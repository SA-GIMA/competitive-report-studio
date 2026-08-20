<template>
  <AppShell title="创建智能功能清单" subtitle="输入产品目标，系统会生成模块树、功能点、字段表、优先级和验收标准。">
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
        <SectionCard title="第一步：说明产品目标" description="描述越具体，生成出的模块、字段和验收标准越贴近真实落地。">
          <template #action>
            <button class="button" :disabled="loading" @click="generatePlan">{{ loading ? "生成中" : "下一步：生成清单" }}</button>
          </template>

          <div class="form-grid">
            <div class="field-grid">
              <div class="field">
                <label>产品或系统名称</label>
                <input v-model="form.productName" />
              </div>
              <div class="field">
                <label>业务领域</label>
                <input v-model="form.domain" />
              </div>
            </div>

            <div class="field">
              <label>业务目标 / 需求描述</label>
              <textarea v-model="form.productSummary" rows="5" />
            </div>

            <div class="field-grid">
              <div class="field">
                <label>目标用户</label>
                <input v-model="form.targetUsers" />
              </div>
              <div class="field">
                <label>使用模型</label>
                <select v-model="form.modelId">
                  <option v-for="model in availableModels" :key="model.id" :value="model.id">{{ model.label }}</option>
                </select>
              </div>
            </div>

            <div class="field-grid">
              <div class="field">
                <label>输出深度</label>
                <select v-model="form.outputDepth">
                  <option value="brief">简版</option>
                  <option value="standard">标准</option>
                  <option value="detailed">详细</option>
                </select>
              </div>
              <div class="field">
                <label>使用端（用顿号或逗号分隔）</label>
                <input :value="platformText" @input="platformText = inputValue($event)" />
              </div>
            </div>

            <div class="field">
              <label>约束条件（可选）</label>
              <textarea v-model="form.constraints" rows="3" placeholder="例如：需要区分省市县三级权限；导出字段需要可配置；审批流先做单级。" />
            </div>

            <div class="prompt-presets">
              <button type="button" @click="applyPreset('crm')">客户拜访</button>
              <button type="button" @click="applyPreset('project')">项目交付</button>
              <button type="button" @click="applyPreset('ops')">运营活动</button>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="当前会生成什么" description="本版本先聚焦结构化功能清单，不接复杂联网检索。">
          <div class="list">
            <div class="list-item"><strong>模块树</strong><span class="muted">业务模块、模块说明、模块内功能点。</span></div>
            <div class="list-item"><strong>字段表</strong><span class="muted">字段名、Key、类型、必填、校验和权限。</span></div>
            <div class="list-item"><strong>验收标准</strong><span class="muted">每个功能点附带 Given / When / Then。</span></div>
            <div class="list-item"><strong>后续操作</strong><span class="muted">可编辑、保存历史、导出 Markdown。</span></div>
          </div>
        </SectionCard>
      </div>

      <SectionCard v-if="wizardStep === 'generating'" title="第二步：生成进度" description="系统正在理解需求并拆解结构化清单。">
        <div class="stack">
          <div class="inline-actions">
            <span class="status">{{ loading ? "生成中" : "已完成" }}</span>
            <span class="muted">{{ currentStep }}</span>
            <span class="mono small">{{ progressPercent }}%</span>
          </div>
          <div class="progress"><span :style="{ width: `${progressPercent}%` }" /></div>
        </div>
      </SectionCard>

      <div v-if="wizardStep === 'result'" class="page-grid">
        <SectionCard title="第三步：编辑和导出" description="生成结果已经保存到历史记录，可以继续编辑后保存。">
          <template #action>
            <div class="inline-actions">
              <button class="button ghost" @click="wizardStep = 'input'">返回修改输入</button>
              <button class="button ghost" :disabled="saving || !plan" @click="savePlan">{{ saving ? "保存中" : "保存修改" }}</button>
              <button class="button" :disabled="!plan" @click="downloadMarkdown">导出 Markdown</button>
            </div>
          </template>
          <div class="banner">{{ resultHint }}</div>
        </SectionCard>

        <SectionCard title="功能清单编辑器" description="模块、功能、字段和验收标准都可以继续微调。">
          <FeatureListEditor :list="plan" editable @update="plan = $event" />
        </SectionCard>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { FeatureListGenerationRequest, FeatureListPlan, ModelConnectionConfig, ModelRoutingConfig } from "@studio/shared";
