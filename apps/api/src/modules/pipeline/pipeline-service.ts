import { join } from "node:path";
import { getAppConfig } from "@studio/config";
import { PngChartRenderer } from "@studio/charting";
import { WordTemplateEngine } from "@studio/docx-engine";
import { CompetitiveAnalysisPipeline, parseJsonWithRepair } from "@studio/orchestrator";
import {
  OpenSearchProvider,
  SearxngSearchProvider,
  SerpApiBaiduSearchProvider,
  SkillBridgeSearchProvider,
  type SearchProvider
} from "@studio/providers";
import { RetrievalPipeline } from "@studio/retrieval";
import { extractUploadedMaterial } from "@studio/retrieval";
import type {
  ChartSpec,
  CompetitorCandidate,
  CompetitorProfile,
  NaturalLanguageRequirement,
  PipelineSnapshot,
  ReportDraft,
  RequirementParseResult,
  RetrievalMode,
  SearchDocument,
  SearchQuery,
  TaskFailureCategory
} from "@studio/shared";
import { MaterialService } from "../materials/material-service.ts";
import { ModelService } from "../models/model-service.ts";
import { ReportService } from "../reports/report-service.ts";
import { RetrievalConfigService } from "../retrieval/retrieval-config-service.ts";
import { TaskService } from "../tasks/task-service.ts";
import { TemplateService } from "../templates/template-service.ts";
import { MockChineseSearchProvider } from "./mock-search-provider.ts";

export class PipelineService {
  private readonly modelService: ModelService;
  private readonly taskService: TaskService;
  private readonly templateService: TemplateService;
  private readonly reportService: ReportService;
  private readonly retrievalConfigService: RetrievalConfigService;
  private readonly materialService: MaterialService;
  private readonly runControls = new Map<string, { pauseRequested: boolean; running: boolean }>();

  constructor(
    modelService: ModelService,
    taskService: TaskService,
    templateService: TemplateService,
    reportService: ReportService,
    retrievalConfigService: RetrievalConfigService,
    materialService: MaterialService
  ) {
    this.modelService = modelService;
    this.taskService = taskService;
    this.templateService = templateService;
    this.reportService = reportService;
    this.retrievalConfigService = retrievalConfigService;
    this.materialService = materialService;
  }

  async createTask(
    requirement: NaturalLanguageRequirement & { parseResult?: RequirementParseResult }
  ) {
    return this.taskService.create(this.normalizeRequirement(requirement));
  }

  async previewRequirement(requirement: NaturalLanguageRequirement) {
    const pipeline = this.createPipeline(requirement.retrievalMode ?? "mock");
    const routing = this.modelService.getRouting();
    const normalizedRequirement = this.normalizeRequirement(requirement);
    const parseResult = await pipeline.parseRequirement(normalizedRequirement, routing.plannerModelId);
    let searchPreview:
      | {
          candidates: CompetitorCandidate[];
          sourceCount: number;
        }
      | null =
      normalizedRequirement.inputMode === "document_upload"
        ? null
        : null;

    if (normalizedRequirement.inputMode !== "document_upload") {
      try {
        searchPreview = await this.previewSearchCandidates(
          pipeline,
          normalizedRequirement,
          parseResult,
          routing.extractorModelId
        );
      } catch {
        searchPreview = null;
      }
    }

    const llmFallbackCandidates =
      normalizedRequirement.inputMode === "document_upload"
        ? []
        : !searchPreview || searchPreview.candidates.length === 0
          ? await this.inferCandidatesWithLlm(
              normalizedRequirement,
              parseResult,
              routing.plannerModelId
            )
          : [];
    const candidates =
      normalizedRequirement.inputMode === "document_upload"
        ? buildUploadCandidates(
            normalizedRequirement.uploadedMaterials ?? [],
            normalizedRequirement.limit ?? 8
          )
        : searchPreview?.candidates?.length
          ? searchPreview.candidates
          : llmFallbackCandidates;
    return {
      parseResult,
      queries:
        normalizedRequirement.inputMode === "document_upload"
          ? []
          : pipeline.buildQueries(parseResult),
      candidates,
      sourceCount:
        normalizedRequirement.inputMode === "document_upload"
          ? normalizedRequirement.uploadedMaterials?.length ?? 0
          : searchPreview?.sourceCount ?? 0
    };
  }

