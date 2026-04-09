import type { SearchDocument, SearchQuery } from "@studio/shared";
import type { SearchProvider } from "./types.ts";

interface SkillBridgeSearchProviderOptions {
  endpoint: string;
  apiKey?: string;
  defaultLanguage?: string;
}

export class SkillBridgeSearchProvider implements SearchProvider {
  readonly providerName = "skill-bridge-search";
  private readonly options: SkillBridgeSearchProviderOptions;

  constructor(options: SkillBridgeSearchProviderOptions) {
    this.options = options;
  }

  async search(query: SearchQuery): Promise<SearchDocument[]> {
    const response = await fetch(this.options.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.options.apiKey ? { Authorization: `Bearer ${this.options.apiKey}` } : {})
      },
      body: JSON.stringify({
        query: query.keyword,
        timeRange: query.timeRange,
        language: this.options.defaultLanguage ?? "zh-CN",
        sourceHints: query.sourceHints ?? []
      })
    });

    if (!response.ok) {
      throw new Error(`Skill Bridge 检索失败: ${response.status}`);
    }

    const payload = (await response.json()) as {
      results?: Array<{
        url: string;
        title: string;
        snippet: string;
        publishedAt?: string;
        sourceType?: SearchDocument["sourceType"];
        credibilityScore?: number;
      }>;
    };

    return (payload.results ?? []).map((item, index) => ({
      id: `${query.keyword}-skill-${index}`,
      url: item.url,
      title: item.title,
      snippet: item.snippet,
      sourceType: item.sourceType ?? "industry_media",
      publishedAt: item.publishedAt,
      crawledAt: new Date().toISOString(),
      credibilityScore: item.credibilityScore ?? 0.72,
      language: "zh-CN"
    }));
  }
}
