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
  RequirementParseResult,
  SearchDocument,
  SearchQuery
} from "@studio/shared";
import type { ChartRenderer } from "@studio/charting";
import type { WordTemplateEngine } from "@studio/docx-engine";
import type { LlmProvider } from "@studio/providers";
import { RetrievalPipeline } from "@studio/retrieval";
import {
  extractionSystemPrompt,
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
    templateId: string;
    templatePath: string;
    reportOutputDir: string;
    chartOutputDir: string;
    routing: ModelRoutingConfig;
    onProgress?: (event: ProgressEvent) => void;
  }) {
    const parseResult =
      input.existingParseResult ??
      (await this.parseRequirement(input.requirement, input.routing.plannerModelId));
    input.onProgress?.({ step: "需求解析完成", progressPercent: 10 });
    const queries = this.buildQueries(parseResult);
    const sources = await this.collectSources(queries);
    input.onProgress?.({ step: "检索完成", progressPercent: 22 });
    const candidates = this.discoverCompetitors(parseResult, sources, input.requirement.limit ?? 5);
    input.onProgress?.({ step: "候选竞品发现完成", progressPercent: 30 });
    const competitorProfiles = await this.extractCompetitors(
      candidates,
      sources,
      input.routing.extractorModelId,
      input.onProgress
    );
    input.onProgress?.({ step: "结构化抽取完成", progressPercent: 58 });
    const chartQueries = this.buildChartQueries(parseResult, competitorProfiles);
    const chartSources = await this.collectSources(chartQueries);
    input.onProgress?.({ step: "图表数据检索完成", progressPercent: 66 });
    const chartSpecs = this.buildCharts(parseResult, competitorProfiles, chartSources);
    const chartAssets = await this.renderCharts(chartSpecs, input.chartOutputDir, input.onProgress);
    input.onProgress?.({ step: "图表生成完成", progressPercent: 74 });
    const reportDraft = await this.writeReport(
      parseResult,
      competitorProfiles,
      sources,
      chartSpecs,
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
      requirement: parseResult,
      queries,
      sources,
      chartQueries,
      chartSources,
      competitors: competitorProfiles,
      charts: chartSpecs,
      generatedAt: new Date().toISOString()
    };

    input.onProgress?.({ step: "Word 导出完成", progressPercent: 100 });

    return { parseResult, candidates, competitorProfiles, chartSpecs, chartAssets, reportDraft, artifact, snapshot };
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

  async extractCompetitors(
    candidates: CompetitorCandidate[],
    sources: SearchDocument[],
    modelId: string,
    onProgress?: (event: ProgressEvent) => void
  ): Promise<CompetitorProfile[]> {
    const config = this.getModelConfig(modelId);
    const profiles: CompetitorProfile[] = [];

    for (const [index, candidate] of candidates.entries()) {
      const relevantSources = sources
        .filter((source) => source.title.includes(candidate.name) || source.snippet.includes(candidate.name))
        .slice(0, 8);
      const prompt = JSON.stringify({
        candidate,
        sources: relevantSources.map((source) => ({
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
      profiles.push(
        sanitizeCompetitorProfile(
          candidate.name,
          parseCompetitorProfileOutput(json)
        )
      );
      onProgress?.({
        step: `抽取竞品画像 ${index + 1}/${Math.max(candidates.length, 1)}：${candidate.name}`,
        progressPercent: 30 + Math.round(((index + 1) / Math.max(candidates.length, 1)) * 28)
      });
      await wait(350);
    }

    return profiles;
  }

  buildCharts(
    parseResult: RequirementParseResult,
    competitors: CompetitorProfile[],
    chartSources: SearchDocument[]
  ): ChartSpec[] {
    const mentionScores = competitors.map((item) => countMentions(chartSources, item.name));
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
      }
    ];
  }

  async renderCharts(
    specs: ChartSpec[],
    outputDir: string,
    onProgress?: (event: ProgressEvent) => void
  ): Promise<GeneratedChartAsset[]> {
    const assets: GeneratedChartAsset[] = [];

    for (const [index, spec] of specs.entries()) {
      const asset = await this.deps.chartRenderer.render(spec, outputDir);
      assets.push(asset);
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
    modelId: string,
    onProgress?: (event: ProgressEvent) => void
  ): Promise<ReportDraft> {
    const config = this.getModelConfig(modelId);
    const summaryJson = await this.deps.providerResolver(modelId).generateText(config, {
      systemPrompt: reportSummarySystemPrompt,
      userPrompt: JSON.stringify({ parseResult, competitors, charts, sourceCount: sources.length }),
      responseFormat: "json"
    });
    const summary = parseSummaryOutput(summaryJson, parseResult);
    const sectionPlan = buildSectionPlan(parseResult, charts);
    const sections: ReportSectionDraft[] = [];

    for (const [index, spec] of sectionPlan.entries()) {
      const sectionJson = await this.deps.providerResolver(modelId).generateText(config, {
        systemPrompt: reportWritingSystemPrompt,
        userPrompt: JSON.stringify({
          mode: "section_write",
          sectionSpec: spec,
          parseResult,
          competitors,
          charts,
          sourceCount: sources.length
        }),
        responseFormat: "json"
      });
      sections.push(
        attachSectionCharts(
          sanitizeSectionDraft(
            spec,
            parseSectionOutput(sectionJson, spec)
          ),
          charts
        )
      );
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

const buildSectionPlan = (parseResult: RequirementParseResult, charts: ChartSpec[]) => [
  {
    sectionId: "industry_background",
    title: "第一章 行业背景与赛道判断",
    summaryHint: `说明 ${parseResult.track} 的市场背景、发展阶段与核心驱动因素。`
  },
  {
    sectionId: "market_drivers",
    title: "第二章 需求驱动与用户痛点",
    summaryHint: `分析 ${parseResult.track} 赛道用户需求与典型痛点。`
  },
  {
    sectionId: "competitor_scope",
    title: "第三章 竞品范围与分层说明",
    summaryHint: "说明候选竞品筛选逻辑、分层方法和纳入标准。"
  },
  {
    sectionId: "competitor_profiles",
    title: "第四章 重点竞品画像",
    summaryHint: "逐个整理主要竞品的定位、目标用户和核心能力。"
  },
  {
    sectionId: "feature_comparison",
    title: "第五章 核心功能对比",
    summaryHint: "重点比较功能覆盖、体验路径和差异化能力。",
    chartIds: charts.map((chart) => chart.id)
  },
  {
    sectionId: "pricing_business",
    title: "第六章 商业模式与定价策略",
    summaryHint: "比较主要竞品的收费模式、收入结构和客户变现路径。"
  },
  {
    sectionId: "channel_strategy",
    title: "第七章 渠道策略与市场动作",
    summaryHint: "总结竞品的渠道打法、市场投放与增长动作。"
  },
  {
    sectionId: "strength_weakness",
    title: "第八章 优势、短板与差异化亮点",
    summaryHint: "对主要竞品的优劣势进行横向分析。"
  },
  {
    sectionId: "risk_assessment",
    title: "第九章 风险判断与竞争压力",
    summaryHint: "分析行业内的竞争风险、同质化风险和执行风险。"
  },
  {
    sectionId: "opportunities",
    title: "第十章 市场机会点",
    summaryHint: "归纳进入该赛道的机会点和可切入方向。"
  },
  {
    sectionId: "recommendations",
    title: "第十一章 策略建议",
    summaryHint: "给出面向老板汇报的行动建议与落地路径。"
  }
];

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
  "百科"
];

const TRACK_KNOWN_BRANDS: Array<{
  matchers: string[];
  brands: string[];
}> = [
  {
    matchers: ["求职", "招聘", "找工作", "人才网"],
    brands: ["BOSS直聘", "智联招聘", "前程无忧", "猎聘", "拉勾", "脉脉", "实习僧", "店长直聘", "鱼泡直聘", "51Job"]
  },
  {
    matchers: ["低代码", "零代码"],
    brands: ["明道云", "简道云", "宜搭", "永洪", "氚云"]
  },
  {
    matchers: ["生鲜", "买菜", "即时零售"],
    brands: ["叮咚买菜", "美团买菜", "盒马鲜生", "朴朴超市"]
  },
  {
    matchers: ["ai办公", "办公助手", "知识助手"],
    brands: ["钉钉", "语雀", "Notion", "扣子空间"]
  }
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

  const knownBrands = inferKnownBrands(text, parseResult.track);
  if (knownBrands.length > 0) {
    return knownBrands;
  }

  const primarySegment = title
    .split(/[-|｜丨_:：]/)
    .map((segment) => normalizeCandidateName(segment))
    .find((segment) => isValidCandidateName(segment, parseResult.track, url));

  return primarySegment ? [primarySegment] : [];
};

const inferKnownBrands = (text: string, track: string) => {
  const normalizedText = safeText(text).replace(/\s+/g, "").toLowerCase();
  const normalizedTrack = safeText(track).replace(/\s+/g, "").toLowerCase();

  return TRACK_KNOWN_BRANDS.flatMap((group) => {
    const trackMatched = group.matchers.some((matcher) =>
      normalizedTrack.includes(matcher.replace(/\s+/g, "").toLowerCase())
    );
    if (!trackMatched) {
      return [];
    }
    return group.brands.filter((brand) =>
      normalizedText.includes(brand.replace(/\s+/g, "").toLowerCase())
    );
  });
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
