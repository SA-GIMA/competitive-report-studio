<template>
  <AppShell title="设置" subtitle="维护模型接入、模型路由、网络访问和检索能力。">
    <div class="page-grid">
      <div v-if="message" class="banner success toast">{{ message }}</div>
      <div v-if="error" class="banner error toast">{{ error }}</div>

      <div class="wizard-steps">
        <button
          v-for="section in settingSections"
          :key="section.key"
          type="button"
          class="wizard-step"
          :class="{ active: activeSettingSection === section.key }"
          @click="activeSettingSection = section.key"
        >
          <span>{{ section.index }}</span>
          <strong>{{ section.title }}</strong>
        </button>
      </div>

      <div v-if="activeSettingSection === 'model_access'" class="split">
        <SectionCard title="模型列表" description="这里展示已保存的模型连接。">
          <div class="stack">
            <div
              v-for="model in models"
              :key="model.id"
              class="list-item"
              style="text-align: left; cursor: pointer; position: relative"
              :style="{ outline: model.id === selectedId ? '2px solid rgba(37,99,235,.35)' : 'none' }"
              @click="selectModel(model.id)"
            >
              <strong>{{ model.label }}</strong>
              <div class="muted small mono">{{ model.id }}</div>
              <div class="inline-actions">
                <span class="status">{{ model.provider }}</span>
                <span class="status" :class="{ success: model.enabled }">{{ model.enabled ? "启用" : "停用" }}</span>
              </div>
              <button
                v-if="model.provider !== 'demo'"
                type="button"
                class="button ghost small"
                style="position: absolute; top: 12px; right: 12px; color: #ef4444; border-color: transparent"
                @click.stop="deleteModel(model.id)"
              >
                删除
              </button>
            </div>
            <button class="button ghost" @click="createNewModel">新增模型</button>
          </div>
        </SectionCard>

        <SectionCard title="模型编辑" description="维护模型的连接信息与基础参数。">
          <template #action>
            <div class="inline-actions">
              <button class="button ghost" :disabled="discoveringModels" @click="discoverModels">{{ discoveringModels ? "获取中" : "获取模型列表" }}</button>
              <button class="button ghost" :disabled="checkingId === draft.id || !draft.id" @click="checkModel(draft.id)">{{ checkingId === draft.id ? "检测中" : "连接检测" }}</button>
              <button class="button" @click="saveModel">保存模型</button>
            </div>
          </template>
          <div class="form-grid">
            <div class="field-grid">
              <div class="field"><label>ID</label><input v-model="draft.id" /></div>
              <div class="field"><label>名称</label><input v-model="draft.label" /></div>
            </div>
            <div class="field-grid">
              <div class="field"><label>Provider</label><input v-model="draft.provider" /></div>
              <div class="field">
                <label>模型名</label>
                <select v-if="discoveredModels.length" v-model="draft.model">
                  <option value="">请选择一个已发现模型</option>
                  <option v-for="modelName in discoveredModels" :key="modelName" :value="modelName">{{ modelName }}</option>
                </select>
                <input v-else v-model="draft.model" placeholder="先填写 Base URL / API Key，再点击“获取模型列表”" />
              </div>
            </div>
            <div class="field"><label>Base URL</label><input v-model="draft.baseUrl" /></div>
            <div class="field"><label>API Key / 引用</label><input v-model="draft.apiKeyRef" placeholder="${OPENAI_API_KEY}" /></div>
            <div class="field-grid">
              <div class="field"><label>超时（ms）</label><input v-model.number="draft.timeoutMs" type="number" min="1000" /></div>
              <div class="field"><label>Temperature</label><input v-model.number="draft.temperature" type="number" min="0" max="2" step="0.1" /></div>
              <div class="field"><label>Max Tokens</label><input v-model.number="draft.maxTokens" type="number" min="1" /></div>
            </div>
            <button type="button" class="glass-toggle" :class="{ active: draft.enabled }" @click="draft.enabled = !draft.enabled">
              <span class="glass-toggle-copy">
                <strong>启用当前模型</strong>
                <small>关闭后，该模型不会出现在规划、抽取、写作路由的可选列表中。</small>
              </span>
              <span class="glass-toggle-track">
                <span class="glass-toggle-thumb" />
              </span>
            </button>
            <div v-if="validationErrors.length" class="banner error">
              <div v-for="item in validationErrors" :key="item">{{ item }}</div>
            </div>
            <div v-if="discoveredModels.length" class="banner success">
              已获取 {{ discoveredModels.length }} 个模型，现在可以直接在“模型名”下拉框中选择。
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard v-if="activeSettingSection === 'model_routing'" title="模型路由设置" description="规划、抽取、写作可以绑定不同模型。">
        <template #action><button class="button" @click="saveRouting">保存路由</button></template>
        <div class="field-grid">
          <div class="field">
            <label>规划模型</label>
            <select v-model="routing.plannerModelId">
              <option v-for="model in enabledModels" :key="model.id" :value="model.id">{{ model.label }}</option>
            </select>
          </div>
          <div class="field">
            <label>抽取模型</label>
            <select v-model="routing.extractorModelId">
              <option v-for="model in enabledModels" :key="model.id" :value="model.id">{{ model.label }}</option>
            </select>
          </div>
          <div class="field">
            <label>写作模型</label>
            <select v-model="routing.writerModelId">
              <option v-for="model in enabledModels" :key="model.id" :value="model.id">{{ model.label }}</option>
            </select>
          </div>
        </div>
        <div class="banner">当前生效写作模型：{{ effectiveRouting.writerModelLabel ?? effectiveRouting.writerModelId }}{{ effectiveRouting.writerUsesDemoProvider ? "（Demo Provider）" : "" }}</div>
      </SectionCard>

      <SectionCard v-if="activeSettingSection === 'network_access'" title="网络与访问" description="控制 API 对本机或局域网的开放方式，以及前端访问地址。">
        <template #action><button class="button" @click="saveNetworkAccessConfig">保存网络设置</button></template>
        <div class="form-grid">
          <div class="field-grid">
            <div class="field">
              <label>API 监听地址</label>
              <select v-model="networkConfig.apiHost">
                <option value="127.0.0.1">127.0.0.1（仅本机）</option>
                <option value="0.0.0.0">0.0.0.0（开放局域网）</option>
              </select>
            </div>
            <div class="field">
              <label>API 端口</label>
              <input v-model.number="networkConfig.apiPort" type="number" min="1" max="65535" />
            </div>
          </div>
          <div class="field">
            <label>前端局域网访问</label>
            <div
              class="glass-toggle compact"
              :class="{ active: networkConfig.lanAccessEnabled }"
              @click="networkConfig.lanAccessEnabled = !networkConfig.lanAccessEnabled"
            >
              <div class="glass-toggle-copy">
                <strong>允许局域网访问前端</strong>
                <small>{{ networkConfig.lanAccessEnabled ? lanAccessSummary : '关闭状态，仅本机可访问' }}</small>
              </div>
              <div class="glass-toggle-track"><div class="glass-toggle-thumb"></div></div>
            </div>
          </div>
          <div v-if="networkConfig.lanAccessEnabled" class="list">
            <div class="list-item">
              <strong>当前局域网前端地址</strong>
              <div class="stack">
                <span v-if="!networkConfig.lanFrontendUrls.length" class="muted">暂未检测到可用局域网 IPv4 地址。</span>
                <template v-else>
                  <a
                    v-for="url in networkConfig.lanFrontendUrls"
                    :key="url"
                    class="text-link mono small"
                    :href="url"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {{ url }}
                  </a>
                </template>
              </div>
            </div>
            <div class="list-item">
              <strong>对应 API 地址</strong>
              <div class="stack">
                <span v-if="!networkConfig.lanApiUrls.length" class="muted">暂未检测到可用局域网 IPv4 地址。</span>
                <template v-else>
                  <span v-for="url in networkConfig.lanApiUrls" :key="url" class="muted mono small">{{ url }}</span>
                </template>
              </div>
            </div>
          </div>
          <div class="field">
            <label>CORS 允许来源</label>
            <textarea
              :value="corsOriginsText"
              rows="4"
              placeholder="每行一个来源，例如 http://localhost:3000；填写 * 表示允许所有来源"
              @input="corsOriginsText = inputValue($event)"
            />
          </div>
          <div class="field">
            <label>前端 Base URL</label>
            <input v-model="networkConfig.webBaseUrl" placeholder="http://localhost:3000" />
          </div>
          <div class="list">
            <div class="list-item"><strong>当前 API 监听</strong><span class="muted mono small">{{ networkConfig.activeApiHost }}:{{ networkConfig.activeApiPort }}</span></div>
            <div class="list-item"><strong>当前前端 Base URL</strong><span class="muted mono small">{{ networkConfig.activeWebBaseUrl }}</span></div>
            <div class="list-item"><strong>CORS 状态</strong><span class="muted">{{ networkConfig.corsOrigins.includes("*") ? "允许所有来源" : `${networkConfig.corsOrigins.length} 个白名单来源` }}</span></div>
            <div class="list-item"><strong>局域网前端访问</strong><span class="muted">{{ networkConfig.activeLanAccessEnabled ? '已开启 (端口 3001)' : '未开启' }}</span></div>
          </div>
          <div v-if="networkConfig.restartRequired" class="banner">
            API 监听地址、端口或前端 Base URL 已保存；重启 API 服务后生效。
          </div>
          <div v-if="networkConfig.lanAccessEnabled && !networkConfig.activeLanAccessEnabled" class="banner">
            局域网访问设置已保存；重启 API 服务后生效。
          </div>
          <div v-if="!networkConfig.lanAccessEnabled && networkConfig.activeLanAccessEnabled" class="banner">
            局域网访问已关闭；重启 API 服务后生效。
          </div>
          <div v-if="networkValidationErrors.length" class="banner error">
            <div v-for="item in networkValidationErrors" :key="item">{{ item }}</div>
          </div>
        </div>
      </SectionCard>

      <SectionCard v-if="activeSettingSection === 'retrieval'" title="检索配置" description="维护 Search API、SearXNG、SerpAPI 和 Skill Bridge。">
        <div class="retrieval-layout">
          <div class="retrieval-tabs">
            <button
              v-for="item in retrievalPanels"
              :key="item.key"
              type="button"
              class="retrieval-tab"
              :class="{ active: activeRetrievalPanel === item.key }"
              @click="activeRetrievalPanel = item.key"
            >
              <strong>{{ item.title }}</strong>
              <span>{{ item.description }}</span>
            </button>
          </div>
          <div class="retrieval-panel">
            <div v-if="activeRetrievalPanel === 'search_api'" class="form-grid">
              <div class="field"><label>Search API Endpoint</label><input v-model="retrievalConfig.searchApiEndpoint" /></div>
              <div class="field"><label>Search API Key</label><input v-model="retrievalConfig.searchApiKey" /></div>
            </div>
            <div v-else-if="activeRetrievalPanel === 'searxng'" class="form-grid">
              <div class="field-grid">
                <div class="field">
                  <label>SearXNG 模式</label>
                  <select v-model="retrievalConfig.searxngMode">
                    <option value="embedded">embedded</option>
                    <option value="remote">remote</option>
                  </select>
                </div>
                <div class="field"><label>SearXNG Endpoint</label><input v-model="retrievalConfig.searxngEndpoint" /></div>
                <div class="field"><label>SearXNG Port</label><input v-model.number="retrievalConfig.searxngPort" type="number" min="1" /></div>
              </div>
              <div class="field-grid">
                <div class="field"><label>SearXNG Key</label><input v-model="retrievalConfig.searxngKey" /></div>
                <div class="field"><label>引擎</label><input :value="enginesText" @input="enginesText = inputValue($event)" placeholder="bing,baidu" /></div>
                <div class="field"><label>Autocomplete</label><input v-model="retrievalConfig.searxngAutocomplete" /></div>
              </div>
              <button
                type="button"
                class="glass-toggle compact"
                :class="{ active: retrievalConfig.searxngAutoStart }"
                @click="retrievalConfig.searxngAutoStart = !retrievalConfig.searxngAutoStart"
              >
                <span class="glass-toggle-copy">
                  <strong>自动拉起内置 SearXNG</strong>
                  <small>API 服务启动时自动尝试启动本地嵌入式检索实例。</small>
                </span>
                <span class="glass-toggle-track">
                  <span class="glass-toggle-thumb" />
                </span>
              </button>
              <div class="list">
                <div class="list-item"><strong>当前模式</strong><span class="muted">{{ embeddedSearxngStatus?.mode ?? "-" }}</span></div>
                <div class="list-item"><strong>运行状态</strong><span class="muted">{{ embeddedSearxngStatus?.running ? "运行中" : "未运行" }}</span></div>
                <div class="list-item"><strong>日志路径</strong><span class="muted mono small">{{ embeddedSearxngStatus?.logPath ?? "-" }}</span></div>
              </div>
            </div>
            <div v-else-if="activeRetrievalPanel === 'serpapi_baidu'" class="form-grid">
              <div class="field"><label>SerpAPI Key</label><input v-model="retrievalConfig.serpApiKey" /></div>
            </div>
            <div v-else class="form-grid">
              <div class="field"><label>Skill Bridge Endpoint</label><input v-model="retrievalConfig.skillBridgeEndpoint" /></div>
              <div class="field"><label>Skill Bridge Key</label><input v-model="retrievalConfig.skillBridgeKey" /></div>
            </div>

            <div class="inline-actions" style="margin-top: 16px">
              <button class="button" @click="saveRetrievalConfig">保存当前配置</button>
              <button class="button ghost" :disabled="isCheckingCurrentPanel" @click="checkCurrentRetrievalPanel">{{ isCheckingCurrentPanel ? "检测中" : "测试当前模式" }}</button>
              <button
                v-if="activeRetrievalPanel === 'searxng'"
                class="button ghost"
                :disabled="changingEmbeddedSearxng === 'start'"
                @click="changeEmbedded('start')"
              >
                {{ changingEmbeddedSearxng === "start" ? "启动中" : "启动内置 SearXNG" }}
              </button>
              <button
                v-if="activeRetrievalPanel === 'searxng'"
                class="button ghost"
                :disabled="changingEmbeddedSearxng === 'stop'"
                @click="changeEmbedded('stop')"
              >
                {{ changingEmbeddedSearxng === "stop" ? "停止中" : "停止内置 SearXNG" }}
              </button>
              <button
                v-if="activeRetrievalPanel === 'searxng'"
                class="button ghost"
                :disabled="checkingSearxngRuntime"
                @click="checkSearxngRuntime"
              >
                {{ checkingSearxngRuntime ? "检测中" : "运行时检测" }}
              </button>
            </div>
          </div>
        </div>
      </SectionCard>

    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type {
  EffectiveModelRouting,
  ModelConnectionConfig,
  ModelRoutingConfig,
  NetworkAccessConfigResponse,
  RetrievalRuntimeConfig
} from "@studio/shared";
import AppShell from "@/components/AppShell.vue";
import SectionCard from "@/components/SectionCard.vue";
import { apiFetch } from "@/services/api";

