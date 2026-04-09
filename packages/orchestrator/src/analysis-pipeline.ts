import type {
  ChartSpec,
  CompetitorCandidate,
  CompetitorProfile,
  GeneratedChartAsset,
  ModelConnectionConfig,
  ModelRoutingConfig,
  NaturalLanguageRequirement,
  PipelineSnapshot,
  ReportDraft,
  ReportSectionDraft,
  ReportSectionTemplate,
  RequirementParseResult,
  SearchDocument,
  SearchQuery,
  UploadedMaterialDigest,
  UploadedMaterialInsightCard,
  UploadedMaterialReference
} from "@studio/shared";
import type { ChartRenderer } from "@studio/charting";
import type { WordTemplateEngine } from "@studio/docx-engine";
import type { LlmProvider } from "@studio/providers";
import { RetrievalPipeline } from "@studio/retrieval";
import {
  candidateValidationSystemPrompt,
  chartKnowledgeCompletionSystemPrompt,
  extractionSystemPrompt,
  materialChunkExtractionSystemPrompt,
  materialProfileMergeSystemPrompt,
  reportSectionReviewSystemPrompt,
  reportWritingSystemPrompt,
  reportSummarySystemPrompt,
  requirementParsingSystemPrompt
} from "./prompts.ts";
import { parseJsonWithRepair } from "./json-utils.ts";

export interface PipelineDependencies {
  providerResolver: (modelId: string) => LlmProvider;
  retrievalPipeline: RetrievalPipeline;
  chartRenderer: ChartRenderer;
  wordTemplateEngine: WordTemplateEngine;
  modelConfigs: Record<string, ModelConnectionConfig>;
}

export interface ProgressEvent {
  step: string;
  progressPercent: number;
}

export class CompetitiveAnalysisPipeline {
  private readonly deps: PipelineDependencies;

  constructor(deps: PipelineDependencies) {
    this.deps = deps;
  }

  async execute(input: {
    taskId: string;
    reportId: string;
    requirement: NaturalLanguageRequirement;
    existingParseResult?: RequirementParseResult;
    confirmedCandidates?: CompetitorCandidate[];
    uploadedMaterials?: UploadedMaterialReference[];
    materialDigests?: UploadedMaterialDigest[];
    templateId: string;
    templatePath: string;
    templateSections: ReportSectionTemplate[];
    reportOutputDir: string;
    chartOutputDir: string;
    routing: ModelRoutingConfig;
    onProgress?: (event: ProgressEvent) => void;
  }) {
    const inputMode = input.requirement.inputMode ?? "search";
    const parseResult =
      input.existingParseResult ??
      (await this.parseRequirement(input.requirement, input.routing.plannerModelId));
    input.onProgress?.({ step: "需求解析完成", progressPercent: 10 });
    const materialDigests = input.materialDigests ?? [];
    const queries = inputMode === "document_upload" ? [] : this.buildQueries(parseResult);
    const sources =
      inputMode === "document_upload"
        ? this.buildSourcesFromMaterialDigests(materialDigests)
        : await this.collectSources(queries);
    input.onProgress?.({
      step: inputMode === "document_upload" ? "上传材料整理完成" : "检索完成",
      progressPercent: 22
    });
    const rawCandidates =
      input.confirmedCandidates && input.confirmedCandidates.length > 0
        ? input.confirmedCandidates
        : inputMode === "document_upload"
          ? this.buildCandidatesFromMaterials(materialDigests, input.requirement.limit ?? 8)
          : this.discoverCompetitors(parseResult, sources, input.requirement.limit ?? 8);
    input.onProgress?.({
      step:
        input.confirmedCandidates && input.confirmedCandidates.length > 0
          ? "已加载用户确认竞品名单"
          : "候选竞品发现完成",
      progressPercent: 28
    });
    const candidates =
      input.confirmedCandidates && input.confirmedCandidates.length > 0
        ? rawCandidates
        : inputMode === "document_upload"
          ? rawCandidates
          : await this.validateCandidates(
              parseResult,
              rawCandidates,
              sources,
              input.routing.extractorModelId
            );
    input.onProgress?.({ step: "候选竞品质检完成", progressPercent: 30 });
    const materialExtractionResult =
      inputMode === "document_upload"
        ? await this.extractCompetitorsFromMaterials(
            candidates,
            materialDigests,
            parseResult,
            input.routing.extractorModelId,
            input.onProgress
          )
        : null;
    const competitorProfiles =
      materialExtractionResult?.profiles ??
      (await this.extractCompetitors(
        candidates,
        sources,
        parseResult,
        input.routing.extractorModelId,
        input.onProgress
      ));
    input.onProgress?.({ step: "结构化抽取完成", progressPercent: 58 });
    const chartQueries =
      inputMode === "document_upload" ? [] : this.buildChartQueries(parseResult, competitorProfiles);
    const chartSources =
      inputMode === "document_upload" ? sources : await this.collectSources(chartQueries);
    input.onProgress?.({
      step: inputMode === "document_upload" ? "图表数据整理完成" : "图表数据检索完成",
      progressPercent: 66
    });
    const baseChartSpecs = this.buildCharts(parseResult, competitorProfiles, chartSources);
    const chartSpecs =
      input.requirement.autoFillChartData && shouldAutoFillCharts(chartSources, baseChartSpecs)
        ? await this.completeChartSpecsWithKnowledge(
            parseResult,
            competitorProfiles,
            baseChartSpecs,
            chartSources,
            input.routing.writerModelId
          )
        : baseChartSpecs;
    const chartAssets = await this.renderCharts(chartSpecs, input.chartOutputDir, input.onProgress);
    input.onProgress?.({ step: "图表生成完成", progressPercent: 74 });
    const reportDraft = await this.writeReport(
      parseResult,
      competitorProfiles,
      sources,
      chartSpecs,
      input.templateSections,
      input.routing.writerModelId,
      input.onProgress
    );
    input.onProgress?.({ step: "报告正文生成完成", progressPercent: 92 });
    const artifact = await this.deps.wordTemplateEngine.render({
      reportId: input.reportId,
      title: reportDraft.title,
      templatePath: input.templatePath,
      outputDir: input.reportOutputDir,
      reportDraft,
      chartAssets
    });

    const snapshot: PipelineSnapshot = {
      taskId: input.taskId,
      modelRouting: input.routing,
      templateId: input.templateId,
      inputMode,
      requirement: parseResult,
      queries,
      sources,
      uploadedMaterials: input.uploadedMaterials,
      materialDigests,
      materialInsightCards: materialExtractionResult?.insightCards ?? [],
      chartQueries,
      chartSources,
      competitors: competitorProfiles,
      charts: chartSpecs,
      generatedAt: new Date().toISOString()
    };

    input.onProgress?.({ step: "Word 导出完成", progressPercent: 100 });

    return { parseResult, candidates, competitorProfiles, chartSpecs, chartAssets, reportDraft, artifact, snapshot };
  }

