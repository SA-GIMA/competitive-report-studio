<template>
  <AppShell title="创建竞品分析报告" subtitle="只需几步，即可获取深度竞品调研报告">
    <div class="create-report-page">
      <div class="step-tabs">
        <button
          v-for="step in wizardSteps"
          :key="step.key"
          type="button"
          class="step-tab"
          :class="{ active: wizardStep === step.key, done: step.done }"
          @click="goToStep(step.key)"
        >
          <span>{{ step.index }}</span>
          <strong>{{ step.title }}</strong>
        </button>
      </div>

      <div v-if="message" class="notice success">{{ message }}</div>
      <div v-if="error" class="notice error">{{ error }}</div>

      <div v-if="wizardStep === 'input'" class="create-layout">
        <section class="form-card">
          <header class="form-card-header">
            <h2>第一步：说明你要分析什么</h2>
            <div class="form-actions">
              <button type="button" class="outline-action" @click="showAdvanced = !showAdvanced">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21v-7" /><path d="M4 10V3" /><path d="M12 21v-9" /><path d="M12 8V3" /><path d="M20 21v-5" /><path d="M20 12V3" /><path d="M2 14h4" /><path d="M10 8h4" /><path d="M18 16h4" /></svg>
                {{ showAdvanced ? "收起设置" : "高级设置" }}
              </button>
              <button type="button" class="primary-action" :disabled="loading === 'preview'" @click="parseRequirement">
                {{ loading === "preview" ? "解析中" : "下一步：解析需求" }}
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
              </button>
            </div>
          </header>

          <div class="form-section">
            <h3>资料来源</h3>
            <div class="source-grid">
              <button type="button" class="source-option" :class="{ active: inputMode === 'search' }" @click="inputMode = 'search'">
                <span class="source-icon blue" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" /><path d="M3.6 9h16.8" /><path d="M3.6 15h16.8" /><path d="M12 3a14 14 0 0 1 0 18" /><path d="M12 3a14 14 0 0 0 0 18" /></svg>
                </span>
                <span>
                  <strong>联网搜索任务</strong>
                  <small>Agent 自动爬取全网最新信息</small>
                </span>
                <svg class="check-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
              </button>

              <button type="button" class="source-option" :class="{ active: inputMode === 'document_upload' }" @click="inputMode = 'document_upload'">
                <span class="source-icon slate" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v5h5" /><path d="M12 12v6" /><path d="m9 15 3-3 3 3" /></svg>
                </span>
                <span>
                  <strong>上传材料任务</strong>
                  <small>基于你提供的文档进行分析</small>
                </span>
                <svg class="check-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
              </button>
            </div>
          </div>

          <div v-if="inputMode === 'document_upload'" class="upload-panel">
            <div class="upload-grid">
              <label>
                <span>竞品名称</span>
                <input v-model="uploadDraft.competitorName" placeholder="例如：钉钉 / 飞书 / WPS AI" />
              </label>
              <label>
                <span>选择文件</span>
                <input ref="fileInputRef" type="file" multiple @change="onSelectUploadFiles" />
              </label>
              <button type="button" class="outline-action upload-action" :disabled="loading === 'upload'" @click="uploadMaterialsForCompetitor">
                {{ loading === "upload" ? "上传中" : "上传材料" }}
              </button>
            </div>
            <p class="upload-meta">当前待上传文件数：{{ uploadDraft.files.length }}</p>
            <div v-if="uploadedMaterials.length" class="uploaded-list">
              <div v-for="item in uploadedMaterials" :key="item.id">
                <strong>{{ item.competitorName }}</strong>
                <span>{{ item.fileName }} · {{ formatBytes(item.size) }}</span>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h3>{{ inputMode === "document_upload" ? "任务说明" : "分析需求描述" }}</h3>
            <div class="prompt-box">
              <textarea
                v-model="prompt"
                :placeholder="inputMode === 'document_upload' ? '例如：基于我上传的产品资料，输出一份面向领导汇报的竞品分析报告。' : '例如：分析目前国内 AI 智能体平台的现状，重点对比百度智能云、字节跳动扣子(Coze) 以及 阿里百炼。关注它们的商业模式、底层模型能力以及对开发者的支持程度...'"
              />
              <div class="prompt-presets">
                <button type="button" :class="{ active: templateId === 'tpl-executive-zh' }" @click="applyPromptPreset('executive')">汇报版</button>
                <button type="button" :class="{ active: templateId === 'tpl-research-zh' }" @click="applyPromptPreset('research')">深度研究版</button>
                <button type="button" :class="{ active: templateId === 'tpl-brief-zh' }" @click="applyPromptPreset('brief')">简洁版</button>
              </div>
            </div>
          </div>

          <div v-if="showAdvanced" class="advanced-card">
            <div class="advanced-grid">
              <label>
                <span>模板</span>
                <select v-model="templateId">
                  <option v-for="template in templates" :key="template.id" :value="template.id">{{ templateOptionLabel(template) }}</option>
                </select>
                <small>{{ selectedTemplateDescription }}</small>
              </label>
              <label>
                <span>分析数量</span>
                <input v-model.number="limit" type="number" min="1" max="20" />
              </label>
              <label>
                <span>检索模式</span>
                <select v-model="retrievalMode" :disabled="inputMode === 'document_upload'">
                  <option v-for="option in retrievalModeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
                <small>{{ selectedRetrievalModeDescription }}</small>
              </label>
              <label>
                <span>写作模型</span>
                <select v-model="routing.writerModelId" :disabled="savingWriterModel || availableWriterModels.length === 0" @change="updateWriterModel">
                  <option v-for="model in availableWriterModels" :key="model.id" :value="model.id">{{ model.label }}</option>
                </select>
                <small>{{ selectedWriterModelDescription }}</small>
              </label>
            </div>
            <button type="button" class="auto-toggle" :class="{ active: autoFillChartData }" @click="autoFillChartData = !autoFillChartData">
              <span>
                <strong>自动补全图表数据</strong>
                <small>缺少可视化数值时，允许模型结合上下文自动补齐展示数据。</small>
              </span>
              <i></i>
            </button>
            <p class="model-hint">
              当前生效写作模型：{{ effectiveRouting.writerModelLabel ?? (effectiveRouting.writerModelId || "未配置") }}{{ effectiveRouting.writerUsesDemoProvider ? "（Demo Provider）" : "" }}
            </p>
          </div>

          <div v-if="loading === 'preview'" class="progress-card">
            <div>
              <strong>{{ previewCurrentStep }}</strong>
              <span>{{ previewProgressPercent }}%</span>
            </div>
            <p><span :style="{ width: `${previewProgressPercent}%` }"></span></p>
          </div>
        </section>

        <aside class="assist-column">
          <section class="mode-card">
            <h3>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17v-5" /><path d="M12 7h.01" /><path d="M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0Z" /></svg>
              当前模式说明
            </h3>
            <div class="mode-note active">
              <strong>适用场景</strong>
              <p>{{ inputMode === "document_upload" ? "适合已有竞品资料、访谈纪要或内部研究文档，需要直接生成汇报报告。" : "适合对市场新趋势进行摸排，或对已知竞品进行年度/季度深度对标更新。" }}</p>
            </div>
            <div class="mode-note">
              <strong>执行方式</strong>
              <p>{{ inputMode === "document_upload" ? "系统将先抽取上传材料，再由 Analysis Agent 进行结构化摘要与报告写作。" : "系统将启动 Web Search Agent 检索多维数据，再交由 Analysis Agent 进行结构化撰写。" }}</p>
            </div>
          </section>

          <section class="tip-card">
            <h3>小提示</h3>
            <p>在描述中尽可能提供竞品的官网链接或确切名称，可以显著提升 AI 解析的准确度。</p>
          </section>
        </aside>
      </div>

      <div v-if="wizardStep === 'review'" class="review-layout">
        <section class="form-card">
          <header class="form-card-header">
            <h2>第二步：确认竞品名单</h2>
            <div class="form-actions">
              <button type="button" class="outline-action" @click="wizardStep = 'input'">返回修改需求</button>
              <button type="button" class="primary-action" :disabled="loading === 'run'" @click="createAndRunTask">{{ loading === "run" ? "提交中" : "下一步：开始生成" }}</button>
            </div>
          </header>
          <div v-if="preview?.parseResult" class="parse-grid">
            <div v-for="(value, key) in preview.parseResult" :key="key">
              <strong>{{ key }}</strong>
              <span>{{ Array.isArray(value) ? value.join(" / ") : String(value) }}</span>
            </div>
          </div>
          <div class="manual-row">
            <input v-model="manualCandidate" placeholder="手动补充竞品名称" />
            <button type="button" class="outline-action" @click="addManualCandidate">添加</button>
          </div>
          <div v-if="candidateDrafts.length" class="candidate-list">
            <button
              v-for="candidate in candidateDrafts"
              :key="candidate.id"
              type="button"
              :class="{ active: candidate.selected }"
              @click="candidate.selected = !candidate.selected"
            >
              <strong>{{ candidate.name }}</strong>
              <span>{{ candidate.layer }} · 置信度 {{ Math.round(candidate.confidence * 100) }}%{{ candidate.manual ? " · 手动补充" : "" }}</span>
            </button>
          </div>
          <div v-else class="empty-state">解析完成后，这里会展示候选竞品。</div>
        </section>
      </div>

      <section v-if="wizardStep === 'running' || createdTask" class="form-card running-card">
        <header class="form-card-header">
          <h2>第三步：生成报告</h2>
          <RouterLink v-if="createdTask" class="outline-action" :to="`/tasks/${createdTask.id}`">进入任务详情</RouterLink>
        </header>
        <div v-if="createdTask" class="run-grid">
          <div><strong>任务 ID</strong><span>{{ createdTask.id }}</span></div>
          <div><strong>当前状态</strong><span>{{ formatTaskStatus(createdTask.status) }}</span></div>
          <div><strong>当前步骤</strong><span>{{ createdTask.currentStep ?? "-" }}</span></div>
          <div><strong>进度</strong><span>{{ createdTask.progressPercent ?? 0 }}%</span></div>
        </div>
        <div v-if="createdTask" class="progress-card">
          <div>
            <strong>{{ createdTask.status === "completed" ? "报告已生成完成" : createdTask.status === "failed" ? "任务执行失败" : (createdTask.currentStep ?? "准备中") }}</strong>
            <span>{{ createdTask.progressPercent ?? 0 }}%</span>
          </div>
          <p><span :style="{ width: `${createdTask.progressPercent ?? 0}%` }"></span></p>
        </div>
        <p v-if="createdTask" class="run-hint">{{ nextTaskHint }}</p>
        <div v-else class="empty-state">任务创建后，这里会显示运行状态。</div>
      </section>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterLink, useRouter } from "vue-router";
