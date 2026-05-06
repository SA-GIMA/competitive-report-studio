<template>
  <AppShell title="报告预览" subtitle="报告详情页展示生成记录、Word 下载和图表资源，便于追溯与汇报。">
    <div class="page-grid">
      <div v-if="error" class="banner error toast">{{ error }}</div>

      <div class="panel-grid">
        <SectionCard title="生成记录" description="这里展示报告生成时间和资源概况。">
          <div v-if="report" class="list">
            <div class="list-item"><strong>报告 ID</strong><span class="muted mono small">{{ report.reportId }}</span></div>
            <div class="list-item"><strong>生成时间</strong><span class="muted">{{ formatDateTime(report.generatedAt) }}</span></div>
            <div class="list-item"><strong>图表数量</strong><span class="muted">{{ report.chartAssets.length }}</span></div>
          </div>
          <div v-else class="empty">正在加载报告信息...</div>
        </SectionCard>

        <SectionCard title="操作区" description="支持直接打开 Word 和图表资源。">
          <div v-if="report" class="chip-row">
            <a class="button" :href="buildApiUrl(`/api/reports/${report.reportId}/download/final`)" target="_blank" rel="noreferrer">最终版 Word</a>
            <a class="button secondary" :href="buildApiUrl(`/api/reports/${report.reportId}/download/editable`)" target="_blank" rel="noreferrer">可编辑版 Word</a>
            <RouterLink class="button ghost" to="/tasks">返回任务历史</RouterLink>
          </div>
          <div v-else class="empty">报告生成后，这里会出现下载入口。</div>
        </SectionCard>
      </div>

      <SectionCard title="图表资源" description="可直接打开各图表图片。">
        <div v-if="report?.chartAssets.length" class="list">
          <div v-for="asset in report.chartAssets" :key="asset.id" class="list-item">
            <strong>{{ asset.spec.title }}</strong>
            <a class="text-link mono small" :href="buildApiUrl(`/api/reports/${report.reportId}/charts/${asset.id}`)" target="_blank" rel="noreferrer">打开图表资源</a>
          </div>
        </div>
        <div v-else class="empty">当前报告还没有图表资源。</div>
      </SectionCard>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, RouterLink } from "vue-router";
import type { ReportArtifact } from "@studio/shared";
import AppShell from "@/components/AppShell.vue";
import SectionCard from "@/components/SectionCard.vue";
import { apiFetch, buildApiUrl } from "@/services/api";
import { formatDateTime } from "@/utils/format";

const route = useRoute();
const report = ref<ReportArtifact | null>(null);
const error = ref("");

onMounted(async () => {
  try {
    report.value = await apiFetch<ReportArtifact>(`/api/reports/${route.params.id as string}`);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "加载报告失败";
  }
});
</script>
