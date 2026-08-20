<template>
  <AppShell title="功能清单历史" subtitle="查看已经生成过的结构化功能清单，继续编辑或导出 Markdown。">
    <div class="page-grid">
      <div v-if="error" class="banner error toast">{{ error }}</div>
      <SectionCard title="历史清单" description="这里会展示已生成并保存的智能功能清单。">
        <template #action><RouterLink class="button" to="/feature-list/new">新建清单</RouterLink></template>
        <div v-if="plans.length === 0" class="empty">目前还没有历史功能清单，先去生成一版试试。</div>
        <table v-else class="table">
          <thead>
            <tr>
              <th>清单</th>
              <th>业务领域</th>
              <th>模块</th>
              <th>功能点</th>
              <th>使用端</th>
              <th>更新时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="plan in plans" :key="plan.id">
              <td>
                <RouterLink class="text-link" :to="`/feature-list/history/${plan.id}`"><strong>{{ plan.title }}</strong></RouterLink>
                <div class="muted small mono">{{ plan.id }}</div>
              </td>
              <td>{{ plan.domain }}</td>
              <td>{{ plan.modules.length }}</td>
              <td>{{ plan.features.length }}</td>
              <td>{{ plan.platforms.join("、") }}</td>
              <td>{{ formatDateTime(plan.updatedAt) }}</td>
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
import type { FeatureListPlan } from "@studio/shared";
import AppShell from "@/components/AppShell.vue";
import SectionCard from "@/components/SectionCard.vue";
import { apiFetch } from "@/services/api";
import { formatDateTime } from "@/utils/format";

const plans = ref<FeatureListPlan[]>([]);
const error = ref("");

onMounted(async () => {
  try {
    const response = await apiFetch<{ items: FeatureListPlan[] }>("/api/feature-lists");
    plans.value = response.items;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "加载功能清单历史失败";
  }
});
</script>
