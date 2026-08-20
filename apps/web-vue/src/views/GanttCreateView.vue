<template>
  <AppShell
    title="创建项目甘特图"
    subtitle="按步骤填写项目目标、时间边界和关键约束，生成后可以继续微调任务排期。"
  >
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
        <SectionCard title="第一步：说明项目和时间边界" description="先选择排期方式，再填写项目目标和关键日期。">
          <template #action>
            <div class="inline-actions">
              <button class="button ghost" @click="showAdvanced = !showAdvanced">
                {{ showAdvanced ? "收起高级设置" : "高级设置" }}
              </button>
              <button class="button" :disabled="loading" @click="generatePlan">
                {{ loading ? "生成中" : "下一步：生成甘特图" }}
              </button>
            </div>
          </template>

          <div class="form-grid">
            <div class="mode-switch">
              <button
                type="button"
                class="mode-switch-btn"
                :class="{ active: form.planningMode === 'backward' }"
                @click="form.planningMode = 'backward'"
              >
                <strong>按截止时间倒排</strong>
                <span>适合已经确定上线、交付或活动日期的项目。</span>
              </button>
              <button
                type="button"
                class="mode-switch-btn"
                :class="{ active: form.planningMode === 'forward' }"
                @click="form.planningMode = 'forward'"
              >
                <strong>按开始时间正排</strong>
                <span>适合从某一天开始推进，向后安排阶段节奏。</span>
              </button>
            </div>

            <div class="field-grid">
              <div class="field">
                <label>项目名称</label>
                <input v-model="form.projectName" />
              </div>
              <div v-if="form.planningMode === 'backward'" class="field">
                <label>截止时间</label>
                <input v-model="form.targetEndDate" type="date" />
              </div>
              <div v-else class="field">
                <label>开始时间</label>
                <input v-model="form.startDate" type="date" />
              </div>
            </div>

            <div class="field-grid">
              <div class="field">
                <label>使用模型</label>
                <select v-model="form.modelId" class="fancy-select">
                  <option v-for="model in availableModels" :key="model.id" :value="model.id">
                    {{ model.label }}
                  </option>
                </select>
              </div>
              <div class="field">
                <label>工期（天）</label>
                <input v-model.number="form.durationDays" type="number" min="1" max="120" />
              </div>
            </div>

            <div class="field">
              <label>项目目标描述</label>
              <textarea v-model="form.projectSummary" />
            </div>

            <div class="prompt-presets">
              <button type="button" @click="applyGanttPreset('release')">产品发布</button>
              <button type="button" @click="applyGanttPreset('delivery')">客户交付</button>
              <button type="button" @click="applyGanttPreset('campaign')">运营活动</button>
            </div>

            <details v-if="showAdvanced" open class="advanced-panel">
              <summary>高级设置</summary>
              <div class="form-grid">
                <div class="field">
                  <label>工作日规则</label>
                  <select v-model="form.workingDaysMode" class="fancy-select">
                    <option value="five_day">双休</option>
                    <option value="six_day">单休</option>
                    <option value="calendar_day">自然日</option>
                  </select>
                </div>
                <div class="field">
                  <label>关键约束（可选）</label>
                  <textarea v-model="form.constraints" placeholder="例如：联调至少 5 天；验收前需要 1 天内部演练。" />
                </div>
              </div>
            </details>
          </div>
        </SectionCard>

        <SectionCard title="当前会如何生成" description="系统会先理解目标，再拆任务和计算日期。">
          <div class="list">
            <div class="list-item">
              <strong>排期方式</strong>
              <span class="muted">{{ form.planningMode === "backward" ? "按截止时间倒排" : "按开始时间正排" }}</span>
            </div>
            <div class="list-item">
              <strong>时间范围</strong>
              <span class="muted">{{ form.durationDays }} 天，{{ formatWorkingDaysMode(form.workingDaysMode) }}</span>
            </div>
            <div class="list-item">
              <strong>生成结果</strong>
              <span class="muted">阶段任务、起止日期、依赖关系、里程碑、排期假设和风险提示。</span>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard v-if="wizardStep === 'generating'" title="第二步：生成进度" description="系统正在拆解任务和计算日期。">
        <div class="stack">
          <div class="inline-actions">
            <span class="status" :class="{ success: progressPercent === 100 }">
              {{ loading ? "生成中" : progressPercent === 100 ? "已完成" : "待开始" }}
            </span>
            <span class="muted">{{ currentStep }}</span>
            <span class="mono small">{{ progressPercent }}%</span>
          </div>
          <div class="progress"><span :style="{ width: `${progressPercent}%` }" /></div>
        </div>
      </SectionCard>

      <div v-if="wizardStep === 'result'">
        <SectionCard title="第三步：微调和导出" description="生成后可以直接编辑任务表，再导出给团队确认。">
          <template #action>
            <div class="inline-actions">
              <button class="button ghost" @click="wizardStep = 'input'">返回修改输入</button>
              <RouterLink class="button ghost" to="/gantt/history">查看历史</RouterLink>
            </div>
          </template>
          <div class="banner">{{ resultHint }}</div>
        </SectionCard>

        <GanttPlanView :plan="plan" editable @update-task="updateTask" />
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import type { GanttPlan, GanttPlanningRequest, GanttTaskItem, ModelConnectionConfig, ModelRoutingConfig } from "@studio/shared";
import AppShell from "@/components/AppShell.vue";
import GanttPlanView from "@/components/GanttPlanView.vue";
import SectionCard from "@/components/SectionCard.vue";
import { apiFetch } from "@/services/api";

