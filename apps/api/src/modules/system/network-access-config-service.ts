import { join } from "node:path";
import { networkInterfaces } from "node:os";
import { getAppConfig } from "@studio/config";
import type { NetworkAccessConfig, NetworkAccessConfigResponse } from "@studio/shared";
import { NetworkAccessConfigStateStore } from "./network-access-config-state-store.ts";

const RESTART_FIELDS: Array<keyof NetworkAccessConfig> = ["apiHost", "apiPort", "webBaseUrl"];

export class NetworkAccessConfigService {
  private readonly bootConfig = getAppConfig();
  private readonly defaultConfig: NetworkAccessConfig = {
    apiHost: this.bootConfig.apiHost,
    apiPort: this.bootConfig.apiPort,
    webBaseUrl: this.bootConfig.webBaseUrl,
    corsOrigins: this.bootConfig.corsOrigins,
    lanAccessEnabled: false
  };
  private readonly store = new NetworkAccessConfigStateStore(
    join(process.cwd(), this.bootConfig.storage.appStateDir, "network-access-config.json")
  );
  private config: NetworkAccessConfig;

  constructor() {
    this.config = this.normalize(this.store.load() ?? this.defaultConfig);
  }

  get(): NetworkAccessConfigResponse {
    return this.toResponse(this.config);
  }

  update(patch: Partial<NetworkAccessConfig>): NetworkAccessConfigResponse {
    this.config = this.normalize({
      ...this.config,
      ...patch
    });
    this.store.save(this.config);
    return this.toResponse(this.config);
  }

  isCorsOriginAllowed(origin: string | undefined) {
    if (!origin) {
      return true;
    }
    if (this.config.corsOrigins.includes("*") || this.config.corsOrigins.includes(origin)) {
      return true;
    }
    return this.config.lanAccessEnabled && isLanFrontendOrigin(origin);
  }

  private normalize(config: NetworkAccessConfig): NetworkAccessConfig {
    return {
      apiHost: normalizeApiHost(config.apiHost),
      apiPort: normalizeApiPort(config.apiPort),
      webBaseUrl: normalizeWebBaseUrl(config.webBaseUrl),
      corsOrigins: normalizeCorsOrigins(config.corsOrigins),
      lanAccessEnabled: typeof config.lanAccessEnabled === "boolean" ? config.lanAccessEnabled : false
    };
  }

  private toResponse(config: NetworkAccessConfig): NetworkAccessConfigResponse {
    const restartFields = RESTART_FIELDS.filter((field) => config[field] !== this.defaultConfig[field]);
    const localNetworkIps = getLocalNetworkIps();
    return {
      ...config,
      activeApiHost: this.defaultConfig.apiHost,
      activeApiPort: this.defaultConfig.apiPort,
      activeWebBaseUrl: this.defaultConfig.webBaseUrl,
      activeCorsOrigins: this.config.corsOrigins,
      activeLanAccessEnabled: this.config.lanAccessEnabled,
      localNetworkIps,
      lanFrontendUrls: localNetworkIps.map((ip) => `http://${ip}:3001`),
      lanApiUrls: localNetworkIps.map((ip) => `http://${ip}:${this.defaultConfig.apiPort}`),
      restartRequired: restartFields.length > 0,
      restartFields
    };
  }
}

const normalizeApiHost = (host: string) => {
  const normalized = host.trim();
  if (!["127.0.0.1", "0.0.0.0", "localhost", "::1"].includes(normalized)) {
    throw new Error("API 监听地址仅支持 127.0.0.1、0.0.0.0、localhost 或 ::1。");
  }
  return normalized;
};

const normalizeApiPort = (port: number) => {
  const normalized = Number(port);
  if (!Number.isInteger(normalized) || normalized < 1 || normalized > 65535) {
    throw new Error("API 端口必须是 1 到 65535 之间的整数。");
  }
  return normalized;
};

const normalizeWebBaseUrl = (webBaseUrl: string) => {
  const normalized = webBaseUrl.trim();
  if (!/^https?:\/\//.test(normalized)) {
    throw new Error("前端 Base URL 需要以 http:// 或 https:// 开头。");
  }
  return normalized.replace(/\/$/, "");
};

const normalizeCorsOrigins = (origins: string[]) => {
  const normalized = origins.map((item) => item.trim().replace(/\/$/, "")).filter(Boolean);
  if (normalized.includes("*")) {
    return ["*"];
  }
  if (normalized.some((item) => !/^https?:\/\//.test(item))) {
    throw new Error("CORS 允许来源需要填写完整来源，例如 http://localhost:3000，或单独填写 *。");
  }
  return Array.from(new Set(normalized));
};

const isLanFrontendOrigin = (origin: string) => {
  try {
    const parsed = new URL(origin);
    return parsed.protocol === "http:" && parsed.port === "3001" && parsed.hostname !== "";
  } catch {
    return false;
  }
};

const getLocalNetworkIps = () => {
  const addresses = Object.values(networkInterfaces())
    .flatMap((items) => items ?? [])
    .filter((item) => item.family === "IPv4" && !item.internal)
    .map((item) => item.address);

  return Array.from(new Set(addresses)).sort();
};
