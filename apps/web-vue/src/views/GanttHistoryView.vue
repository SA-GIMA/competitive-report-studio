<template>
  <AppShell title="甘特图任务历史" subtitle="查看已经生成过的计划，回看项目名称、起止时间和排期模式。">
    <div class="page-grid">
      <div v-if="error" class="banner error toast">{{ error }}</div>
      <SectionCard title="历史任务" description="这里会展示已经生成过的甘特图计划。">
        <template #action><RouterLink class="button" to="/gantt/new">新建任务</RouterLink></template>
        <div v-if="plans.length === 0" class="empty">目前还没有历史甘特图计划，先去生成一版试试。</div>
        <table v-else class="table">
          <thead>
            <tr>
              <th>项目</th>
              <th>开始时间</th>
              <th>截止时间</th>
              <th>工期</th>
              <th>排期方式</th>
              <th>创建时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="plan in plans" :key="plan.id">
              <td>
                <RouterLink class="text-link" :to="`/gantt/history/${plan.id}`"><strong>{{ plan.projectName }}</strong></RouterLink>
                <div class="muted small mono">{{ plan.id }}</div>
              </td>
              <td>{{ plan.startDate }}</td>
              <td>{{ plan.targetEndDate }}</td>
              <td>{{ plan.durationDays }} 天</td>
              <td>{{ plan.planningMode === "backward" ? "倒排" : "正排" }}</td>
              <td>{{ formatDateTime(plan.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </SectionCard>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import type { GanttPlan } from "@studio/shared";
import AppShell from "@/components/AppShell.vue";
import SectionCard from "@/components/SectionCard.vue";
import { apiFetch } from "@/services/api";
import { formatDateTime } from "@/utils/format";

const plans = ref<GanttPlan[]>([]);
const error = ref("");

onMounted(async () => {
  try {
    const response = await apiFetch<{ items: GanttPlan[] }>("/api/gantt/plans");
    plans.value = response.items;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "加载甘特图历史失败";
  }
});
</script>