  async runTask(taskId: string) {
    return this.startTask(taskId, "fresh");
  }

  async pauseTask(taskId: string) {
    const task = this.taskService.get(taskId);
    const control = this.runControls.get(taskId);

    if (task.status !== "running" || !control?.running) {
      throw new Error("当前任务不在运行中，无法暂停。");
    }

    control.pauseRequested = true;
    this.taskService.update(taskId, {
      currentStep: "已收到暂停请求，等待当前阶段安全暂停",
      progressPercent: task.progressPercent
    });
    return this.taskService.get(taskId);
  }

  async resumeTask(taskId: string) {
    const task = this.taskService.get(taskId);
    if (task.status !== "paused" && !(task.status === "failed" && task.retryable)) {
      throw new Error("当前任务不支持继续执行。");
    }
    return this.startTask(taskId, "resume");
  }

  async retryTask(taskId: string) {
    const task = this.taskService.get(taskId);
    if (!["failed", "paused", "completed"].includes(task.status)) {
      throw new Error("当前任务状态不支持重新执行。");
    }
    return this.startTask(taskId, "retry");
  }

  private async startTask(taskId: string, mode: "fresh" | "resume" | "retry") {
    const existingControl = this.runControls.get(taskId);
    if (existingControl?.running) {
      throw new Error("任务正在执行中，请勿重复提交。");
    }

    if (mode === "retry") {
      this.taskService.update(taskId, {
        executionCheckpoint: undefined,
        errorMessage: undefined,
        failureCategory: undefined,
        retryable: true,
        selectedCompetitors: undefined,
        reportId: undefined
      });
    }

    this.taskService.update(taskId, {
      status: "queued",
      currentStep:
        mode === "resume" ? "任务继续执行中，准备从断点恢复" : "任务已提交，准备执行",
      progressPercent: 2,
      errorMessage: undefined,
      failureCategory: undefined,
      retryable: true
    });

    this.runControls.set(taskId, { pauseRequested: false, running: true });
    void this.executeTask(taskId, mode);

    return this.taskService.get(taskId);
  }

  private async executeTask(taskId: string, mode: "fresh" | "resume" | "retry") {
    const config = getAppConfig();
    const task = this.taskService.get(taskId);
    const routing = this.modelService.getRouting();
    const template = this.templateService.get(task.templateId ?? "tpl-executive-zh");
    const reportId = `report-${taskId}`;
    const normalizedRequirement = this.normalizeRequirement({
      rawPrompt: task.prompt,
      preferredTemplateId: template.id,
      preferredStyle: template.style,
      limit: task.limit ?? 5,
      inputMode: task.inputMode ?? "search",
      retrievalMode: task.retrievalMode ?? "mock",
      autoFillChartData: task.autoFillChartData ?? false,
      confirmedCompetitors: task.confirmedCompetitors ?? [],
      uploadedMaterials: task.uploadedMaterials ?? []
    });

    this.taskService.update(taskId, {
      status: "running",
      currentStep: mode === "resume" ? "开始从断点继续执行任务" : "开始执行任务",
      progressPercent: 5
    });

    const pipeline = this.createPipeline(task.retrievalMode ?? "mock");
    try {
      const result = await this.executeWithCheckpoint({
        taskId,
        reportId,
        task,
        requirement: normalizedRequirement,
        template,
        routing,
        pipeline,
        reportOutputDir: join(process.cwd(), config.storage.reportsDir),
        chartOutputDir: join(process.cwd(), config.storage.chartsDir)
      });

      this.taskService.update(taskId, {
        status: "completed",
        parseResult: result.parseResult,
        selectedCompetitors: result.competitorProfiles.map((item) => item.name),
        reportId,
        errorMessage: undefined,
        failureCategory: undefined,
        retryable: true,
        executionCheckpoint: {
          ...result.checkpoint,
          stage: "completed"
        },
        currentStep: "执行完成",
        progressPercent: 100
      });
      this.reportService.save(result.artifact, result.snapshot);
    } catch (error) {
      if (error instanceof PauseRequestedError) {
        const latestTask = this.taskService.get(taskId);
        this.taskService.update(taskId, {
          status: "paused",
          currentStep: "任务已暂停，可继续执行",
          retryable: true,
          progressPercent: latestTask.progressPercent
        });
        return;
      }
      const failure = classifyTaskFailure(error);
      const latestTask = this.taskService.get(taskId);
      this.taskService.update(taskId, {
        status: "failed",
        reportId,
        errorMessage: error instanceof Error ? error.message : "任务执行失败",
        failureCategory: failure.category,
        retryable: failure.retryable,
        currentStep: latestTask.currentStep ?? "执行失败",
        progressPercent: latestTask.progressPercent ?? 0
      });
    } finally {
      const control = this.runControls.get(taskId);
      if (control) {
        control.running = false;
        control.pauseRequested = false;
      }
    }
  }