interface ModelsResponse {
  items: ModelConnectionConfig[];
  routing: ModelRoutingConfig;
  effectiveRouting: EffectiveModelRouting;
}

interface DiscoverModelsResponse {
  ok: boolean;
  message: string;
  models: string[];
}

interface EmbeddedSearxngStatus {
  mode: "remote" | "embedded";
  installed: boolean;
  running: boolean;
  healthy: boolean;
  endpoint: string;
  port: number;
  autoStart: boolean;
  engines: string[];
  autocomplete: string;
  installDir: string;
  logPath: string;
  message: string;
}

const emptyRetrievalConfig: RetrievalRuntimeConfig = {
  searchApiEndpoint: "",
  searchApiKey: "",
  searxngMode: "embedded",
  searxngEndpoint: "",
  searxngKey: "",
  searxngAutoStart: true,
  searxngPort: 18080,
  searxngEngines: ["bing", "baidu"],
  searxngAutocomplete: "baidu",
  serpApiKey: "",
  skillBridgeEndpoint: "",
  skillBridgeKey: ""
};

const emptyModel: ModelConnectionConfig = {
  id: "",
  provider: "openai-compatible",
  label: "",
  baseUrl: "https://api.openai.com/v1",
  apiKeyRef: "",
  model: "",
  timeoutMs: 30000,
  temperature: 0.4,
  maxTokens: 2400,
  enabled: true
};

