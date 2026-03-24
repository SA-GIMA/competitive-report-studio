import Fastify from "fastify";
import { OpenSearchProvider } from "@studio/providers";
import type { SearchDocument } from "@studio/shared";

const app = Fastify({ logger: true });

app.get("/health", async () => ({ ok: true }));

app.post("/search", async (request) => {
  const body = request.body as {
    query: string;
    timeRange?: string;
    language?: string;
    sourceHints?: string[];
  };

  const endpoint = process.env.BRIDGE_UPSTREAM_SEARCH_ENDPOINT;
  const apiKey = process.env.BRIDGE_UPSTREAM_SEARCH_KEY;

  if (endpoint) {
    const provider = new OpenSearchProvider({
      endpoint,
      apiKey,
      defaultLanguage: body.language ?? "zh-CN"
    });
    const results = await provider.search({
      keyword: body.query,
      timeRange: body.timeRange,
      sourceHints: body.sourceHints
    });

    return {
      results: results.map(mapDocument)
    };
  }

  return {
    results: buildFallbackResults(body.query)
  };
});

const port = Number(process.env.SKILL_BRIDGE_PORT ?? 4200);

app
  .listen({ port, host: "0.0.0.0" })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

const mapDocument = (doc: SearchDocument) => ({
  url: doc.url,
  title: doc.title,
  snippet: doc.snippet,
  publishedAt: doc.publishedAt,
  sourceType: doc.sourceType,
  credibilityScore: doc.credibilityScore
});

const buildFallbackResults = (query: string) => {
  const normalized = query.replace(/\s+/g, "");
  const track = inferTrackLabel(normalized);
  const base = new Date().toISOString();

  return [
    {
      url: `https://bridge.example.com/${encodeURIComponent(track)}/official-1`,
      title: `${track}官方资料与产品介绍`,
      snippet: `围绕 ${track} 的产品定位、核心功能、价格模式和渠道策略整理。`,
      publishedAt: base,
      sourceType: "official_site",
      credibilityScore: 0.78
    },
    {
      url: `https://bridge.example.com/${encodeURIComponent(track)}/media-1`,
      title: `${track}行业媒体观察`,
      snippet: `聚焦 ${track} 市场动态、竞品动作和用户反馈。`,
      publishedAt: base,
      sourceType: "industry_media",
      credibilityScore: 0.72
    },
    {
      url: `https://bridge.example.com/${encodeURIComponent(track)}/news-1`,
      title: `${track}最新新闻与市场事件`,
      snippet: `追踪 ${track} 的行业新闻、融资动向和产品发布。`,
      publishedAt: base,
      sourceType: "news",
      credibilityScore: 0.68
    }
  ];
};

const inferTrackLabel = (query: string) => {
  const matchers = [
    /中国(.{2,30}?)(?:竞品|官网|行业媒体|用户评价|商业模式)/,
    /分析(.{2,30}?)(?:赛道|行业|市场|竞品)/,
    /帮我分析(.{2,30}?)(?:赛道|行业|市场|竞品)/
  ];

  for (const matcher of matchers) {
    const matched = query.match(matcher)?.[1]?.trim();
    if (matched) {
      return matched;
    }
  }

  return "通用赛道";
};