  private async executeWithCheckpoint(input: {
    taskId: string;
    reportId: string;
    task: ReturnType<TaskService["get"]>;
    requirement: NaturalLanguageRequirement;
    template: ReturnType<TemplateService["get"]>;
    routing: ReturnType<ModelService["getRouting"]>;
    pipeline: CompetitiveAnalysisPipeline;
    reportOutputDir: string;
    chartOutputDir: string;
  }) {
    const task = this.taskService.get(input.taskId);
    const baseCheckpoint = input.task.executionCheckpoint;
    const inputMode = input.requirement.inputMode ?? "search";
    const confirmedCandidates = (input.task.confirmedCompetitors ?? []).map((name) => ({
      id: `confirmed-${name}`,
      name,
      layer: "direct" as const,
      matchReason: "来自用户确认名单",
      confidence: 1,
      supportingSources: []
    }));

    let checkpoint = baseCheckpoint ?? { stage: "parse_requirement" as const };

    const parseResult =
      checkpoint.parseResult ??
      input.task.parseResult ??
      (await input.pipeline.parseRequirement(input.requirement, input.routing.plannerModelId));
    checkpoint = this.saveCheckpoint(input.taskId, {
      ...checkpoint,
      stage: "collect_sources",
      parseResult
    });
    await this.throwIfPauseRequested(input.taskId);

    const materialDigests =
      checkpoint.materialDigests ??
      (inputMode === "document_upload"
        ? await this.extractMaterialDigests(input.taskId, input.requirement.uploadedMaterials ?? [])
        : []);
    const queries = checkpoint.queries ?? (inputMode === "document_upload" ? [] : input.pipeline.buildQueries(parseResult));
    const sources =
      checkpoint.sources ??
      (inputMode === "document_upload"
        ? input.pipeline.buildSourcesFromMaterialDigests(materialDigests)
        : await input.pipeline.collectSources(queries));
    checkpoint = this.saveCheckpoint(input.taskId, {
      ...checkpoint,
      stage: "prepare_candidates",
      parseResult,
      materialDigests,
      queries,
      sources
    });
    await this.throwIfPauseRequested(input.taskId);

    const rawCandidates =
      confirmedCandidates.length > 0
        ? confirmedCandidates
        : inputMode === "document_upload"
          ? input.pipeline.buildCandidatesFromMaterials(materialDigests, input.requirement.limit ?? 8)
          : input.pipeline.discoverCompetitors(parseResult, sources, input.requirement.limit ?? 8);
    const candidates =
      checkpoint.candidates ??
      (confirmedCandidates.length > 0
        ? rawCandidates
        : inputMode === "document_upload"
          ? rawCandidates
          : await input.pipeline.validateCandidates(
              parseResult,
              rawCandidates,
              sources,
              input.routing.extractorModelId
            ));
    checkpoint = this.saveCheckpoint(input.taskId, {
      ...checkpoint,
      stage: "extract_competitors",
      parseResult,
      materialDigests,
      queries,
      sources,
      candidates
    });
    await this.throwIfPauseRequested(input.taskId);

    const competitorProfiles =
      checkpoint.competitorProfiles ??
      (inputMode === "document_upload"
        ? (
            await input.pipeline.extractCompetitorsFromMaterials(
              candidates,
              materialDigests,
              parseResult,
              input.routing.extractorModelId,
              (event) => this.updateProgress(input.taskId, event.step, event.progressPercent),
              checkpoint.competitorProfiles ?? [],
              [],
              ({ profiles }) => {
                checkpoint = this.saveCheckpoint(input.taskId, {
                  ...checkpoint,
                  stage: "extract_competitors",
                  parseResult,
                  materialDigests,
                  queries,
                  sources,
                  candidates,
                  competitorProfiles: profiles
                });
              }
            )
          ).profiles
        : await input.pipeline.extractCompetitors(
            candidates,
            sources,
            parseResult,
            input.routing.extractorModelId,
            (event) => this.updateProgress(input.taskId, event.step, event.progressPercent),
            checkpoint.competitorProfiles ?? [],
            (profiles) => {
              checkpoint = this.saveCheckpoint(input.taskId, {
                ...checkpoint,
                stage: "extract_competitors",
                parseResult,
                materialDigests,
                queries,
                sources,
                candidates,
                competitorProfiles: profiles
              });
            }
          ));
    checkpoint = this.saveCheckpoint(input.taskId, {
      ...checkpoint,
      stage: "collect_chart_sources",
      parseResult,
      materialDigests,
      queries,
      sources,
      candidates,
      competitorProfiles
    });
    await this.throwIfPauseRequested(input.taskId);

    const chartQueries =
      checkpoint.chartQueries ??
      (inputMode === "document_upload"
        ? []
        : input.pipeline.buildChartQueries(parseResult, competitorProfiles));
    const chartSources =
      checkpoint.chartSources ??
      (inputMode === "document_upload"
        ? sources
        : await input.pipeline.collectSources(chartQueries));
    const chartSpecs =
      checkpoint.charts ?? input.pipeline.buildCharts(parseResult, competitorProfiles, chartSources);
    checkpoint = this.saveCheckpoint(input.taskId, {
      ...checkpoint,
      stage: "render_charts",
      parseResult,
      materialDigests,
      queries,
      sources,
      candidates,
      competitorProfiles,
      chartQueries,
      chartSources,
      charts: chartSpecs
    });
    await this.throwIfPauseRequested(input.taskId);

    const chartAssets =
      checkpoint.chartAssets ??
      (await input.pipeline.renderCharts(
        chartSpecs,
        input.chartOutputDir,
        (event) => this.updateProgress(input.taskId, event.step, event.progressPercent),
        checkpoint.chartAssets ?? [],
        (assets) => {
          checkpoint = this.saveCheckpoint(input.taskId, {
            ...checkpoint,
            stage: "render_charts",
            parseResult,
            materialDigests,
            queries,
            sources,
            candidates,
            competitorProfiles,
            chartQueries,
            chartSources,
            charts: chartSpecs,
            chartAssets: assets
          });
        }
      ));
    checkpoint = this.saveCheckpoint(input.taskId, {
      ...checkpoint,
      stage: "write_report",
      parseResult,
      materialDigests,
      queries,
      sources,
      candidates,
      competitorProfiles,
      chartQueries,
      chartSources,
      charts: chartSpecs,
      chartAssets
    });
    await this.throwIfPauseRequested(input.taskId);

    const reportDraft =
      checkpoint.reportDraft ??
      (await input.pipeline.writeReport(
        parseResult,
        competitorProfiles,
        sources,
        chartSpecs,
        input.template.sections,
        input.routing.writerModelId,
        (event) => this.updateProgress(input.taskId, event.step, event.progressPercent),
        checkpoint.reportDraft,
        (draft) => {
          checkpoint = this.saveCheckpoint(input.taskId, {
            ...checkpoint,
            stage: "write_report",
            parseResult,
            materialDigests,
            queries,
            sources,
            candidates,
            competitorProfiles,
            chartQueries,
            chartSources,
            charts: chartSpecs,
            chartAssets,
            reportDraft: draft
          });
        }
      ));
    checkpoint = this.saveCheckpoint(input.taskId, {
      ...checkpoint,
      stage: "export_report",
      parseResult,
      materialDigests,
      queries,
      sources,
      candidates,
      competitorProfiles,
      chartQueries,
      chartSources,
      charts: chartSpecs,
      chartAssets,
      reportDraft
    });
    await this.throwIfPauseRequested(input.taskId);

    const wordTemplateEngine = new WordTemplateEngine();
    const artifact = await wordTemplateEngine.render({
      reportId: input.reportId,
      title: reportDraft.title,
      templatePath: input.template.fileKey,
      outputDir: input.reportOutputDir,
      reportDraft,
      chartAssets
    });

    const snapshot: PipelineSnapshot = {
      taskId: input.taskId,
      modelRouting: input.routing,
      templateId: input.template.id,
      inputMode,
      requirement: parseResult,
      queries,
      sources,
      uploadedMaterials: input.requirement.uploadedMaterials,
      materialDigests,
      materialInsightCards: [],
      chartQueries,
      chartSources,
      competitors: competitorProfiles,
      charts: chartSpecs,
      generatedAt: new Date().toISOString()
    };

    return {
      parseResult,
      competitorProfiles,
      artifact,
      snapshot,
      checkpoint: {
        ...checkpoint,
        stage: "completed",
        parseResult,
        materialDigests,
        queries,
        sources,
        candidates,
        competitorProfiles,
        chartQueries,
        chartSources,
        charts: chartSpecs,
        chartAssets,
        reportDraft
      }
    };
  }

