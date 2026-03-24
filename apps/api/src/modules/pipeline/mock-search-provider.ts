import type { SearchDocument, SearchQuery } from "@studio/shared";
import type { SearchProvider } from "@studio/providers";

interface MockResultSeed {
  url: string;
  title: string;
  snippet: string;
  sourceType: SearchDocument["sourceType"];
  credibilityScore: number;
}

const TRACK_SEEDS: Array<{
  aliases: string[];
  seeds: MockResultSeed[];
}> = [
  {
    aliases: ["ai办公", "ai 办公", "办公助手", "ai助手", "知识助手"],
    seeds: [
      {
        url: "https://example.com/official/coze",
        title: "扣子空间企业版产品介绍",
        snippet: "面向企业办公场景，提供 AI 助手、工作流、知识库等能力。",
        sourceType: "official_site",
        credibilityScore: 0.9
      },
      {
        url: "https://example.com/news/yuque-ai",
        title: "语雀发布 AI 办公新能力",
        snippet: "强调知识沉淀、文档协作和智能问答的一体化能力。",
        sourceType: "news",
        credibilityScore: 0.76
      },
      {
        url: "https://example.com/media/dingtalk",
        title: "钉钉 AI 助手解决方案观察",
        snippet: "钉钉继续强化企业工作台、审批和组织协同场景。",
        sourceType: "industry_media",
        credibilityScore: 0.82
      },
      {
        url: "https://example.com/review/notion",
        title: "Notion AI 中文团队使用体验",
        snippet: "以文档与知识管理见长，但本地化和企业交付存在差异。",
        sourceType: "review",
        credibilityScore: 0.61
      }
    ]
  },
  {
    aliases: ["低代码", "零代码", "应用搭建"],
    seeds: [
      {
        url: "https://example.com/official/mingdao",
        title: "明道云低代码平台产品介绍",
        snippet: "强调表单、流程、应用搭建和组织协同，面向中小企业数字化。",
        sourceType: "official_site",
        credibilityScore: 0.9
      },
      {
        url: "https://example.com/official/yonghong",
        title: "永洪低代码平台能力盘点",
        snippet: "聚焦数据分析与低代码融合，覆盖业务应用搭建与管理分析。",
        sourceType: "industry_media",
        credibilityScore: 0.82
      },
      {
        url: "https://example.com/official/jiandaoyun",
        title: "简道云低代码方案",
        snippet: "从表单和流程切入，提供轻量级业务系统搭建能力。",
        sourceType: "official_site",
        credibilityScore: 0.88
      },
      {
        url: "https://example.com/news/ali-yida",
        title: "阿里宜搭发布低代码新能力",
        snippet: "加强行业模板与企业集成，服务中大型组织数字化。",
        sourceType: "news",
        credibilityScore: 0.78
      }
    ]
  },
  {
    aliases: ["生鲜", "买菜", "即时零售"],
    seeds: [
      {
        url: "https://example.com/official/dingdong",
        title: "叮咚买菜业务模式介绍",
        snippet: "前置仓模式、生鲜即时履约、强化品控和用户复购。",
        sourceType: "official_site",
        credibilityScore: 0.9
      },
      {
        url: "https://example.com/official/meituan-maicai",
        title: "美团买菜运营观察",
        snippet: "依托平台流量和即时配送能力，强化生鲜零售心智。",
        sourceType: "industry_media",
        credibilityScore: 0.82
      },
      {
        url: "https://example.com/official/hema",
        title: "盒马鲜生全渠道能力",
        snippet: "线下门店、线上履约、供应链品牌化同步推进。",
        sourceType: "official_site",
        credibilityScore: 0.88
      },
      {
        url: "https://example.com/news/pupu",
        title: "朴朴超市区域扩张动态",
        snippet: "持续深耕区域市场，优化前置仓和即时零售效率。",
        sourceType: "news",
        credibilityScore: 0.78
      }
    ]
  },
  {
    aliases: ["宠物食品", "宠物粮", "猫粮", "狗粮"],
    seeds: [
      {
        url: "https://example.com/official/myfoodie",
        title: "麦富迪宠物食品品牌介绍",
        snippet: "覆盖猫粮、狗粮、零食和湿粮，强调渠道覆盖和品牌化运营。",
        sourceType: "official_site",
        credibilityScore: 0.88
      },
      {
        url: "https://example.com/official/xianlang",
        title: "鲜朗高端宠物食品产品观察",
        snippet: "聚焦高品质原料和线上内容种草，强化年轻养宠用户心智。",
        sourceType: "industry_media",
        credibilityScore: 0.8
      },
      {
        url: "https://example.com/official/orijen",
        title: "渴望宠物粮品牌评测",
        snippet: "主打高蛋白和进口高端定位，在中高端宠物食品市场具备品牌认知。",
        sourceType: "review",
        credibilityScore: 0.76
      },
      {
        url: "https://example.com/news/netease-pet",
        title: "网易严选宠物食品新品策略",
        snippet: "依托电商品牌和内容能力切入宠物消费市场。",
        sourceType: "news",
        credibilityScore: 0.72
      }
    ]
  }
];

export class MockChineseSearchProvider implements SearchProvider {
  readonly providerName = "mock-chinese-search";

  async search(query: SearchQuery): Promise<SearchDocument[]> {
    const track = detectTrack(query.keyword);
    if (!track) {
      return [];
    }

    const crawledAt = new Date().toISOString();
    return track.seeds.map((seed, index) => ({
      id: `${query.keyword}-${index + 1}`,
      url: seed.url,
      title: seed.title,
      snippet: seed.snippet,
      sourceType: seed.sourceType,
      crawledAt,
      credibilityScore: seed.credibilityScore,
      language: "zh-CN"
    }));
  }
}

const detectTrack = (keyword: string) => {
  const normalized = keyword.replace(/\s+/g, "").toLowerCase();
  return TRACK_SEEDS.find((track) =>
    track.aliases.some((alias) => normalized.includes(alias.replace(/\s+/g, "").toLowerCase()))
  );
};
