import { join } from "node:path";
import { getAppConfig } from "@studio/config";
import type {
  EffectiveModelRouting,
  ModelConnectionConfig,
  ModelRoutingConfig
} from "@studio/shared";
import { OpenAiCompatibleProvider, type LlmProvider } from "@studio/providers";
import { ModelStateStore } from "./model-state-store.ts";

export class DemoLlmProvider implements LlmProvider {
  readonly providerName = "demo";

  async healthCheck(_config: ModelConnectionConfig) {
    return { ok: true, message: "Demo 模型可用" };
  }

  async listAvailableModels(config: ModelConnectionConfig) {
    return {
      ok: true,
      message: "Demo Provider 仅提供当前示例模型",
      models: [config.model || "demo-model"]
    };
  }

  async generateText(_config: ModelConnectionConfig, input: { systemPrompt: string; userPrompt: string }) {
    if (input.systemPrompt.includes("任务规划器")) {
      return JSON.stringify(parseDemoRequirement(input.userPrompt));
    }

    if (input.systemPrompt.includes("项目排期规划师")) {
      return JSON.stringify(buildDemoGanttPlan(JSON.parse(input.userPrompt) as {
        projectName: string;
        projectSummary: string;
        durationDays: number;
      }));
    }

    if (input.systemPrompt.includes("资深产品经理和需求分析师")) {
      return JSON.stringify(buildDemoFeatureList(JSON.parse(input.userPrompt) as {
        productName: string;
        productSummary: string;
        targetUsers: string;
        domain: string;
        platforms: string[];
        outputDepth: string;
      }));
    }

    if (input.systemPrompt.includes("信息抽取器")) {
      const payload = JSON.parse(input.userPrompt) as {
        candidate: { name: string };
        sources: Array<{ title: string; url: string; snippet: string }>;
      };
      const preset = getDemoPreset(payload.candidate.name);
      return JSON.stringify({
        id: payload.candidate.name.toLowerCase(),
        name: preset.name,
        company: preset.company,
        positioning: preset.positioning,
        targetUsers: preset.targetUsers,
        coreFeatures: preset.coreFeatures,
        pricing: preset.pricing,
        businessModel: preset.businessModel,
        channelStrategy: preset.channelStrategy,
        marketMoves: preset.marketMoves,
        strengths: preset.strengths,
        weaknesses: preset.weaknesses,
        differentiators: preset.differentiators,
        risks: preset.risks,
        evidence: payload.sources.map((source, index) => ({
          id: `${preset.name}-${index}`,
          title: source.title,
          url: source.url,
          sourceType: "official_site",
          crawledAt: new Date().toISOString(),
          excerpt: source.snippet
        }))
      });
    }

    if (input.systemPrompt.includes("材料分块理解器")) {
      const payload = JSON.parse(input.userPrompt) as {
        competitorName: string;
        blocks: Array<{ blockId: string; title: string; text: string }>;
      };
      const preset = getDemoPreset(payload.competitorName);
      return JSON.stringify({
        competitorName: payload.competitorName,
        summary: payload.blocks.map((block) => `${block.title}: ${block.text.slice(0, 40)}`).join("；"),
        positioningSignals: [preset.positioning],
        targetUsersSignals: preset.targetUsers,
        featureSignals: preset.coreFeatures,
        pricingSignals: preset.pricing.map((item) => `${item.name} ${item.price}`),
        businessModelSignals: preset.businessModel,
        channelSignals: preset.channelStrategy,
        marketSignals: preset.marketMoves,
        strengthsSignals: preset.strengths,
        weaknessesSignals: preset.weaknesses,
        differentiatorsSignals: preset.differentiators,
        risksSignals: preset.risks,
        evidence: payload.blocks.slice(0, 3).map((block) => ({
          blockIds: [block.blockId],
          excerpt: block.text.slice(0, 80),
          sourceTitle: block.title
        }))
      });
    }

    if (input.systemPrompt.includes("材料综合分析器")) {
      const payload = JSON.parse(input.userPrompt) as {
        competitorName: string;
      };
      const preset = getDemoPreset(payload.competitorName);
      return JSON.stringify({
        id: payload.competitorName.toLowerCase(),
        name: preset.name,
        company: preset.company,
        positioning: preset.positioning,
        targetUsers: preset.targetUsers,
        coreFeatures: preset.coreFeatures,
        pricing: preset.pricing,
        businessModel: preset.businessModel,
        channelStrategy: preset.channelStrategy,
        marketMoves: preset.marketMoves,
        strengths: preset.strengths,
        weaknesses: preset.weaknesses,
        differentiators: preset.differentiators,
        risks: preset.risks,
        evidence: [
          {
            id: `${preset.name}-upload-1`,
            title: `${preset.name} 上传材料摘要`,
            url: `upload://${preset.name}`,
            sourceType: "public_report",
            crawledAt: new Date().toISOString(),
            excerpt: `${preset.name} 上传材料中提到的核心能力与商业模式摘要`
          }
        ]
      });
    }

    if (input.systemPrompt.includes("咨询顾问")) {
      const payload = JSON.parse(input.userPrompt) as {
        mode?: string;
        sectionSpec?: {
          sectionId: string;
          title: string;
          summaryHint: string;
          chartIds?: string[];
        };
        sectionDraft?: {
          sectionId: string;
          title: string;
          summary: string;
          bodyMarkdown: string;
          chartIds?: string[];
          citations?: string[];
        };
        parseResult: { track: string; region: string };
        competitors: Array<{
          name: string;
          positioning: string;
          coreFeatures: string[];
          businessModel: string[];
          channelStrategy: string[];
          marketMoves: string[];
          strengths: string[];
          weaknesses: string[];
          differentiators: string[];
          risks: string[];
          pricing: Array<{ name: string; price: string; billingCycle?: string }>;
        }>;
        charts: Array<{ id: string }>;
        sourceCount: number;
      };
      if (payload.mode === "section_write" && payload.sectionSpec) {
        return JSON.stringify(buildDemoSectionDraft(payload.sectionSpec, payload.competitors));
      }
      if (payload.mode === "section_review" && payload.sectionDraft) {
        return JSON.stringify(
          buildDemoReviewedSectionDraft(payload.sectionDraft)
        );
      }
      return JSON.stringify(buildLongDemoReport(payload));
    }

    if (input.systemPrompt.includes("图表数据补全助手")) {
      const payload = JSON.parse(input.userPrompt) as {
        specs: Array<{
          id: string;
          labels: string[];
          type: string;
          series: Array<{ name: string; data: Array<number | string> }>;
        }>;
        competitors: Array<{
          name: string;
          coreFeatures: string[];
          businessModel: string[];
          channelStrategy: string[];
          differentiators: string[];
        }>;
      };
      return JSON.stringify({
        items: payload.specs.map((spec) => {
          if (spec.type === "comparison_table") {
            return {
              id: spec.id,
              series: spec.series,
              inferenceNotes: ["基于 demo 竞品画像与行业经验生成展示型表格"]
            };
          }

          if (spec.type === "line") {
            return {
              id: spec.id,
              series: payload.competitors.slice(0, 4).map((competitor, index) => ({
                name: competitor.name,
                data: [
                  Math.max(competitor.coreFeatures.length, 3 + index),
                  Math.max(competitor.businessModel.length, 2 + (index % 3)),
                  Math.max(competitor.channelStrategy.length, 3 + ((index + 1) % 3)),
                  Math.max(competitor.differentiators.length, 2 + ((index + 2) % 3))
                ]
              })),
              inferenceNotes: ["基于 demo 竞品画像进行保守补全，保证维度差异可视化"]
            };
          }

          const baseSeries = spec.series[0];
          return {
            id: spec.id,
            series: baseSeries
              ? [
                  {
                    ...baseSeries,
                    data: payload.competitors.map((competitor, index) =>
                      Math.max(
                        competitor.coreFeatures.length +
                          competitor.channelStrategy.length +
                          competitor.businessModel.length +
                          competitor.differentiators.length +
                          index,
                        3 + index
                      )
                    )
                  }
                ]
              : spec.series,
            inferenceNotes: ["基于 demo 竞品画像和相对强弱关系进行保守补全"]
          };
        })
      });
    }

    if (input.systemPrompt.includes("执行摘要")) {
      const payload = JSON.parse(input.userPrompt) as {
        parseResult: { track: string; region: string };
        competitors: Array<{ name: string }>;
      };
      return JSON.stringify({
        title: `${payload.parseResult.region}${payload.parseResult.track}赛道竞品深度分析报告`,
        executiveSummary: `本报告围绕 ${payload.parseResult.region}${payload.parseResult.track} 赛道展开，重点分析 ${payload.competitors
          .map((item) => item.name)
          .join("、")} 等竞品在功能、商业模式和机会点上的差异。`
      });
    }

    return "{}";
  }
}

