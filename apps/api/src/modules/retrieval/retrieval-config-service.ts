import { join } from "node:path";
import { getAppConfig } from "@studio/config";
import type { RetrievalRuntimeConfig } from "@studio/shared";
import {
  OpenSearchProvider,
  SearxngSearchProvider,
  SerpApiBaiduSearchProvider,
  SkillBridgeSearchProvider,
  assertSafeHttpUrl
} from "@studio/providers";
import {
  EmbeddedSearxngManager,
  buildEmbeddedEndpoint,
  normalizeEmbeddedConfig
} from "./embedded-searxng-manager.ts";
import { RetrievalConfigStateStore } from "./retrieval-config-state-store.ts";

export class RetrievalConfigService {
  private readonly defaultConfig: RetrievalRuntimeConfig = {
    searxngMode: "embedded",
    searxngAutoStart: true,
    searxngPort: 18080,
    searxngEngines: ["bing", "baidu"],
    searxngAutocomplete: "baidu",
    ...getAppConfig().retrieval
  };
  private readonly store = new RetrievalConfigStateStore(
    join(process.cwd(), getAppConfig().storage.appStateDir, "retrieval-config.json")
  );
  private readonly embeddedSearxng = new EmbeddedSearxngManager(
    join(process.cwd(), getAppConfig().storage.appStateDir, "embedded-searxng")
  );
  private config: RetrievalRuntimeConfig;

  constructor() {
    this.config = this.normalize(this.store.load() ?? { ...this.defaultConfig });
  }

  get() {
    return this.withComputedEndpoint(this.config);
  }

  getPublic() {
    return redactRetrievalSecrets(this.get());
  }

  update(patch: Partial<RetrievalRuntimeConfig>) {
    this.config = this.normalize({
      ...this.config,
      ...patch
    });
    this.store.save(this.config);
    return this.config;
  }

  updatePublic(patch: Partial<RetrievalRuntimeConfig>) {
    return redactRetrievalSecrets(this.update(mergeRetrievalPatch(this.config, patch)));
  }

  reset() {
    this.config = this.normalize({ ...this.defaultConfig });
    this.store.save(this.config);
    return this.config;
  }

  resetPublic() {
    return redactRetrievalSecrets(this.reset());
  }

  async ensureEmbeddedSearxngReady() {
    const config = this.get();
    if (config.searxngMode !== "embedded") {
      return;
    }
    await this.embeddedSearxng.ensureReady(config);
  }

  async warmupEmbeddedSearxng() {
    const config = this.get();
    if (config.searxngMode !== "embedded" || !config.searxngAutoStart) {
      return;
    }
    await this.embeddedSearxng.ensureReady(config);
  }

  async getEmbeddedSearxngStatus() {
    return this.embeddedSearxng.getStatus(this.get());
  }

  async startEmbeddedSearxng() {
    this.update({
      searxngMode: "embedded"
    });
    await this.embeddedSearxng.ensureReady(this.get());
    return this.getEmbeddedSearxngStatus();
  }

  async stopEmbeddedSearxng() {
    return this.embeddedSearxng.stop(this.get());
  }

  getSearxngProviderOptions() {
    const config = this.get();
    if (!config.searxngEndpoint) {
      throw new Error("未配置 SearXNG Endpoint。");
    }
    return {
      endpoint: config.searxngEndpoint,
      apiKey: config.searxngKey,
      defaultLanguage: "zh-CN",
      engines: config.searxngEngines,
      allowPrivateEndpoint: config.searxngMode === "embedded"
    };
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

  async validateSearxng() {
    const config = this.get();
    if (config.searxngMode === "embedded") {
      await this.embeddedSearxng.ensureReady(config);
    }
    if (!config.searxngEndpoint) {
      return {
        ok: false,
        message: "未配置 SearXNG Endpoint",
        sampleCount: 0
      };
    }

    try {
      const provider = new SearxngSearchProvider(this.getSearxngProviderOptions());
      const results = await provider.search({
        keyword: "中国 AI 办公助手 竞品",
        timeRange: "近 12 个月"
      });
      return {
        ok: results.length > 0,
        message: results.length > 0 ? "SearXNG 可用" : "SearXNG 返回为空",
        sampleCount: results.length
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "SearXNG 校验失败",
        sampleCount: 0
      };
    }
  }

  async checkSearxngRuntime() {
    const config = this.get();
    if (!config.searxngEndpoint) {
      return {
        ok: false,
        message: "未配置 SearXNG Endpoint",
        endpoint: "",
        mode: config.searxngMode ?? "embedded"
      };
    }

    if (config.searxngMode === "embedded") {
      const status = await this.embeddedSearxng.getStatus(config);
      return {
        ok: status.healthy,
        message: status.healthy
          ? "内置 SearXNG 正在运行"
          : status.installed
            ? "内置 SearXNG 已安装但未运行"
            : "内置 SearXNG 尚未安装",
        endpoint: status.endpoint,
        mode: status.mode
      };
    }

    try {
      const url = await assertSafeHttpUrl(config.searxngEndpoint);
      url.searchParams.set("q", "SearXNG 健康检查");
      url.searchParams.set("format", "json");
      const response = await fetch(url);
      return {
        ok: response.ok,
        message: response.ok ? "外部 SearXNG Endpoint 可访问" : `外部 SearXNG 返回 ${response.status}`,
        endpoint: config.searxngEndpoint,
        mode: "remote" as const
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "SearXNG 运行状态检测失败",
        endpoint: config.searxngEndpoint,
        mode: "remote" as const
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

  private normalize(config: RetrievalRuntimeConfig) {
    return this.withComputedEndpoint(normalizeEmbeddedConfig(config));
  }

  private withComputedEndpoint(config: RetrievalRuntimeConfig): RetrievalRuntimeConfig {
    if (config.searxngMode !== "embedded") {
      return config;
    }
    return {
      ...config,
      searxngEndpoint: buildEmbeddedEndpoint(config.searxngPort)
    };
  }
}

const REDACTED_SECRET = "********";

const redactSecret = (value: string | undefined) => {
  if (!value || /^\$\{.+\}$/.test(value)) {
    return value;
  }
  return REDACTED_SECRET;
};

const redactRetrievalSecrets = (config: RetrievalRuntimeConfig): RetrievalRuntimeConfig => ({
  ...config,
  searchApiKey: redactSecret(config.searchApiKey),
  searxngKey: redactSecret(config.searxngKey),
  serpApiKey: redactSecret(config.serpApiKey),
  skillBridgeKey: redactSecret(config.skillBridgeKey)
});

const mergeRetrievalPatch = (
  current: RetrievalRuntimeConfig,
  patch: Partial<RetrievalRuntimeConfig>
): Partial<RetrievalRuntimeConfig> => ({
  ...patch,
  searchApiKey: preserveRedacted(current.searchApiKey, patch.searchApiKey),
  searxngKey: preserveRedacted(current.searxngKey, patch.searxngKey),
  serpApiKey: preserveRedacted(current.serpApiKey, patch.serpApiKey),
  skillBridgeKey: preserveRedacted(current.skillBridgeKey, patch.skillBridgeKey)
});

const preserveRedacted = (current: string | undefined, next: string | undefined) =>
  next === REDACTED_SECRET ? current : next;
