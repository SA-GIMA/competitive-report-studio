import { getAppConfig } from "@studio/config";
import type { RetrievalRuntimeConfig } from "@studio/shared";
import {
  OpenSearchProvider,
  SerpApiBaiduSearchProvider,
  SkillBridgeSearchProvider
} from "@studio/providers";

export class RetrievalConfigService {
  private config: RetrievalRuntimeConfig = {
    ...getAppConfig().retrieval
  };

  get() {
    return this.config;
  }

  update(patch: Partial<RetrievalRuntimeConfig>) {
    this.config = {
      ...this.config,
      ...patch
    };
    return this.config;
  }

  async validateSearchApi() {
    if (!this.config.searchApiEndpoint) {
      return {
        ok: false,
        message: "未配置 Search API Endpoint",
        sampleCount: 0
      };
    }

    try {
      const provider = new OpenSearchProvider({
        endpoint: this.config.searchApiEndpoint,
        apiKey: this.config.searchApiKey,
        defaultLanguage: "zh-CN"
      });
      const results = await provider.search({
        keyword: "中国 AI 办公助手 竞品",
        timeRange: "近 12 个月"
      });
      return {
        ok: results.length > 0,
        message: results.length > 0 ? "Search API 可用" : "Search API 返回为空",
        sampleCount: results.length
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Search API 校验失败",
        sampleCount: 0
      };
    }
  }

  async validateSerpApiBaidu() {
    if (!this.config.serpApiKey) {
      return {
        ok: false,
        message: "未配置 SerpAPI Key",
        sampleCount: 0
      };
    }

    try {
      const provider = new SerpApiBaiduSearchProvider({
        apiKey: this.config.serpApiKey
      });
      const results = await provider.search({
        keyword: "中国 AI 办公助手 竞品",
        timeRange: "近 12 个月"
      });
      return {
        ok: results.length > 0,
        message: results.length > 0 ? "SerpAPI(Baidu) 可用" : "SerpAPI(Baidu) 返回为空",
        sampleCount: results.length
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "SerpAPI(Baidu) 校验失败",
        sampleCount: 0
      };
    }
  }

  async validateSkillBridge() {
    if (!this.config.skillBridgeEndpoint) {
      return {
        ok: false,
        message: "未配置 Skill Bridge Endpoint",
        sampleCount: 0
      };
    }

    try {
      const provider = new SkillBridgeSearchProvider({
        endpoint: this.config.skillBridgeEndpoint,
        apiKey: this.config.skillBridgeKey,
        defaultLanguage: "zh-CN"
      });
      const results = await provider.search({
        keyword: "中国低代码平台 竞品",
        timeRange: "近 12 个月"
      });
      return {
        ok: results.length > 0,
        message: results.length > 0 ? "Skill Bridge 可用" : "Skill Bridge 返回为空",
        sampleCount: results.length
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Skill Bridge 校验失败",
        sampleCount: 0
      };
    }
  }
}