import type {
  AnalysisTask,
  CompetitorCandidate,
  EffectiveModelRouting,
  ModelConnectionConfig,
  ModelRoutingConfig,
  RetrievalMode,
  RequirementParseResult,
  TaskInputMode,
  UploadedMaterialReference,
  WordTemplateDefinition
} from "@studio/shared";
import AppShell from "@/components/AppShell.vue";
import { apiFetch } from "@/services/api";
import { readFileAsBase64 } from "@/utils/files";
import { formatBytes, formatTaskStatus } from "@/utils/format";

interface PreviewResponse {
  parseResult: RequirementParseResult;
  candidates: CompetitorCandidate[];
  sourceCount: number;
}

interface CandidateDraft extends CompetitorCandidate {
  selected: boolean;
  manual?: boolean;
}

interface UploadDraft {
  competitorName: string;
  files: File[];
}

const inputMode = ref<TaskInputMode>("search");
const prompt = ref("帮我分析国内 AI 办公助手赛道的主要竞品，做一份面向领导汇报的报告，重点看功能对比、商业模式和机会点。");
const templateId = ref("tpl-brief-zh");
const limit = ref(5);
const retrievalMode = ref<RetrievalMode>("searxng");
const autoFillChartData = ref(true);
const templates = ref<WordTemplateDefinition[]>([]);
const availableWriterModels = ref<ModelConnectionConfig[]>([]);
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
const preview = ref<PreviewResponse | null>(null);
const candidateDrafts = ref<CandidateDraft[]>([]);
const manualCandidate = ref("");
const createdTask = ref<AnalysisTask | null>(null);
const uploadedMaterials = ref<UploadedMaterialReference[]>([]);
const uploadDraft = ref<UploadDraft>({ competitorName: "", files: [] });
const message = ref("");
const error = ref("");
const router = useRouter();
const loading = ref<"preview" | "run" | "upload" | "">("");
const savingWriterModel = ref(false);
const previewInputKey = ref("");
const fileInputRef = ref<HTMLInputElement | null>(null);
const wizardStep = ref<"input" | "review" | "running">("input");
const showAdvanced = ref(false);
let timer: number | null = null;
const previewProgressPercent = ref(0);
const previewCurrentStep = ref("等待解析");
let previewTimer: number | null = null;