  buildCandidatesFromMaterials(
    materialDigests: UploadedMaterialDigest[],
    limit: number
  ): CompetitorCandidate[] {
    const names = Array.from(
      new Map(
        materialDigests.map((digest) => [
          digest.competitorName,
          digest.blocks.length
        ])
      ).entries()
    );

    return names
      .sort((left, right) => right[1] - left[1])
      .slice(0, limit)
      .map(([name, blockCount]) => ({
        id: `upload-${name}`,
        name,
        layer: "direct",
        matchReason: `来自用户上传材料，共 ${blockCount} 个结构化内容块`,
        confidence: 1,
        supportingSources: materialDigests
          .filter((digest) => digest.competitorName === name)
          .map((digest) => digest.materialId)
      }));
  }

  async parseRequirement(requirement: NaturalLanguageRequirement, modelId: string) {
    const config = this.getModelConfig(modelId);
    const json = await this.deps.providerResolver(modelId).generateText(config, {
      systemPrompt: requirementParsingSystemPrompt,
      userPrompt: requirement.rawPrompt,
      responseFormat: "json"
    });

    const parsed = sanitizeRequirementParseResult(parseRequirementOutput(json), requirement.rawPrompt);
    if (requirement.preferredStyle) {
      parsed.inferredOutputStyle = requirement.preferredStyle;
    }
    return parsed;
  }

  buildQueries(parseResult: RequirementParseResult): SearchQuery[] {
    const base = `${parseResult.region}${parseResult.track}`;
    return [
      { keyword: `${base} 竞品 官网 产品介绍`, timeRange: parseResult.timeRange },
      { keyword: `${base} 行业媒体 融资 动态`, timeRange: parseResult.timeRange },
      { keyword: `${base} 用户评价 应用商店`, timeRange: parseResult.timeRange },
      { keyword: `${base} 商业模式 价格`, timeRange: parseResult.timeRange }
    ];
  }

  async collectSources(queries: SearchQuery[]) {
    const batches = await Promise.all(queries.map((query) => this.deps.retrievalPipeline.search(query)));
    return batches.flat();
  }

  buildChartQueries(parseResult: RequirementParseResult, competitors: CompetitorProfile[]) {
    const names = competitors.map((item) => item.name).slice(0, 5);
    const compactNames = names.join(" ");
    const base = `${parseResult.region}${parseResult.track}`;

    return [
      {
        keyword: `${base} ${compactNames} 功能对比 核心能力`,
        timeRange: parseResult.timeRange
      },
      {
        keyword: `${base} ${compactNames} 商业模式 定价 收费`,
        timeRange: parseResult.timeRange
      },
      {
        keyword: `${base} ${compactNames} 渠道 市场动作 用户评价`,
        timeRange: parseResult.timeRange
      }
    ];
  }

  discoverCompetitors(
    parseResult: RequirementParseResult,
    sources: SearchDocument[],
    limit: number
  ): CompetitorCandidate[] {
    const nameMap = new Map<string, CompetitorCandidate>();

    for (const source of sources) {
      const candidateNames = extractCandidateNamesFromSource(source, parseResult);
      for (const normalizedName of candidateNames) {
        const existing = nameMap.get(normalizedName);
        if (existing) {
          existing.confidence = Math.min(existing.confidence + 0.05, 0.98);
          if (!existing.supportingSources.includes(source.id)) {
            existing.supportingSources.push(source.id);
          }
          continue;
        }
        nameMap.set(normalizedName, {
          id: `candidate-${normalizedName}`,
          name: normalizedName,
          layer: "direct",
          matchReason: `来源于 ${source.title}`,
          confidence: Math.min(0.58 + source.credibilityScore / 2, 0.95),
          supportingSources: [source.id]
        });
      }
    }

    return Array.from(nameMap.values())
      .sort((left, right) => right.confidence - left.confidence)
      .slice(0, limit);
  }

  async validateCandidates(
    parseResult: RequirementParseResult,
    candidates: CompetitorCandidate[],
    sources: SearchDocument[],
    modelId: string
  ) {
    const preliminarilyFiltered = candidates.filter((candidate) =>
      isLikelyRealCompetitorCandidate(candidate.name, sources, parseResult.track)
    );

    if (preliminarilyFiltered.length === 0) {
      return [];
    }

    const config = this.getModelConfig(modelId);
    const json = await this.deps.providerResolver(modelId).generateText(config, {
      systemPrompt: candidateValidationSystemPrompt,
      userPrompt: JSON.stringify({
        track: parseResult.track,
        industry: parseResult.industry,
        targetAudience: parseResult.targetAudience,
        candidates: preliminarilyFiltered.map((candidate) => ({
          name: candidate.name,
          matchReason: candidate.matchReason,
          relatedSources: sources
            .filter(
              (source) =>
                source.title.includes(candidate.name) || source.snippet.includes(candidate.name)
            )
            .slice(0, 3)
            .map((source) => ({
              title: source.title,
              snippet: source.snippet,
              url: source.url
            }))
        }))
      }),
      responseFormat: "json"
    });

    const validation = parseCandidateValidationOutput(json);
    const acceptedNames = new Set(
      validation.items.filter((item) => item.accepted).map((item) => item.name)
    );

    return preliminarilyFiltered
      .filter((candidate) => acceptedNames.has(candidate.name))
      .map((candidate) => {
        const matched = validation.items.find((item) => item.name === candidate.name);
        return {
          ...candidate,
          matchReason: matched?.reason
            ? `${candidate.matchReason}；质检：${matched.reason}`
            : candidate.matchReason
        };
      });
  }

  async extractCompetitors(
    candidates: CompetitorCandidate[],
    sources: SearchDocument[],
    parseResult: RequirementParseResult,
    modelId: string,
    onProgress?: (event: ProgressEvent) => void,
    existingProfiles: CompetitorProfile[] = [],
    onItemComplete?: (profiles: CompetitorProfile[]) => void
  ): Promise<CompetitorProfile[]> {
    const config = this.getModelConfig(modelId);
    const profiles: CompetitorProfile[] = [...existingProfiles];

    for (const [index, candidate] of candidates.entries()) {
      if (profiles[index]) {
        onProgress?.({
          step: `抽取竞品画像 ${index + 1}/${Math.max(candidates.length, 1)}：${candidate.name}`,
          progressPercent: 30 + Math.round(((index + 1) / Math.max(candidates.length, 1)) * 28)
        });
        continue;
      }
      const relevantSources = sources
        .filter((source) => source.title.includes(candidate.name) || source.snippet.includes(candidate.name))
        .slice(0, 8);
      const enrichedSources =
        relevantSources.length >= 3
          ? relevantSources
          : dedupeSourcesByUrl([
              ...relevantSources,
              ...(await this.collectSources(
                this.buildCandidateQueries(parseResult, candidate.name)
              ))
            ]).slice(0, 8);
      const prompt = JSON.stringify({
        candidate,
        sources: enrichedSources.map((source) => ({
          title: source.title,
          url: source.url,
          snippet: source.snippet
        }))
      });
      const json = await this.deps.providerResolver(modelId).generateText(config, {
        systemPrompt: extractionSystemPrompt,
        userPrompt: prompt,
        responseFormat: "json"
      });
      profiles.push(sanitizeCompetitorProfile(candidate.name, parseCompetitorProfileOutput(json)));
      onItemComplete?.(profiles);
      onProgress?.({
        step: `抽取竞品画像 ${index + 1}/${Math.max(candidates.length, 1)}：${candidate.name}`,
        progressPercent: 30 + Math.round(((index + 1) / Math.max(candidates.length, 1)) * 28)
      });
      await wait(350);
    }

    return profiles;
  }

