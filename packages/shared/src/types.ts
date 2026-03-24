export type TaskType =
  | "product_competitor"
  | "brand_competitor"
  | "substitute_competitor"
  | "channel_competitor"
  | "price_band_competitor";

export type CompetitorLayer = "direct" | "indirect" | "substitute";

export type TaskStatus =
  | "draft"
  | "awaiting_confirmation"
  | "queued"
  | "running"
  | "failed"
  | "completed";

export type ChartType =
  | "pie"
  | "bar"
  | "line"
  | "quadrant"
  | "comparison_table";

export type RetrievalMode =
  | "mock"
  | "search_api"
  | "serpapi_baidu"
  | "skill_bridge"
  | "hybrid";

export interface RetrievalRuntimeConfig {
  searchApiEndpoint?: string;
  searchApiKey?: string;
  serpApiKey?: string;
  skillBridgeEndpoint?: string;
  skillBridgeKey?: string;
}

export interface ModelConnectionConfig {
  id: string;
  provider: string;
  label: string;
  baseUrl: string;
  apiKeyRef: string;
  model: string;
  timeoutMs: number;
  temperature: number;
  maxTokens?: number;
  enabled: boolean;
}

export interface ModelRoutingConfig {
  plannerModelId: string;
  extractorModelId: string;
  writerModelId: string;
}

export interface ReportSectionTemplate {
  id: string;
  title: string;
  description: string;
  order: number;
  enabled: boolean;
  placeholderKey: string;
}

export interface WordTemplateDefinition {
  id: string;
  name: string;
  style: "executive" | "research" | "brief";
  description: string;
  fileKey: string;
  sections: ReportSectionTemplate[];
  placeholders: TemplatePlaceholderDefinition[];
  createdAt: string;
  updatedAt: string;
}

export interface TemplatePlaceholderDefinition {
  key: string;
  label: string;
  type: "text" | "markdown" | "table" | "chart" | "image" | "list";
  required: boolean;
  bindingPath: string;
}

export interface NaturalLanguageRequirement {
  rawPrompt: string;
  preferredTemplateId?: string;
  preferredStyle?: "executive" | "research" | "brief";
  limit?: number;
  retrievalMode?: RetrievalMode;
}

export interface RequirementParseResult {
  industry: string;
  track: string;
  competitorType: TaskType;
  targetAudience: string;
  region: string;
  timeRange: string;
  focusDimensions: string[];
  reportPurpose: string;
  tone: string;
  inferredOutputStyle: "executive" | "research" | "brief";
  analysisDepth: "light" | "standard" | "deep";
  userProvidedCompetitors: string[];
}

export interface SearchDocument {
  id: string;
  url: string;
  title: string;
  snippet: string;
  sourceType:
    | "official_site"
    | "news"
    | "industry_media"
    | "app_store"
    | "review"
    | "public_report";
  publishedAt?: string;
  crawledAt: string;
  credibilityScore: number;
  language: "zh-CN" | "zh-TW" | "en";
  content?: string;
}

export interface SearchQuery {
  keyword: string;
  sourceHints?: string[];
  timeRange?: string;
}

export interface CompetitorCandidate {
  id: string;
  name: string;
  company?: string;
  layer: CompetitorLayer;
  matchReason: string;
  confidence: number;
  supportingSources: string[];
}

export interface PricingPlan {
  name: string;
  price: string;
  billingCycle?: string;
  targetSegment?: string;
}

export interface CompetitorProfile {
  id: string;
  name: string;
  company: string;
  positioning: string;
  targetUsers: string[];
  coreFeatures: string[];
  pricing: PricingPlan[];
  businessModel: string[];
  channelStrategy: string[];
  marketMoves: string[];
  strengths: string[];
  weaknesses: string[];
  differentiators: string[];
  risks: string[];
  evidence: SourceCitation[];
}

export interface SourceCitation {
  id: string;
  title: string;
  url: string;
  sourceType: SearchDocument["sourceType"];
  crawledAt: string;
  excerpt?: string;
}

export interface ChartSeries {
  name: string;
  data: Array<number | string>;
}

export interface ChartSpec {
  id: string;
  title: string;
  type: ChartType;
  labels: string[];
  series: ChartSeries[];
  sourceRefs: string[];
  inferenceNotes?: string[];
  theme: "business_blue" | "warm_gray" | "research_green";
  placeholderKey: string;
}

export interface GeneratedChartAsset {
  id: string;
  filePath: string;
  width: number;
  height: number;
  format: "png" | "svg";
  spec: ChartSpec;
}

export interface ReportSectionDraft {
  sectionId: string;
  title: string;
  summary: string;
  bodyMarkdown: string;
  tables?: Array<Record<string, string | number>>;
  chartIds?: string[];
  citations: string[];
}

export interface ReportDraft {
  id: string;
  title: string;
  executiveSummary: string;
  sections: ReportSectionDraft[];
  appendixSources: SourceCitation[];
}

export interface ReportArtifact {
  reportId: string;
  editableDocxPath: string;
  finalDocxPath: string;
  chartAssets: GeneratedChartAsset[];
  generatedAt: string;
}

export interface PipelineSnapshot {
  taskId: string;
  modelRouting: ModelRoutingConfig;
  templateId: string;
  requirement: RequirementParseResult;
  queries: SearchQuery[];
  sources: SearchDocument[];
  chartQueries?: SearchQuery[];
  chartSources?: SearchDocument[];
  competitors: CompetitorProfile[];
  charts: ChartSpec[];
  generatedAt: string;
}

export interface AnalysisTask {
  id: string;
  prompt: string;
  status: TaskStatus;
  parseResult?: RequirementParseResult;
  selectedCompetitors?: string[];
  templateId?: string;
  limit?: number;
  retrievalMode?: RetrievalMode;
  reportId?: string;
  errorMessage?: string;
  currentStep?: string;
  progressPercent?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDetailResponse {
  task: AnalysisTask;
  artifact?: ReportArtifact;
  snapshot?: PipelineSnapshot;
}