onMounted(async () => {
  await Promise.all([loadTemplates(), loadModelOptions()]);
});

onBeforeUnmount(() => {
  stopPolling();
  stopPreviewProgress();
});

const preferredStyle = computed(
  () => templates.value.find((item) => item.id === templateId.value)?.style ?? "executive"
);

const retrievalModeOptions: Array<{
  value: RetrievalMode;
  label: string;
  description: string;
}> = [
  {
    value: "searxng",
    label: "SearXNG",
    description: "推荐默认方案。系统会通过聚合搜索获取公开网页信息，适合大多数竞品研究任务。"
  },
  {
    value: "hybrid",
    label: "混合检索",
    description: "会组合多个检索来源一起搜，覆盖更广，但速度通常会更慢一些。"
  },
  {
    value: "search_api",
    label: "Search API",
    description: "适合已经接入通用搜索接口的团队，稳定性取决于你配置的外部搜索服务。"
  },
  {
    value: "serpapi_baidu",
    label: "SerpAPI(Baidu)",
    description: "更偏向百度结果，适合想快速获取中文网页搜索结果的场景。"
  },
  {
    value: "skill_bridge",
    label: "Skill Bridge",
    description: "用于连接外部检索代理或桥接服务，通常由技术同学提前配置。"
  },
  {
    value: "mock",
    label: "Mock 演示模式",
    description: "只用于演示或离线测试，不会执行真实联网检索。"
  }
];