  async extractCompetitorsFromMaterials(
    candidates: CompetitorCandidate[],
    materialDigests: UploadedMaterialDigest[],
    parseResult: RequirementParseResult,
    modelId: string,
    onProgress?: (event: ProgressEvent) => void,
    existingProfiles: CompetitorProfile[] = [],
    existingInsightCards: UploadedMaterialInsightCard[] = [],
    onItemComplete?: (payload: {
      profiles: CompetitorProfile[];
      insightCards: UploadedMaterialInsightCard[];
    }) => void
  ): Promise<{ profiles: CompetitorProfile[]; insightCards: UploadedMaterialInsightCard[] }> {
    const config = this.getModelConfig(modelId);
    const provider = this.deps.providerResolver(modelId);
    const profiles: CompetitorProfile[] = [...existingProfiles];
    const insightCards: UploadedMaterialInsightCard[] = [...existingInsightCards];

    for (const [index, candidate] of candidates.entries()) {
      if (profiles[index]) {
        onProgress?.({
          step: `理解上传材料 ${index + 1}/${Math.max(candidates.length, 1)}：${candidate.name}`,
          progressPercent: 30 + Math.round(((index + 1) / Math.max(candidates.length, 1)) * 28)
        });
        continue;
      }
      const relatedDigests = materialDigests.filter(
        (digest) => digest.competitorName === candidate.name
      );
      const blocks = relatedDigests.flatMap((digest) => digest.blocks);
      const batches = groupBlocksForUnderstanding(blocks);
      const competitorCards: UploadedMaterialInsightCard[] = [];

      for (const batch of batches) {
        const json = await provider.generateText(config, {
          systemPrompt: materialChunkExtractionSystemPrompt,
          userPrompt: JSON.stringify({
            competitorName: candidate.name,
            parseResult,
            blocks: batch.map((block) => ({
              blockId: block.id,
              fileName: block.fileName,
              title: block.title,
              blockType: block.blockType,
              text: block.text
            }))
          }),
          responseFormat: "json"
        });
        competitorCards.push(
          sanitizeInsightCard(
            candidate.name,
            parseMaterialInsightCardOutput(json)
          )
        );
      }

      const mergedProfileJson = await provider.generateText(config, {
        systemPrompt: materialProfileMergeSystemPrompt,
        userPrompt: JSON.stringify({
          competitorName: candidate.name,
          parseResult,
          materialSummaries: relatedDigests.map((digest) => ({
            fileName: digest.fileName,
            summary: digest.summary
          })),
          cards: competitorCards
        }),
        responseFormat: "json"
      });

      profiles.push(sanitizeCompetitorProfile(candidate.name, parseCompetitorProfileOutput(mergedProfileJson)));
      insightCards.push(...competitorCards);
      onItemComplete?.({ profiles, insightCards });
      onProgress?.({
        step: `理解上传材料 ${index + 1}/${Math.max(candidates.length, 1)}：${candidate.name}`,
        progressPercent: 30 + Math.round(((index + 1) / Math.max(candidates.length, 1)) * 28)
      });
      await wait(250);
    }

    return { profiles, insightCards };
  }

  buildSourcesFromMaterialDigests(materialDigests: UploadedMaterialDigest[]): SearchDocument[] {
    return materialDigests.flatMap((digest) =>
      digest.blocks.map((block) => ({
        id: block.id,
        url: `upload://${digest.materialId}/${encodeURIComponent(block.id)}`,
        title: `${digest.competitorName} / ${block.fileName} / ${block.title}`,
        snippet: truncateText(block.text, 220),
        sourceType: "public_report" as const,
        crawledAt: digest.extractedAt,
        credibilityScore: 0.92,
        language: "zh-CN" as const,
        content: block.text
      }))
    );
  }

  buildCharts(
    parseResult: RequirementParseResult,
    competitors: CompetitorProfile[],
    chartSources: SearchDocument[]
  ): ChartSpec[] {
    const mentionScores = competitors.map((item) => countMentions(chartSources, item.name));
    const topCompetitors = competitors.slice(0, 4);
    return [
      {
        id: "feature-coverage-bar",
        title: "核心功能覆盖度对比",
        type: "bar",
        labels: competitors.map((item) => item.name),
        series: [
          {
            name: "功能数量",
            data: competitors.map((item) => item.coreFeatures.length)
          }
        ],
        sourceRefs: collectChartSourceRefs(chartSources, competitors),
        inferenceNotes: [
          `基于 ${parseResult.track} 赛道图表专用检索结果与结构化功能抽取综合统计`,
          "同一任务中的图表数据检索沿用当前设置的检索模式"
        ],
        theme: "business_blue",
        placeholderKey: "charts.feature_matrix"
      },
      {
        id: "market-attention-pie",
        title: "竞品市场关注度占比",
        type: "pie",
        labels: competitors.map((item) => item.name),
        series: [
          {
            name: "关注度",
            data: mentionScores.map((score) => Math.max(score, 1))
          }
        ],
        sourceRefs: collectChartSourceRefs(chartSources, competitors),
        inferenceNotes: [
          "按图表专用检索中各竞品公开提及次数进行归一化估算"
        ],
        theme: "research_green",
        placeholderKey: "charts.market_attention"
      },
      {
        id: "channel-coverage-bar",
        title: "渠道策略覆盖度对比",
        type: "bar",
        labels: competitors.map((item) => item.name),
        series: [
          {
            name: "渠道策略数量",
            data: competitors.map((item, index) => item.channelStrategy.length + mentionScores[index])
          }
        ],
        sourceRefs: collectChartSourceRefs(chartSources, competitors),
        inferenceNotes: [
          "基于图表专用检索中的渠道/市场动作信息和结构化渠道字段综合估算"
        ],
        theme: "business_blue",
        placeholderKey: "charts.channel_matrix"
      },
      {
        id: "business-model-bar",
        title: "商业模式复杂度对比",
        type: "bar",
        labels: competitors.map((item) => item.name),
        series: [
          {
            name: "商业模式项数",
            data: competitors.map((item, index) =>
        item.businessModel.length + Math.min(mentionScores[index], 3)
            )
          }
        ],
        sourceRefs: collectChartSourceRefs(chartSources, competitors),
        inferenceNotes: [
          "按公开披露的收入模式、定价模式与相关检索信号归并统计"
        ],
        theme: "business_blue",
        placeholderKey: "charts.business_model"
      },
      {
        id: "capability-trend-line",
        title: "核心能力维度折线对比",
        type: "line",
        labels: ["功能广度", "商业复杂度", "渠道动作", "差异化亮点"],
        series: topCompetitors.map((item, index) => ({
          name: item.name,
          data: [
            item.coreFeatures.length,
            item.businessModel.length + Math.min(mentionScores[index] ?? 0, 2),
            item.channelStrategy.length,
            item.differentiators.length
          ]
        })),
        sourceRefs: collectChartSourceRefs(chartSources, competitors),
        inferenceNotes: [
          "用于横向观察竞品在四个核心维度上的相对形态差异"
        ],
        theme: "warm_gray",
        placeholderKey: "charts.capability_trend"
      },
      {
        id: "pricing-comparison-table",
        title: "定价与商业模式对比表",
        type: "comparison_table",
        labels: ["竞品", "代表定价", "商业模式"],
        series: competitors.map((item) => ({
          name: item.name,
          data: [
            item.name,
            item.pricing[0]?.price ?? "待核实",
            item.businessModel.slice(0, 2).join(" / ") || "待核实"
          ]
        })),
        sourceRefs: collectChartSourceRefs(chartSources, competitors),
        inferenceNotes: [
          "对公开披露的定价与商业模式信息进行压缩展示"
        ],
        theme: "warm_gray",
        placeholderKey: "charts.pricing_table"
      }
    ];
  }

