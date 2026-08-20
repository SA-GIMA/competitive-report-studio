import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { getAppConfig } from "@studio/config";
import { parseJsonWithRepair } from "@studio/orchestrator";
import type {
  FeatureAcceptanceCriterion,
  FeatureComplexity,
  FeatureFieldDefinition,
  FeatureItem,
  FeatureListGenerationRequest,
  FeatureListPlan,
  FeatureModule,
  FeaturePriority
} from "@studio/shared";
import { ModelService } from "../models/model-service.ts";
import { FeatureListStateStore } from "./feature-list-state-store.ts";

export class FeatureListService {
  private readonly modelService: ModelService;
  private readonly plans = new Map<string, FeatureListPlan>();
  private readonly store = new FeatureListStateStore(
    join(process.cwd(), getAppConfig().storage.appStateDir, "feature-lists.json")
  );

  constructor(modelService: ModelService) {
    this.modelService = modelService;
    for (const plan of this.store.load()) {
      this.plans.set(plan.id, plan);
    }
  }

  async generatePlan(input: FeatureListGenerationRequest): Promise<FeatureListPlan> {
    const normalized = normalizeRequest(input);
    const routing = this.modelService.getRouting();
    const modelId = normalized.modelId || routing.plannerModelId;
    const config = this.modelService.getConfigsMap()[modelId];
    if (!config) {
      throw new Error(`未找到指定的规划模型 (${modelId})，无法生成功能清单。`);
    }

    const json = await this.modelService.getProvider(modelId).generateText(config, {
      systemPrompt: featureListPlanningSystemPrompt,
      userPrompt: JSON.stringify(normalized),
      responseFormat: "json"
    });
    const draft = parseFeatureListDraft(json);
    const now = new Date().toISOString();
    const modules = ensureModules(draft.modules, normalized);
    const features = ensureFeatures(draft.features, modules, normalized);
    const plan: FeatureListPlan = {
      ...normalized,
      id: `feature-${randomUUID().slice(0, 8)}`,
      title: draft.title?.trim() || `${normalized.productName}功能清单`,
      createdAt: now,
      updatedAt: now,
      assumptions: normalizeStringArray(draft.assumptions).length
        ? normalizeStringArray(draft.assumptions)
        : buildDefaultAssumptions(normalized),
      reviewNotes: normalizeStringArray(draft.reviewNotes),
      modules,
      features
    };

    this.plans.set(plan.id, plan);
    this.persist();
    return plan;
  }

  listPlans() {
    return Array.from(this.plans.values()).sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt)
    );
  }

  getPlan(planId: string) {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`功能清单不存在: ${planId}`);
    }
    return plan;
  }

  updatePlan(planId: string, patch: Partial<FeatureListPlan>) {
    const current = this.getPlan(planId);
    const next: FeatureListPlan = {
      ...current,
      ...patch,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
      modules: ensureModules(patch.modules ?? current.modules, current),
      features: ensureFeatures(patch.features ?? current.features, patch.modules ?? current.modules, current)
    };
    this.plans.set(planId, next);
    this.persist();
    return next;
  }

  exportMarkdown(planId: string) {
    const plan = this.getPlan(planId);
    return {
      fileName: `${sanitizeFileName(plan.title)}.md`,
      content: buildMarkdown(plan)
    };
  }

  private persist() {
    this.store.save(this.listPlans());
  }
}

const featureListPlanningSystemPrompt = `
你是资深产品经理和需求分析师。请根据产品目标生成一份可编辑、可落地的结构化功能清单。
要求：
1. 只输出严格 JSON，不要输出 Markdown。
2. 模块数量控制在 4-8 个，功能点总数根据 outputDepth 控制：brief 8-12 个，standard 12-20 个，detailed 20-32 个。
3. 每个功能点必须包含字段表、优先级、复杂度、依赖关系和验收标准。
4. 字段表要给出字段名、字段 key、字段类型、是否必填、校验规则、展示位置和可编辑角色。
5. 验收标准使用 given/when/then 表达，避免空话。
6. 优先级只允许 P0、P1、P2、P3；复杂度只允许 low、medium、high。
7. dependsOn 填依赖的功能 id；如果无依赖则为空数组。
返回格式：
{
  "title": "清单标题",
  "assumptions": ["生成假设"],
  "reviewNotes": ["需要人工确认的点"],
  "modules": [
    {
      "id": "module-1",
      "name": "模块名",
      "description": "模块说明",
      "parentId": "",
      "order": 1
    }
  ],
  "features": [
    {
      "id": "feature-1",
      "moduleId": "module-1",
      "name": "功能名",
      "description": "功能说明",
      "userRoles": ["角色"],
      "scenarios": ["使用场景"],
      "preconditions": ["前置条件"],
      "mainFlow": ["主流程步骤"],
      "exceptionFlows": ["异常流程"],
      "businessRules": ["业务规则"],
      "priority": "P0",
      "complexity": "medium",
      "dependsOn": [],
      "fields": [
        {
          "id": "field-1",
          "name": "字段名",
          "key": "fieldKey",
          "type": "string",
          "required": true,
          "defaultValue": "",
          "validationRule": "校验规则",
          "enumValues": [],
          "displayIn": ["列表页", "详情页"],
          "editableBy": ["管理员"],
          "note": "备注"
        }
      ],
      "acceptanceCriteria": [
        {
          "id": "ac-1",
          "scenario": "验收场景",
          "given": "前置条件",
          "when": "触发动作",
          "then": "期望结果"
        }
      ]
    }
  ]
}
`;