const emptyNetworkConfig: NetworkAccessConfigResponse = {
  apiHost: "127.0.0.1",
  apiPort: 4100,
  corsOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:5173",
    "http://127.0.0.1:5173"
  ],
  webBaseUrl: "http://localhost:3000",
  activeApiHost: "127.0.0.1",
  activeApiPort: 4100,
  activeWebBaseUrl: "http://localhost:3000",
  activeCorsOrigins: [],
  activeLanAccessEnabled: false,
  localNetworkIps: [],
  lanFrontendUrls: [],
  lanApiUrls: [],
  restartRequired: false,
  restartFields: [],
  lanAccessEnabled: false
};

const models = ref<ModelConnectionConfig[]>([]);
const routing = ref<ModelRoutingConfig>({
  plannerModelId: "",
  extractorModelId: "",
  writerModelId: ""
});
const effectiveRouting = ref<EffectiveModelRouting>({
  plannerModelId: "",
  extractorModelId: "",
  writerModelId: "",
  writerUsesDemoProvider: false
});
const selectedId = ref("");
const draft = ref<ModelConnectionConfig>({ ...emptyModel });
const retrievalConfig = ref<RetrievalRuntimeConfig>({ ...emptyRetrievalConfig });
const networkConfig = ref<NetworkAccessConfigResponse>({ ...emptyNetworkConfig });
const embeddedSearxngStatus = ref<EmbeddedSearxngStatus | null>(null);
const message = ref("");
const error = ref("");
const checkingId = ref("");
const checkingRetrieval = ref<"" | "search_api" | "searxng" | "serpapi_baidu" | "skill_bridge">("");
const changingEmbeddedSearxng = ref<"" | "start" | "stop">("");
const checkingSearxngRuntime = ref(false);
const discoveringModels = ref(false);
const discoveredModels = ref<string[]>([]);
const validationErrors = ref<string[]>([]);
const networkValidationErrors = ref<string[]>([]);
const activeRetrievalPanel = ref<"search_api" | "searxng" | "serpapi_baidu" | "skill_bridge">("search_api");
const activeSettingSection = ref<"model_access" | "model_routing" | "network_access" | "retrieval">("model_access");
const discoverRequestSeq = ref(0);