  async completeChartSpecsWithKnowledge(
    parseResult: RequirementParseResult,
    competitors: CompetitorProfile[],
    specs: ChartSpec[],
    chartSources: SearchDocument[],
    modelId: string
  ) {
    const config = this.getModelConfig(modelId);
    const json = await this.deps.providerResolver(modelId).generateText(config, {
      systemPrompt: chartKnowledgeCompletionSystemPrompt,
      userPrompt: JSON.stringify({
        parseResult,
        competitors: competitors.map((item) => ({
          name: item.name,
          positioning: item.positioning,
          coreFeatures: item.coreFeatures,
          businessModel: item.businessModel,
          channelStrategy: item.channelStrategy,
          differentiators: item.differentiators
        })),
        chartSources: chartSources.slice(0, 12).map((source) => ({
          title: source.title,
          snippet: source.snippet,
          url: source.url
        })),
        specs
      }),
      responseFormat: "json"
    });

    const parsed = parseChartKnowledgeCompletionOutput(json);
    return specs.map((spec) => {
      const matched = parsed.items.find((item) => item.id === spec.id);
      if (!matched) {
        return spec;
      }
      return {
        ...spec,
        series: matched.series?.length ? matched.series : spec.series,
        inferenceNotes: [
          ...(spec.inferenceNotes ?? []),
          ...(matched.inferenceNotes ?? []),
          "部分图表数据在检索不足时由模型知识进行保守补全"
        ]
      };
    });
  }

  buildCandidateQueries(parseResult: RequirementParseResult, candidateName: string) {
    const base = `${parseResult.region}${parseResult.track}`;
    return [
      {
        keyword: `${candidateName} ${base} 产品介绍`,
        timeRange: parseResult.timeRange
      },
      {
        keyword: `${candidateName} ${base} 商业模式 功能`,
        timeRange: parseResult.timeRange
      }
    ];
  }

  async renderCharts(
    specs: ChartSpec[],
    outputDir: string,
    onProgress?: (event: ProgressEvent) => void,
    existingAssets: GeneratedChartAsset[] = [],
    onItemComplete?: (assets: GeneratedChartAsset[]) => void
  ): Promise<GeneratedChartAsset[]> {
    const assets: GeneratedChartAsset[] = [...existingAssets];

    for (const [index, spec] of specs.entries()) {
      if (assets.some((asset) => asset.id === spec.id)) {
        onProgress?.({
          step: `生成图表 ${index + 1}/${Math.max(specs.length, 1)}：${spec.title}`,
          progressPercent: 58 + Math.round(((index + 1) / Math.max(specs.length, 1)) * 14)
        });
        continue;
      }
      const asset = await this.deps.chartRenderer.render(spec, outputDir);
      assets.push(asset);
      onItemComplete?.(assets);
      onProgress?.({
        step: `生成图表 ${index + 1}/${Math.max(specs.length, 1)}：${spec.title}`,
        progressPercent: 58 + Math.round(((index + 1) / Math.max(specs.length, 1)) * 14)
      });
    }

    return assets;
  }

  async writeReport(
    parseResult: RequirementParseResult,
    competitors: CompetitorProfile[],
    sources: SearchDocument[],
    charts: ChartSpec[],
    templateSections: ReportSectionTemplate[],
    modelId: string,
    onProgress?: (event: ProgressEvent) => void,
    existingDraft?: ReportDraft,
    onItemComplete?: (draft: ReportDraft) => void
  ): Promise<ReportDraft> {
    const config = this.getModelConfig(modelId);
    const summary =
      existingDraft
        ? {
            title: existingDraft.title,
            executiveSummary: existingDraft.executiveSummary
          }
        : parseSummaryOutput(
            await this.deps.providerResolver(modelId).generateText(config, {
              systemPrompt: reportSummarySystemPrompt,
              userPrompt: JSON.stringify({ parseResult, competitors, charts, sourceCount: sources.length }),
              responseFormat: "json"
            }),
            parseResult
          );
    const sectionPlan = buildSectionPlan(parseResult, charts, templateSections);
    const sections: ReportSectionDraft[] = [...(existingDraft?.sections ?? [])];

    for (const [index, spec] of sectionPlan.entries()) {
      if (sections[index]?.sectionId === spec.sectionId) {
        onProgress?.({
          step: `撰写章节 ${index + 1}/${Math.max(sectionPlan.length, 1)}：${spec.title}`,
          progressPercent: 72 + Math.round(((index + 1) / Math.max(sectionPlan.length, 1)) * 20)
        });
        continue;
      }
      const sectionJson = await this.deps.providerResolver(modelId).generateText(config, {
        systemPrompt: reportWritingSystemPrompt,
        userPrompt: JSON.stringify({
          mode: "section_write",
          sectionSpec: spec,
          parseResult,
          competitors,
          charts,
          sourceCount: sources.length,
          minimumBodyLength: 500,
          evidenceSnippets: buildSectionEvidence(spec.sectionId, competitors, sources).slice(0, 16),
          allowKnowledgeFallback: true,
          fallbackRule:
            "当检索证据不足时，可以用模型已有行业知识补全，但要明确写成推断、行业通行判断或经验性归纳，不能伪装成已检索事实。"
        }),
        responseFormat: "json"
      });
      const parsedSection = attachSectionCharts(
        sanitizeSectionDraft(
          spec,
          parseSectionOutput(sectionJson, spec)
        ),
        charts
      );
      const completedSection = ensureMinimumSectionLength(parsedSection, spec, competitors, sources);
      const reviewedSectionJson = await this.deps.providerResolver(modelId).generateText(config, {
        systemPrompt: reportSectionReviewSystemPrompt,
        userPrompt: JSON.stringify({
          mode: "section_review",
          sectionSpec: spec,
          parseResult,
          sectionDraft: completedSection,
          competitors,
          charts,
          minimumBodyLength: 500,
          evidenceSnippets: buildSectionEvidence(spec.sectionId, competitors, sources).slice(0, 16)
        }),
        responseFormat: "json"
      });
      const reviewedSection = attachSectionCharts(
        sanitizeSectionDraft(
          spec,
          parseSectionOutput(reviewedSectionJson, spec)
        ),
        charts
      );
      const finalSection = ensureMinimumSectionLength(reviewedSection, spec, competitors, sources);
      sections.push(finalSection);
      onItemComplete?.({
        id: existingDraft?.id ?? `draft-${Date.now()}`,
        title: summary.title ?? `${parseResult.region}${parseResult.track}竞品分析报告`,
        executiveSummary:
          summary.executiveSummary ??
          `本报告围绕 ${parseResult.track} 赛道进行分析，基于公开信息整理重点竞品的功能、商业模式和机会点。`,
        sections,
        appendixSources: sources.slice(0, 40).map((source) => ({
          id: source.id,
          title: source.title,
          url: source.url,
          sourceType: source.sourceType,
          crawledAt: source.crawledAt,
          excerpt: source.snippet
        }))
      });
      onProgress?.({
        step: `撰写章节 ${index + 1}/${Math.max(sectionPlan.length, 1)}：${spec.title}`,
        progressPercent: 72 + Math.round(((index + 1) / Math.max(sectionPlan.length, 1)) * 20)
      });
    }

    return {
      id: `draft-${Date.now()}`,
      title: summary.title ?? `${parseResult.region}${parseResult.track}竞品分析报告`,
      executiveSummary:
        summary.executiveSummary ??
        `本报告围绕 ${parseResult.track} 赛道进行分析，基于公开信息整理重点竞品的功能、商业模式和机会点。`,
      sections,
      appendixSources: sources.slice(0, 40).map((source) => ({
        id: source.id,
        title: source.title,
        url: source.url,
        sourceType: source.sourceType,
        crawledAt: source.crawledAt,
        excerpt: source.snippet
      }))
    };
  }