const normalizeRequest = (input: FeatureListGenerationRequest): FeatureListGenerationRequest => {
  if (!input.productName.trim()) {
    throw new Error("请输入产品或系统名称后再生成功能清单。");
  }
  if (!input.productSummary.trim()) {
    throw new Error("请输入业务目标或需求描述后再生成功能清单。");
  }
  const platforms = input.platforms.filter((item) => item.trim()).map((item) => item.trim());
  return {
    ...input,
    productName: input.productName.trim(),
    productSummary: input.productSummary.trim(),
    targetUsers: input.targetUsers.trim() || "业务用户、运营人员、管理员",
    domain: input.domain.trim() || "通用业务系统",
    platforms: platforms.length ? platforms : ["Web 管理端"],
    constraints: input.constraints?.trim() || undefined,
    outputDepth: input.outputDepth ?? "standard"
  };
};

const parseFeatureListDraft = (raw: string): Partial<FeatureListPlan> => {
  try {
    return parseJsonWithRepair<Partial<FeatureListPlan>>(raw);
  } catch {
    return {};
  }
};

const ensureModules = (
  modules: unknown,
  input: Pick<FeatureListGenerationRequest, "productName">
): FeatureModule[] => {
  const parsed = Array.isArray(modules) ? modules : [];
  const normalized = parsed
    .filter((item): item is Partial<FeatureModule> => Boolean(item) && typeof item === "object")
    .map((item, index) => ({
      id: normalizeId(item.id, `module-${index + 1}`),
      name: normalizeText(item.name, `模块 ${index + 1}`),
      description: normalizeText(item.description, "围绕核心业务场景沉淀的功能模块。"),
      parentId: item.parentId?.trim() || undefined,
      order: Number.isFinite(item.order) ? Number(item.order) : index + 1
    }))
    .sort((left, right) => left.order - right.order);

  if (normalized.length > 0) {
    return normalized;
  }

  return [
    { id: "module-1", name: "基础资料", description: "维护系统运行所需的基础对象和字典。", order: 1 },
    { id: "module-2", name: "业务办理", description: "承载用户最高频的核心业务操作。", order: 2 },
    { id: "module-3", name: "流程协同", description: "处理审批、通知、流转和跨角色协作。", order: 3 },
    { id: "module-4", name: "统计分析", description: `展示 ${input.productName} 的关键指标和运营结果。`, order: 4 }
  ];
};

const ensureFeatures = (
  features: unknown,
  modules: FeatureModule[],
  input: Pick<FeatureListGenerationRequest, "productName" | "targetUsers" | "outputDepth">
): FeatureItem[] => {
  const moduleIds = new Set(modules.map((module) => module.id));
  const fallbackModuleId = modules[0]?.id ?? "module-1";
  const parsed = Array.isArray(features) ? features : [];
  const normalized = parsed
    .filter((item): item is Partial<FeatureItem> => Boolean(item) && typeof item === "object")
    .map((item, index) => normalizeFeature(item, index, moduleIds, fallbackModuleId));

  if (normalized.length > 0) {
    return supplementFeatures(normalized, modules, input);
  }

  return buildFallbackFeatures(modules, input);
};