  private updateProgress(taskId: string, step: string, progressPercent: number) {
    this.taskService.update(taskId, {
      status: "running",
      currentStep: step,
      progressPercent
    });
  }

  private saveCheckpoint(taskId: string, checkpoint: NonNullable<ReturnType<TaskService["get"]>["executionCheckpoint"]>) {
    this.taskService.update(taskId, {
      executionCheckpoint: checkpoint,
      parseResult: checkpoint.parseResult,
      currentStep: stageToMessage(checkpoint.stage)
    });
    return checkpoint;
  }

  private async throwIfPauseRequested(taskId: string) {
    const control = this.runControls.get(taskId);
    if (control?.pauseRequested) {
      throw new PauseRequestedError();
    }
  }

  private createPipeline(retrievalMode: RetrievalMode) {
    return new CompetitiveAnalysisPipeline({
      providerResolver: (modelId) => this.modelService.getProvider(modelId),
      retrievalPipeline: new RetrievalPipeline(this.createSearchProviders(retrievalMode)),
      chartRenderer: new PngChartRenderer(),
      wordTemplateEngine: new WordTemplateEngine(),
      modelConfigs: this.modelService.getConfigsMap()
    });
  }

  private normalizeRequirement(requirement: NaturalLanguageRequirement): NaturalLanguageRequirement {
    const inputMode = requirement.inputMode ?? "search";
    const uploadedMaterials = requirement.uploadedMaterials ?? [];
    const confirmedCompetitors =
      requirement.confirmedCompetitors && requirement.confirmedCompetitors.length > 0
        ? requirement.confirmedCompetitors
        : inputMode === "document_upload"
          ? Array.from(new Set(uploadedMaterials.map((item) => item.competitorName)))
          : [];

    const rawPrompt = requirement.rawPrompt.trim() || buildDefaultUploadPrompt(confirmedCompetitors);

    return {
      ...requirement,
      rawPrompt,
      inputMode,
      autoFillChartData: requirement.autoFillChartData ?? false,
      confirmedCompetitors,
      uploadedMaterials
    };
  }

