<template>
  <AppShell title="功能清单详情" subtitle="继续编辑模块、功能点、字段表和验收标准，并导出 Markdown。">
    <div class="page-grid">
      <div v-if="message" class="banner success toast">{{ message }}</div>
      <div v-if="error" class="banner error toast">{{ error }}</div>

      <SectionCard title="清单概览" description="查看基本信息、生成时间和当前结构规模。">
        <template #action>
          <div class="inline-actions">
            <RouterLink class="button ghost" to="/feature-list/history">返回历史</RouterLink>
            <button class="button ghost" :disabled="saving || !plan" @click="savePlan">{{ saving ? "保存中" : "保存修改" }}</button>
            <button class="button" :disabled="!plan" @click="downloadMarkdown">导出 Markdown</button>
          </div>
        </template>
        <div v-if="!plan" class="empty">正在加载功能清单详情...</div>
        <div v-else class="list">
          <div class="list-item"><strong>清单标题</strong><span class="muted">{{ plan.title }}</span></div>
          <div class="list-item"><strong>产品名称</strong><span class="muted">{{ plan.productName }}</span></div>
          <div class="list-item"><strong>业务领域</strong><span class="muted">{{ plan.domain }}</span></div>
          <div class="list-item"><strong>目标用户</strong><span class="muted">{{ plan.targetUsers }}</span></div>
          <div class="list-item"><strong>结构规模</strong><span class="muted">{{ plan.modules.length }} 个模块，{{ plan.features.length }} 个功能点</span></div>
          <div class="list-item"><strong>更新时间</strong><span class="muted">{{ formatDateTime(plan.updatedAt) }}</span></div>
        </div>
      </SectionCard>

      <SectionCard title="功能清单编辑器" description="所有修改需点击保存后写入历史。">
        <FeatureListEditor :list="plan" editable @update="plan = $event" />
      </SectionCard>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink, useRoute } from "vue-router";
import type { FeatureListPlan } from "@studio/shared";
import AppShell from "@/components/AppShell.vue";
import FeatureListEditor from "@/components/FeatureListEditor.vue";
import SectionCard from "@/components/SectionCard.vue";
import { apiFetch } from "@/services/api";
import { formatDateTime } from "@/utils/format";

const route = useRoute();
const plan = ref<FeatureListPlan | null>(null);
const saving = ref(false);
const message = ref("");
const error = ref("");

onMounted(load);

async function load() {
  try {
    plan.value = await apiFetch<FeatureListPlan>(`/api/feature-lists/${route.params.id as string}`);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "加载功能清单详情失败";
  }
}

async function savePlan() {
  if (!plan.value) return;
  saving.value = true;
  message.value = "";
  error.value = "";
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
</script>