const demoModel: ModelConnectionConfig = {
  id: "demo-planner",
  provider: "demo",
  label: "Demo Planner",
  baseUrl: "demo://local",
  apiKeyRef: "demo",
  model: "demo-planner",
  timeoutMs: 5000,
  temperature: 0.2,
  enabled: true
};

const openAiModel: ModelConnectionConfig = {
  id: "openai-compatible-main",
  provider: "openai-compatible",
  label: "OpenAI Compatible",
  baseUrl: "https://api.openai.com/v1",
  apiKeyRef: "${OPENAI_API_KEY}",
  model: "gpt-4.1-mini",
  timeoutMs: 30000,
  temperature: 0.4,
  enabled: false
};

const codingPlanModel: ModelConnectionConfig = {
  id: "codingplan-minimax-m2-5-config",
  provider: "openai-compatible",
  label: "移动云 CodingPlan",
  baseUrl: "https://zhenze-huhehaote.cmecloud.cn/api/coding/v1",
  apiKeyRef: "",
  model: "minimax-m2.5",
  timeoutMs: 30000,
  temperature: 0.4,
  enabled: false
};

const createDefaultModels = () =>
  new Map<string, ModelConnectionConfig>([
    [demoModel.id, demoModel],
    ["demo-extractor", { ...demoModel, id: "demo-extractor", label: "Demo Extractor" }],
    ["demo-writer", { ...demoModel, id: "demo-writer", label: "Demo Writer" }],
    [openAiModel.id, openAiModel],
    [codingPlanModel.id, codingPlanModel]
  ]);

const defaultRouting: ModelRoutingConfig = {
  plannerModelId: "demo-planner",
  extractorModelId: "demo-extractor",
  writerModelId: "demo-writer"
};

const REDACTED_SECRET = "********";