const selectedTemplateDescription = computed(() => {
  const template = templates.value.find((item) => item.id === templateId.value);
  if (!template) {
    return "系统会按当前模板组织章节结构和报告语气。";
  }
  if (template.style === "executive") {
    return "适合给领导汇报，强调结论、对比和行动建议。";
  }
  if (template.style === "research") {
    return "适合做深入研究，内容会更完整，信息密度更高。";
  }
  return "适合快速浏览重点，篇幅更短，更像一份高层简报。";
});

const selectedRetrievalModeDescription = computed(() => {
  if (inputMode.value === "document_upload") {
    return "上传材料模式会优先使用你上传的文档内容，不再额外依赖联网检索。";
  }
  return retrievalModeOptions.find((item) => item.value === retrievalMode.value)?.description
    ?? "系统会按当前检索模式自动收集公开资料。";
});

const selectedWriterModelDescription = computed(() => {
  const model = availableWriterModels.value.find((item) => item.id === routing.value.writerModelId);
  if (!model) {
    return "当前还没有可选的启用模型。";
  }
  return `已选择 ${model.label} 作为报告写作模型，这个设置会同步到模型设置页面。`;
});

const wizardSteps = computed(() => [
  { key: "input" as const, index: "1", title: "填写需求", done: Boolean(preview.value) },
  { key: "review" as const, index: "2", title: "确认名单", done: Boolean(createdTask.value) },
  { key: "running" as const, index: "3", title: "生成报告", done: createdTask.value?.status === "completed" }
]);

const nextTaskHint = computed(() => {
  if (!createdTask.value) {
    return "提交任务后，系统会自动刷新进度。";
  }
  if (createdTask.value.status === "completed") {
    return "报告已经生成完成，进入任务详情页即可下载 Word 和图表资源。";
  }
  if (createdTask.value.status === "failed") {
    return "任务执行失败，可以进入详情页查看原因，修复配置后继续或重试。";
  }
  return "可以留在当前页等待，也可以进入任务详情页查看更完整的快照信息。";
});

const currentInputKey = computed(() =>
  JSON.stringify({
    inputMode: inputMode.value,
    prompt: prompt.value.trim(),
    templateId: templateId.value,
    limit: limit.value,
    retrievalMode: retrievalMode.value,
    autoFillChartData: autoFillChartData.value,
    uploadedMaterials: uploadedMaterials.value.map((item) => ({
      id: item.id,
      competitorName: item.competitorName,
      fileName: item.fileName
    }))
  })
);

watch(currentInputKey, (next) => {
  if (previewInputKey.value && previewInputKey.value !== next) {
    preview.value = null;
    candidateDrafts.value = [];
    manualCandidate.value = "";
    createdTask.value = null;
    wizardStep.value = "input";
    message.value = "需求、材料或检索条件已修改，请重新点击“解析需求”以更新结果。";
  }
});

watch(
  () => createdTask.value?.status,
  (status) => {
    if (status && ["queued", "running"].includes(status)) {
      startPolling();
    } else {
      stopPolling();
    }
  }
);

async function loadTemplates() {
  const response = await apiFetch<{ items: WordTemplateDefinition[] }>("/api/templates");
  templates.value = response.items;
  if (!response.items.some((item) => item.id === templateId.value) && response.items[0]) {
    templateId.value = response.items[0].id;
  }
}

async function loadModelOptions() {
  try {
    const response = await apiFetch<{
      items: ModelConnectionConfig[];
      routing: ModelRoutingConfig;
      effectiveRouting: EffectiveModelRouting;
    }>("/api/models");
    availableWriterModels.value = response.items.filter((item) => item.enabled);
    routing.value = response.routing;
    effectiveRouting.value = response.effectiveRouting;
    if (!routing.value.writerModelId && availableWriterModels.value[0]) {
      routing.value.writerModelId = availableWriterModels.value[0].id;
    }
  } catch {
    // Ignore hint load failure.
  }
}

async function updateWriterModel() {
  if (!routing.value.writerModelId) {
    return;
  }
  savingWriterModel.value = true;
  error.value = "";
  message.value = "";
  try {
    await apiFetch<ModelRoutingConfig>("/api/models/routing", {
      method: "POST",
      body: JSON.stringify(routing.value)
    });
    await loadModelOptions();
    message.value = "写作模型已同步到模型设置。";
  } catch (err) {
    error.value = err instanceof Error ? err.message : "同步写作模型失败";
  } finally {
    savingWriterModel.value = false;
  }
}

