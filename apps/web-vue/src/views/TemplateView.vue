<template>
  <AppShell title="模板管理" subtitle="维护报告模板、章节顺序和上传模板文件。">
    <div class="page-grid">
      <div v-if="message" class="banner success toast">{{ message }}</div>
      <div v-if="error" class="banner error toast">{{ error }}</div>

      <div class="split">
        <SectionCard title="模板列表" description="模板可选、可切换、可编辑。">
          <div class="stack">
            <button
              v-for="template in templates"
              :key="template.id"
              class="list-item"
              style="text-align: left; cursor: pointer"
              :style="{ outline: template.id === selectedId ? '2px solid rgba(37,99,235,.35)' : 'none' }"
              @click="selectTemplate(template.id)"
            >
              <strong>{{ template.name }}</strong>
              <p class="muted small">{{ template.description }}</p>
              <div class="inline-actions">
                <span class="status">{{ template.style }}</span>
                <span class="status success">{{ template.sections.length }} 个章节</span>
              </div>
            </button>
          </div>
        </SectionCard>

        <SectionCard title="上传模板" description="支持把本地 .docx 模板上传到系统。">
          <template #action><button class="button" @click="uploadTemplate">上传并创建模板</button></template>
          <div class="form-grid">
            <div class="upload-box">
              <input type="file" accept=".docx" @change="onSelectFile" />
              <p class="muted small">当前选择：{{ uploadFile?.name ?? "未选择文件" }}</p>
            </div>
            <div class="field-grid">
              <input v-model="uploadName" class="text-like-input" />
              <select v-model="uploadStyle">
                <option value="executive">高层汇报版</option>
                <option value="research">深度研究版</option>
                <option value="brief">简版摘要版</option>
              </select>
            </div>
            <input v-model="uploadDescription" class="text-like-input" />
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="模板章节配置"
        :description="draft ? `当前编辑：${draft.name} · ${draft.sections.length} 个章节` : '支持新增、删改、启停和上下移动。'"
      >
        <template #action>
          <div class="inline-actions">
            <button class="button ghost" :disabled="!draft" @click="addSection">新增章节</button>
            <button class="button ghost" :disabled="!draft || !selectedTemplate" @click="resetSections">还原默认</button>
            <button class="button" :disabled="!draft" @click="saveTemplate">保存模板</button>
          </div>
        </template>
        <div v-if="!draft" class="empty">请选择一个模板后再编辑。</div>
        <div v-else class="stack">
          <div v-for="(section, index) in draft.sections" :key="section.id" class="card template-section-card">
            <div class="field-grid template-section-grid">
              <input v-model="section.title" class="text-like-input" />
              <input v-model="section.placeholderKey" class="text-like-input" />
            </div>
            <div class="field-grid template-section-grid">
              <input v-model="section.id" class="text-like-input" />
              <button
                type="button"
                class="glass-toggle compact"
                :class="{ active: section.enabled }"
                @click="section.enabled = !section.enabled"
              >
                <span class="glass-toggle-copy">
                  <strong>启用该章节</strong>
                  <small>关闭后，该章节不会出现在报告生成结果里。</small>
                </span>
                <span class="glass-toggle-track">
                  <span class="glass-toggle-thumb" />
                </span>
              </button>
            </div>
            <textarea v-model="section.description" class="text-like-input" />
            <div class="inline-actions template-section-actions">
              <button class="button ghost" :disabled="index === 0" @click="moveSection(index, -1)">上移</button>
              <button class="button ghost" :disabled="index === draft.sections.length - 1" @click="moveSection(index, 1)">下移</button>
              <button class="button ghost" @click="removeSection(index)">删除</button>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import type { ReportSectionTemplate, WordTemplateDefinition } from "@studio/shared";
import AppShell from "@/components/AppShell.vue";
import SectionCard from "@/components/SectionCard.vue";
import { apiFetch } from "@/services/api";
import { readFileAsBase64 } from "@/utils/files";

const templates = ref<WordTemplateDefinition[]>([]);
const selectedId = ref("");
const draft = ref<WordTemplateDefinition | null>(null);
const message = ref("");
const error = ref("");
const uploadFile = ref<File | null>(null);
const uploadName = ref("新上传模板");
const uploadDescription = ref("由界面上传的新模板");
const uploadStyle = ref<WordTemplateDefinition["style"]>("executive");