export class ModelService {
  private readonly store = new ModelStateStore(
    join(process.cwd(), getAppConfig().storage.appStateDir, "models.json")
  );
  private readonly configs = new Map<string, ModelConnectionConfig>();
  private routing: ModelRoutingConfig;

  private readonly providers: Record<string, LlmProvider> = {
    demo: new DemoLlmProvider(),
    "openai-compatible": new OpenAiCompatibleProvider()
  };

  constructor() {
    const persisted = this.store.load();

    for (const config of persisted?.models ?? Array.from(createDefaultModels().values())) {
      if (config?.id) {
        this.configs.set(config.id, config);
      }
    }

    this.routing =
      persisted?.routing &&
      Object.values(persisted.routing).every((modelId) => this.configs.has(modelId))
        ? persisted.routing
        : defaultRouting;
    this.routing = this.resolveRoutingWithRealWriter(this.routing);
  }

  list() {
    return Array.from(this.configs.values());
  }

  listPublic() {
    return this.list().map((model) => this.toPublicModel(model));
  }

  toPublicModel(model: ModelConnectionConfig): ModelConnectionConfig {
    return {
      ...model,
      apiKeyRef: redactSecret(model.apiKeyRef)
    };
  }

  getRouting(): ModelRoutingConfig {
    return this.routing;
  }

  getEffectiveRouting(): EffectiveModelRouting {
    const writer = this.configs.get(this.routing.writerModelId);
    return {
      ...this.routing,
      writerModelLabel: writer?.label,
      writerProvider: writer?.provider,
      writerUsesDemoProvider: writer?.provider === "demo"
    };
  }

  upsert(config: ModelConnectionConfig) {
    this.configs.set(config.id, config);
    this.routing = this.resolveRoutingWithRealWriter(this.routing);
    this.persist();
    return config;
  }

  update(modelId: string, patch: Partial<ModelConnectionConfig>) {
    const current = this.configs.get(modelId);
    if (!current) {
      throw new Error(`模型不存在: ${modelId}`);
    }
    const next = {
      ...current,
      ...patch,
      apiKeyRef:
        patch.apiKeyRef === undefined || patch.apiKeyRef === REDACTED_SECRET
          ? current.apiKeyRef
          : patch.apiKeyRef
    };
    this.configs.set(modelId, next);
    this.routing = this.resolveRoutingWithRealWriter(this.routing);
    this.persist();
    return next;
  }

  updateRouting(routing: ModelRoutingConfig) {
    for (const modelId of Object.values(routing)) {
      if (!this.configs.has(modelId)) {
        throw new Error(`路由引用了不存在的模型: ${modelId}`);
      }
    }
    this.routing = routing;
    this.persist();
    return this.routing;
  }

  getConfigsMap() {
    return Object.fromEntries(this.configs.entries());
  }

  getProvider(modelId: string) {
    const config = this.configs.get(modelId);
    if (!config) {
      throw new Error(`模型不存在: ${modelId}`);
    }
    return this.providers[config.provider];
  }

  async healthCheck(modelId: string) {
    const config = this.configs.get(modelId);
    if (!config) {
      throw new Error(`模型不存在: ${modelId}`);
    }
    return this.providers[config.provider].healthCheck(config);
  }

  async discoverAvailableModels(config: ModelConnectionConfig) {
    const provider = this.providers[config.provider];
    if (!provider) {
      throw new Error(`不支持的 Provider: ${config.provider}`);
    }
    if (!provider.listAvailableModels) {
      return {
        ok: false,
        message: `当前 Provider 暂不支持自动发现模型列表: ${config.provider}`,
        models: []
      };
    }
    return provider.listAvailableModels(config);
  }

  remove(modelId: string) {
    if (!this.configs.has(modelId)) {
      throw new Error(`模型不存在: ${modelId}`);
    }
    if (Object.values(this.routing).includes(modelId)) {
      throw new Error("当前模型已被任务路由使用，不能直接删除。请先调整任务路由。");
    }
    this.configs.delete(modelId);
    this.routing = this.resolveRoutingWithRealWriter(this.routing);
    this.persist();
    return { success: true };
  }

  resetToDefaults() {
    this.configs.clear();
    for (const [id, config] of createDefaultModels().entries()) {
      this.configs.set(id, config);
    }
    this.routing = defaultRouting;
    this.persist();
    return {
      items: this.listPublic(),
      routing: this.routing,
      effectiveRouting: this.getEffectiveRouting()
    };
  }

  private resolveRoutingWithRealWriter(routing: ModelRoutingConfig) {
    const realWriter = this.findPreferredRealWriterModelId();
    if (!realWriter) {
      return routing;
    }

    if (routing.writerModelId === "demo-writer") {
      return {
        ...routing,
        writerModelId: realWriter
      };
    }

    return routing;
  }

  private findPreferredRealWriterModelId() {
    const candidates = this.list().filter(
      (model) => model.enabled && model.provider !== "demo"
    );
    return candidates[0]?.id;
  }

  private persist() {
    this.store.save({
      models: this.list(),
      routing: this.routing
    });
  }
}

const redactSecret = (value: string) => {
  if (!value || /^\$\{.+\}$/.test(value) || value === "demo") {
    return value;
  }
  return REDACTED_SECRET;
};