function startPolling() {
  stopPolling();
  timer = window.setInterval(() => {
    if (createdTask.value) {
      void refreshTask(createdTask.value.id);
    }
  }, 1500);
}

function stopPolling() {
  if (timer) {
    window.clearInterval(timer);
    timer = null;
  }
}

function startPreviewProgress() {
  stopPreviewProgress();
  previewProgressPercent.value = 8;
  previewCurrentStep.value =
    inputMode.value === "document_upload" ? "正在理解任务说明与上传材料" : "正在理解分析需求";
  previewTimer = window.setInterval(() => {
    previewProgressPercent.value = Math.min(
      previewProgressPercent.value + previewProgressIncrement(previewProgressPercent.value),
      92
    );
    previewCurrentStep.value = previewProgressStep(previewProgressPercent.value, inputMode.value);
  }, 420);
}

function stopPreviewProgress() {
  if (previewTimer) {
    window.clearInterval(previewTimer);
    previewTimer = null;
  }
}

async function parseRequirement() {
  if (!canSubmitCurrentMode()) {
    error.value = inputMode.value === "document_upload" ? "请先上传至少一份竞品材料。" : "请输入竞品分析需求后再解析。";
    return;
  }
  loading.value = "preview";
  startPreviewProgress();
  error.value = "";
  message.value = "";
  try {
    const response = await apiFetch<PreviewResponse>("/api/tasks/preview", {
      method: "POST",
      body: JSON.stringify(buildRequirementPayload())
    });
    previewProgressPercent.value = 100;
    previewCurrentStep.value = "需求解析完成，正在整理候选竞品";
    preview.value = response;
    candidateDrafts.value = response.candidates.map((candidate) => ({
      ...candidate,
      selected: true
    }));
    manualCandidate.value = "";
    previewInputKey.value = currentInputKey.value;
    wizardStep.value = "review";
    message.value =
      inputMode.value === "document_upload"
        ? `已完成材料解析，纳入 ${response.sourceCount} 份上传材料。`
        : `已完成需求解析，命中 ${response.sourceCount} 条来源。`;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "需求解析失败";
  } finally {
    stopPreviewProgress();
    loading.value = "";
  }
}

async function createAndRunTask() {
  if (!canSubmitCurrentMode()) {
    error.value = inputMode.value === "document_upload" ? "请先上传至少一份竞品材料。" : "请输入竞品分析需求后再创建任务。";
    return;
  }
  loading.value = "run";
  error.value = "";
  message.value = "";
  const canReusePreview = previewInputKey.value === currentInputKey.value;
  const confirmedCompetitors = candidateDrafts.value
    .filter((candidate) => candidate.selected)
    .map((candidate) => candidate.name.trim())
    .filter(Boolean);
  if (canReusePreview && confirmedCompetitors.length === 0) {
    error.value = "请至少保留一个候选竞品，或手动补充后再创建任务。";
    loading.value = "";
    return;
  }
  try {
    const task = await apiFetch<AnalysisTask>("/api/tasks", {
      method: "POST",
      body: JSON.stringify({
        ...buildRequirementPayload(),
        confirmedCompetitors,
        parseResult:
          canReusePreview && preview.value?.parseResult
            ? {
                ...preview.value.parseResult,
                inferredOutputStyle: preferredStyle.value
              }
            : undefined
      })
    });
    createdTask.value = task;
    const result = await apiFetch<AnalysisTask>(`/api/tasks/${task.id}/run`, {
      method: "POST",
      body: JSON.stringify({})
    });
    createdTask.value = {
      ...(createdTask.value ?? task),
      status: result.status,
      currentStep: result.currentStep,
      progressPercent: result.progressPercent
    };
    wizardStep.value = "running";
    message.value = "任务已提交，系统正在后台分阶段执行。";
    await router.push(`/tasks/${task.id}`);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "任务执行失败";
  } finally {
    loading.value = "";
  }
}

function goToStep(step: "input" | "review" | "running") {
  if (step === "review" && !preview.value) {
    message.value = "请先完成需求解析，再确认竞品名单。";
    return;
  }
  if (step === "running" && !createdTask.value) {
    message.value = "请先创建并运行任务，再查看生成进度。";
    return;
  }
  wizardStep.value = step;
}