  private getModelConfig(modelId: string) {
    const config = this.deps.modelConfigs[modelId];
    if (!config) {
      throw new Error(`未找到模型配置: ${modelId}`);
    }
    return config;
  }
}

const attachSectionCharts = (section: ReportSectionDraft, charts: ChartSpec[]): ReportSectionDraft => {
  if (section.chartIds?.length) {
    return section;
  }

  if (section.sectionId === "feature_comparison") {
    return { ...section, chartIds: charts.map((chart) => chart.id) };
  }

  return section;
};

const buildSectionEvidence = (
  sectionId: string,
  competitors: CompetitorProfile[],
  sources: SearchDocument[]
) => {
  const keywords = buildSectionEvidenceKeywords(sectionId, competitors);
  return sources
    .filter((source) =>
      keywords.some((keyword) =>
        `${safeText(source.title)} ${safeText(source.snippet)} ${safeText(source.content)}`.includes(keyword)
      )
    )
    .slice(0, 20)
    .map((source) => ({
      title: source.title,
      url: source.url,
      snippet: source.snippet,
      contentExcerpt: truncateText(safeText(source.content) || safeText(source.snippet), 220)
    }));
};

const buildSectionEvidenceKeywords = (sectionId: string, competitors: CompetitorProfile[]) => {
  const competitorNames = competitors.map((item) => item.name);
  if (sectionId === "pricing_business") {
    return [...competitorNames, "价格", "定价", "收费", "商业模式", "订阅"];
  }
  if (sectionId === "channel_strategy") {
    return [...competitorNames, "渠道", "增长", "合作", "市场", "生态"];
  }
  if (sectionId === "strength_weakness") {
    return [...competitorNames, "优势", "短板", "差异化", "能力"];
  }
  return [...competitorNames, "功能", "产品", "用户", "定位"];
};

const ensureMinimumSectionLength = (
  section: ReportSectionDraft,
  spec: {
    sectionId: string;
    title: string;
    summaryHint: string;
    chartIds?: string[];
  },
  competitors: CompetitorProfile[],
  sources: SearchDocument[]
): ReportSectionDraft => {
  const body = normalizeSectionBody(section.bodyMarkdown, spec.summaryHint, spec.title);
  if (measureBodyLength(body) >= 500) {
    return {
      ...section,
      bodyMarkdown: enforcePlainParagraphBody(body)
    };
  }

  const synthesized = synthesizeSectionBody(spec, competitors, sources, body);
  if (measureBodyLength(synthesized) >= 500) {
    return {
      ...section,
      bodyMarkdown: enforcePlainParagraphBody(synthesized)
    };
  }

  return {
    ...section,
    bodyMarkdown: enforcePlainParagraphBody(synthesized)
  };
};

const measureBodyLength = (value: string) =>
  value.replace(/\s+/g, "").length;

const normalizeSectionBody = (body: string, summaryHint: string, sectionTitle: string) => {
  const trimmed = body.trim();
  if (!trimmed) {
    return "";
  }
  const lines = trimmed
    .split(/\n+/)
    .map((line) => cleanupListLikeLine(line.trim()))
    .filter(Boolean);
  const dedupedLines = lines.filter((line, index) => {
    if (index === 0) {
      return line !== summaryHint.trim() && line !== sectionTitle.trim();
    }
    return (
      line !== lines[index - 1] &&
      line !== summaryHint.trim() &&
      line !== sectionTitle.trim()
    );
  });
  return dedupedLines.join("\n\n");
};

const synthesizeSectionBody = (
  spec: {
    sectionId: string;
    title: string;
    summaryHint: string;
    chartIds?: string[];
  },
  competitors: CompetitorProfile[],
  sources: SearchDocument[],
  existingBody: string
) => {
  const evidence = buildSectionEvidence(spec.sectionId, competitors, sources).slice(0, 6);
  const competitorParagraph = summarizeCompetitorsForSection(spec.sectionId, competitors);
  const evidenceParagraph = summarizeEvidenceForSection(spec.sectionId, evidence);
  const inferenceParagraph = buildInferenceParagraph(spec.sectionId, competitors, evidence);

  return [
    existingBody || `${spec.summaryHint} 从当前竞品格局来看，这一章节需要同时交代市场现状、主要玩家差异和下一步判断。`,
    competitorParagraph,
    evidenceParagraph,
    inferenceParagraph
  ]
    .filter(Boolean)
    .join("\n\n");
};

const enforcePlainParagraphBody = (body: string) => {
  const cleaned = body
    .replace(/^#+\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .split(/\n+/)
    .map((line) => cleanupListLikeLine(line.trim()))
    .filter(Boolean)
    .join("\n");

  const rawParagraphs = cleaned
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n+/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const mergedParagraphs = mergeParagraphs(rawParagraphs, 4);
  return mergedParagraphs.join("\n\n");
};

const cleanupListLikeLine = (line: string) =>
  line
    .replace(/^[-*•]\s+/g, "")
    .replace(/^\d+[.)、]\s+/g, "")
    .replace(/^第[一二三四五六七八九十百]+[章节部分点]\s*/g, "")
    .replace(/^[（(]?[一二三四五六七八九十]+[）)]\s*/g, "")
    .trim();