const getDemoPreset = (name: string) => {
  if (name.includes("钉钉")) {
    return {
      name: "钉钉",
      company: "钉钉（阿里巴巴）",
      positioning: "面向大中型企业的协同办公平台，强调组织、审批与 AI 助手的一体化融合。",
      targetUsers: ["中大型企业", "组织管理者", "协同办公团队"],
      coreFeatures: ["AI 问答", "智能文档", "审批自动化", "组织协同", "工作台集成"],
      pricing: [
        { name: "专业版", price: "按席位订阅", billingCycle: "年付" },
        { name: "专属版", price: "项目制报价", billingCycle: "年付" }
      ],
      businessModel: ["SaaS 订阅", "专属部署", "生态增购"],
      channelStrategy: ["官网直销", "区域服务商", "生态伙伴联销"],
      marketMoves: ["强化企业 AI 助手入口", "推出行业模板", "加强审批与知识库联动"],
      strengths: ["组织关系链完整", "企业流程沉淀深", "客户基础大"],
      weaknesses: ["产品形态偏平台化", "轻量团队上手成本偏高"],
      differentiators: ["把 AI 助手嵌入组织、审批、协同链路中"],
      risks: ["创新速度受大平台路径影响", "部分场景存在配置复杂度"],
    };
  }

  if (name.includes("语雀")) {
    return {
      name: "语雀",
      company: "语雀",
      positioning: "围绕文档、知识沉淀和团队协同打造的知识型 AI 办公产品。",
      targetUsers: ["知识密集型团队", "产品与研发团队", "中小企业"],
      coreFeatures: ["AI 写作", "知识问答", "文档协同", "空间管理", "内容结构化沉淀"],
      pricing: [
        { name: "团队版", price: "按团队订阅", billingCycle: "年付" },
        { name: "企业版", price: "定制报价", billingCycle: "年付" }
      ],
      businessModel: ["SaaS 订阅", "企业增值服务"],
      channelStrategy: ["官网转化", "内容口碑传播", "产品社区扩散"],
      marketMoves: ["发布 AI 办公新能力", "强化知识库应用场景", "提升文档智能化体验"],
      strengths: ["文档体验成熟", "知识沉淀能力强", "适合中小团队快速上手"],
      weaknesses: ["流程自动化深度相对有限", "组织级管控能力弱于综合平台"],
      differentiators: ["从知识协同切入 AI 办公，而非从组织平台切入"],
      risks: ["被平台型产品整合替代的压力较高", "向企业深水区扩张时交付挑战增加"],
    };
  }

  if (name.includes("扣子")) {
    return {
      name: "扣子空间",
      company: "字节系生态产品",
      positioning: "强调 AI Agent、工作流和知识库连接的企业智能助手平台。",
      targetUsers: ["创新业务团队", "运营团队", "需要流程自动化的企业"],
      coreFeatures: ["Agent 编排", "知识库连接", "工作流自动化", "智能问答", "多模型接入"],
      pricing: [
        { name: "企业版", price: "按用量与席位组合报价", billingCycle: "月付/年付" }
      ],
      businessModel: ["SaaS 订阅", "API 与平台能力付费", "行业解决方案"],
      channelStrategy: ["官网销售", "开发者社区扩散", "生态伙伴引流"],
      marketMoves: ["加强企业版能力", "持续扩展 Agent 场景", "打通知识库与流程系统"],
      strengths: ["Agent 概念清晰", "平台开放度较高", "产品创新速度快"],
      weaknesses: ["企业长期交付可信度仍需观察", "标准化行业方案仍在沉淀"],
      differentiators: ["更强调智能体能力与流程连接，而非传统协同平台能力"],
      risks: ["平台心智仍在建立期", "大客户采购信任门槛较高"],
    };
  }

  return {
    name,
    company: `${name}科技`,
    positioning: `${name} 是面向企业协作与办公提效的 AI 助手产品。`,
    targetUsers: ["中大型企业", "知识工作者"],
    coreFeatures: ["智能问答", "文档总结", "工作流协同", "知识库连接"],
    pricing: [{ name: "企业版", price: "按席位报价", billingCycle: "年付" }],
    businessModel: ["SaaS 订阅", "企业定制"],
    channelStrategy: ["官网销售", "生态伙伴渠道"],
    marketMoves: ["推出行业解决方案", "加强大模型接入"],
    strengths: ["落地场景明确", "企业客户接受度高"],
    weaknesses: ["公开价格透明度一般", "生态广度仍需验证"],
    differentiators: ["更强调知识库与流程融合"],
    risks: ["模型成本压力", "同质化竞争加剧"],
  };
};

