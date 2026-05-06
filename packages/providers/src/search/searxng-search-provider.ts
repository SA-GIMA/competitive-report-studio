import type { SearchDocument, SearchQuery } from "@studio/shared";
import type { SearchProvider } from "./types.ts";
import { assertSafeHttpUrl } from "../url-security.ts";

interface SearxngSearchProviderOptions {
  endpoint: string;
  apiKey?: string;
  defaultLanguage?: string;
  engines?: string[];
  allowPrivateEndpoint?: boolean;
}

interface SearxngResponse {
  results?: Array<{
    url?: string;
    title?: string;
    content?: string;
    publishedDate?: string;
    category?: string;
    engine?: string;
  }>;
}

export class SearxngSearchProvider implements SearchProvider {
  readonly providerName = "searxng";
  private readonly options: SearxngSearchProviderOptions;

  constructor(options: SearxngSearchProviderOptions) {
    this.options = options;
  }

  async search(query: SearchQuery): Promise<SearchDocument[]> {
    const primary = await this.searchOnce(query, this.options.engines);
    if (primary.length > 0 || !this.options.engines || this.options.engines.length === 0) {
      return primary;
    }
    return this.searchOnce(query, undefined);
  }

  private async searchOnce(
    query: SearchQuery,
    engines?: string[]
  ): Promise<SearchDocument[]> {
    const url = await assertSafeHttpUrl(this.options.endpoint, {
      allowPrivate: this.options.allowPrivateEndpoint
    });
    url.searchParams.set("q", query.keyword);
    url.searchParams.set("format", "json");
    url.searchParams.set("language", this.options.defaultLanguage ?? "zh-CN");
    if (engines && engines.length > 0) {
      url.searchParams.set("engines", engines.join(","));
    } else {
      url.searchParams.set("categories", "general,news");
    }
    url.searchParams.set("safesearch", "0");

    const timeRange = mapTimeRange(query.timeRange);
    if (timeRange) {
      url.searchParams.set("time_range", timeRange);
    }

    const response = await fetch(url, {
      headers: this.options.apiKey ? { Authorization: `Bearer ${this.options.apiKey}` } : {}
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`SearXNG 检索失败: ${response.status} ${body}`);
    }

    const payload = (await response.json()) as SearxngResponse;
    return (payload.results ?? [])
      .filter((item) => item.url && item.title)
      .map((item, index) => ({
        id: `${query.keyword}-searxng-${index}`,
        url: item.url ?? "",
        title: item.title ?? "未命名结果",
        snippet: item.content ?? "",
        sourceType: inferSourceType(item.category, item.engine, item.url ?? ""),
        publishedAt: item.publishedDate,
        crawledAt: new Date().toISOString(),
        credibilityScore: scoreCredibility(item.url ?? "", item.engine),
        language: "zh-CN"
      }));
  }
}

const mapTimeRange = (timeRange?: string) => {
  if (!timeRange) {
    return undefined;
  }

  if (timeRange.includes("7")) {
    return "day";
  }
  if (timeRange.includes("30") || timeRange.includes("1 个月")) {
    return "month";
  }
  if (timeRange.includes("12") || timeRange.includes("年")) {
    return "year";
  }
  return undefined;
};

const inferSourceType = (
  category: string | undefined,
  engine: string | undefined,
  url: string
): SearchDocument["sourceType"] => {
  const normalized = `${category ?? ""} ${engine ?? ""} ${url}`.toLowerCase();
  if (normalized.includes("news") || normalized.includes("36kr") || normalized.includes("iyiou")) {
    return "industry_media";
  }
  if (normalized.includes("baike") || normalized.includes("zhihu") || normalized.includes("xiaohongshu")) {
    return "review";
  }
  if (normalized.includes("app")) {
    return "app_store";
  }
  if (normalized.includes("official") || normalized.includes(".gov.cn") || normalized.includes(".edu.cn")) {
    return "official_site";
  }
  return "news";
};

const scoreCredibility = (url: string, engine?: string) => {
  const normalized = `${url} ${engine ?? ""}`.toLowerCase();
  if (normalized.includes(".gov.cn") || normalized.includes(".edu.cn")) {
    return 0.95;
  }
  if (normalized.includes("baidu") || normalized.includes("bing") || normalized.includes("sogou")) {
    return 0.74;
  }
  if (normalized.includes("36kr.com") || normalized.includes("iyiou.com") || normalized.includes("geekpark.net")) {
    return 0.82;
  }
  if (normalized.includes("zhihu") || normalized.includes("xiaohongshu") || normalized.includes("tieba")) {
    return 0.48;
  }
  return 0.68;
};