const mergeParagraphs = (paragraphs: string[], maxParagraphs: number) => {
  if (paragraphs.length <= maxParagraphs && paragraphs.length >= 2) {
    return paragraphs;
  }

  const normalized = paragraphs.length > 0 ? paragraphs : [""];
  const targetParagraphs = Math.max(2, Math.min(maxParagraphs, normalized.length || 2));
  const bucketSize = Math.ceil(normalized.length / targetParagraphs);
  const buckets: string[] = [];

  for (let index = 0; index < normalized.length; index += bucketSize) {
    buckets.push(normalized.slice(index, index + bucketSize).join(" "));
  }

  return buckets.slice(0, maxParagraphs).filter(Boolean);
};

const summarizeCompetitorsForSection = (
  sectionId: string,
  competitors: CompetitorProfile[]
) => {
  const items = competitors.slice(0, 4);
  if (items.length === 0) {
    return "";
  }

  return items
    .map((item) => {
      const featureText =
        item.coreFeatures.length > 0
          ? `核心功能主要包括 ${item.coreFeatures.slice(0, 4).join("、")}`
          : "公开材料显示其仍以基础平台能力为主";
      const businessText =
        item.businessModel.length > 0
          ? `商业模式更偏向 ${item.businessModel.slice(0, 3).join("、")}`
          : "商业化路径仍需结合行业惯例进一步判断";
      const channelText =
        sectionId === "channel_strategy" && item.channelStrategy.length > 0
          ? `，渠道侧重点在 ${item.channelStrategy.slice(0, 3).join("、")}`
          : "";
      return `${item.name} 当前更像是${item.positioning}。${featureText}，${businessText}${channelText}。`;
    })
    .join("\n\n");
};

const summarizeEvidenceForSection = (
  sectionId: string,
  evidence: Array<{
    title: string;
    url: string;
    snippet: string;
    contentExcerpt: string;
  }>
) => {
  if (evidence.length === 0) {
    return "";
  }

  const condensed = evidence
    .map((item) => {
      const cleanTitle = item.title.replace(/\s+/g, " ").trim();
      const cleanExcerpt = truncateText(item.contentExcerpt.replace(/\s+/g, " ").trim(), 90);
      return `${cleanTitle} 提到 ${cleanExcerpt}`;
    })
    .join("；");

  return `从已检索到的公开材料看，围绕“${sectionId}”最直接的外部信号集中在以下几点：${condensed}。这些线索虽然来源类型不完全一致，但足以反映当前市场讨论重点与头部玩家的核心竞争焦点。`;
};

const buildInferenceParagraph = (
  sectionId: string,
  competitors: CompetitorProfile[],
  evidence: Array<{
    title: string;
    url: string;
    snippet: string;
    contentExcerpt: string;
  }>
) => {
  const names = competitors.slice(0, 3).map((item) => item.name).join("、");
  if (sectionId === "industry_background") {
    return `综合现有竞品和公开讨论热度来看，${names || "当前主要玩家"}所处赛道已经不是单纯比拼补贴或单点功能的阶段，而是在比拼履约能力、平台协同效率以及对商家和用户两端的运营掌控力。这一判断部分来自检索证据，部分属于基于行业通行规律的推断，后续仍可结合更新数据继续校准。`;
  }
  if (sectionId === "competitor_list") {
    return `从竞争集合的角度看，当前样本之间并不是完全同质化竞争，而是在平台心智、运力协同、补贴效率和生态联动能力上形成差异。换句话说，竞品名单背后真正需要关注的不是“谁也在做”，而是“谁在同一预算和同一用户决策链路里发生替代关系”。`;
  }
  return `进一步看，这一章节中的比较不应只停留在表面信息罗列，更应落到“谁的模式更容易形成持续优势”。若部分信息点没有被检索材料完整覆盖，上述判断吸收了行业通行做法和平台型业务的一般规律，因此应视作带有推断性质的综合分析。`;
};

const sanitizeSectionDraft = (
  spec: {
    sectionId: string;
    title: string;
    summaryHint: string;
    chartIds?: string[];
  },
  section: Partial<ReportSectionDraft>
): ReportSectionDraft => ({
  sectionId: section.sectionId ?? spec.sectionId,
  title: section.title ?? spec.title,
  summary: section.summary ?? spec.summaryHint,
  bodyMarkdown: typeof section.bodyMarkdown === "string" ? section.bodyMarkdown : "",
  tables: Array.isArray(section.tables) ? section.tables : undefined,
  chartIds: Array.isArray(section.chartIds) ? section.chartIds : spec.chartIds,
  citations: Array.isArray(section.citations) ? section.citations : []
});

const buildSectionPlan = (
  parseResult: RequirementParseResult,
  charts: ChartSpec[],
  templateSections: ReportSectionTemplate[]
) =>
  templateSections
    .filter((section) => section.enabled)
    .sort((left, right) => left.order - right.order)
    .map((section) => {
      const preset = buildSectionPresetMap(parseResult, charts)[section.id];
      return {
        sectionId: section.id,
        title: section.title,
        summaryHint: preset?.summaryHint ?? section.description ?? `围绕 ${section.title} 展开分析。`,
        chartIds: preset?.chartIds
      };
    });

const buildSectionPresetMap = (
  parseResult: RequirementParseResult,
  charts: ChartSpec[]
): Record<string, { summaryHint: string; chartIds?: string[] }> => ({
  industry_background: {
    summaryHint: `说明 ${parseResult.track} 的市场背景、发展阶段与核心驱动因素。`
  },
  market_drivers: {
    summaryHint: `分析 ${parseResult.track} 赛道用户需求与典型痛点。`
  },
  competitor_scope: {
    summaryHint: "说明候选竞品筛选逻辑、分层方法和纳入标准。"
  },
  competitor_list: {
    summaryHint: "概述当前纳入分析的重点竞品名单、分层和筛选理由。"
  },
  competitor_profiles: {
    summaryHint: "逐个整理主要竞品的定位、目标用户和核心能力。"
  },
  feature_comparison: {
    summaryHint: "重点比较功能覆盖、体验路径和差异化能力。",
    chartIds: charts.map((chart) => chart.id)
  },
  pricing_business: {
    summaryHint: "比较主要竞品的收费模式、收入结构和客户变现路径。"
  },
  channel_strategy: {
    summaryHint: "总结竞品的渠道打法、市场投放与增长动作。"
  },
  strength_weakness: {
    summaryHint: "对主要竞品的优劣势进行横向分析。"
  },
  risk_assessment: {
    summaryHint: "分析行业内的竞争风险、同质化风险和执行风险。"
  },
  opportunities: {
    summaryHint: "归纳进入该赛道的机会点和可切入方向。"
  },
  recommendations: {
    summaryHint: "给出面向老板汇报的行动建议与落地路径。"
  }
});

const STOPWORDS = new Set([
  "ai",
  "产品介绍",
  "解决方案",
  "观察",
  "体验",
  "团队",
  "中文",
  "国内",
  "中国",
  "企业版",
  "办公",
  "助手",
  "能力",
  "发布"
]);