import AppShell from "@/components/AppShell.vue";
import FeatureListEditor from "@/components/FeatureListEditor.vue";
import SectionCard from "@/components/SectionCard.vue";
import { apiFetch } from "@/services/api";

const form = ref<FeatureListGenerationRequest>({
  productName: "政企客户拜访管理系统",
  productSummary: "面向政企客户经理，管理客户档案、拜访计划、拜访记录、商机跟进、审批协同和统计分析。",
  targetUsers: "客户经理、销售主管、业务管理员",
  domain: "政企销售管理",
  platforms: ["Web 管理端", "移动端"],
  constraints: "需要支持按组织层级控制数据范围；拜访记录需要可审批；统计指标口径需要可配置。",
  outputDepth: "standard",
  modelId: ""
});
const platformText = ref(form.value.platforms.join("、"));
const availableModels = ref<ModelConnectionConfig[]>([]);
const plan = ref<FeatureListPlan | null>(null);
const loading = ref(false);
const saving = ref(false);
const message = ref("");
const error = ref("");
const wizardStep = ref<"input" | "generating" | "result">("input");
const currentStep = ref("等待生成");
const progressPercent = ref(0);
let timer: number | null = null;

onMounted(loadModelOptions);
onBeforeUnmount(stopProgress);

const wizardSteps = computed(() => [
  { key: "input" as const, index: "1", title: "填写需求", done: Boolean(plan.value) },
  { key: "generating" as const, index: "2", title: "生成清单", done: Boolean(plan.value) },
  { key: "result" as const, index: "3", title: "编辑导出", done: false }
]);

const resultHint = computed(() => {
  if (!plan.value) return "生成完成后，这里会展示结构化功能清单。";
  return `已生成 ${plan.value.modules.length} 个模块、${plan.value.features.length} 个功能点。`;
});

async function loadModelOptions() {
  try {
    const response = await apiFetch<{ items: ModelConnectionConfig[]; routing: ModelRoutingConfig }>("/api/models");
    availableModels.value = response.items.filter((item) => item.enabled);
    if (!form.value.modelId && response.routing.plannerModelId) {
      form.value.modelId = response.routing.plannerModelId;
    }
  } catch {
    // 模型列表加载失败时，提交接口仍会使用后端默认路由。
  }
}

async function generatePlan() {
  loading.value = true;
  error.value = "";
  message.value = "";
  wizardStep.value = "generating";
  startProgress();
  try {
    plan.value = await apiFetch<FeatureListPlan>("/api/feature-lists", {
      method: "POST",
      body: JSON.stringify(normalizeForm())
    });
    stopProgress();
    currentStep.value = "功能清单生成完成";
    progressPercent.value = 100;
    wizardStep.value = "result";
    message.value = "已生成一版功能清单，你可以继续编辑并导出。";
  } catch (err) {
    stopProgress();
    wizardStep.value = "input";
    progressPercent.value = 0;
    currentStep.value = "功能清单生成失败";
    error.value = err instanceof Error ? err.message : "功能清单生成失败";
  } finally {
    loading.value = false;
  }
}

async function savePlan() {
  if (!plan.value) return;
  saving.value = true;
  error.value = "";
  message.value = "";
  try {
    plan.value = await apiFetch<FeatureListPlan>(`/api/feature-lists/${plan.value.id}`, {
      method: "PUT",
      body: JSON.stringify(plan.value)
    });
    message.value = "功能清单已保存。";
  } catch (err) {
    error.value = err instanceof Error ? err.message : "保存功能清单失败";
  } finally {
    saving.value = false;
  }
}