function applyPromptPreset(type: "executive" | "research" | "brief") {
  if (type === "executive") {
    prompt.value = "帮我分析国内 AI 办公助手赛道的主要竞品，做一份面向领导汇报的报告，重点看功能对比、商业模式和机会点。";
    templateId.value = "tpl-executive-zh";
    return;
  }
  if (type === "research") {
    prompt.value = "帮我做一份国内 AI 办公助手赛道的深度研究报告，重点分析市场格局、代表竞品、功能差异、价格模式、增长动作和风险机会。";
    templateId.value = "tpl-research-zh";
    return;
  }
  prompt.value = "帮我快速整理国内 AI 办公助手赛道的竞品简报，输出主要竞品、核心功能差异、商业模式和三个行动建议。";
  templateId.value = "tpl-brief-zh";
}

async function uploadMaterialsForCompetitor() {
  const competitorName = uploadDraft.value.competitorName.trim();
  if (!competitorName) {
    error.value = "请先填写竞品名称，再上传材料。";
    return;
  }
  if (uploadDraft.value.files.length === 0) {
    error.value = "请至少选择一个文件后再上传。";
    return;
  }
  loading.value = "upload";
  error.value = "";
  message.value = "";
  try {
    const items: UploadedMaterialReference[] = [];
    for (const file of uploadDraft.value.files) {
      const fileContentBase64 = await readFileAsBase64(file);
      const uploaded = await apiFetch<UploadedMaterialReference>("/api/materials", {
        method: "POST",
        body: JSON.stringify({
          competitorName,
          fileName: file.name,
          mimeType: file.type,
          fileContentBase64
        })
      });
      items.push(uploaded);
    }
    uploadedMaterials.value = [...uploadedMaterials.value, ...items];
    uploadDraft.value = { competitorName: "", files: [] };
    if (fileInputRef.value) fileInputRef.value.value = "";
    message.value = `已成功上传 ${items.length} 份材料。`;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "上传材料失败";
  } finally {
    loading.value = "";
  }
}

function onSelectUploadFiles(event: Event) {
  uploadDraft.value.files = Array.from((event.target as HTMLInputElement).files ?? []);
}

function addManualCandidate() {
  const name = manualCandidate.value.trim();
  if (!name) return;
  if (candidateDrafts.value.some((item) => item.name === name)) {
    message.value = `${name} 已在候选列表中。`;
    manualCandidate.value = "";
    return;
  }
  candidateDrafts.value.unshift({
    id: `manual-${name}`,
    name,
    layer: "direct",
    matchReason: "手动补充",
    confidence: 1,
    supportingSources: [],
    selected: true,
    manual: true
  });
  manualCandidate.value = "";
}

async function refreshTask(taskId: string) {
  try {
    const detail = await apiFetch<{ task: AnalysisTask }>(`/api/tasks/${taskId}`);
    createdTask.value = detail.task;
  } catch {
    // Ignore poll failure.
  }
}

function canSubmitCurrentMode() {
  return inputMode.value === "document_upload"
    ? uploadedMaterials.value.length > 0
    : prompt.value.trim().length > 0;
}

function buildRequirementPayload() {
  return {
    rawPrompt: prompt.value.trim(),
    preferredTemplateId: templateId.value,
    preferredStyle: preferredStyle.value,
    limit: limit.value,
    inputMode: inputMode.value,
    retrievalMode: inputMode.value === "document_upload" ? "mock" : retrievalMode.value,
    autoFillChartData: autoFillChartData.value,
    uploadedMaterials: uploadedMaterials.value
  };
}

function templateOptionLabel(template: WordTemplateDefinition) {
  if (template.style === "executive") {
    return `${template.name} · 汇报导向`;
  }
  if (template.style === "research") {
    return `${template.name} · 深度研究`;
  }
  return `${template.name} · 简洁摘要`;
}

function previewProgressIncrement(current: number) {
  if (current < 24) return 10;
  if (current < 46) return 7;
  if (current < 72) return 5;
  return 3;
}

function previewProgressStep(current: number, mode: TaskInputMode) {
  if (mode === "document_upload") {
    if (current < 26) return "正在理解任务说明与上传材料";
    if (current < 52) return "正在提炼结构化分析维度";
    if (current < 78) return "正在根据材料准备竞品候选";
    return "正在整理解析结果";
  }
  if (current < 26) return "正在理解分析需求";
  if (current < 52) return "正在补全赛道、区域与关注维度";
  if (current < 78) return "正在检索公开信息并发现候选竞品";
  return "正在整理解析结果";
}
</script>

<style scoped>
.create-report-page {
  display: grid;
  gap: 26px;
}

.create-report-page svg {
  width: 1em;
  height: 1em;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.step-tabs {
  display: flex;
  gap: 34px;
  min-height: 38px;
  align-items: flex-start;
  margin-top: -8px;
  padding-left: 2px;
}

.step-tab {
  position: relative;
  min-width: 124px;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  border: 0;
  background: transparent;
  color: #95a3b8;
  cursor: pointer;
  font-size: 15px;
  font-weight: 800;
}

.step-tab::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -12px;
  height: 2px;
  border-radius: 999px;
  background: transparent;
}

