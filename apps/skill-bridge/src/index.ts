import Fastify from "fastify";
import { OpenSearchProvider } from "@studio/providers";
import type { SearchDocument } from "@studio/shared";

const app = Fastify({ logger: true });
const token = process.env.SKILL_BRIDGE_TOKEN;

app.get("/health", async () => ({ ok: true }));

app.addHook("onRequest", async (request, reply) => {
  if (!token || request.url === "/health") {
    return;
  }

  if (request.headers.authorization !== `Bearer ${token}`) {
    await reply.code(401).send({ message: "未授权，请提供有效 Skill Bridge Token。" });
  }
});

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
const host = process.env.SKILL_BRIDGE_HOST ?? "127.0.0.1";
assertSafeServerBinding(host, token);

app
  .listen({ port, host })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

function assertSafeServerBinding(bindHost: string, bridgeToken: string | undefined) {
  const normalizedHost = bindHost.trim().toLowerCase();
  const isLoopback =
    normalizedHost === "127.0.0.1" ||
    normalizedHost === "localhost" ||
    normalizedHost === "::1";

  if (!isLoopback && !bridgeToken) {
    throw new Error("SKILL_BRIDGE_HOST 绑定到非本机地址时必须设置 SKILL_BRIDGE_TOKEN。");
  }
}

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