const form = ref<GanttPlanningRequest>({
  projectName: "新产品发布排期",
  projectSummary: "围绕一个新产品版本发布，自动拆解阶段任务、验收节点和整体时间计划。",
  targetEndDate: buildDefaultTargetDate(),
  durationDays: 15,
  workingDaysMode: "five_day",
  planningMode: "backward",
  constraints: "正式验收前至少预留 1 天演练；联调与修正阶段不能少于 2 天。",
  modelId: ""
});
const plan = ref<GanttPlan | null>(null);
const availableModels = ref<ModelConnectionConfig[]>([]);
const message = ref("");
const error = ref("");
const loading = ref(false);
const currentStep = ref("等待生成");
const progressPercent = ref(0);
const wizardStep = ref<"input" | "generating" | "result">("input");
const showAdvanced = ref(false);
let timer: number | null = null;

onMounted(async () => {
  await loadModelOptions();
});

onBeforeUnmount(() => stopProgress());

const wizardSteps = computed(() => [
  { key: "input" as const, index: "1", title: "填写项目", done: Boolean(plan.value) },
  { key: "generating" as const, index: "2", title: "生成计划", done: Boolean(plan.value) },
  { key: "result" as const, index: "3", title: "微调导出", done: false }
]);

const resultHint = computed(() => {
  if (!plan.value) {
    return "生成计划后，这里会显示可编辑的任务表和甘特图。";
  }
  return `已生成 ${plan.value.tasks.length} 个任务，时间范围 ${plan.value.startDate} 到 ${plan.value.endDate}。`;
});

const loadModelOptions = async () => {
  try {
    const response = await apiFetch<{
      items: ModelConnectionConfig[];
      routing: ModelRoutingConfig;
    }>("/api/models");
    availableModels.value = response.items.filter((item) => item.enabled);
    if (!form.value.modelId && response.routing.plannerModelId) {
      form.value.modelId = response.routing.plannerModelId;
    }
  } catch {
    // Ignore load failure.
  }
};

const startProgress = () => {
  stopProgress();
  currentStep.value = "正在整理项目目标与时间约束";
  progressPercent.value = 8;
  timer = window.setInterval(() => {
    progressPercent.value = Math.min(progressPercent.value + progressIncrement(progressPercent.value), 92);
    currentStep.value = progressStep(progressPercent.value);
  }, 450);
};

const stopProgress = () => {
  if (timer) {
    window.clearInterval(timer);
    timer = null;
  }
};

const generatePlan = async () => {
  loading.value = true;
  error.value = "";
  message.value = "";
  wizardStep.value = "generating";
  startProgress();
  try {
    plan.value = await apiFetch<GanttPlan>("/api/gantt/plans", {
      method: "POST",
      body: JSON.stringify(normalizeForm())
    });
    stopProgress();
    currentStep.value = "甘特图生成完成";
    progressPercent.value = 100;
    wizardStep.value = "result";
    message.value = "已生成一版甘特图计划，你可以继续微调任务和日期。";
  } catch (err) {
    stopProgress();
    wizardStep.value = "input";
    currentStep.value = "甘特图生成失败";
    progressPercent.value = 0;
    error.value = err instanceof Error ? err.message : "甘特图生成失败";
  } finally {
    loading.value = false;
  }
};