.step-tab span {
  width: 23px;
  height: 23px;
  display: inline-grid;
  place-items: center;
  border-radius: 999px;
  background: #e8eef6;
  color: #94a3b8;
  font-size: 12px;
}

.step-tab.active {
  color: #2563eb;
}

.step-tab.active::after {
  background: #2563eb;
}

.step-tab.active span,
.step-tab.done span {
  background: #2563eb;
  color: #ffffff;
}

.notice {
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 700;
}

.notice.success {
  border: 1px solid #bbf7d0;
  background: #f0fdf4;
  color: #15803d;
}

.notice.error {
  border: 1px solid #fecdd3;
  background: #fff1f2;
  color: #be123c;
}

.create-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 34px;
  align-items: start;
}

.form-card,
.mode-card,
.tip-card {
  border: 1px solid #d9e2ef;
  border-radius: 16px;
  background: #ffffff;
}

.form-card {
  padding: 34px;
}

.form-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 34px;
}

.form-card-header h2 {
  margin: 0;
  color: #1d293d;
  font-size: 19px;
}

.form-actions {
  display: inline-flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.outline-action,
.primary-action {
  min-height: 41px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border-radius: 8px;
  padding: 0 18px;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
}

.outline-action {
  border: 1px solid #dbe3ef;
  background: #ffffff;
  color: #34445a;
}

.primary-action {
  border: 1px solid #2563eb;
  background: #2563eb;
  color: #ffffff;
}

.primary-action:disabled,
.outline-action:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.form-section {
  display: grid;
  gap: 16px;
  margin-top: 28px;
}

.form-section:first-of-type {
  margin-top: 0;
}

.form-section h3 {
  margin: 0;
  color: #2a3a50;
  font-size: 15px;
}

.source-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.source-option {
  min-height: 80px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 16px;
  border: 1px solid #e3eaf3;
  border-radius: 12px;
  padding: 18px;
  background: #ffffff;
  color: #24344a;
  text-align: left;
  cursor: pointer;
}

.source-option.active {
  border: 2px solid #2563eb;
  background: #f8fbff;
}

.source-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  font-size: 22px;
}

.source-icon.blue {
  background: #2563eb;
  color: #ffffff;
}

.source-icon.slate {
  background: #eef3f9;
  color: #61728a;
}

.source-option strong {
  display: block;
  font-size: 18px;
  line-height: 1.25;
}

.source-option small {
  display: block;
  margin-top: 4px;
  color: #6990c7;
  font-size: 13px;
}

.check-icon {
  width: 20px;
  height: 20px;
  color: #2563eb;
  opacity: 0;
}

.source-option.active .check-icon {
  opacity: 1;
}

.upload-panel {
  display: grid;
  gap: 12px;
  margin-top: 22px;
  border: 1px solid #e3eaf3;
  border-radius: 12px;
  padding: 18px;
  background: #f8fbff;
}

.upload-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;
}

.upload-panel label,
.advanced-grid label {
  display: grid;
  gap: 8px;
}

.upload-panel label span,
.advanced-grid label span {
  color: #607086;
  font-size: 13px;
  font-weight: 800;
}

.upload-meta {
  margin: 0;
  color: #708199;
  font-size: 13px;
}

.uploaded-list {
  display: grid;
  gap: 8px;
}

.uploaded-list div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border-radius: 10px;
  padding: 10px 12px;
  background: #ffffff;
  color: #53657f;
  font-size: 13px;
}

.prompt-box {
  position: relative;
  border: 1px solid #dce5f0;
  border-radius: 12px;
  overflow: hidden;
  background: #f8fbff;
}

.prompt-box textarea {
  width: 100%;
  min-height: 204px;
  display: block;
  border: 0;
  border-radius: 0;
  padding: 18px;
  background: transparent;
  box-shadow: none;
  color: #2b3d55;
  line-height: 1.7;
  resize: vertical;
}

.prompt-box textarea:focus {
  outline: none;
  box-shadow: none;
}

.prompt-presets {
  position: absolute;
  right: 16px;
  bottom: 12px;
  display: inline-flex;
  gap: 8px;
}

.prompt-presets button {
  min-height: 30px;
  border: 1px solid #dbe3ef;
  border-radius: 6px;
  padding: 0 12px;
  background: #ffffff;
  color: #53657f;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.prompt-presets button.active {
  border-color: #2563eb;
  background: #2563eb;
  color: #ffffff;
}

.advanced-card {
  display: grid;
  gap: 14px;
  margin-top: 24px;
  border: 1px solid #e3eaf3;
  border-radius: 12px;
  padding: 18px;
  background: #ffffff;
}