  private async previewSearchCandidates(
    pipeline: CompetitiveAnalysisPipeline,
    requirement: NaturalLanguageRequirement,
    parseResult: RequirementParseResult,
    extractorModelId: string
  ) {
    const queries = pipeline.buildQueries(parseResult);
    const sources = await pipeline.collectSources(queries);
    const rawCandidates = pipeline.discoverCompetitors(parseResult, sources, requirement.limit ?? 8);
    const candidates = await pipeline.validateCandidates(
      parseResult,
      rawCandidates,
      sources,
      extractorModelId
    );
    return {
      candidates,
      sourceCount: sources.length
    };
  }

  private async inferCandidatesWithLlm(
    requirement: NaturalLanguageRequirement,
    parseResult: RequirementParseResult,
    modelId: string
  ): Promise<CompetitorCandidate[]> {
    const config = this.modelService.getConfigsMap()[modelId];
    if (!config) {
      return [];
    }

    const json = await this.modelService.getProvider(modelId).generateText(config, {
      systemPrompt: `
你是中文竞品候选补全助手。
当联网检索没有返回可靠候选竞品时，请基于用户需求和你已有的通用行业知识，补充一批可能的竞品名称。
要求：
1. 只返回严格 JSON。
2. 最多返回 8 个候选。
3. 候选必须是产品名、平台名、品牌名，不要返回媒体、文库、论坛、文章栏目。
4. 如果把握不足，也要给出当前赛道中最常见、最可能的竞品。
返回格式：
{
  "items": [
    {
      "name": "竞品名称",
      "reason": "为什么它可能是竞品"
    }
  ]
}
      `,
      userPrompt: JSON.stringify({
        rawPrompt: requirement.rawPrompt,
        track: parseResult.track,
        industry: parseResult.industry,
        region: parseResult.region,
        targetAudience: parseResult.targetAudience,
        competitorType: parseResult.competitorType,
        limit: Math.min(requirement.limit ?? 8, 8)
      }),
      responseFormat: "json"
    });

    try {
      const parsed = parseJsonWithRepair<{
        items?: Array<{ name?: string; reason?: string }>;
      }>(json);
      return (parsed.items ?? [])
        .filter((item) => typeof item?.name === "string" && item.name.trim())
        .slice(0, Math.min(requirement.limit ?? 8, 8))
        .map((item, index) => ({
          id: `llm-fallback-${index + 1}-${item.name?.trim()}`,
          name: item.name?.trim() ?? "",
          layer: "direct",
          matchReason: item.reason?.trim() || "联网检索未命中，由模型根据赛道知识补充",
          confidence: 0.68,
          supportingSources: []
        }));
    } catch {
      return [];
    }
  }