const selectedTemplate = computed(
  () => templates.value.find((item) => item.id === selectedId.value) ?? null
);

onMounted(load);

watch(selectedId, syncDraftFromSelected);

async function load() {
  try {
    const response = await apiFetch<{ items: WordTemplateDefinition[] }>("/api/templates");
    templates.value = response.items;
    if (!response.items.some((item) => item.id === selectedId.value)) {
      selectedId.value = response.items[0]?.id ?? "";
    }
    syncDraftFromSelected();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "加载模板失败";
  }
}

function selectTemplate(templateId: string) {
  if (!templates.value.some((item) => item.id === templateId)) return;
  selectedId.value = templateId;
  message.value = "";
  error.value = "";
}

function syncDraftFromSelected() {
  const template = selectedTemplate.value;
  draft.value = template ? JSON.parse(JSON.stringify(template)) : null;
}

function moveSection(index: number, offset: number) {
  if (!draft.value) return;
  const targetIndex = index + offset;
  if (targetIndex < 0 || targetIndex >= draft.value.sections.length) return;
  const sections = [...draft.value.sections];
  const [item] = sections.splice(index, 1);
  sections.splice(targetIndex, 0, item);
  draft.value.sections = sections.map((section, currentIndex) => ({
    ...section,
    order: currentIndex + 1
  }));
}

function addSection() {
  if (!draft.value) return;
  const nextOrder = draft.value.sections.length + 1;
  draft.value.sections.push({
    id: `section_${nextOrder}`,
    title: `新增章节 ${nextOrder}`,
    description: "请补充章节说明",
    order: nextOrder,
    enabled: true,
    placeholderKey: `section.new_${nextOrder}`
  });
}

function removeSection(index: number) {
  if (!draft.value) return;
  draft.value.sections = draft.value.sections
    .filter((_, currentIndex) => currentIndex !== index)
    .map((section, currentIndex) => ({ ...section, order: currentIndex + 1 }));
}

async function resetSections() {
  if (!draft.value || !selectedTemplate.value || !selectedId.value) return;
  try {
    const saved = await apiFetch<WordTemplateDefinition>(`/api/templates/${selectedId.value}/reset-sections`, {
      method: "POST",
      body: JSON.stringify({})
    });
    message.value = `已还原 ${saved.name} 的默认章节设置`;
    await load();
    selectedId.value = saved.id;
    draft.value = JSON.parse(JSON.stringify(saved));
    error.value = "";
  } catch (err) {
    error.value = err instanceof Error ? err.message : "还原默认章节失败";
  }
}

async function saveTemplate() {
  if (!draft.value || !selectedId.value || !selectedTemplate.value) return;
  try {
    const saved = await apiFetch<WordTemplateDefinition>(`/api/templates/${selectedId.value}`, {
      method: "PUT",
      body: JSON.stringify({
        ...draft.value,
        id: selectedId.value,
        sections: draft.value.sections.map((section, index) => normalizeSection(section, index))
      })
    });
    message.value = `模板 ${saved.name} 已保存`;
    await load();
    selectedId.value = saved.id;
    draft.value = JSON.parse(JSON.stringify(saved));
  } catch (err) {
    error.value = err instanceof Error ? err.message : "保存模板失败";
  }
}

async function uploadTemplate() {
  if (!uploadFile.value) {
    error.value = "请先选择一个 .docx 模板文件";
    return;
  }
  try {
    const base64 = await readFileAsBase64(uploadFile.value);
    const uploaded = await apiFetch<WordTemplateDefinition>("/api/templates/upload", {
      method: "POST",
      body: JSON.stringify({
        name: uploadName.value,
        style: uploadStyle.value,
        description: uploadDescription.value,
        fileName: uploadFile.value.name,
        fileContentBase64: base64
      })
    });
    message.value = `模板 ${uploaded.name} 上传成功`;
    await load();
    selectedId.value = uploaded.id;
    draft.value = structuredClone(uploaded);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "模板上传失败";
  }
}

function onSelectFile(event: Event) {
  uploadFile.value = (event.target as HTMLInputElement).files?.[0] ?? null;
}

function normalizeSection(section: ReportSectionTemplate, index: number): ReportSectionTemplate {
  return {
    ...section,
    title: section.title.trim(),
    description: section.description.trim(),
    id: section.id.trim(),
    placeholderKey: section.placeholderKey.trim(),
    order: index + 1
  };
}
</script>