async function downloadMarkdown() {
  if (!plan.value) return;
  try {
    const result = await apiFetch<{ fileName: string; content: string }>(`/api/feature-lists/${plan.value.id}/export/markdown`);
    const blob = new Blob([result.content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = result.fileName;
    link.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "导出 Markdown 失败";
  }
}

function normalizeForm(): FeatureListGenerationRequest {
  return {
    ...form.value,
    platforms: platformText.value.split(/[、,\n]+/).map((item) => item.trim()).filter(Boolean),
    constraints: form.value.constraints?.trim() || undefined
  };
}

function goToStep(step: "input" | "generating" | "result") {
  if (step === "generating" && !loading.value && !plan.value) {
    message.value = "请先填写需求并点击生成。";
    return;
  }
  if (step === "result" && !plan.value) {
    message.value = "功能清单生成完成后，才能进入编辑导出。";
    return;
  }
  wizardStep.value = step;
}

function applyPreset(type: "crm" | "project" | "ops") {
  if (type === "crm") {
    form.value.productName = "政企客户拜访管理系统";
    form.value.productSummary = "面向政企客户经理，管理客户档案、拜访计划、拜访记录、商机跟进、审批协同和统计分析。";
    form.value.targetUsers = "客户经理、销售主管、业务管理员";
    form.value.domain = "政企销售管理";
    platformText.value = "Web 管理端、移动端";
    return;
  }
  if (type === "project") {
    form.value.productName = "项目交付管理平台";
    form.value.productSummary = "围绕客户项目交付过程，管理项目立项、任务分解、进度跟踪、风险问题、验收材料和客户确认。";
    form.value.targetUsers = "项目经理、实施顾问、交付主管、客户联系人";
    form.value.domain = "项目交付";
    platformText.value = "Web 管理端";
    return;
  }
  form.value.productName = "运营活动管理系统";
  form.value.productSummary = "管理活动方案、物料制作、渠道排期、报名名单、执行过程、数据复盘和活动资产沉淀。";
  form.value.targetUsers = "运营人员、设计协同人员、运营主管";
  form.value.domain = "运营活动";
  platformText.value = "Web 管理端、移动端";
}

function startProgress() {
  stopProgress();
  currentStep.value = "正在理解产品目标";
  progressPercent.value = 8;
  timer = window.setInterval(() => {
    progressPercent.value = Math.min(progressPercent.value + progressIncrement(progressPercent.value), 92);
    currentStep.value = progressStep(progressPercent.value);
  }, 450);
}

function stopProgress() {
  if (timer) {
    window.clearInterval(timer);
    timer = null;
  }
}

function progressIncrement(current: number) {
  if (current < 35) return 7;
  if (current < 70) return 5;
  return 2;
}

function progressStep(current: number) {
  if (current < 35) return "正在识别业务模块和角色";
  if (current < 70) return "正在拆解功能点、字段和规则";
  if (current < 88) return "正在补充验收标准和优先级";
  return "正在整理可编辑结果";
}

function inputValue(event: Event) {
  return (event.target as HTMLInputElement).value;
}
</script>

<style scoped>
.wizard-steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.wizard-step {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #d9e2ef;
  border-radius: 12px;
  padding: 14px 16px;
  background: #ffffff;
  color: #536b8b;
  cursor: pointer;
}

.wizard-step span {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  font-weight: 800;
}

.wizard-step.active {
  border-color: #93c5fd;
  color: #1d4ed8;
}

.wizard-step.done span {
  background: #dcfce7;
  color: #15803d;
}

.prompt-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.prompt-presets button {
  min-height: 36px;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  padding: 0 14px;
  background: #ffffff;
  color: #34445a;
  font-weight: 700;
  cursor: pointer;
}

@media (max-width: 860px) {
  .wizard-steps {
    grid-template-columns: 1fr;
  }
}
</style>
