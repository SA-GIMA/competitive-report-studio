<template>
  <AppShell title="任务详情" subtitle="查看任务状态、解析结果、产物链接和运行快照。">
    <div class="page-grid">
      <div v-if="message" class="banner success toast">{{ message }}</div>
      <div v-if="error" class="banner error toast">{{ error }}</div>
      <div v-if="!detail && !error" class="empty">正在加载任务详情...</div>

      <template v-if="detail">
        <SectionCard title="任务概览" description="查看任务状态、模板、错误信息和报告入口。">
          <template #action>
            <div class="inline-actions">
              <RouterLink class="button ghost" to="/tasks">返回历史列表</RouterLink>
              <RouterLink class="button" to="/tasks/new">新建任务</RouterLink>
              <button v-if="['queued', 'running'].includes(detail.task.status)" class="button ghost" :disabled="controlling" @click="controlTask('pause')">{{ controlling ? "处理中" : "暂停" }}</button>
              <button v-if="detail.task.status === 'paused' || (detail.task.status === 'failed' && detail.task.retryable)" class="button ghost" :disabled="controlling" @click="controlTask('resume')">{{ controlling ? "处理中" : "继续" }}</button>
              <button v-if="['paused', 'failed', 'completed'].includes(detail.task.status)" class="button" :disabled="controlling" @click="controlTask('retry')">{{ controlling ? "处理中" : "重试" }}</button>
            </div>
          </template>
          <div class="list">
            <div class="list-item"><strong>任务状态</strong><span class="status" :class="taskStatusClass(detail.task.status)">{{ formatTaskStatus(detail.task.status) }}</span></div>
            <div class="list-item"><strong>任务 ID</strong><span class="mono small">{{ detail.task.id }}</span></div>
            <div class="list-item"><strong>原始需求</strong><span class="muted">{{ detail.task.prompt }}</span></div>
            <div class="list-item"><strong>模板 ID</strong><span class="muted">{{ detail.task.templateId ?? "未指定" }}</span></div>
            <div class="list-item"><strong>输入模式</strong><span class="muted">{{ detail.task.inputMode ?? "search" }}</span></div>
            <div class="list-item"><strong>检索模式</strong><span class="muted">{{ detail.task.retrievalMode ?? "mock" }}</span></div>
            <div class="list-item"><strong>图表自动补全</strong><span class="muted">{{ detail.task.autoFillChartData ? "已开启" : "未开启" }}</span></div>
            <div class="list-item"><strong>更新时间</strong><span class="muted">{{ formatDateTime(detail.task.updatedAt) }}</span></div>
            <div v-if="detail.task.errorMessage" class="list-item"><strong>失败原因</strong><span class="muted">{{ detail.task.errorMessage }}</span></div>
            <div v-if="detail.task.failureCategory" class="list-item"><strong>失败分类</strong><span class="muted">{{ formatFailureCategory(detail.task.failureCategory) }}{{ detail.task.retryable ? " · 可重试" : " · 需先修复" }}</span></div>
          </div>
          <div v-if="recoveryHint" class="banner">
            {{ recoveryHint }}
          </div>
        </SectionCard>

        <SectionCard
          v-if="['queued', 'running'].includes(detail.task.status)"
          title="生成进度"
          description="页面会自动刷新当前步骤，离开后也可以从任务历史回到这里继续查看。"
        >
          <div class="stack">
            <div class="inline-actions">
              <span class="status" :class="taskStatusClass(detail.task.status)">{{ formatTaskStatus(detail.task.status) }}</span>
              <span class="muted">{{ detail.task.currentStep ?? "等待后台更新" }}</span>
              <span class="mono small">{{ detail.task.progressPercent ?? 0 }}%</span>
            </div>
            <div class="progress"><span :style="{ width: `${detail.task.progressPercent ?? 0}%` }" /></div>
            <div v-if="detail.task.autoResumeAttempts" class="field-hint">
              系统正在自动尝试从断点继续执行，第 {{ detail.task.autoResumeAttempts }}/3 次。
            </div>
          </div>
        </SectionCard>

        <div class="panel-grid">
          <SectionCard title="解析结果" description="显示系统对需求的结构化理解。">
            <div v-if="detail.task.parseResult" class="list">
              <div v-for="(value, key) in detail.task.parseResult" :key="key" class="list-item">
                <strong>{{ key }}</strong>
                <span class="muted">{{ Array.isArray(value) ? value.join(" / ") : String(value) }}</span>
              </div>
            </div>
            <div v-else class="empty">当前任务还没有解析结果。</div>
          </SectionCard>

          <SectionCard title="报告产物" description="生成成功后，可在这里直接打开 Word 和图表。">
            <div v-if="detail.artifact" class="list">
              <div class="list-item">
                <strong>最终版报告</strong>
                <a class="text-link mono small" :href="buildApiUrl(`/api/reports/${detail.artifact.reportId}/download/final`)" target="_blank" rel="noreferrer">打开 / 下载最终版</a>
              </div>
              <div class="list-item">
                <strong>报告预览页</strong>
                <RouterLink class="text-link mono small" :to="`/reports/${detail.artifact.reportId}`">进入预览</RouterLink>
              </div>
              <div class="list-item">
                <strong>图表资源</strong>
                <div class="stack">
                  <a v-for="asset in detail.artifact.chartAssets" :key="asset.id" class="text-link mono small" :href="buildApiUrl(`/api/reports/${detail.artifact.reportId}/charts/${asset.id}`)" target="_blank" rel="noreferrer">{{ asset.spec.title }} ({{ asset.format }})</a>
                </div>
              </div>
            </div>
            <div v-else class="empty">当前任务还没有生成报告产物。</div>
          </SectionCard>
        </div>

        <SectionCard title="候选竞品" description="记录本次任务最终纳入分析的竞品。">
          <div v-if="detail.task.selectedCompetitors?.length" class="chip-row">
            <span v-for="name in detail.task.selectedCompetitors" :key="name" class="chip">{{ name }}</span>
          </div>
          <div v-else class="empty">当前没有可展示的竞品名单。</div>
        </SectionCard>

        <SectionCard title="上传材料" description="上传文档模式下，这里会记录本次任务引用的材料。">
          <div v-if="detail.task.uploadedMaterials?.length" class="list">
            <div v-for="item in detail.task.uploadedMaterials" :key="item.id" class="list-item">
              <strong>{{ item.competitorName }}</strong>
              <span class="muted">{{ item.fileName }} · {{ formatBytes(item.size) }}</span>
            </div>
          </div>
          <div v-else class="empty">当前任务没有上传材料记录。</div>
        </SectionCard>

        <SectionCard title="运行快照" description="展示编排后的快照信息，便于排查和追溯。">
          <div v-if="detail.snapshot" class="list">
            <div class="list-item"><strong>模板</strong><span class="muted">{{ detail.snapshot.templateId }}</span></div>
            <div class="list-item"><strong>查询数</strong><span class="muted">{{ detail.snapshot.queries.length }}</span></div>
            <div class="list-item"><strong>来源数</strong><span class="muted">{{ detail.snapshot.sources.length }}</span></div>
            <div class="list-item"><strong>竞品画像数</strong><span class="muted">{{ detail.snapshot.competitors.length }}</span></div>
            <div class="list-item"><strong>图表数</strong><span class="muted">{{ detail.snapshot.charts.length }}</span></div>
            <div class="list-item"><strong>生成时间</strong><span class="muted">{{ formatDateTime(detail.snapshot.generatedAt) }}</span></div>
          </div>
          <div v-else class="empty">当前任务还没有生成快照。</div>
        </SectionCard>

        <SectionCard title="断点恢复" description="失败或暂停后，这里会告诉你继续执行能复用到哪一步。">
          <div v-if="detail.task.executionCheckpoint" class="list">
            <div class="list-item"><strong>当前断点阶段</strong><span class="muted">{{ checkpointStageLabel(detail.task.executionCheckpoint.stage) }}</span></div>
            <div class="list-item"><strong>已复用的解析结果</strong><span class="muted">{{ detail.task.executionCheckpoint.parseResult ? "已保存" : "未保存" }}</span></div>
            <div class="list-item"><strong>已复用的来源数据</strong><span class="muted">{{ detail.task.executionCheckpoint.sources?.length ?? 0 }} 条</span></div>
            <div class="list-item"><strong>已复用的候选竞品</strong><span class="muted">{{ detail.task.executionCheckpoint.candidates?.length ?? 0 }} 个</span></div>
            <div class="list-item"><strong>已复用的竞品画像</strong><span class="muted">{{ detail.task.executionCheckpoint.competitorProfiles?.length ?? 0 }} 个</span></div>
            <div class="list-item"><strong>已复用的图表资源</strong><span class="muted">{{ detail.task.executionCheckpoint.chartAssets?.length ?? 0 }} 个</span></div>
          </div>
          <div v-else class="empty">当前任务还没有可用断点。</div>
        </SectionCard>
      </template>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, RouterLink } from "vue-router";
