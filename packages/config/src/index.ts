import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface StorageConfig {
  reportsDir: string;
  chartsDir: string;
  templatesDir: string;
  materialsDir: string;
  appStateDir: string;
}

export interface RetrievalConfig {
  searchApiEndpoint?: string;
  searchApiKey?: string;
  searxngMode?: "remote" | "embedded";
  searxngEndpoint?: string;
  searxngKey?: string;
  searxngAutoStart?: boolean;
  searxngPort?: number;
  searxngEngines?: string[];
  searxngAutocomplete?: string;
  serpApiKey?: string;
  skillBridgeEndpoint?: string;
  skillBridgeKey?: string;
}

export interface AppConfig {
  apiPort: number;
  apiHost: string;
  apiToken?: string;
  webBaseUrl: string;
  corsOrigins: string[];
  storage: StorageConfig;
  retrieval: RetrievalConfig;
}

interface PersistedNetworkAccessConfig {
  apiHost?: string;
  apiPort?: number;
  webBaseUrl?: string;
  corsOrigins?: string[];
  lanAccessEnabled?: boolean;
}

export const getAppConfig = (): AppConfig => {
  const storage = {
    reportsDir: process.env.REPORTS_DIR ?? "./storage/reports",
    chartsDir: process.env.CHARTS_DIR ?? "./storage/charts",
    templatesDir: process.env.TEMPLATES_DIR ?? "./storage/templates",
    materialsDir: process.env.MATERIALS_DIR ?? "./storage/materials",
    appStateDir: process.env.APP_STATE_DIR ?? "./storage/app-state"
  };
  const persistedNetwork = readPersistedNetworkAccessConfig(storage.appStateDir);
  const webBaseUrl = process.env.WEB_BASE_URL ?? persistedNetwork.webBaseUrl ?? "http://localhost:3000";

  return {
    apiPort: Number(process.env.API_PORT ?? persistedNetwork.apiPort ?? 4100),
    apiHost: process.env.API_HOST ?? persistedNetwork.apiHost ?? "127.0.0.1",
    apiToken: process.env.API_TOKEN,
    webBaseUrl,
    corsOrigins: process.env.CORS_ORIGINS
      ? parseCorsOrigins(process.env.CORS_ORIGINS, webBaseUrl)
      : normalizeCorsOrigins(persistedNetwork.corsOrigins, webBaseUrl),
    storage,
    retrieval: {
      searchApiEndpoint: process.env.SEARCH_API_ENDPOINT,
      searchApiKey: process.env.SEARCH_API_KEY,
      searxngMode:
        process.env.SEARXNG_MODE === "remote" ? "remote" : process.env.SEARXNG_MODE === "embedded" ? "embedded" : undefined,
      searxngEndpoint: process.env.SEARXNG_ENDPOINT,
      searxngKey: process.env.SEARXNG_KEY,
      searxngAutoStart:
        process.env.SEARXNG_AUTO_START === undefined
          ? undefined
          : process.env.SEARXNG_AUTO_START !== "false",
      searxngPort: process.env.SEARXNG_PORT ? Number(process.env.SEARXNG_PORT) : undefined,
      searxngEngines: process.env.SEARXNG_ENGINES
        ?.split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      searxngAutocomplete: process.env.SEARXNG_AUTOCOMPLETE,
      serpApiKey: process.env.SERPAPI_KEY,
      skillBridgeEndpoint: process.env.SKILL_BRIDGE_ENDPOINT,
      skillBridgeKey: process.env.SKILL_BRIDGE_KEY
    }
  };
};

const parseCorsOrigins = (raw: string | undefined, webBaseUrl: string) =>
  Array.from(
    new Set(
      [
        webBaseUrl,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        ...(raw?.split(",") ?? [])
      ]
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );

const normalizeCorsOrigins = (persistedOrigins: string[] | undefined, webBaseUrl: string) =>
  persistedOrigins?.length
    ? Array.from(new Set(persistedOrigins.map((item) => item.trim()).filter(Boolean)))
    : parseCorsOrigins(undefined, webBaseUrl);

const readPersistedNetworkAccessConfig = (appStateDir: string): PersistedNetworkAccessConfig => {
  const filePath = join(process.cwd(), appStateDir, "network-access-config.json");
  if (!existsSync(filePath)) {
    return {};
  }

  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as PersistedNetworkAccessConfig;
    return {
      apiHost: parsed.apiHost,
      apiPort: parsed.apiPort,
      webBaseUrl: parsed.webBaseUrl,
      corsOrigins: Array.isArray(parsed.corsOrigins) ? parsed.corsOrigins : undefined,
      lanAccessEnabled: typeof parsed.lanAccessEnabled === "boolean" ? parsed.lanAccessEnabled : undefined
    };
  } catch {
    return {};
  }
};