const buildLongDemoReport = (payload: {
  parseResult: { track: string; region: string };
  competitors: Array<{
    name: string;
    positioning: string;
    coreFeatures: string[];
    businessModel: string[];
    channelStrategy: string[];
    marketMoves: string[];
    strengths: string[];
    weaknesses: string[];
    differentiators: string[];
    risks: string[];
    pricing: Array<{ name: string; price: string; billingCycle?: string }>;
  }>;
  charts: Array<{ id: string }>;
  sourceCount: number;
}) => {
  const competitorNames = payload.competitors.map((item) => item.name).join("、");
  const comparisonTable = payload.competitors.map((item) => ({
    竞品: item.name,
    核心定位: item.positioning,
    功能数量: item.coreFeatures.length,
    商业模式: item.businessModel.join(" / "),
    代表风险: item.risks[0] ?? "待补充"
  }));

  return {
    id: "report-demo",
    title: `${payload.parseResult.region}${payload.parseResult.track}赛道竞品深度分析报告`,
    executiveSummary:
      `本报告围绕 ${payload.parseResult.region}${payload.parseResult.track} 赛道展开，选取 ${competitorNames} 作为重点观察对象。结论上看，当前市场已经从“模型能力展示”转向“业务场景落地、数据接入深度、组织协同嵌入和 ROI 证明”竞争。若新进入者希望建立差异化，建议从垂直场景、快速交付、可量化价值三个方向切入。`,
    sections: [
      buildSection(
        "industry_background",
        "第一章 行业背景与赛道判断",
        "赛道已从概念验证阶段进入场景落地和价值验证阶段。",
        [
          `近 12 个月内，${payload.parseResult.track} 在中国企业数字化语境下快速升温。市场关注点不再停留于“是否接入大模型”，而是转向“能否真正嵌入业务流程、连接内部知识、改善员工效率和服务体验”。`,
          "从需求端看，企业客户更关心知识安全、权限体系、系统集成和采购后的落地成本；从供给端看，厂商正从单点问答工具向平台化协同、Agent 编排和场景套件升级。",
          `这意味着，未来竞争不会只发生在模型效果层，而会发生在交付能力、行业理解、生态连接和客户成功体系层。本次报告使用 ${payload.sourceCount} 条来源做归纳，重点观察头部与代表性产品。`
        ].join("\n\n")
      ),
      buildSection(
        "market_drivers",
        "第二章 市场驱动因素与需求拆解",
        "组织提效、知识复用和流程自动化共同推动赛道演化。",
        [
          "第一类驱动来自企业内部知识资产激活。大量企业已经积累了文档、制度、FAQ 和项目资料，但传统检索和共享方式效率有限，因此知识问答和文档智能化成为最直接的切入口。",
          "第二类驱动来自流程自动化需求。单纯的 AI 问答难以持续证明价值，而与审批、CRM、客服、运营流程结合后，更容易形成可量化的节省时间和提效指标。",
          "第三类驱动来自管理层对降本增效的现实诉求。尤其在预算趋于理性的环境下，能够明确展示 ROI 的产品更容易获得试点和扩容机会。"
        ].join("\n\n")
      ),
      buildSection(
        "competitor_scope",
        "第三章 竞品范围与分层说明",
        "本次样本覆盖平台型、知识型和 Agent 型产品。",
        [
          `本次分析将 ${competitorNames} 视为直接观察样本。其共同点是都围绕企业办公效率提升展开，但切入点存在明显差异，有的从组织平台切入，有的从知识协同切入，也有的从 Agent 与流程自动化切入。`,
          "在实际市场竞争中，这些产品不一定在所有场景正面对抗，但在预算争夺、试点采购和管理层心智层面会相互替代，因此具有明确的竞品意义。",
          "分层上，平台型产品通常在组织、权限和流程方面占优，知识型产品在内容沉淀与使用体验上更突出，Agent 型产品则在自动化和灵活扩展方面更具吸引力。"
        ].join("\n\n"),
        comparisonTable
      ),
      buildSection(
        "competitor_profiles",
        "第四章 重点竞品画像",
        "不同竞品的切入路径和客户价值主张有明显差异。",
        payload.competitors
          .map(
            (item) =>
              `${item.name}：${item.positioning} 其核心功能包括 ${item.coreFeatures.join("、")}。在渠道上主要依赖 ${item.channelStrategy.join("、")}，近期市场动作集中在 ${item.marketMoves.join("、")}。`
          )
          .join("\n\n")
      ),
      buildSection(
        "feature_comparison",
        "第五章 核心功能与产品能力对比",
        "功能竞争正在从单点能力转向工作流闭环能力。",
        [
          "从产品能力层看，当前头部产品都已具备基础的智能问答、文档总结和知识库能力，真正的差异主要体现在是否具备流程连接、权限治理、跨系统集成和可扩展的工作流引擎。",
          "平台型产品往往在组织协同和系统整合上领先，知识型产品则在内容体验、文档结构和团队沉淀方面更成熟，而 Agent 型产品在自动化链路和任务编排上更有想象空间。",
          "对企业客户而言，是否能够快速形成一个闭环场景，比是否拥有更多零散功能更重要。因此，应把功能对比放在“使用路径”和“落地效率”里评价，而不是只数功能项。"
        ].join("\n\n"),
        payload.competitors.map((item) => ({
          竞品: item.name,
          代表功能: item.coreFeatures.slice(0, 3).join(" / "),
          差异化: item.differentiators[0] ?? "待补充"
        })),
        ["feature-coverage-bar", "channel-coverage-bar"]
      ),
      buildSection(
        "pricing_business",
        "第六章 价格策略与商业模式分析",
        "订阅制仍是基础，行业方案和专属部署拉高客单价。",
        [
          "从商业模式看，样本竞品大多采用 SaaS 订阅作为基础盘，再辅以企业增值服务、专属部署或行业解决方案，形成更高客单价和更高客户粘性。",
          "价格透明度整体一般，尤其在企业市场，最终成交价格常与席位规模、功能包、部署方式和服务深度挂钩。公开报价更多承担市场教育和线索筛选作用，而非最终成交标准。",
          "这说明新进入者在制定商业模式时，不应只考虑产品定价，还要考虑交付、成功服务和持续运营的成本结构。"
        ].join("\n\n"),
        payload.competitors.map((item) => ({
          竞品: item.name,
          主价格包: item.pricing[0]?.name ?? "待补充",
          收费方式: item.pricing[0]?.price ?? "待补充",
          商业模式: item.businessModel.join(" / ")
        })),
        ["business-model-bar"]
      ),
      buildSection(
        "channel_strategy",
        "第七章 渠道策略与市场动作",
        "渠道和增长动作决定了产品能否从工具走向规模化产品。",
        [
          "企业级产品增长并不只依赖线上自然转化。除了官网和品牌曝光之外，区域服务商、交付伙伴、既有客户扩容和行业口碑都会显著影响成单效率。",
          "样本竞品的市场动作集中在三类：一是发布新一轮 AI 功能或解决方案，二是强调知识库、工作流与内部系统的打通，三是通过标杆案例和行业模板加快客户决策。",
          "对于新产品来说，如果没有成熟渠道体系，就需要通过更明确的场景价值和更短的落地周期来弥补品牌与生态劣势。"
        ].join("\n\n")
      ),
      buildSection(
        "strength_weakness",
        "第八章 优势、短板与差异化亮点",
        "真正的差异化来自产品路线和组织能力，而不是单个功能点。",
        [
          ...payload.competitors.map(
            (item) =>
              `${item.name} 的优势集中在 ${item.strengths.join("、")}；其短板主要体现在 ${item.weaknesses.join("、")}；差异化亮点则是 ${item.differentiators.join("、")}。`
          ),
          "综合来看，平台型产品更容易守住组织入口，知识型产品更容易赢得使用口碑，Agent 型产品则更容易形成新鲜度和创新势能。"
        ].join("\n\n")
      ),
      buildSection(
        "risk_assessment",
        "第九章 风险判断与竞争压力",
        "当前赛道最大风险不是没有需求，而是价值同质化与交付复杂化。",
        [
          "一方面，越来越多厂商都能提供“问答 + 文档 + 知识库”的标准组合，若没有更深的场景能力，客户很难感受到明显差异。",
          "另一方面，企业级交付需要兼顾权限、安全、组织流程和系统集成，一旦产品路线过于追求创新而忽视交付复杂度，就容易在规模化阶段受阻。",
          ...payload.competitors.map(
            (item) => `${item.name} 当前最突出的潜在风险包括 ${item.risks.join("、")}。`
          )
        ].join("\n\n"),
        payload.competitors.map((item) => ({
          竞品: item.name,
          关键风险1: item.risks[0] ?? "待补充",
          关键风险2: item.risks[1] ?? "待补充"
        }))
      ),
      buildSection(
        "opportunities",
        "第十章 市场机会点判断",
        "机会不在做一个更通用的 AI 办公工具，而在做更可落地的场景方案。",
        [
          "机会点一是垂直场景切入。相比打造一个大而全的平台，从销售知识助手、客户服务助手、内部 IT 服务台助手等高频高痛场景切入，更容易形成清晰价值。",
          "机会点二是把知识与流程真正连起来。很多产品具备知识问答，但难以与后续动作衔接；若能在问答之后直接触发审批、创建任务、更新 CRM，就会形成更强壁垒。",
          "机会点三是用更轻量的交付方式降低试点门槛。企业希望先看到结果，再扩大预算，因此产品若能在两到四周内快速上线并证明价值，会更容易拿到扩容机会。"
        ].join("\n\n")
      ),
      buildSection(
        "recommendations",
        "第十一章 对新进入者的策略建议",
        "建议采取“窄场景切入、平台能力预埋、案例驱动增长”的路径。",
        [
          "第一阶段建议聚焦一个高频刚需场景，打透单点价值，形成可复制的行业脚本、知识结构和交付方法论。",
          "第二阶段建议补齐平台化底座，包括权限、日志、知识接入、工作流和多系统连接能力，为规模化扩展做准备。",
          "第三阶段则要通过标杆客户案例、伙伴渠道和行业模板放大增长势能，让产品从项目型交付逐步走向可复制的产品化扩张。"
        ].join("\n\n")
      )
    ],
    appendixSources: []
  };
};

