import type { WordTemplateDefinition } from "@studio/shared";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { getAppConfig } from "@studio/config";
import { TemplateStateStore } from "./template-state-store.ts";

const now = new Date().toISOString();
const MAX_TEMPLATE_BYTES = 10 * 1024 * 1024;

const executiveTemplate: WordTemplateDefinition = {
  id: "tpl-executive-zh",
  name: "汇报版",
  style: "executive",
  description: "适合老板汇报，重结论、重图表、章节精简。",
  fileKey: "templates/executive_cn.docx",
  createdAt: now,
  updatedAt: now,
  sections: [
    {
      id: "industry_background",
      title: "第一章 行业背景",
      description: "描述赛道趋势、阶段和驱动因素。",
      order: 1,
      enabled: true,
      placeholderKey: "section.industry_background"
    },
    {
      id: "competitor_list",
      title: "第二章 竞品清单",
      description: "列出直接、间接与替代型竞品。",
      order: 2,
      enabled: true,
      placeholderKey: "section.competitor_list"
    },
    {
      id: "competitor_profiles",
      title: "第三章 重点竞品画像",
      description: "梳理代表竞品的定位与切入路径。",
      order: 3,
      enabled: true,
      placeholderKey: "section.competitor_profiles"
    },
    {
      id: "market_drivers",
      title: "第四章 市场驱动因素",
      description: "分析需求变化和采购动机。",
      order: 4,
      enabled: true,
      placeholderKey: "section.market_drivers"
    },
    {
      id: "feature_comparison",
      title: "第五章 核心功能对比",
      description: "突出功能与场景能力差异。",
      order: 5,
      enabled: true,
      placeholderKey: "section.feature_comparison"
    },
    {
      id: "pricing_business",
      title: "第六章 价格与商业模式",
      description: "分析收费方式与商业结构。",
      order: 6,
      enabled: true,
      placeholderKey: "section.pricing_business"
    },
    {
      id: "channel_strategy",
      title: "第七章 渠道与市场动作",
      description: "观察渠道策略和增长动作。",
      order: 7,
      enabled: true,
      placeholderKey: "section.channel_strategy"
    },
    {
      id: "strength_weakness",
      title: "第八章 优势与短板",
      description: "总结竞争格局中的差异点。",
      order: 8,
      enabled: true,
      placeholderKey: "section.strength_weakness"
    },
    {
      id: "risk_assessment",
      title: "第九章 风险判断",
      description: "识别竞争和交付风险。",
      order: 9,
      enabled: true,
      placeholderKey: "section.risk_assessment"
    },
    {
      id: "opportunities",
      title: "第十章 机会点",
      description: "归纳市场切入机会。",
      order: 10,
      enabled: true,
      placeholderKey: "section.opportunities"
    },
    {
      id: "recommendations",
      title: "第十一章 策略建议",
      description: "形成行动建议和路线图。",
      order: 11,
      enabled: true,
      placeholderKey: "section.recommendations"
    }
  ],
  placeholders: [
    { key: "{{report.title}}", label: "报告标题", type: "text", required: true, bindingPath: "report.title" },
    {
      key: "{{report.executive_summary}}",
      label: "执行摘要",
      type: "markdown",
      required: true,
      bindingPath: "report.executiveSummary"
    },
    {
      key: "{{charts.feature_matrix}}",
      label: "功能对比图",
      type: "chart",
      required: false,
      bindingPath: "charts.feature_matrix"
    },
    {
      key: "{{charts.channel_matrix}}",
      label: "渠道对比图",
      type: "chart",
      required: false,
      bindingPath: "charts.channel_matrix"
    },
    {
      key: "{{appendix.sources}}",
      label: "附录参考资料",
      type: "list",
      required: true,
      bindingPath: "appendix.sources"
    }
  ]
};

const researchTemplate: WordTemplateDefinition = {
  ...executiveTemplate,
  id: "tpl-research-zh",
  name: "深度研究版",
  style: "research",
  description: "适合战略、投资和行业研究，章节更全。",
  fileKey: "templates/research_cn.docx"
};

const briefTemplate: WordTemplateDefinition = {
  ...executiveTemplate,
  id: "tpl-brief-zh",
  name: "简洁版",
  style: "brief",
  description: "适合周报、月报和快速汇报。",
  fileKey: "templates/brief_cn.docx",
  sections: executiveTemplate.sections.slice(0, 5)
};

export class TemplateService {
  private readonly templates = new Map<string, WordTemplateDefinition>();
  private readonly store = new TemplateStateStore(
    join(process.cwd(), getAppConfig().storage.appStateDir, "templates.json")
  );

  constructor() {
    const persistedTemplates = this.store.load();
    const defaults = [executiveTemplate, researchTemplate, briefTemplate];

    for (const template of defaults) {
      this.templates.set(template.id, template);
    }

    for (const template of persistedTemplates) {
      if (template?.id) {
        this.templates.set(template.id, template);
      }
    }
  }

  list() {
    return Array.from(this.templates.values());
  }

  get(templateId: string) {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`模板不存在: ${templateId}`);
    }
    return template;
  }

  upsert(template: WordTemplateDefinition) {
    const next = {
      ...template,
      updatedAt: new Date().toISOString()
    };
    this.templates.set(template.id, next);
    this.persist();
    return next;
  }

  update(templateId: string, patch: Partial<WordTemplateDefinition>) {
    const current = this.get(templateId);
    const next = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString()
    };
    this.templates.set(templateId, next);
    this.persist();
    return next;
  }

  async upload(input: {
    name: string;
    style: WordTemplateDefinition["style"];
    description: string;
    fileName: string;
    fileContentBase64: string;
  }) {
    const config = getAppConfig();
    const templateId = `tpl-upload-${randomUUID().slice(0, 8)}`;
    const safeName = basename(input.fileName || `${templateId}.docx`);
    if (extname(safeName).toLowerCase() !== ".docx") {
      throw new Error("模板上传仅支持 docx 文件。");
    }
    const buffer = Buffer.from(input.fileContentBase64, "base64");
    if (!buffer.length) {
      throw new Error("模板文件为空，请重新选择文件。");
    }
    if (buffer.length > MAX_TEMPLATE_BYTES) {
      throw new Error("模板文件不能超过 10MB。");
    }
    const filePath = join(process.cwd(), config.storage.templatesDir, safeName);
    await mkdir(join(process.cwd(), config.storage.templatesDir), { recursive: true });
    await writeFile(filePath, buffer);

    const template: WordTemplateDefinition = {
      id: templateId,
      name: input.name,
      style: input.style,
      description: input.description,
      fileKey: filePath,
      sections: executiveTemplate.sections,
      placeholders: executiveTemplate.placeholders,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.templates.set(template.id, template);
    this.persist();
    return template;
  }

  private persist() {
    this.store.save(this.list());
  }
}
