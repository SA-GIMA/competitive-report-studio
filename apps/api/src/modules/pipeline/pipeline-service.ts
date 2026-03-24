import { join } from "node:path";
import { getAppConfig } from "@studio/config";
import { PngChartRenderer } from "@studio/charting";
import { WordTemplateEngine } from "@studio/docx-engine";
import { CompetitiveAnalysisPipeline } from "@studio/orchestrator";
import {
  OpenSearchProvider,
  SerpApiBaiduSearchProvider,
  SkillBridgeSearchProvider,
  type SearchProvider
} from "@studio/providers";
import { RetrievalPipeline } from "@studio/retrieval";
import type {
  NaturalLanguageRequirement,
  RequirementParseResult,
  RetrievalMode
} from "@studio/shared";
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

  constructor(
    modelService: ModelService,
    taskService: TaskService,
    templateService: TemplateService,
    reportService: ReportService,
    retrievalConfigService: RetrievalConfigService
  ) {
    this.modelService = modelService;
    this.taskService = taskService;
    this.templateService = templateService;
    this.reportService = reportService;
    this.retrievalConfigService = retrievalConfigService;
  }

  async createTask(
    requirement: NaturalLanguageRequirement & { parseResult?: RequirementParseResult }
  ) {
    return this.taskService.create(requirement);
  }

  async previewRequirement(requirement: NaturalLanguageRequirement) {
    const pipeline = this.createPipeline(requirement.retrievalMode ?? "mock");
    const routing = this.modelService.getRouting();
    const parseResult = await pipeline.parseRequirement(requirement, routing.plannerModelId);
    const queries = pipeline.buildQueries(parseResult);
    const sources = await pipeline.collectSources(queries);
    const candidates = pipeline.discoverCompetitors(parseResult, sources, requirement.limit ?? 5);
    return {
      parseResult,
      queries,
      candidates,
      sourceCount: sources.length
    };
  }

  async runTask(taskId: string) {
    this.taskService.update(taskId, {
      status: "queued",
      currentStep: "任务已提交，准备执行",
      progressPercent: 2,
      errorMessage: undefined
    });

    void this.executeTask(taskId);

    return this.taskService.get(taskId);
  }

  private async executeTask(taskId: string) {
    const config = getAppConfig();
    const task = this.taskService.get(taskId);
    const routing = this.modelService.getRouting();
    const template = this.templateService.get(task.templateId ?? "tpl-executive-zh");
    const reportId = `report-${taskId}`;

    this.taskService.update(taskId, {
      status: "running",
      currentStep: "开始执行任务",
      progressPercent: 5
    });

    const pipeline = this.createPipeline(task.retrievalMode ?? "mock");
    try {
      const result = await pipeline.execute({
        taskId,
        reportId,
        requirement: {
          rawPrompt: task.prompt,
        preferredTemplateId: template.id,
        preferredStyle: template.style,
        limit: task.limit ?? 5,
        retrievalMode: task.retrievalMode ?? "mock"
      },
        existingParseResult: task.parseResult,
        templateId: template.id,
        templatePath: template.fileKey,
        reportOutputDir: join(process.cwd(), config.storage.reportsDir),
        chartOutputDir: join(process.cwd(), config.storage.chartsDir),
        routing,
        onProgress: (event) => {
          this.taskService.update(taskId, {
            status: "running",
            currentStep: event.step,
            progressPercent: event.progressPercent
          });
        }
      });

      this.taskService.update(taskId, {
        status: "completed",
        parseResult: result.parseResult,
        selectedCompetitors: result.competitorProfiles.map((item) => item.name),
        reportId,
        errorMessage: undefined,
        currentStep: "执行完成",
        progressPercent: 100
      });
      this.reportService.save(result.artifact, result.snapshot);
    } catch (error) {
      this.taskService.update(taskId, {
        status: "failed",
        reportId,
        errorMessage: error instanceof Error ? error.message : "任务执行失败",
        currentStep: "执行失败",
        progressPercent: 100
      });
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

    if (retrievalMode === "search_api" || retrievalMode === "hybrid") {
      if (!config.searchApiEndpoint && retrievalMode === "search_api") {
        throw new Error("未配置 Search API Endpoint，无法使用 Search API 检索模式。");
      }
      if (config.searchApiEndpoint) {
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