const normalizeFeature = (
  item: Partial<FeatureItem>,
  index: number,
  moduleIds: Set<string>,
  fallbackModuleId: string
): FeatureItem => {
  const id = normalizeId(item.id, `feature-${index + 1}`);
  const moduleId = item.moduleId && moduleIds.has(item.moduleId) ? item.moduleId : fallbackModuleId;
  return {
    id,
    moduleId,
    name: normalizeText(item.name, `功能 ${index + 1}`),
    description: normalizeText(item.description, "支持用户完成关键业务操作。"),
    userRoles: normalizeStringArray(item.userRoles, ["管理员"]),
    scenarios: normalizeStringArray(item.scenarios, ["日常业务处理"]),
    preconditions: normalizeStringArray(item.preconditions),
    mainFlow: normalizeStringArray(item.mainFlow, ["用户进入功能页面", "填写或确认业务信息", "提交并查看处理结果"]),
    exceptionFlows: normalizeStringArray(item.exceptionFlows, ["必填信息缺失时提示用户补充"]),
    businessRules: normalizeStringArray(item.businessRules, ["操作记录需保留审计信息"]),
    priority: normalizePriority(item.priority),
    complexity: normalizeComplexity(item.complexity),
    dependsOn: normalizeStringArray(item.dependsOn),
    fields: normalizeFields(item.fields),
    acceptanceCriteria: normalizeAcceptanceCriteria(item.acceptanceCriteria)
  };
};

const normalizeFields = (fields: unknown): FeatureFieldDefinition[] => {
  const parsed = Array.isArray(fields) ? fields : [];
  const normalized = parsed
    .filter((item): item is Partial<FeatureFieldDefinition> => Boolean(item) && typeof item === "object")
    .map((item, index) => ({
      id: normalizeId(item.id, `field-${index + 1}`),
      name: normalizeText(item.name, `字段 ${index + 1}`),
      key: normalizeText(item.key, `field${index + 1}`).replace(/\s+/g, ""),
      type: normalizeText(item.type, "string"),
      required: Boolean(item.required),
      defaultValue: item.defaultValue?.trim() || undefined,
      validationRule: item.validationRule?.trim() || undefined,
      enumValues: normalizeStringArray(item.enumValues),
      displayIn: normalizeStringArray(item.displayIn, ["详情页"]),
      editableBy: normalizeStringArray(item.editableBy, ["管理员"]),
      note: item.note?.trim() || undefined
    }));

  return normalized.length
    ? normalized
    : [
        {
          id: "field-1",
          name: "名称",
          key: "name",
          type: "string",
          required: true,
          validationRule: "不能为空，长度不超过 50 个字符",
          displayIn: ["列表页", "详情页"],
          editableBy: ["管理员"]
        }
      ];
};

const normalizeAcceptanceCriteria = (items: unknown): FeatureAcceptanceCriterion[] => {
  const parsed = Array.isArray(items) ? items : [];
  const normalized = parsed
    .filter((item): item is Partial<FeatureAcceptanceCriterion> => Boolean(item) && typeof item === "object")
    .map((item, index) => ({
      id: normalizeId(item.id, `ac-${index + 1}`),
      scenario: normalizeText(item.scenario, `验收场景 ${index + 1}`),
      given: normalizeText(item.given, "用户具备对应操作权限"),
      when: normalizeText(item.when, "用户提交有效信息"),
      then: normalizeText(item.then, "系统保存成功并反馈处理结果")
    }));

  return normalized.length
    ? normalized
    : [
        {
          id: "ac-1",
          scenario: "成功提交",
          given: "用户具备对应权限且已填写必填字段",
          when: "用户点击保存",
          then: "系统保存数据、展示成功提示并记录操作日志"
        }
      ];
};

const buildFallbackFeatures = (
  modules: FeatureModule[],
  input: Pick<FeatureListGenerationRequest, "productName" | "targetUsers">
): FeatureItem[] =>
  modules.flatMap((module, moduleIndex) =>
    ["列表查询", "新增编辑", "详情查看"].map((name, featureIndex) =>
      normalizeFeature(
        {
          id: `feature-${moduleIndex + 1}-${featureIndex + 1}`,
          moduleId: module.id,
          name: `${module.name}${name}`,
          description: `支持${input.targetUsers}在${input.productName}中完成${module.name}的${name}。`,
          priority: moduleIndex === 0 ? "P0" : "P1",
          fields: [
            { id: "field-name", name: "名称", key: "name", type: "string", required: true },
            { id: "field-status", name: "状态", key: "status", type: "enum", required: true, enumValues: ["启用", "停用"] }
          ]
        },
        moduleIndex * 3 + featureIndex,
        new Set(modules.map((item) => item.id)),
        modules[0]?.id ?? "module-1"
      )
    )
  );

const supplementFeatures = (
  features: FeatureItem[],
  modules: FeatureModule[],
  input: Pick<FeatureListGenerationRequest, "productName" | "targetUsers" | "outputDepth">
) => {
  const next = [...features];
  const moduleIdsWithFeature = new Set(next.map((feature) => feature.moduleId));
  for (const module of modules) {
    if (!moduleIdsWithFeature.has(module.id)) {
      next.push(buildSupplementalFeature(module, next.length, input, "核心维护"));
    }
  }

  const minimum = input.outputDepth === "detailed" ? 20 : input.outputDepth === "brief" ? 8 : 12;
  const suffixes = ["列表查询", "新增编辑", "详情查看", "权限控制", "导入导出", "统计看板"];
  while (next.length < minimum && modules.length > 0) {
    const module = modules[next.length % modules.length];
    const suffix = suffixes[next.length % suffixes.length];
    next.push(buildSupplementalFeature(module, next.length, input, suffix));
  }

  return next;
};