onMounted(load);

const enabledModels = computed(() => models.value.filter((item) => item.enabled));
const settingSections = [
  { key: "model_access", index: "01", title: "模型接入设置" },
  { key: "model_routing", index: "02", title: "模型路由设置" },
  { key: "network_access", index: "03", title: "网络与访问" },
  { key: "retrieval", index: "04", title: "检索配置" }
] as const;
const retrievalPanels = [
  { key: "search_api", title: "Search API", description: "通用搜索接口接入。" },
  { key: "searxng", title: "SearXNG", description: "内置或远程 SearXNG 检索实例。" },
  { key: "serpapi_baidu", title: "SerpAPI(Baidu)", description: "基于百度搜索的第三方检索能力。" },
  { key: "skill_bridge", title: "Skill Bridge", description: "桥接外部检索服务或代理层。" }
] as const;
const isCheckingCurrentPanel = computed(() => checkingRetrieval.value === activeRetrievalPanel.value);
const lanAccessSummary = computed(() => {
  const firstUrl = networkConfig.value.lanFrontendUrls[0];
  if (!firstUrl) {
    return "已开启局域网前端访问，等待检测本机局域网 IP。";
  }
  return `局域网设备可通过 ${firstUrl} 访问。`;
});

const enginesText = computed({
  get: () => (retrievalConfig.value.searxngEngines ?? []).join(","),
  set: (value: string) => {
    retrievalConfig.value.searxngEngines = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
});

const corsOriginsText = computed({
  get: () => networkConfig.value.corsOrigins.join("\n"),
  set: (value: string) => {
    networkConfig.value.corsOrigins = value
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
});

async function load() {
  try {
    const response = await apiFetch<ModelsResponse>("/api/models");
    const retrieval = await apiFetch<RetrievalRuntimeConfig>("/api/retrieval-config");
    const network = await apiFetch<NetworkAccessConfigResponse>("/api/network-access-config");
    const embeddedStatus = await apiFetch<EmbeddedSearxngStatus>("/api/retrieval-config/searxng/embedded/status");
    models.value = response.items;
    routing.value = response.routing;
    effectiveRouting.value = response.effectiveRouting;
    retrievalConfig.value = {
      ...emptyRetrievalConfig,
      ...retrieval
    };
    networkConfig.value = {
      ...emptyNetworkConfig,
      ...network
    };
    embeddedSearxngStatus.value = embeddedStatus;
    if (response.items[0]) {
      selectedId.value = response.items[0].id;
      draft.value = { ...response.items[0] };
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : "加载配置失败";
  }
}

function createNewModel() {
  draft.value = { ...emptyModel, id: `model-${models.value.length + 1}` };
  selectedId.value = draft.value.id;
  discoveredModels.value = [];
  validationErrors.value = [];
}

function selectModel(modelId: string) {
  const model = models.value.find((item) => item.id === modelId);
  if (!model) return;
  selectedId.value = modelId;
  draft.value = { ...model };
  discoveredModels.value = [];
  message.value = "";
  error.value = "";
}

async function deleteModel(modelId: string) {
  if (!window.confirm(`确定要删除模型 ${modelId} 吗？`)) {
    return;
  }
  try {
    await apiFetch(`/api/models/${modelId}`, { method: "DELETE" });
    message.value = `模型 ${modelId} 已删除`;
    if (selectedId.value === modelId) {
      selectedId.value = "";
      draft.value = { ...emptyModel };
    }
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "删除模型失败";
  }
}

async function saveModel() {
  validationErrors.value = validateDraft(draft.value);
  error.value = "";
  message.value = "";
  if (validationErrors.value.length > 0) {
    error.value = "请先修正模型配置中的必填项和格式问题。";
    return;
  }
  try {
    const hasExisting = models.value.some((item) => item.id === draft.value.id);
    const payload = {
      ...draft.value,
      timeoutMs: Number(draft.value.timeoutMs),
      temperature: Number(draft.value.temperature),
      maxTokens: Number(draft.value.maxTokens ?? 2400)
    };
    const saved = hasExisting
      ? await apiFetch<ModelConnectionConfig>(`/api/models/${draft.value.id}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        })
      : await apiFetch<ModelConnectionConfig>("/api/models", {
          method: "POST",
          body: JSON.stringify(payload)
        });
    message.value = `模型 ${saved.label} 已保存`;
    await load();
    selectedId.value = saved.id;
    draft.value = { ...saved };
    discoveredModels.value = [];
  } catch (err) {
    error.value = err instanceof Error ? err.message : "保存模型失败";
  }
}

async function checkModel(modelId: string) {
  if (!modelId || !models.value.some((item) => item.id === modelId)) {
    error.value = "请先保存模型，再执行可用性检测。";
    return;
  }
  checkingId.value = modelId;
  try {
    const response = await apiFetch<{ ok: boolean; message: string }>(`/api/models/${modelId}/check`);
    message.value = `${modelId} 检测结果：${response.message}`;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "模型检测失败";
  } finally {
    checkingId.value = "";
  }
}

async function discoverModels() {
  if (!draft.value.baseUrl.trim()) {
    error.value = "请先填写 Base URL。";
    return;
  }
  if (!draft.value.apiKeyRef.trim()) {
    error.value = "请先填写 API Key 或引用。";
    return;
  }
  discoveringModels.value = true;
  error.value = "";
  message.value = "";
  discoveredModels.value = [];
  const requestSeq = discoverRequestSeq.value + 1;
  discoverRequestSeq.value = requestSeq;
  const payload = {
    ...draft.value,
    timeoutMs: Number(draft.value.timeoutMs),
    temperature: Number(draft.value.temperature),
    maxTokens: Number(draft.value.maxTokens ?? 2400)
  };
  const requestKey = buildDraftDiscoveryKey(payload);
  try {
    const response = await apiFetch<DiscoverModelsResponse>("/api/models/discover", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    if (requestSeq !== discoverRequestSeq.value) {
      return;
    }
    if (requestKey !== buildDraftDiscoveryKey(draft.value)) {
      message.value = "模型列表已返回，但当前表单内容已变化，请重新点击“获取模型列表”以刷新。";
      return;
    }
    discoveredModels.value = response.models;
    message.value = response.message;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "发现可用模型失败";
  } finally {
    if (requestSeq === discoverRequestSeq.value) {
      discoveringModels.value = false;
    }
  }
}

async function saveRouting() {
  try {
    await apiFetch<ModelRoutingConfig>("/api/models/routing", {
      method: "POST",
      body: JSON.stringify(routing.value)
    });
    message.value = "模型路由已更新";
    const response = await apiFetch<ModelsResponse>("/api/models");
    effectiveRouting.value = response.effectiveRouting;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "保存模型路由失败";
  }
}

async function saveRetrievalConfig() {
  try {
    retrievalConfig.value = await apiFetch<RetrievalRuntimeConfig>("/api/retrieval-config", {
      method: "PUT",
      body: JSON.stringify(retrievalConfig.value)
    });
    embeddedSearxngStatus.value = await apiFetch<EmbeddedSearxngStatus>("/api/retrieval-config/searxng/embedded/status");
    message.value = "检索配置已更新";
  } catch (err) {
    error.value = err instanceof Error ? err.message : "保存检索配置失败";
  }
}

async function saveNetworkAccessConfig() {
  networkValidationErrors.value = validateNetworkConfig(networkConfig.value);
  error.value = "";
  message.value = "";
  if (networkValidationErrors.value.length > 0) {
    error.value = "请先修正网络与访问配置。";
    return;
  }
  if (networkConfig.value.lanAccessEnabled && networkConfig.value.apiHost !== "0.0.0.0") {
    const confirmed = window.confirm(
      "开启局域网访问需要将 API 监听地址设为 0.0.0.0，否则局域网设备无法调用 API。\n\n是否自动切换为 0.0.0.0？"
    );
    if (confirmed) {
      networkConfig.value.apiHost = "0.0.0.0";
    } else {
      return;
    }
  }
  try {
    networkConfig.value = await apiFetch<NetworkAccessConfigResponse>("/api/network-access-config", {
      method: "PUT",
      body: JSON.stringify({
        apiHost: networkConfig.value.apiHost,
        apiPort: Number(networkConfig.value.apiPort),
        corsOrigins: networkConfig.value.corsOrigins,
        webBaseUrl: networkConfig.value.webBaseUrl,
        lanAccessEnabled: networkConfig.value.lanAccessEnabled
      })
    });
    message.value = networkConfig.value.restartRequired
      ? "网络设置已保存，监听地址、端口或前端 Base URL 需要重启 API 后生效。"
      : "网络设置已保存";
  } catch (err) {
    error.value = err instanceof Error ? err.message : "保存网络设置失败";
  }
}

async function checkRetrieval(type: "search_api" | "searxng" | "serpapi_baidu" | "skill_bridge") {
  checkingRetrieval.value = type;
  try {
    const path =
      type === "search_api"
        ? "/api/retrieval-config/check/search-api"
        : type === "searxng"
          ? "/api/retrieval-config/check/searxng"
          : type === "serpapi_baidu"
            ? "/api/retrieval-config/check/serpapi-baidu"
            : "/api/retrieval-config/check/skill-bridge";
    const response = await apiFetch<{ ok: boolean; message: string }>(path);
    message.value = response.message;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "检索配置检测失败";
  } finally {
    checkingRetrieval.value = "";
  }
}

async function checkCurrentRetrievalPanel() {
  await checkRetrieval(activeRetrievalPanel.value);
}

async function changeEmbedded(action: "start" | "stop") {
  changingEmbeddedSearxng.value = action;
  try {
    embeddedSearxngStatus.value = await apiFetch<EmbeddedSearxngStatus>(
      `/api/retrieval-config/searxng/embedded/${action}`,
      { method: "POST", body: JSON.stringify({}) }
    );
    message.value = embeddedSearxngStatus.value.message;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "切换内置 SearXNG 失败";
  } finally {
    changingEmbeddedSearxng.value = "";
  }
}

async function checkSearxngRuntime() {
  checkingSearxngRuntime.value = true;
  try {
    const response = await apiFetch<{ ok: boolean; message: string }>("/api/retrieval-config/check/searxng/runtime");
    message.value = response.message;
    const status = await apiFetch<EmbeddedSearxngStatus>("/api/retrieval-config/searxng/embedded/status");
    embeddedSearxngStatus.value = status;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "SearXNG 运行时检测失败";
  } finally {
    checkingSearxngRuntime.value = false;
  }
}

function inputValue(event: Event) {
  return (event.target as HTMLInputElement).value;
}

function buildDraftDiscoveryKey(model: Pick<ModelConnectionConfig, "id" | "baseUrl" | "apiKeyRef" | "provider" | "model">) {
  return JSON.stringify({
    id: model.id,
    baseUrl: model.baseUrl.trim(),
    apiKeyRef: model.apiKeyRef.trim(),
    provider: model.provider.trim(),
    model: model.model.trim()
  });
}

function validateDraft(model: ModelConnectionConfig) {
  const errors: string[] = [];
  if (!model.id.trim()) errors.push("模型 ID 不能为空");
  if (!model.label.trim()) errors.push("模型名称不能为空");
  if (!model.baseUrl.trim()) errors.push("Base URL 不能为空");
  if (!/^https?:\/\//.test(model.baseUrl)) errors.push("Base URL 需要以 http:// 或 https:// 开头");
  if (!model.model.trim()) errors.push("模型名不能为空");
  if (Number(model.timeoutMs) < 1000) errors.push("超时不能低于 1000 ms");
  return errors;
}

function validateNetworkConfig(config: NetworkAccessConfigResponse) {
  const errors: string[] = [];
  if (!["127.0.0.1", "0.0.0.0"].includes(config.apiHost)) {
    errors.push("API 监听地址请选择 127.0.0.1 或 0.0.0.0");
  }
  if (!Number.isInteger(Number(config.apiPort)) || Number(config.apiPort) < 1 || Number(config.apiPort) > 65535) {
    errors.push("API 端口必须是 1 到 65535 之间的整数");
  }
  if (!/^https?:\/\//.test(config.webBaseUrl.trim())) {
    errors.push("前端 Base URL 需要以 http:// 或 https:// 开头");
  }
  if (!config.corsOrigins.length) {
    errors.push("CORS 允许来源不能为空，可以填写 * 表示允许所有来源");
  }
  if (!config.corsOrigins.includes("*") && config.corsOrigins.some((item) => !/^https?:\/\//.test(item))) {
    errors.push("CORS 允许来源需要是完整来源，例如 http://localhost:3000，或填写 *");
  }
  return errors;
}
</script>
