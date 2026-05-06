<template>
  <AppShell title="甘特图详情" subtitle="查看项目排期详情，支持直接编辑并保存任务计划。">
    <div class="page-grid">
      <div v-if="message" class="banner success toast">{{ message }}</div>
      <div v-if="error" class="banner error toast">{{ error }}</div>

      <SectionCard title="计划概览" description="查看项目排期的基本信息、时间边界和生成时间。">
        <template #action>
          <div class="inline-actions">
            <RouterLink class="button ghost" to="/gantt/history">返回历史</RouterLink>
            <button class="button ghost" :disabled="saving || !plan" @click="savePlan">{{ saving ? "保存中" : "保存修改" }}</button>
            <RouterLink class="button" to="/gantt/new">新建任务</RouterLink>
          </div>
        </template>
        <div v-if="!plan" class="empty">正在加载甘特图详情...</div>
        <div v-else class="list">
          <div class="list-item"><strong>项目名称</strong><span class="muted">{{ plan.projectName }}</span></div>
          <div class="list-item"><strong>开始时间</strong><span class="muted">{{ plan.startDate }}</span></div>
          <div class="list-item"><strong>截止时间</strong><span class="muted">{{ plan.targetEndDate }}</span></div>
          <div class="list-item"><strong>工期</strong><span class="muted">{{ plan.durationDays }} 天</span></div>
          <div class="list-item"><strong>排期方式</strong><span class="muted">{{ plan.planningMode === "backward" ? "倒排" : "正排" }}</span></div>
          <div class="list-item"><strong>生成时间</strong><span class="muted">{{ formatDateTime(plan.createdAt) }}</span></div>
        </div>
      </SectionCard>

      <GanttPlanView :plan="plan" editable @update-task="updateTask" />
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, RouterLink } from "vue-router";
import type { GanttPlan, GanttTaskItem } from "@studio/shared";
import AppShell from "@/components/AppShell.vue";
import GanttPlanView from "@/components/GanttPlanView.vue";
import SectionCard from "@/components/SectionCard.vue";
import { apiFetch } from "@/services/api";
import { formatDateTime } from "@/utils/format";

const route = useRoute();
const plan = ref<GanttPlan | null>(null);
const error = ref("");
const message = ref("");
const saving = ref(false);

onMounted(load);

async function load() {
  try {
    plan.value = await apiFetch<GanttPlan>(`/api/gantt/plans/${route.params.id as string}`);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "加载甘特图详情失败";
  }
}

function updateTask(
  taskId: string,
  patch: Partial<Pick<GanttTaskItem, "phase" | "name" | "startDate" | "endDate" | "durationDays">>
) {
  if (!plan.value) {
    return;
  }
  const tasks = plan.value.tasks.map((task) => {
    if (task.id !== taskId) {
      return task;
    }
    const next = { ...task, ...patch };
    if (patch.startDate || patch.endDate) {
      next.durationDays = calculateDurationDays(next.startDate, next.endDate);
    } else if (patch.durationDays) {
      next.endDate = addCalendarDays(next.startDate, Math.max(1, patch.durationDays) - 1);
    }
    return next;
  });
  plan.value = {
    ...plan.value,
    tasks,
    startDate: tasks[0]?.startDate ?? plan.value.startDate,
    endDate: tasks[tasks.length - 1]?.endDate ?? plan.value.endDate
  };
}

async function savePlan() {
  if (!plan.value) {
    return;
  }
  saving.value = true;
  error.value = "";
  message.value = "";
  try {
    plan.value = await apiFetch<GanttPlan>(`/api/gantt/plans/${plan.value.id}`, {
      method: "PUT",
      body: JSON.stringify({
        projectName: plan.value.projectName,
        projectSummary: plan.value.projectSummary,
        startDate: plan.value.startDate,
        endDate: plan.value.endDate,
        targetEndDate: plan.value.targetEndDate,
        tasks: plan.value.tasks,
        assumptions: plan.value.assumptions,
        riskNotes: plan.value.riskNotes
      })
    });
    message.value = "甘特图任务已保存。";
  } catch (err) {
    error.value = err instanceof Error ? err.message : "保存甘特图失败";
  } finally {
    saving.value = false;
  }
}

function calculateDurationDays(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
}

function addCalendarDays(startDate: string, offset: number) {
  const next = new Date(`${startDate}T00:00:00`);
  next.setDate(next.getDate() + offset);
  return next.toISOString().slice(0, 10);
}
</script>