  private async extractMaterialDigests(taskId: string, materials: NonNullable<NaturalLanguageRequirement["uploadedMaterials"]>) {
    this.taskService.update(taskId, {
      status: "running",
      currentStep: "正在解析上传材料",
      progressPercent: 12
    });

    const fullMaterials = this.materialService.getMany(materials.map((item) => item.id));
    return Promise.all(fullMaterials.map((material) => extractUploadedMaterial(material)));
  }

  private createSearchProviders(retrievalMode: RetrievalMode): SearchProvider[] {
    const config = this.retrievalConfigService.get();
    const providers: SearchProvider[] = [];

    if (retrievalMode === "mock") {
      return [new MockChineseSearchProvider()];
    }

    if (retrievalMode === "serpapi_baidu") {
      if (!config.serpApiKey) {
        throw new Error("未配置 SerpAPI Key，无法使用 SerpAPI(Baidu) 检索模式。");
      }
      return [
        new SerpApiBaiduSearchProvider({
          apiKey: config.serpApiKey
        })
      ];
    }

    if (retrievalMode === "searxng") {
      if (!config.searxngEndpoint) {
        throw new Error("未配置 SearXNG Endpoint，无法使用 SearXNG 检索模式。");
      }
      assertValidHttpUrl(config.searxngEndpoint, "SearXNG Endpoint");
      return [
        new SearxngSearchProvider({
          endpoint: config.searxngEndpoint,
          apiKey: config.searxngKey,
          defaultLanguage: "zh-CN"
        })
      ];
    }

    if (retrievalMode === "search_api" || retrievalMode === "hybrid") {
      if (!config.searchApiEndpoint && retrievalMode === "search_api") {
        throw new Error("未配置 Search API Endpoint，无法使用 Search API 检索模式。");
      }
      if (config.searchApiEndpoint) {
        assertValidHttpUrl(config.searchApiEndpoint, "Search API Endpoint");
        providers.push(
          new OpenSearchProvider({
            endpoint: config.searchApiEndpoint,
            apiKey: config.searchApiKey,
            defaultLanguage: "zh-CN"
          })
        );
      }
    }

    if (retrievalMode === "skill_bridge" || retrievalMode === "hybrid") {
      if (!config.skillBridgeEndpoint && retrievalMode === "skill_bridge") {
        throw new Error("未配置 Skill Bridge Endpoint，无法使用 Skill Bridge 检索模式。");
      }
      if (config.skillBridgeEndpoint) {
        assertValidHttpUrl(config.skillBridgeEndpoint, "Skill Bridge Endpoint");
        providers.push(
          new SkillBridgeSearchProvider({
            endpoint: config.skillBridgeEndpoint,
            apiKey: config.skillBridgeKey,
            defaultLanguage: "zh-CN"
          })
        );
      }
    }

    if (retrievalMode === "hybrid") {
      if (config.serpApiKey) {
        providers.push(
          new SerpApiBaiduSearchProvider({
            apiKey: config.serpApiKey
          })
        );
      }
      providers.push(new MockChineseSearchProvider());
    }

    if (providers.length === 0) {
      return [new MockChineseSearchProvider()];
    }

    return providers;
  }
}

