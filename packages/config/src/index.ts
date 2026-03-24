export interface StorageConfig {
  reportsDir: string;
  chartsDir: string;
  templatesDir: string;
}

export interface RetrievalConfig {
  searchApiEndpoint?: string;
  searchApiKey?: string;
  serpApiKey?: string;
  skillBridgeEndpoint?: string;
  skillBridgeKey?: string;
}

export interface AppConfig {
  apiPort: number;
  webBaseUrl: string;
  storage: StorageConfig;
  retrieval: RetrievalConfig;
}

export const getAppConfig = (): AppConfig => ({
  apiPort: Number(process.env.API_PORT ?? 4100),
  webBaseUrl: process.env.WEB_BASE_URL ?? "http://localhost:3000",
  storage: {
    reportsDir: process.env.REPORTS_DIR ?? "./storage/reports",
    chartsDir: process.env.CHARTS_DIR ?? "./storage/charts",
    templatesDir: process.env.TEMPLATES_DIR ?? "./storage/templates"
  },
  retrieval: {
    searchApiEndpoint: process.env.SEARCH_API_ENDPOINT,
    searchApiKey: process.env.SEARCH_API_KEY,
    serpApiKey: process.env.SERPAPI_KEY,
    skillBridgeEndpoint: process.env.SKILL_BRIDGE_ENDPOINT,
    skillBridgeKey: process.env.SKILL_BRIDGE_KEY
  }
});
