<template>
  <AppShell title="创建竞品分析报告" subtitle="按步骤完成输入、解析、确认和生成。默认配置已经准备好，只有需要时再展开高级设置。">
    <div class="page-grid">
      <div v-if="message" class="banner success toast">{{ message }}</div>
      <div v-if="error" class="banner error toast">{{ error }}</div>

      <div class="wizard-steps">
        <button
          v-for="step in wizardSteps"
          :key="step.key"
          type="button"
          class="wizard-step"
          :class="{ active: wizardStep === step.key, done: step.done }"
          @click="goToStep(step.key)"
        >
          <span>{{ step.index }}</span>
          <strong>{{ step.title }}</strong>
        </button>
      </div>

      <div v-if="wizardStep === 'input'" class="two-col">
        <SectionCard title="第一步：说明你要分析什么" description="先选择资料来源，再用一句话描述报告目标。">
          <template #action>
            <div class="inline-actions">
              <button class="button ghost" @click="showAdvanced = !showAdvanced">{{ showAdvanced ? "收起高级设置" : "高级设置" }}</button>
              <button class="button" :disabled="loading === 'preview'" @click="parseRequirement">{{ loading === "preview" ? "解析中" : "下一步：解析需求" }}</button>
            </div>
          </template>
          <div class="form-grid">
            <div class="mode-switch">
              <button type="button" class="mode-switch-btn" :class="{ active: inputMode === 'search' }" @click="inputMode = 'search'">
                <strong>联网搜索任务</strong>
                <span>自动检索公开资料，适合探索赛道和发现竞品。</span>
              </button>
              <button type="button" class="mode-switch-btn" :class="{ active: inputMode === 'document_upload' }" @click="inputMode = 'document_upload'">
                <strong>上传材料任务</strong>
                <span>直接基于已有文档抽取与写作，适合内部资料分析。</span>
              </button>
            </div>
            <div class="field">
              <label>{{ inputMode === "document_upload" ? "任务说明" : "分析需求" }}</label>
              <textarea v-model="prompt" :placeholder="inputMode === 'document_upload' ? '例如：基于我上传的产品资料，输出一份面向领导汇报的竞品分析报告。' : '例如：帮我分析国内 AI 办公助手赛道的主要竞品，做一份面向领导汇报的报告。'" />
            </div>
            <div class="prompt-presets">
              <button
                type="button"
                :class="{ active: templateId === 'tpl-executive-zh' }"
                @click="applyPromptPreset('executive')"
              >
                汇报版
              </button>
              <button
                type="button"
                :class="{ active: templateId === 'tpl-research-zh' }"
                @click="applyPromptPreset('research')"
              >
                深度研究版
              </button>
              <button
                type="button"
                :class="{ active: templateId === 'tpl-brief-zh' }"
                @click="applyPromptPreset('brief')"
              >
                简洁版
              </button>
            </div>
            <details v-if="showAdvanced" open class="advanced-panel">
              <summary>高级设置</summary>
              <div class="form-grid">
                <div class="field-grid">
                  <div class="field">
                    <label>模板</label>
                    <select v-model="templateId">
                      <option v-for="template in templates" :key="template.id" :value="template.id">{{ templateOptionLabel(template) }}</option>
                    </select>
                    <div class="field-hint">{{ selectedTemplateDescription }}</div>
                  </div>
                  <div class="field"><label>分析数量</label><input v-model.number="limit" type="number" min="1" max="20" /></div>
                </div>
                <div class="field-grid">
                  <div class="field">
                    <label>检索模式</label>
                    <select v-model="retrievalMode" :disabled="inputMode === 'document_upload'">
                      <option v-for="option in retrievalModeOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                      </option>
                    </select>
                    <div class="field-hint">{{ selectedRetrievalModeDescription }}</div>
                  </div>
                  <div class="field">
                    <label>写作模型</label>
                    <select
                      v-model="routing.writerModelId"
                      :disabled="savingWriterModel || availableWriterModels.length === 0"
                      @change="updateWriterModel"
                    >
                      <option v-for="model in availableWriterModels" :key="model.id" :value="model.id">{{ model.label }}</option>
                    </select>
                    <div class="field-hint">{{ selectedWriterModelDescription }}</div>
                  </div>
                </div>
                <button type="button" class="glass-toggle" :class="{ active: autoFillChartData }" @click="autoFillChartData = !autoFillChartData">
                  <span class="glass-toggle-copy">
                    <strong>自动补全图表数据</strong>
                    <small>当检索和抽取结果缺少可视化数值时，允许模型结合上下文自动补齐展示数据。</small>
                  </span>
                  <span class="glass-toggle-track">
                    <span class="glass-toggle-thumb" />
                  </span>
                </button>
                <div class="banner">
                  当前生效写作模型：{{ effectiveRouting.writerModelLabel ?? (effectiveRouting.writerModelId || "未配置") }}{{ effectiveRouting.writerUsesDemoProvider ? "（Demo Provider）" : "" }}
                </div>
                <div v-if="savingWriterModel" class="field-hint">正在同步写作模型到模型设置…</div>
              </div>
            </details>
          </div>
        </SectionCard>

        <SectionCard
          :title="inputMode === 'document_upload' ? '上传材料' : '当前模式说明'"
          :description="inputMode === 'document_upload' ? '上传文档模式下，先按竞品补充资料，再解析需求。' : '联网搜索模式会先检索公开资料，再自动发现候选竞品。'"
        >
          <template #action>
            <button v-if="inputMode === 'document_upload'" class="button ghost" :disabled="loading === 'upload'" @click="uploadMaterialsForCompetitor">{{ loading === "upload" ? "上传中" : "上传材料" }}</button>
          </template>
          <div v-if="inputMode === 'document_upload'" class="form-grid">
            <div class="field"><label>竞品名称</label><input v-model="uploadDraft.competitorName" placeholder="例如：钉钉 / 飞书 / WPS AI" /></div>
            <div class="field"><label>选择文件</label><input ref="fileInputRef" type="file" multiple @change="onSelectUploadFiles" /></div>
            <div class="banner">当前待上传文件数：{{ uploadDraft.files.length }}</div>
            <div v-if="uploadedMaterials.length" class="list">
              <div v-for="item in uploadedMaterials" :key="item.id" class="list-item">
                <strong>{{ item.competitorName }}</strong>
                <span class="muted">{{ item.fileName }} · {{ formatBytes(item.size) }}</span>
              </div>
            </div>
            <div v-else class="empty">还没有上传材料。</div>
          </div>
          <div v-else class="list">
            <div class="list-item">
              <strong>适用场景</strong>
              <span class="muted">需要快速了解公开市场格局，或还没有沉淀内部材料时使用。</span>
            </div>
            <div class="list-item">
              <strong>执行方式</strong>
              <span class="muted">系统先检索，再做候选竞品发现、结构化抽取、图表生成和报告写作。</span>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        v-if="wizardStep === 'input' && loading === 'preview'"
        title="正在解析需求"
        description="系统正在理解任务目标、补全结构化字段并准备候选竞品。"
      >
        <div class="stack">
          <div class="inline-actions">
            <span class="status">解析中</span>
            <span class="muted">{{ previewCurrentStep }}</span>
            <span class="mono small">{{ previewProgressPercent }}%</span>
          </div>
          <div class="progress"><span :style="{ width: `${previewProgressPercent}%` }" /></div>
        </div>
      </SectionCard>

      <div v-if="wizardStep === 'review'" class="panel-grid">
        <SectionCard title="解析结果" description="系统对当前需求的结构化理解。">
          <template #action>
            <button class="button ghost" @click="wizardStep = 'input'">返回修改需求</button>
          </template>
          <div v-if="preview?.parseResult" class="list">
            <div v-for="(value, key) in preview.parseResult" :key="key" class="list-item">
              <strong>{{ key }}</strong>
              <span class="muted">{{ Array.isArray(value) ? value.join(" / ") : String(value) }}</span>
            </div>
          </div>
          <div v-else class="empty">点击“解析需求”后，这里会展示结构化结果。</div>
        </SectionCard>

        <SectionCard title="候选竞品" description="可取消候选项，也可以手动补充。">
          <template #action>
            <div class="inline-actions">
              <input v-model="manualCandidate" placeholder="手动补充竞品名称" />
              <button class="button ghost" @click="addManualCandidate">添加</button>
              <button class="button" :disabled="loading === 'run'" @click="createAndRunTask">{{ loading === "run" ? "提交中" : "下一步：开始生成" }}</button>
            </div>
          </template>
          <div v-if="candidateDrafts.length" class="stack">
            <button
              v-for="candidate in candidateDrafts"
              :key="candidate.id"
              type="button"
              class="glass-toggle compact"
              :class="{ active: candidate.selected }"
              @click="candidate.selected = !candidate.selected"
            >
              <span class="glass-toggle-copy">
                <strong>{{ candidate.name }}</strong>
                <small>{{ candidate.layer }} · 置信度 {{ Math.round(candidate.confidence * 100) }}%{{ candidate.manual ? " · 手动补充" : "" }}</small>
              </span>
              <span class="glass-toggle-track">
                <span class="glass-toggle-thumb" />
              </span>
            </button>
          </div>
          <div v-else class="empty">解析完成后，这里会展示候选竞品。</div>
        </SectionCard>
      </div>

      <SectionCard v-if="wizardStep === 'running' || createdTask" title="生成进度" description="任务已经交给后台执行，完成后可进入详情页下载报告。">
        <div v-if="createdTask" class="list">
          <div class="list-item"><strong>任务 ID</strong><span class="mono small">{{ createdTask.id }}</span></div>
          <div class="list-item"><strong>当前状态</strong><span class="status" :class="taskStatusClass(createdTask.status)">{{ formatTaskStatus(createdTask.status) }}</span></div>
          <div class="list-item"><strong>当前步骤</strong><span class="muted">{{ createdTask.currentStep ?? "-" }}</span></div>
          <div class="list-item"><strong>进度</strong><span class="muted">{{ createdTask.progressPercent ?? 0 }}%</span></div>
          <div class="progress"><span :style="{ width: `${createdTask.progressPercent ?? 0}%` }" /></div>
          <div class="banner">{{ nextTaskHint }}</div>
          <div class="inline-actions">
            <RouterLink class="button ghost" :to="`/tasks/${createdTask.id}`">进入任务详情</RouterLink>
            <RouterLink v-if="createdTask.status === 'completed'" class="button" :to="`/tasks/${createdTask.id}`">下载报告</RouterLink>
          </div>
        </div>
        <div v-else class="empty">任务创建后，这里会显示运行状态。</div>
      </SectionCard>
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
import SectionCard from "@/components/SectionCard.vue";
import { apiFetch } from "@/services/api";
import { readFileAsBase64 } from "@/utils/files";
import { formatBytes, formatTaskStatus, taskStatusClass } from "@/utils/format";

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
const templateId = ref("tpl-executive-zh");
const limit = ref(5);
const retrievalMode = ref<RetrievalMode>("searxng");
const autoFillChartData = ref(false);
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