const buildUploadCandidates = (
  materials: NonNullable<NaturalLanguageRequirement["uploadedMaterials"]>,
  limit: number
) =>
  Array.from(new Set(materials.map((item) => item.competitorName)))
    .slice(0, limit)
    .map((name) => ({
      id: `upload-${name}`,
      name,
      layer: "direct" as const,
      matchReason: "来自用户上传材料",
      confidence: 1,
      supportingSources: materials
        .filter((item) => item.competitorName === name)
        .map((item) => item.id)
    }));

const buildDefaultUploadPrompt = (competitors: string[]) =>
  competitors.length > 0
    ? `请基于我上传的材料，分析 ${competitors.join("、")} 的产品定位、核心功能、商业模式、优劣势和机会点，输出一份结构化竞品分析报告。`
    : "请基于我上传的竞品材料，输出一份结构化竞品分析报告。";

class PauseRequestedError extends Error {
  constructor() {
    super("任务已暂停");
  }
}

const stageToMessage = (stage: string) => {
  switch (stage) {
    case "collect_sources":
      return "需求解析完成";
    case "prepare_candidates":
      return "来源收集完成";
    case "extract_competitors":
      return "候选竞品准备完成";
    case "collect_chart_sources":
      return "竞品抽取完成";
    case "render_charts":
      return "图表数据准备完成";
    case "write_report":
      return "图表生成完成";
    case "export_report":
      return "报告正文生成完成";
    case "completed":
      return "执行完成";
    default:
      return "执行中";
  }
};

const classifyTaskFailure = (
  error: unknown
): { category: TaskFailureCategory; retryable: boolean } => {
  const message = error instanceof Error ? error.message : String(error);

  if (
    /未配置|不存在|请先保存|路由引用了不存在|模型不存在|模板不存在|上传材料不存在/.test(
      message
    )
  ) {
    return { category: "configuration", retryable: false };
  }

  if (/请输入|至少|为空|缺少|无效|不存在:/.test(message)) {
    return { category: "input", retryable: false };
  }

  if (/余额不足|401|403|404|502|503|504|ECONNRESET|ETIMEDOUT|fetch failed/i.test(message)) {
    return { category: "provider", retryable: true };
  }

  if (/限流|rate limit|超时|timeout/i.test(message)) {
    return { category: "temporary", retryable: true };
  }

  return { category: "unknown", retryable: true };
};

const assertValidHttpUrl = (value: string, label: string) => {
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("unsupported protocol");
    }
  } catch {
    throw new Error(`${label} 不是合法的 http(s) 地址，请先到模型设置中修正后再运行任务。`);
  }
};