const updateTask = (
  taskId: string,
  patch: Partial<Pick<GanttTaskItem, "phase" | "name" | "startDate" | "endDate" | "durationDays">>
) => {
  if (!plan.value) {
    return;
  }
  const tasks = plan.value.tasks.map((task) => {
    if (task.id !== taskId) {
      return task;
    }
    const next = { ...task, ...patch };
    if (patch.startDate && !patch.endDate) {
      next.endDate = addCalendarDays(next.startDate, Math.max(1, next.durationDays) - 1);
    } else if (patch.endDate && !patch.startDate) {
      next.durationDays = calculateDurationDays(next.startDate, next.endDate);
    } else if (patch.startDate && patch.endDate) {
      next.durationDays = calculateDurationDays(next.startDate, next.endDate);
    } else if (patch.durationDays) {
      next.endDate = addCalendarDays(next.startDate, Math.max(1, patch.durationDays) - 1);
    }
    return next;
  });
  const allStarts = tasks.map((t) => t.startDate);
  const allEnds = tasks.map((t) => t.endDate);
  plan.value = {
    ...plan.value,
    tasks,
    startDate: allStarts.length ? allStarts.reduce((a, b) => (a < b ? a : b)) : plan.value.startDate,
    endDate: allEnds.length ? allEnds.reduce((a, b) => (a > b ? a : b)) : plan.value.endDate
  };
};

const normalizeForm = (): GanttPlanningRequest => ({
  ...form.value,
  startDate: form.value.startDate || undefined,
  constraints: form.value.constraints?.trim() || undefined
});

function goToStep(step: "input" | "generating" | "result") {
  if (step === "generating" && !loading.value && !plan.value) {
    message.value = "请先填写项目信息并点击生成。";
    return;
  }
  if (step === "result" && !plan.value) {
    message.value = "甘特图生成完成后，才能进入微调和导出。";
    return;
  }
  wizardStep.value = step;
}

function applyGanttPreset(type: "release" | "delivery" | "campaign") {
  if (type === "release") {
    form.value.projectName = "新产品版本发布排期";
    form.value.projectSummary = "围绕一个新产品版本发布，拆解需求确认、方案设计、研发联调、测试验收、上线准备和复盘收口。";
    form.value.constraints = "上线前至少预留 2 天验收；联调与修正阶段不能少于 3 天。";
    return;
  }
  if (type === "delivery") {
    form.value.projectName = "客户项目交付排期";
    form.value.projectSummary = "围绕客户项目交付，拆解需求澄清、方案确认、实施配置、联调验收、客户培训和最终交付。";
    form.value.constraints = "客户验收前至少安排 1 次内部演练；培训和交付文档需要单独预留时间。";
    return;
  }
  form.value.projectName = "运营活动筹备排期";
  form.value.projectSummary = "围绕一场运营活动，拆解活动方案、内容制作、渠道排期、物料确认、上线执行和数据复盘。";
  form.value.constraints = "活动上线前至少预留 1 天检查物料；复盘需要在活动结束后 2 天内完成。";
}

function formatWorkingDaysMode(mode: GanttPlanningRequest["workingDaysMode"]) {
  if (mode === "five_day") return "双休";
  if (mode === "six_day") return "单休";
  return "自然日";
}

function buildDefaultTargetDate() {
  const date = new Date();
  date.setDate(date.getDate() + 21);
  return formatDateOnly(date);
}

function progressIncrement(current: number) {
  if (current < 30) return 6;
  if (current < 60) return 4;
  return 2;
}

function progressStep(current: number) {
  if (current < 30) return "正在理解目标与时间边界";
  if (current < 60) return "正在拆解阶段与任务";
  if (current < 85) return "正在计算依赖与排期";
  return "正在整理展示结果";
}

function calculateDurationDays(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
}

function addCalendarDays(startDate: string, offset: number) {
  const next = new Date(`${startDate}T00:00:00`);
  next.setDate(next.getDate() + offset);
  return formatDateOnly(next);
}

function formatDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
</script>
