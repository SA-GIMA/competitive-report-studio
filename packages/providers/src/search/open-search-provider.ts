import type { SearchDocument, SearchQuery } from "@studio/shared";
import type { SearchProvider } from "./types.ts";
import { assertSafeHttpUrl } from "../url-security.ts";

interface SearchProviderOptions {
  endpoint: string;
  apiKey?: string;
  defaultLanguage?: string;
  allowPrivateEndpoint?: boolean;
}

export class OpenSearchProvider implements SearchProvider {
  readonly providerName = "open-search";
  private readonly options: SearchProviderOptions;

  constructor(options: SearchProviderOptions) {
    this.options = options;
  }

  async search(query: SearchQuery): Promise<SearchDocument[]> {
    const url = await assertSafeHttpUrl(this.options.endpoint, {
      allowPrivate: this.options.allowPrivateEndpoint
    });
    url.searchParams.set("q", query.keyword);
    url.searchParams.set("language", this.options.defaultLanguage ?? "zh-CN");
    if (query.timeRange) {
      url.searchParams.set("time_range", query.timeRange);
    }

    const response = await fetch(url, {
      headers: this.options.apiKey ? { Authorization: `Bearer ${this.options.apiKey}` } : {}
    });

    if (!response.ok) {
      throw new Error(`检索失败: ${response.status}`);
    }

    const payload = (await response.json()) as {
      results?: Array<{
        url: string;
        title: string;
        content: string;
        published_at?: string;
        source_type?: SearchDocument["sourceType"];
      }>;
    };

    return (payload.results ?? []).map((item, index) => ({
      id: `${query.keyword}-${index}`,
      url: item.url,
      title: item.title,
      snippet: item.content,
      sourceType: item.source_type ?? "news",
      publishedAt: item.published_at,
      crawledAt: new Date().toISOString(),
      credibilityScore: scoreCredibility(item.url),
      language: "zh-CN"
    }));
  }
}

const scoreCredibility = (url: string) => {
  if (url.includes(".gov.cn") || url.includes(".edu.cn")) {
    return 0.95;
  }
  if (url.includes("36kr.com") || url.includes("iyiou.com") || url.includes("geekpark.net")) {
    return 0.82;
  }
  if (url.includes("xiaohongshu") || url.includes("tieba")) {
    return 0.45;
  }
  return 0.68;
};