const IRRELEVANT_TITLE_PATTERNS = [
  "百度知道",
  "商业模式",
  "定价策略",
  "创业公司的",
  "欧姆龙",
  "血压计",
  "未命名结果",
  "什么意思",
  "怎么办",
  "知乎",
  "百科",
  "原创力文档",
  "百度文库",
  "豆丁",
  "人人都是产品经理",
  "虎嗅",
  "36氪",
  "腾讯新闻",
  "搜狐",
  "新浪",
  "网易",
  "今日头条"
];

const sanitizeCompetitorProfile = (
  fallbackName: string,
  profile: Partial<CompetitorProfile>
): CompetitorProfile => ({
  id: profile.id ?? normalizeCandidateName(fallbackName).toLowerCase(),
  name: profile.name ?? fallbackName,
  company: profile.company ?? `${fallbackName}科技`,
  positioning: profile.positioning ?? `${fallbackName} 是目标赛道中的代表性竞品。`,
  targetUsers: Array.isArray(profile.targetUsers) ? profile.targetUsers : [],
  coreFeatures: Array.isArray(profile.coreFeatures) ? profile.coreFeatures : [],
  pricing: Array.isArray(profile.pricing) ? profile.pricing : [],
  businessModel: Array.isArray(profile.businessModel) ? profile.businessModel : [],
  channelStrategy: Array.isArray(profile.channelStrategy) ? profile.channelStrategy : [],
  marketMoves: Array.isArray(profile.marketMoves) ? profile.marketMoves : [],
  strengths: Array.isArray(profile.strengths) ? profile.strengths : [],
  weaknesses: Array.isArray(profile.weaknesses) ? profile.weaknesses : [],
  differentiators: Array.isArray(profile.differentiators) ? profile.differentiators : [],
  risks: Array.isArray(profile.risks) ? profile.risks : [],
  evidence: Array.isArray(profile.evidence) ? profile.evidence : []
});

const sanitizeInsightCard = (
  competitorName: string,
  card: Partial<UploadedMaterialInsightCard>
): UploadedMaterialInsightCard => ({
  competitorName,
  summary: safeText(card.summary) || `${competitorName} 上传材料内容摘要`,
  positioningSignals: ensureStringArray(card.positioningSignals),
  targetUsersSignals: ensureStringArray(card.targetUsersSignals),
  featureSignals: ensureStringArray(card.featureSignals),
  pricingSignals: ensureStringArray(card.pricingSignals),
  businessModelSignals: ensureStringArray(card.businessModelSignals),
  channelSignals: ensureStringArray(card.channelSignals),
  marketSignals: ensureStringArray(card.marketSignals),
  strengthsSignals: ensureStringArray(card.strengthsSignals),
  weaknessesSignals: ensureStringArray(card.weaknessesSignals),
  differentiatorsSignals: ensureStringArray(card.differentiatorsSignals),
  risksSignals: ensureStringArray(card.risksSignals),
  evidence: Array.isArray(card.evidence)
    ? card.evidence
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
          blockIds: Array.isArray(item.blockIds)
            ? item.blockIds.filter((blockId): blockId is string => typeof blockId === "string")
            : [],
          excerpt: safeText(item.excerpt),
          sourceTitle: safeText(item.sourceTitle)
        }))
    : []
});

const ensureStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const groupBlocksForUnderstanding = (blocks: UploadedMaterialDigest["blocks"]) => {
  const batches: UploadedMaterialDigest["blocks"][] = [];
  let current: UploadedMaterialDigest["blocks"] = [];
  let currentChars = 0;

  for (const block of blocks) {
    const nextChars = currentChars + block.text.length;
    if (current.length > 0 && nextChars > 3200) {
      batches.push(current);
      current = [];
      currentChars = 0;
    }
    current.push(block);
    currentChars += block.text.length;
  }

  if (current.length > 0) {
    batches.push(current);
  }

  return batches;
};

const truncateText = (value: string, maxChars: number) =>
  value.length <= maxChars ? value : `${value.slice(0, Math.max(0, maxChars - 1))}…`;

const extractCandidateNamesFromSource = (
  source: SearchDocument,
  parseResult: RequirementParseResult
) => {
  const title = safeText(source.title);
  const snippet = safeText(source.snippet);
  const url = safeText(source.url);
  const text = `${title} ${snippet}`;

  if (IRRELEVANT_TITLE_PATTERNS.some((pattern) => text.includes(pattern))) {
    return [];
  }

  const primarySegment = title
    .split(/[-|｜丨_:：]/)
    .map((segment) => normalizeCandidateName(segment))
    .find((segment) => isValidCandidateName(segment, parseResult.track, url));

  return primarySegment ? [primarySegment] : [];
};

const isValidCandidateName = (value: string | undefined, track: string, url: string) => {
  if (!value) {
    return false;
  }
  const normalized = value.trim();
  if (!normalized || normalized.length <= 1 || normalized.length > 16) {
    return false;
  }
  if (normalized.includes(track) || normalized.includes("竞品")) {
    return false;
  }
  if (STOPWORDS.has(normalized.toLowerCase())) {
    return false;
  }
  if (IRRELEVANT_TITLE_PATTERNS.some((pattern) => normalized.includes(pattern))) {
    return false;
  }
  if (
    url.includes("zhidao.baidu.com") ||
    url.includes("baike.baidu.com") ||
    url.includes("taobao.com") ||
    url.includes("jd.com")
  ) {
    return false;
  }
  return true;
};

const isLikelyRealCompetitorCandidate = (
  name: string,
  sources: SearchDocument[],
  track: string
) => {
  const normalizedName = safeText(name).trim();
  if (!normalizedName) {
    return false;
  }

  if (IRRELEVANT_TITLE_PATTERNS.some((pattern) => normalizedName.includes(pattern))) {
    return false;
  }

  const evidenceSources = sources.filter(
    (source) =>
      safeText(source.title).includes(normalizedName) ||
      safeText(source.snippet).includes(normalizedName)
  );

  if (evidenceSources.length === 0) {
    return false;
  }

  const allEvidenceText = evidenceSources
    .map((source) => `${safeText(source.title)} ${safeText(source.snippet)} ${safeText(source.url)}`)
    .join(" ");

  if (SOURCE_PLATFORM_PATTERNS.some((pattern) => allEvidenceText.includes(pattern))) {
    return false;
  }

  const trackTokens = tokenizeTrack(track);
  if (
    trackTokens.length > 0 &&
    !trackTokens.some((token) => allEvidenceText.includes(token)) &&
    evidenceSources.every((source) => source.sourceType === "review")
  ) {
    return false;
  }

  return true;
};

const normalizeCandidateName = (value: string) =>
  safeText(value)
    .replace(
      /产品介绍|解决方案观察|解决方案|新能力|中文团队使用体验|团队使用体验|企业版|低代码方案|能力盘点|业务模式介绍|运营观察|全渠道能力/g,
      ""
    )
    .replace(/发布低代码|发布$/g, "")
    .replace(/\s+/g, "")
    .trim();

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const countMentions = (sources: SearchDocument[], name: string) => {
  const normalizedName = safeText(name).replace(/\s+/g, "");
  if (!normalizedName) {
    return 0;
  }
  return sources.reduce((count, source) => {
    const text = `${safeText(source.title)} ${safeText(source.snippet)}`.replace(/\s+/g, "");
    return text.includes(normalizedName) ? count + 1 : count;
  }, 0);
};