const buildSection = (
  sectionId: string,
  title: string,
  summary: string,
  bodyMarkdown: string,
  tables?: Array<Record<string, string | number>>,
  chartIds?: string[]
) => ({
  sectionId,
  title,
  summary,
  bodyMarkdown,
  tables,
  chartIds,
  citations: []
});

const parseDemoRequirement = (prompt: string) => {
  const normalized = prompt.replace(/\s+/g, "");
  if (!normalized) {
    return {
      industry: "待识别行业",
      track: "待识别赛道",
      competitorType: "product_competitor",
      targetAudience: "待补充",
      region: "中国",
      timeRange: "近 12 个月",
      focusDimensions: ["产品定位", "核心功能", "商业模式"],
      reportPurpose: "内部分析",
      tone: "中性、结构化",
      inferredOutputStyle: "executive",
      analysisDepth: "light",
      userProvidedCompetitors: []
    };
  }
  const purpose = normalized.includes("老板") ? "面向老板汇报" : "内部研究与方案分析";
  const style = normalized.includes("深度") || normalized.includes("研究") ? "research" : normalized.includes("简版") ? "brief" : "executive";
  const depth = normalized.includes("深度") ? "deep" : "standard";

  if (normalized.includes("低代码")) {
    return {
      industry: "企业软件",
      track: "低代码平台",
      competitorType: "product_competitor",
      targetAudience: normalized.includes("中小企业") ? "中小企业" : "企业数字化团队",
      region: "中国",
      timeRange: "近 12 个月",
      focusDimensions: ["产品定位", "商业模式", "行业方案", "机会点"],
      reportPurpose: purpose,
      tone: "理性、结构化、偏策略判断",
      inferredOutputStyle: style,
      analysisDepth: depth,
      userProvidedCompetitors: []
    };
  }

  if (normalized.includes("生鲜")) {
    return {
      industry: "零售电商",
      track: "生鲜电商",
      competitorType: "brand_competitor",
      targetAudience: "城市家庭用户与社区零售消费者",
      region: "中国",
      timeRange: "近 12 个月",
      focusDimensions: ["履约模式", "价格带", "供应链", "用户心智"],
      reportPurpose: purpose,
      tone: "面向业务汇报、强调结论",
      inferredOutputStyle: style,
      analysisDepth: depth,
      userProvidedCompetitors: []
    };
  }

  const inferredTrack = inferGenericTrack(normalized);

  return {
    industry: inferredTrack ? "待确认行业" : "AI 办公助手",
    track: inferredTrack || "AI 办公助手",
    competitorType: "product_competitor",
    targetAudience: inferredTrack ? "待确认目标用户" : "企业知识工作者与管理者",
    region: "中国",
    timeRange: "近 12 个月",
    focusDimensions: inferredTrack
      ? ["产品定位", "核心功能", "商业模式", "机会点"]
      : ["核心功能", "价格策略", "商业模式", "差异化亮点"],
    reportPurpose: purpose,
    tone: inferredTrack ? "理性、结构化、待进一步确认" : "专业、简洁、偏结论导向",
    inferredOutputStyle: style,
    analysisDepth: depth,
    userProvidedCompetitors: []
  };
};

