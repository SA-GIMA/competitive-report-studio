<template>
  <AppShell title="任务历史" subtitle="查看历史分析任务，支持筛选、暂停、继续和重试。">
    <div class="page-grid">
      <div v-if="message" class="banner success toast">{{ message }}</div>
      <div v-if="error" class="banner error toast">{{ error }}</div>

      <SectionCard title="历史任务列表" description="这里会展示已创建的历史任务。">
        <template #action><RouterLink class="button" to="/tasks/new">新建任务</RouterLink></template>
        <div v-if="tasks.length === 0" class="empty">目前还没有历史任务，可以先去新建一个分析任务。</div>
        <div v-else class="stack">
          <div class="form-grid">
            <div class="field"><label>关键词</label><input v-model="keyword" placeholder="搜索任务标题、任务 ID、模板或错误信息" /></div>
            <div class="field-grid">
              <div class="field">
                <label>状态</label>
                <select v-model="statusFilter">
                  <option value="all">全部状态</option>
                  <option value="draft">草稿</option>
                  <option value="awaiting_confirmation">待确认</option>
                  <option value="queued">排队中</option>
                  <option value="running">运行中</option>
                  <option value="paused">已暂停</option>
                  <option value="failed">失败</option>
                  <option value="completed">已完成</option>
                </select>
              </div>
              <div class="field">
                <label>输入模式</label>
                <select v-model="inputModeFilter">
                  <option value="all">全部模式</option>
                  <option value="search">联网搜索</option>
                  <option value="document_upload">上传文档</option>
                </select>
              </div>
              <div class="field">
                <label>检索模式</label>
                <select v-model="retrievalFilter">
                  <option value="all">全部检索</option>
                  <option value="mock">mock</option>
                  <option value="search_api">search_api</option>
                  <option value="searxng">searxng</option>
                  <option value="serpapi_baidu">serpapi_baidu</option>
                  <option value="skill_bridge">skill_bridge</option>
                  <option value="hybrid">hybrid</option>
                </select>
              </div>
            </div>
            <div class="banner">当前共 {{ tasks.length }} 条任务，筛选后剩余 {{ filteredTasks.length }} 条。</div>
          </div>
          <div v-if="filteredTasks.length === 0" class="empty">当前筛选条件下没有匹配任务，试着放宽条件再看。</div>
          <table v-else class="table">
            <thead>
              <tr>
                <th>任务</th>
                <th>状态</th>
                <th>失败情况</th>
                <th>模板</th>
                <th>输入 / 检索</th>
                <th>更新时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="task in filteredTasks" :key="task.id">
                <td>
                  <strong>{{ truncate(task.prompt, 36) }}</strong>
                  <div class="muted small mono">{{ task.id }}</div>
                </td>
                <td><span class="status" :class="taskStatusClass(task.status)">{{ formatTaskStatus(task.status) }}</span></td>
                <td>
                  <div v-if="task.status === 'failed'" class="stack">
                    <span class="muted small">{{ formatFailureCategory(task.failureCategory) }}{{ task.retryable ? " · 可重试" : " · 需先修复" }}</span>
                    <span v-if="task.errorMessage" class="muted small">{{ truncate(task.errorMessage, 60) }}</span>
                  </div>
                  <span v-else class="muted small">-</span>
                </td>
                <td>{{ task.templateId ?? "未指定" }}</td>
                <td>{{ task.inputMode === "document_upload" ? "上传文档" : `联网搜索 / ${task.retrievalMode ?? "mock"}` }}</td>
                <td>{{ formatDateTime(task.updatedAt) }}</td>
                <td>
                  <div class="inline-actions">
                    <RouterLink class="text-link" :to="`/tasks/${task.id}`">查看详情</RouterLink>
                    <button v-if="['queued', 'running'].includes(task.status)" type="button" class="button ghost" :disabled="busyId === task.id" @click="controlTask(task.id, 'pause')">{{ busyId === task.id ? "处理中" : "暂停" }}</button>
                    <button v-if="task.status === 'paused' || (task.status === 'failed' && task.retryable)" type="button" class="button ghost" :disabled="busyId === task.id" @click="controlTask(task.id, 'resume')">{{ busyId === task.id ? "处理中" : "继续" }}</button>
                    <button v-if="task.status === 'failed' && task.retryable" type="button" class="button ghost" :disabled="busyId === task.id" @click="controlTask(task.id, 'retry')">{{ busyId === task.id ? "处理中" : "重试" }}</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import type { AnalysisTask } from "@studio/shared";
import AppShell from "@/components/AppShell.vue";
import SectionCard from "@/components/SectionCard.vue";
import { apiFetch } from "@/services/api";
import { formatDateTime, formatFailureCategory, formatTaskStatus, taskStatusClass, truncate } from "@/utils/format";

const tasks = ref<AnalysisTask[]>([]);
const error = ref("");
const message = ref("");
const busyId = ref("");
const keyword = ref("");
const statusFilter = ref<"all" | AnalysisTask["status"]>("all");
const inputModeFilter = ref<"all" | "search" | "document_upload">("all");
const retrievalFilter = ref<"all" | NonNullable<AnalysisTask["retrievalMode"]>>("all");

onMounted(load);

const filteredTasks = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLowerCase();
  return tasks.value.filter((task) => {
    if (statusFilter.value !== "all" && task.status !== statusFilter.value) return false;
    if (inputModeFilter.value !== "all" && (task.inputMode ?? "search") !== inputModeFilter.value) return false;
    if (
      retrievalFilter.value !== "all" &&
      (task.inputMode ?? "search") !== "document_upload" &&
      (task.retrievalMode ?? "mock") !== retrievalFilter.value
    ) return false;
    if (!normalizedKeyword) return true;
    return [task.prompt, task.id, task.templateId ?? "", task.errorMessage ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(normalizedKeyword);
  });
});

async function load() {
  try {
    const response = await apiFetch<{ items: AnalysisTask[] }>("/api/tasks");
    tasks.value = response.items;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "加载任务历史失败";
  }
}

async function controlTask(taskId: string, action: "pause" | "resume" | "retry") {
  busyId.value = taskId;
  error.value = "";
  message.value = "";
  try {
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
    busyId.value = "";
  }
}
</script>