const buildSupplementalFeature = (
  module: FeatureModule,
  index: number,
  input: Pick<FeatureListGenerationRequest, "productName" | "targetUsers">,
  suffix: string
) =>
  normalizeFeature(
    {
      id: `feature-auto-${index + 1}`,
      moduleId: module.id,
      name: `${module.name}${suffix}`,
      description: `补充${input.productName}中${module.name}的${suffix}能力，保证该模块具备可落地的业务闭环。`,
      userRoles: input.targetUsers.split(/[、,\s]+/).filter(Boolean).slice(0, 3),
      priority: index < 6 ? "P1" : "P2",
      complexity: suffix.includes("权限") || suffix.includes("统计") ? "medium" : "low",
      businessRules: ["操作记录需保留审计信息", "数据展示需遵循当前用户的数据权限范围"],
      fields: [
        { id: "field-name", name: "名称", key: "name", type: "string", required: true },
        { id: "field-status", name: "状态", key: "status", type: "enum", required: true, enumValues: ["启用", "停用"] }
      ]
    },
    index,
    new Set([module.id]),
    module.id
  );

const buildDefaultAssumptions = (input: FeatureListGenerationRequest) => [
  `默认以 ${input.platforms.join("、")} 为主要使用端。`,
  `默认目标用户包含 ${input.targetUsers}。`,
  "默认先满足核心业务闭环，再补充统计、权限、审计和系统配置能力。"
];

const buildMarkdown = (plan: FeatureListPlan) => {
  const lines: string[] = [
    `# ${plan.title}`,
    "",
    `- 产品名称：${plan.productName}`,
    `- 业务领域：${plan.domain}`,
    `- 目标用户：${plan.targetUsers}`,
    `- 使用端：${plan.platforms.join("、")}`,
    `- 输出深度：${plan.outputDepth}`,
    `- 更新时间：${plan.updatedAt}`,
    ""
  ];

  if (plan.assumptions.length) {
    lines.push("## 生成假设", "", ...plan.assumptions.map((item) => `- ${item}`), "");
  }

  for (const module of plan.modules) {
    lines.push(`## ${module.order}. ${module.name}`, "", module.description, "");
    const features = plan.features.filter((feature) => feature.moduleId === module.id);
    for (const feature of features) {
      lines.push(
        `### ${feature.name}`,
        "",
        `- 优先级：${feature.priority}`,
        `- 复杂度：${feature.complexity}`,
        `- 角色：${feature.userRoles.join("、") || "未设置"}`,
        `- 依赖：${feature.dependsOn.join("、") || "无"}`,
        "",
        feature.description,
        "",
        "#### 业务规则",
        "",
        ...feature.businessRules.map((item) => `- ${item}`),
        "",
        "#### 字段表",
        "",
        "| 字段 | Key | 类型 | 必填 | 校验规则 | 展示位置 | 可编辑角色 |",
        "| --- | --- | --- | --- | --- | --- | --- |",
        ...feature.fields.map((field) =>
          `| ${field.name} | ${field.key} | ${field.type} | ${field.required ? "是" : "否"} | ${field.validationRule ?? ""} | ${(field.displayIn ?? []).join("、")} | ${(field.editableBy ?? []).join("、")} |`
        ),
        "",
        "#### 验收标准",
        "",
        ...feature.acceptanceCriteria.map(
          (item) => `- ${item.scenario}：Given ${item.given}，When ${item.when}，Then ${item.then}`
        ),
        ""
      );
    }
  }

  if (plan.reviewNotes.length) {
    lines.push("## 待人工确认", "", ...plan.reviewNotes.map((item) => `- ${item}`), "");
  }

  return lines.join("\n");
};

const normalizeId = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim() ? value.trim().replace(/\s+/g, "-") : fallback;

const normalizeText = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

const normalizeStringArray = (value: unknown, fallback: string[] = []) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim())
    : fallback;

const normalizePriority = (value: unknown): FeaturePriority =>
  value === "P0" || value === "P1" || value === "P2" || value === "P3" ? value : "P1";

const normalizeComplexity = (value: unknown): FeatureComplexity =>
  value === "low" || value === "medium" || value === "high" ? value : "medium";

const sanitizeFileName = (value: string) =>
  value.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "-").slice(0, 80) || "feature-list";