import type { AnalysisTask, TaskDetailResponse } from "@studio/shared";
import AppShell from "@/components/AppShell.vue";
import SectionCard from "@/components/SectionCard.vue";
import { apiFetch, buildApiUrl } from "@/services/api";
import { formatBytes, formatDateTime, formatFailureCategory, formatTaskStatus, taskStatusClass } from "@/utils/format";

const route = useRoute();
const detail = ref<TaskDetailResponse | null>(null);
const error = ref("");
const message = ref("");
const controlling = ref(false);
let timer: number | null = null;

const recoveryHint = computed(() => {
  const task = detail.value?.task;
  if (!task || task.status !== "failed") {
    return "";
  }
  if (task.retryable && task.executionCheckpoint?.stage) {
    return `这次失败发生在“${checkpointStageLabel(task.executionCheckpoint.stage)}”阶段。点击“继续”会从这里接着跑，前面已经完成的解析、检索和已保存结果会尽量复用；点击“重试”则会从头重新执行。`;
  }
  if (!task.retryable) {
    return "当前失败被判定为需要先修复配置或输入后再运行；修复后建议重新执行。";
  }
  return "";
});

onMounted(async () => {
  await load();
  startPolling();
});

onBeforeUnmount(() => stopPolling());

async function load() {
  try {
    detail.value = await apiFetch<TaskDetailResponse>(`/api/tasks/${route.params.id as string}`);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "加载任务详情失败";
  }
}