const collectChartSourceRefs = (chartSources: SearchDocument[], competitors: CompetitorProfile[]) => {
  const competitorNames = competitors.map((item) => item.name);
  return chartSources
    .filter((source) =>
      competitorNames.some((name) =>
        `${safeText(source.title)} ${safeText(source.snippet)}`.includes(name)
      )
    )
    .map((source) => source.id);
};

const shouldAutoFillCharts = (chartSources: SearchDocument[], specs: ChartSpec[]) => {
  if (chartSources.length < 3) {
    return true;
  }

  return specs.some((spec) =>
    spec.series.some((series) =>
      series.data.every((value) => typeof value === "number" && Number(value) <= 1)
    )
  );
};

const dedupeSourcesByUrl = (sources: SearchDocument[]) => {
  const seen = new Map<string, SearchDocument>();
  for (const source of sources) {
    if (!source.url) {
      continue;
    }
    if (!seen.has(source.url)) {
      seen.set(source.url, source);
    }
  }
  return Array.from(seen.values());
};

const safeText = (value: unknown) => (typeof value === "string" ? value : "");

const sanitizeRequirementParseResult = (
  parsed: Partial<RequirementParseResult>,
  rawPrompt: string
): RequirementParseResult => {
  const inferredTrack = safeText(parsed.track) || inferTrackFromPrompt(rawPrompt) || "待识别赛道";
  return {
    industry: safeText(parsed.industry) || "待识别行业",
    track: inferredTrack,
    competitorType: parsed.competitorType ?? "product_competitor",
    targetAudience: safeText(parsed.targetAudience) || "待补充",
    region: safeText(parsed.region) || "中国",
    timeRange: safeText(parsed.timeRange) || "近 12 个月",
    focusDimensions:
      Array.isArray(parsed.focusDimensions) && parsed.focusDimensions.length > 0
        ? parsed.focusDimensions
        : ["产品定位", "核心功能", "商业模式"],
    reportPurpose: safeText(parsed.reportPurpose) || "内部分析",
    tone: safeText(parsed.tone) || "中性、结构化",
    inferredOutputStyle: parsed.inferredOutputStyle ?? "executive",
    analysisDepth: parsed.analysisDepth ?? "standard",
    userProvidedCompetitors: Array.isArray(parsed.userProvidedCompetitors)
      ? parsed.userProvidedCompetitors
      : []
  };
};

const inferTrackFromPrompt = (prompt: string) => {
  const normalized = safeText(prompt).replace(/\s+/g, "");
  const matchers = [
    /帮我分析(.{2,24}?)(?:赛道|行业|竞品|市场)/,
    /分析(.{2,24}?)(?:赛道|行业|竞品|市场)/,
    /做一份面向老板汇报的(.{2,24}?)(?:竞品分析|分析报告)/,
    /做一份(.{2,24}?)(?:竞品分析|分析报告)/,
    /面向(.{2,24}?)(?:的竞品|竞品)/
  ];

  for (const matcher of matchers) {
    const matched = normalized.match(matcher)?.[1]?.trim();
    if (matched && !matched.includes("老板") && !matched.includes("汇报")) {
      return matched;
    }
  }

  return "";
};

const tokenizeTrack = (track: string) =>
  safeText(track)
    .split(/[\s、，,\/]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

const SOURCE_PLATFORM_PATTERNS = [
  "百度文库",
  "原创力文档",
  "人人都是产品经理",
  "知乎",
  "知乎专栏",
  "百度知道",
  "搜狐",
  "网易",
  "新浪",
  "豆丁",
  "腾讯新闻",
  "凤凰网",
  "虎嗅",
  "36氪",
  "小红书",
  "微博",
  "中国商品信息服务平台"
];

const parseCandidateValidationOutput = (
  raw: string
): { items: Array<{ name: string; accepted: boolean; reason: string }> } => {
  try {
    const parsed = parseJsonWithRepair<{
      items?: Array<{ name?: string; accepted?: boolean; reason?: string }>;
    }>(raw);
    return {
      items: (parsed.items ?? [])
        .filter((item) => typeof item?.name === "string")
        .map((item) => ({
          name: item.name ?? "",
          accepted: Boolean(item.accepted),
          reason: item.reason ?? ""
        }))
    };
  } catch {
    return { items: [] };
  }
};

const parseRequirementOutput = (raw: string) => {
  try {
    return parseJsonWithRepair<Partial<RequirementParseResult>>(raw);
  } catch {
    return {};
  }
};

const parseCompetitorProfileOutput = (raw: string) => {
  try {
    return parseJsonWithRepair<Partial<CompetitorProfile>>(raw);
  } catch {
    return {};
  }
};

const parseMaterialInsightCardOutput = (raw: string) => {
  try {
    return parseJsonWithRepair<Partial<UploadedMaterialInsightCard>>(raw);
  } catch {
    return {};
  }
};

const parseSummaryOutput = (
  raw: string,
  parseResult: RequirementParseResult
): { title?: string; executiveSummary?: string } => {
  try {
    return parseJsonWithRepair<{
      title?: string;
      executiveSummary?: string;
    }>(raw);
  } catch {
    const lines = raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const firstLine = lines[0]?.replace(/^#+\s*/, "");
    return {
      title: firstLine || `${parseResult.region}${parseResult.track}竞品分析报告`,
      executiveSummary: lines.slice(1).join("\n") || raw.trim()
    };
  }
};

const parseSectionOutput = (
  raw: string,
  spec: {
    sectionId: string;
    title: string;
    summaryHint: string;
    chartIds?: string[];
  }
): Partial<ReportSectionDraft> => {
  try {
    return parseJsonWithRepair<Partial<ReportSectionDraft>>(raw);
  } catch {
    return {
      sectionId: spec.sectionId,
      title: spec.title,
      summary: spec.summaryHint,
      bodyMarkdown: raw.trim(),
      chartIds: spec.chartIds,
      citations: []
    };
  }
};

const parseChartKnowledgeCompletionOutput = (
  raw: string
): {
  items: Array<{
    id: string;
    series?: ChartSpec["series"];
    inferenceNotes?: string[];
  }>;
} => {
  try {
    const parsed = parseJsonWithRepair<{
      items?: Array<{
        id?: string;
        series?: ChartSpec["series"];
        inferenceNotes?: string[];
      }>;
    }>(raw);
    return {
      items: (parsed.items ?? [])
        .filter((item) => typeof item?.id === "string")
        .map((item) => ({
          id: item.id ?? "",
          series: Array.isArray(item.series) ? item.series : undefined,
          inferenceNotes: Array.isArray(item.inferenceNotes)
            ? item.inferenceNotes.filter((note): note is string => typeof note === "string")
            : undefined
        }))
    };
  } catch {
    return { items: [] };
  }
};
