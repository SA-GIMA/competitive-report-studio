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
  | "paused"
  | "failed"
  | "completed";

export type TaskFailureCategory =
  | "configuration"
  | "input"
  | "temporary"
  | "provider"
  | "unknown";

export type TaskExecutionStage =
  | "parse_requirement"
  | "collect_sources"
  | "prepare_candidates"
  | "extract_competitors"
  | "collect_chart_sources"
  | "render_charts"
  | "write_report"
  | "export_report"
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
  | "searxng"
  | "serpapi_baidu"
  | "skill_bridge"
  | "hybrid";

export type TaskInputMode = "search" | "document_upload";

export interface RetrievalRuntimeConfig {
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

export interface NetworkAccessConfig {
  apiHost: string;
  apiPort: number;
  corsOrigins: string[];
  webBaseUrl: string;
  lanAccessEnabled: boolean;
}

export interface NetworkAccessConfigResponse extends NetworkAccessConfig {
  activeApiHost: string;
  activeApiPort: number;
  activeWebBaseUrl: string;
  activeCorsOrigins: string[];
  activeLanAccessEnabled: boolean;
  localNetworkIps: string[];
  lanFrontendUrls: string[];
  lanApiUrls: string[];
  restartRequired: boolean;
  restartFields: Array<keyof NetworkAccessConfig>;
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

export interface EffectiveModelRouting {
  plannerModelId: string;
  extractorModelId: string;
  writerModelId: string;
  writerModelLabel?: string;
  writerProvider?: string;
  writerUsesDemoProvider: boolean;
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
  inputMode?: TaskInputMode;
  retrievalMode?: RetrievalMode;
  autoFillChartData?: boolean;
  confirmedCompetitors?: string[];
  uploadedMaterials?: UploadedMaterialReference[];
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

export interface UploadedMaterialReference {
  id: string;
  competitorName: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface UploadedMaterial extends UploadedMaterialReference {
  storagePath: string;
  extension: string;
}

export interface UploadedMaterialBlock {
  id: string;
  materialId: string;
  competitorName: string;
  fileName: string;
  title: string;
  blockType: "heading" | "paragraph" | "table" | "slide" | "page" | "list" | "summary";
  order: number;
  text: string;
}

export interface UploadedMaterialDigest {
  materialId: string;
  competitorName: string;
  fileName: string;
  summary: string;
  blocks: UploadedMaterialBlock[];
  extractedAt: string;
}

export interface UploadedMaterialInsightCard {
  competitorName: string;
  summary: string;
  positioningSignals: string[];
  targetUsersSignals: string[];
  featureSignals: string[];
  pricingSignals: string[];
  businessModelSignals: string[];
  channelSignals: string[];
  marketSignals: string[];
  strengthsSignals: string[];
  weaknessesSignals: string[];
  differentiatorsSignals: string[];
  risksSignals: string[];
  evidence: Array<{
    blockIds: string[];
    excerpt: string;
    sourceTitle: string;
  }>;
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

export interface TaskExecutionCheckpoint {
  stage: TaskExecutionStage;
  parseResult?: RequirementParseResult;
  queries?: SearchQuery[];
  sources?: SearchDocument[];
  materialDigests?: UploadedMaterialDigest[];
  candidates?: CompetitorCandidate[];
  competitorProfiles?: CompetitorProfile[];
  chartQueries?: SearchQuery[];
  chartSources?: SearchDocument[];
  charts?: ChartSpec[];
  chartAssets?: GeneratedChartAsset[];
  reportDraft?: ReportDraft;
}

export interface ReportArtifact {
  reportId: string;
  editableDocxPath: string;
  finalDocxPath: string;
  editableFileName?: string;
  finalFileName?: string;
  chartAssets: GeneratedChartAsset[];
  generatedAt: string;
}

export interface PipelineSnapshot {
  taskId: string;
  modelRouting: ModelRoutingConfig;
  templateId: string;
  inputMode?: TaskInputMode;
  requirement: RequirementParseResult;
  queries: SearchQuery[];
  sources: SearchDocument[];
  uploadedMaterials?: UploadedMaterialReference[];
  materialDigests?: UploadedMaterialDigest[];
  materialInsightCards?: UploadedMaterialInsightCard[];
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
  inputMode?: TaskInputMode;
  parseResult?: RequirementParseResult;
  selectedCompetitors?: string[];
  confirmedCompetitors?: string[];
  uploadedMaterials?: UploadedMaterialReference[];
  templateId?: string;
  limit?: number;
  retrievalMode?: RetrievalMode;
  autoFillChartData?: boolean;
  reportId?: string;
  errorMessage?: string;
  failureCategory?: TaskFailureCategory;
  retryable?: boolean;
  autoResumeAttempts?: number;
  executionCheckpoint?: TaskExecutionCheckpoint;
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

export type GanttWorkingDaysMode = "five_day" | "six_day" | "calendar_day";

export type GanttPlanningMode = "backward" | "forward";

export interface GanttPlanningRequest {
  projectName: string;
  projectSummary: string;
  targetEndDate: string;
  durationDays: number;
  startDate?: string;
  workingDaysMode: GanttWorkingDaysMode;
  planningMode: GanttPlanningMode;
  constraints?: string;
}

export interface GanttTaskDraft {
  id: string;
  phase: string;
  name: string;
  description?: string;
  durationDays: number;
  dependsOn: string[];
  milestone?: boolean;
}

export interface GanttTaskItem extends GanttTaskDraft {
  startDate: string;
  endDate: string;
}

export interface GanttPlan {
  id: string;
  projectName: string;
  projectSummary: string;
  targetEndDate: string;
  durationDays: number;
  planningMode: GanttPlanningMode;
  workingDaysMode: GanttWorkingDaysMode;
  startDate: string;
  endDate: string;
  createdAt: string;
  assumptions: string[];
  riskNotes: string[];
  tasks: GanttTaskItem[];
}