function startPolling() {
  stopPolling();
  timer = window.setInterval(async () => {
    if (!detail.value || !["queued", "running"].includes(detail.value.task.status)) {
      return;
    }
    await load();
  }, 1500);
}

function stopPolling() {
  if (timer) {
    window.clearInterval(timer);
    timer = null;
  }
}

async function controlTask(action: "pause" | "resume" | "retry") {
  controlling.value = true;
  error.value = "";
  message.value = "";
  try {
    const taskId = route.params.id as string;
    const path =
      action === "pause"
        ? `/api/tasks/${taskId}/pause`
        : action === "resume"
          ? `/api/tasks/${taskId}/resume`
          : `/api/tasks/${taskId}/retry`;
    await apiFetch<AnalysisTask>(path, { method: "POST", body: JSON.stringify({}) });
    message.value =
      action === "pause"
        ? "任务已请求暂停。"
        : action === "resume"
          ? "任务已继续执行。"
          : "任务已重新开始执行。";
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "任务控制失败";
  } finally {
    controlling.value = false;
  }
}

function checkpointStageLabel(stage: string) {
  switch (stage) {
    case "parse_requirement":
      return "需求解析";
    case "collect_sources":
      return "来源收集";
    case "prepare_candidates":
      return "候选竞品准备";
    case "extract_competitors":
      return "竞品画像抽取";
    case "collect_chart_sources":
      return "图表数据收集";
    case "render_charts":
      return "图表生成";
    case "write_report":
      return "报告写作";
    case "export_report":
      return "Word 导出";
    case "completed":
      return "已完成";
    default:
      return stage;
  }
}
</script>
