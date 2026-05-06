import type { SearchDocument, SearchQuery } from "@studio/shared";
import type { SearchProvider } from "./types.ts";
import { assertSafeHttpUrl } from "../url-security.ts";

interface SerpApiBaiduSearchProviderOptions {
  apiKey: string;
  endpoint?: string;
}

interface SerpApiResponse {
  organic_results?: Array<{
    title?: string;
    link?: string;
    snippet?: string;
    date?: string;
  }>;
}

export class SerpApiBaiduSearchProvider implements SearchProvider {
  readonly providerName = "serpapi-baidu";
  private readonly options: SerpApiBaiduSearchProviderOptions;

  constructor(options: SerpApiBaiduSearchProviderOptions) {
    this.options = options;
  }

  async search(query: SearchQuery): Promise<SearchDocument[]> {
    const url = await assertSafeHttpUrl(this.options.endpoint ?? "https://serpapi.com/search");
    url.searchParams.set("engine", "baidu");
    url.searchParams.set("q", query.keyword);
    url.searchParams.set("api_key", this.options.apiKey);

    const response = await fetch(url);
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`SerpAPI 检索失败: ${response.status} ${body}`);
    }

    const payload = (await response.json()) as SerpApiResponse;
    return (payload.organic_results ?? []).map((item, index) => ({
      id: `${query.keyword}-serpapi-${index}`,
      url: item.link ?? "",
      title: item.title ?? "未命名结果",
      snippet: item.snippet ?? "",
      sourceType: inferSourceType(item.link ?? ""),
      publishedAt: item.date,
      crawledAt: new Date().toISOString(),
      credibilityScore: scoreCredibility(item.link ?? ""),
      language: "zh-CN"
    }));
  }
}

const inferSourceType = (url: string): SearchDocument["sourceType"] => {
  if (url.includes("app")) {
    return "app_store";
  }
  if (url.includes("36kr") || url.includes("iyiou") || url.includes("geekpark")) {
    return "industry_media";
  }
  if (url.includes("zhihu") || url.includes("xiaohongshu")) {
    return "review";
  }
  return "news";
};

const scoreCredibility = (url: string) => {
  if (url.includes(".gov.cn") || url.includes(".edu.cn")) {
    return 0.95;
  }
  if (url.includes("36kr.com") || url.includes("iyiou.com") || url.includes("geekpark.net")) {
    return 0.82;
  }
  return 0.68;
};