const inferGenericTrack = (normalizedPrompt: string) => {
  const matchers = [
    /帮我分析(.{2,24}?)(?:赛道|行业|竞品|市场)/,
    /分析(.{2,24}?)(?:赛道|行业|竞品|市场)/,
    /做一份(.{2,24}?)(?:竞品分析|分析报告)/,
    /面向(.{2,24}?)(?:的竞品|竞品)/,
  ];

  for (const matcher of matchers) {
    const matched = normalizedPrompt.match(matcher)?.[1]?.trim();
    if (matched && !matched.includes("老板") && !matched.includes("汇报")) {
      return matched;
    }
  }

  return "";
};

const buildDemoSectionDraft = (
  sectionSpec: {
    sectionId: string;
    title: string;
    summaryHint: string;
    chartIds?: string[];
  },
  competitors: Array<{
    name: string;
    positioning: string;
    coreFeatures: string[];
    businessModel: string[];
    strengths: string[];
    weaknesses: string[];
    differentiators: string[];
    risks: string[];
  }>
) => ({
  sectionId: sectionSpec.sectionId,
  title: sectionSpec.title,
  summary: sectionSpec.summaryHint,
  bodyMarkdown: [
    sectionSpec.summaryHint,
    ...competitors.slice(0, 5).map(
      (item) =>
        `${item.name}：定位为${item.positioning}；核心能力包括 ${item.coreFeatures.join("、") || "待补充"}；商业模式侧重 ${item.businessModel.join("、") || "待补充"}；优势包括 ${item.strengths.join("、") || "待补充"}；短板主要是 ${item.weaknesses.join("、") || "待补充"}；差异化体现在 ${item.differentiators.join("、") || "待补充"}；风险点包括 ${item.risks.join("、") || "待补充"}。`
    )
  ].join("\n\n"),
  citations: [],
  chartIds: sectionSpec.chartIds ?? []
});

const buildDemoReviewedSectionDraft = (sectionDraft: {
  sectionId: string;
  title: string;
  summary: string;
  bodyMarkdown: string;
  chartIds?: string[];
  citations?: string[];
}) => ({
  ...sectionDraft,
  summary: `${sectionDraft.summary}（已完成审核润色）`,
  bodyMarkdown: `${sectionDraft.bodyMarkdown}\n\n从审稿视角看，本章节已经补足了主要逻辑衔接与结论表达，使其更适合直接放入正式汇报材料中。`,
  citations: sectionDraft.citations ?? [],
  chartIds: sectionDraft.chartIds ?? []
});

const buildDemoGanttPlan = (input: {
  projectName: string;
  projectSummary: string;
  durationDays: number;
}) => {
  const coreDuration = Math.max(3, Math.floor(input.durationDays * 0.35));
  const testDuration = Math.max(2, Math.floor(input.durationDays * 0.2));
  return {
    tasks: [
      {
        id: "task-1",
        phase: "准备阶段",
        name: "项目目标澄清与排期假设确认",
        description: `围绕${input.projectName}确认目标、范围和关键时间边界。`,
        durationDays: 2,
        dependsOn: []
      },
      {
        id: "task-2",
        phase: "方案阶段",
        name: "方案设计与里程碑拆解",
        description: "形成关键阶段和里程碑。",
        durationDays: 3,
        dependsOn: ["task-1"]
      },
      {
        id: "task-3",
        phase: "执行阶段",
        name: "核心工作推进与阶段性交付",
        description: input.projectSummary,
        durationDays: coreDuration,
        dependsOn: ["task-2"]
      },
      {
        id: "task-4",
        phase: "校验阶段",
        name: "联调、评审与问题修正",
        description: "对关键输出做联调和修正。",
        durationDays: testDuration,
        dependsOn: ["task-3"]
      },
      {
        id: "task-5",
        phase: "收口阶段",
        name: "成果收口与内部演练",
        description: "准备最终验收版本。",
        durationDays: 2,
        dependsOn: ["task-4"]
      },
      {
        id: "task-6",
        phase: "里程碑",
        name: "最终验收节点",
        description: "最终交付或验收节点。",
        durationDays: 1,
        dependsOn: ["task-5"],
        milestone: true
      }
    ],
    assumptions: ["默认按常见项目推进节奏拆分阶段。"],
    riskNotes: ["若中间评审轮次增加，执行阶段和收口阶段可能被压缩。"]
  };
};