.advanced-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.advanced-grid small {
  color: #708199;
  font-size: 12px;
  line-height: 1.55;
}

.auto-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border: 1px solid #e3eaf3;
  border-radius: 12px;
  padding: 14px;
  background: #f8fbff;
  color: #2a3a50;
  text-align: left;
  cursor: pointer;
}

.auto-toggle span {
  display: grid;
  gap: 4px;
}

.auto-toggle small {
  color: #708199;
}

.auto-toggle i {
  position: relative;
  width: 48px;
  height: 28px;
  border-radius: 999px;
  background: #cbd5e1;
  flex: 0 0 auto;
}

.auto-toggle i::after {
  content: "";
  position: absolute;
  top: 4px;
  left: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ffffff;
  transition: transform 0.18s ease;
}

.auto-toggle.active i {
  background: #2563eb;
}

.auto-toggle.active i::after {
  transform: translateX(20px);
}

.model-hint {
  margin: 0;
  color: #53657f;
  font-size: 13px;
}

.progress-card {
  display: grid;
  gap: 12px;
  margin-top: 22px;
  border: 1px solid #bfdbfe;
  border-radius: 12px;
  padding: 16px;
  background: #eff6ff;
}

.progress-card div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #1d4ed8;
  font-size: 14px;
}

.progress-card p {
  height: 8px;
  margin: 0;
  overflow: hidden;
  border-radius: 999px;
  background: #dbeafe;
}

.progress-card p span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #2563eb;
}

.assist-column {
  display: grid;
  gap: 26px;
}

.mode-card {
  padding: 26px;
}

.mode-card h3 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 20px;
  color: #1d293d;
  font-size: 17px;
}

.mode-card h3 svg {
  color: #2563eb;
}

.mode-note {
  border-radius: 12px;
  padding: 18px;
  background: #f5f7fb;
}

.mode-note + .mode-note {
  margin-top: 18px;
}

.mode-note.active {
  border: 1px solid #bfdbfe;
  background: #eff6ff;
}

.mode-note strong {
  color: #2563eb;
  font-size: 14px;
}

.mode-note p {
  margin: 10px 0 0;
  color: #53657f;
  font-size: 13px;
  line-height: 1.75;
}

.tip-card {
  position: relative;
  overflow: hidden;
  padding: 26px;
  background: #2563eb;
  color: #ffffff;
}

.tip-card::after {
  content: "+";
  position: absolute;
  right: -8px;
  bottom: -42px;
  color: rgba(255, 255, 255, 0.12);
  font-size: 160px;
  font-weight: 800;
}

.tip-card h3 {
  position: relative;
  z-index: 1;
  margin: 0 0 18px;
  font-size: 18px;
}

.tip-card p {
  position: relative;
  z-index: 1;
  margin: 0;
  max-width: 260px;
  color: rgba(255, 255, 255, 0.92);
  font-size: 13px;
  line-height: 1.8;
}

.review-layout {
  display: grid;
}

.parse-grid,
.run-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 22px;
}

.parse-grid div,
.run-grid div {
  display: grid;
  gap: 8px;
  border: 1px solid #e3eaf3;
  border-radius: 12px;
  padding: 14px;
  background: #f8fbff;
}

.parse-grid strong,
.run-grid strong {
  color: #607086;
  font-size: 12px;
}

.parse-grid span,
.run-grid span {
  color: #1d293d;
  line-height: 1.6;
}

.manual-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  margin-bottom: 18px;
}

.candidate-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.candidate-list button {
  display: grid;
  gap: 6px;
  border: 1px solid #e3eaf3;
  border-radius: 12px;
  padding: 14px;
  background: #ffffff;
  color: #2b3d55;
  text-align: left;
  cursor: pointer;
}

.candidate-list button.active {
  border-color: #2563eb;
  background: #f8fbff;
}

.candidate-list span {
  color: #708199;
  font-size: 12px;
}

.empty-state {
  border: 1px dashed #d8e3f1;
  border-radius: 12px;
  padding: 24px;
  color: #708199;
  text-align: center;
}

.running-card {
  max-width: 980px;
}

.run-hint {
  margin: 8px 0 0;
  color: #607086;
  font-size: 13px;
}

@media (max-width: 1180px) {
  .create-layout {
    grid-template-columns: 1fr;
  }

  .assist-column {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .form-card {
    padding: 22px;
  }

  .form-card-header,
  .step-tabs {
    display: grid;
  }

  .source-grid,
  .upload-grid,
  .advanced-grid,
  .assist-column,
  .parse-grid,
  .run-grid,
  .candidate-list {
    grid-template-columns: 1fr;
  }

  .prompt-presets {
    position: static;
    padding: 0 14px 14px;
    flex-wrap: wrap;
  }
}
</style>