const buildDemoFeatureList = (input: {
  productName: string;
  productSummary: string;
  targetUsers: string;
  domain: string;
  platforms: string[];
  outputDepth: string;
}) => {
  const modules = [
    {
      id: "module-1",
      name: "客户与基础资料",
      description: "维护客户、联系人、标签和基础字典，支撑后续业务流转。",
      order: 1
    },
    {
      id: "module-2",
      name: "业务过程管理",
      description: "围绕核心业务动作进行创建、跟进、审批和协同。",
      order: 2
    },
    {
      id: "module-3",
      name: "消息与权限",
      description: "处理角色权限、待办提醒、操作记录和安全边界。",
      order: 3
    },
    {
      id: "module-4",
      name: "统计分析",
      description: "沉淀关键指标、业务看板和导出能力。",
      order: 4
    }
  ];

  const featureNames = [
    ["客户档案管理", "联系人维护", "客户标签配置"],
    ["任务创建与分派", "过程记录填报", "审批流转"],
    ["角色权限矩阵", "消息待办提醒", "操作日志审计"],
    ["业务数据看板", "明细筛选导出", "指标口径配置"]
  ];

  return {
    title: `${input.productName}智能功能清单`,
    assumptions: [
      `默认面向${input.targetUsers || "业务人员和管理员"}使用。`,
      `默认主要承载在${input.platforms?.join("、") || "Web 管理端"}。`,
      "默认先实现核心业务闭环，再补充自动化和分析能力。"
    ],
    reviewNotes: [
      "字段权限和数据范围需要结合组织架构进一步确认。",
      "审批节点、消息渠道和导出字段建议在评审会上逐项确认。"
    ],
    modules,
    features: modules.flatMap((module, moduleIndex) =>
      featureNames[moduleIndex].map((name, featureIndex) => {
        const id = `feature-${moduleIndex + 1}-${featureIndex + 1}`;
        return {
          id,
          moduleId: module.id,
          name,
          description: `围绕${input.productName}的${input.domain || "业务场景"}，支持${name}，保障${input.productSummary}`,
          userRoles: moduleIndex === 2 ? ["系统管理员", "业务主管"] : ["业务人员", "业务主管"],
          scenarios: [`${input.targetUsers || "用户"}在日常工作中需要${name}`],
          preconditions: featureIndex === 0 ? ["用户已登录系统并具备对应权限"] : [`已完成${featureNames[moduleIndex][0]}`],
          mainFlow: ["进入功能页面", "填写或筛选业务信息", "提交操作并查看系统反馈"],
          exceptionFlows: ["必填信息缺失时提示补充", "无权限操作时阻止提交并给出说明"],
          businessRules: ["所有关键操作需要记录操作人和操作时间", "列表查询需要支持按权限过滤可见数据"],
          priority: moduleIndex < 2 ? (featureIndex === 0 ? "P0" : "P1") : "P2",
          complexity: featureIndex === 2 ? "medium" : moduleIndex === 1 ? "high" : "low",
          dependsOn: featureIndex === 0 ? [] : [`feature-${moduleIndex + 1}-1`],
          fields: [
            {
              id: `${id}-field-1`,
              name: "名称",
              key: "name",
              type: "string",
              required: true,
              validationRule: "不能为空，长度不超过 50 个字符",
              displayIn: ["列表页", "详情页"],
              editableBy: ["业务人员", "业务主管"]
            },
            {
              id: `${id}-field-2`,
              name: "状态",
              key: "status",
              type: "enum",
              required: true,
              enumValues: ["待处理", "处理中", "已完成", "已关闭"],
              displayIn: ["列表页", "详情页"],
              editableBy: ["业务主管"]
            },
            {
              id: `${id}-field-3`,
              name: "备注",
              key: "remark",
              type: "text",
              required: false,
              validationRule: "长度不超过 500 个字符",
              displayIn: ["详情页"],
              editableBy: ["业务人员", "业务主管"]
            }
          ],
          acceptanceCriteria: [
            {
              id: `${id}-ac-1`,
              scenario: "成功保存",
              given: "用户具备该功能操作权限且必填字段完整",
              when: "用户点击保存",
              then: "系统保存数据、展示成功提示并刷新列表"
            },
            {
              id: `${id}-ac-2`,
              scenario: "权限拦截",
              given: "用户没有该功能操作权限",
              when: "用户访问或提交该功能",
              then: "系统阻止操作并展示无权限提示"
            }
          ]
        };
      })
    )
  };
};
