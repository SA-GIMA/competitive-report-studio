<template>
  <div v-if="!localList" class="empty">暂无功能清单数据。</div>
  <div v-else class="feature-editor">
    <section class="feature-summary">
      <div>
        <strong>{{ localList.title }}</strong>
        <span>{{ localList.modules.length }} 个模块 · {{ localList.features.length }} 个功能点</span>
      </div>
      <div class="summary-tags">
        <span>{{ localList.domain }}</span>
        <span>{{ localList.outputDepth }}</span>
        <span v-for="platform in localList.platforms" :key="platform">{{ platform }}</span>
      </div>
    </section>

    <div class="editor-grid">
      <aside class="module-rail">
        <div class="rail-head">
          <strong>模块树</strong>
          <button v-if="editable" type="button" class="icon-btn" aria-label="新增模块" @click="addModule">
            <svg viewBox="0 0 24 24"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
          </button>
        </div>
        <button
          v-for="module in sortedModules"
          :key="module.id"
          type="button"
          class="module-tab"
          :class="{ active: module.id === selectedModuleId }"
          @click="selectedModuleId = module.id"
        >
          <strong>{{ module.name }}</strong>
          <span>{{ featuresByModule(module.id).length }} 个功能点</span>
        </button>
      </aside>

      <section class="feature-column">
        <div v-if="selectedModule" class="module-form">
          <div class="field">
            <label>模块名称</label>
            <input :value="selectedModule.name" :disabled="!editable" @input="updateModule({ name: inputValue($event) })" />
          </div>
          <div class="field">
            <label>模块说明</label>
            <textarea :value="selectedModule.description" :disabled="!editable" rows="3" @input="updateModule({ description: inputValue($event) })" />
          </div>
        </div>

        <div class="feature-list-head">
          <strong>功能点</strong>
          <button v-if="editable" type="button" class="button ghost" @click="addFeature">新增功能</button>
        </div>

        <div class="feature-card-list">
          <button
            v-for="feature in selectedFeatures"
            :key="feature.id"
            type="button"
            class="feature-card"
            :class="{ active: feature.id === selectedFeatureId }"
            @click="selectedFeatureId = feature.id"
          >
            <span class="priority" :class="feature.priority.toLowerCase()">{{ feature.priority }}</span>
            <strong>{{ feature.name }}</strong>
            <small>{{ feature.description }}</small>
          </button>
        </div>
      </section>

      <section class="detail-column">
        <div v-if="!selectedFeature" class="empty">选择一个功能点后编辑字段、规则和验收标准。</div>
        <div v-else class="detail-stack">
          <div class="field-grid">
            <div class="field">
              <label>功能名称</label>
              <input :value="selectedFeature.name" :disabled="!editable" @input="updateFeature({ name: inputValue($event) })" />
            </div>
            <div class="field">
              <label>优先级</label>
              <select :value="selectedFeature.priority" :disabled="!editable" @change="updateFeature({ priority: inputValue($event) as FeaturePriority })">
                <option value="P0">P0</option>
                <option value="P1">P1</option>
                <option value="P2">P2</option>
                <option value="P3">P3</option>
              </select>
            </div>
          </div>
          <div class="field-grid">
            <div class="field">
              <label>复杂度</label>
              <select :value="selectedFeature.complexity" :disabled="!editable" @change="updateFeature({ complexity: inputValue($event) as FeatureComplexity })">
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </div>
            <div class="field">
              <label>依赖功能 ID（每行一个）</label>
              <textarea :value="selectedFeature.dependsOn.join('\n')" :disabled="!editable" rows="2" @input="updateFeature({ dependsOn: toLines(inputValue($event)) })" />
            </div>
          </div>

          <div class="field">
            <label>功能说明</label>
            <textarea :value="selectedFeature.description" :disabled="!editable" rows="3" @input="updateFeature({ description: inputValue($event) })" />
          </div>

          <div class="detail-panels">
            <div class="field">
              <label>用户角色（每行一个）</label>
              <textarea :value="selectedFeature.userRoles.join('\n')" :disabled="!editable" rows="4" @input="updateFeature({ userRoles: toLines(inputValue($event)) })" />
            </div>
            <div class="field">
              <label>业务规则（每行一个）</label>
              <textarea :value="selectedFeature.businessRules.join('\n')" :disabled="!editable" rows="4" @input="updateFeature({ businessRules: toLines(inputValue($event)) })" />
            </div>
            <div class="field">
              <label>主流程（每行一步）</label>
              <textarea :value="selectedFeature.mainFlow.join('\n')" :disabled="!editable" rows="4" @input="updateFeature({ mainFlow: toLines(inputValue($event)) })" />
            </div>
            <div class="field">
              <label>异常流程（每行一个）</label>
              <textarea :value="selectedFeature.exceptionFlows.join('\n')" :disabled="!editable" rows="4" @input="updateFeature({ exceptionFlows: toLines(inputValue($event)) })" />
            </div>
          </div>

          <section class="subsection">
            <div class="subsection-head">
              <strong>字段表</strong>
              <button v-if="editable" type="button" class="button ghost" @click="addField">新增字段</button>
            </div>
            <div class="table-wrap">
              <table class="table compact-table">
                <thead>
                  <tr>
                    <th>字段</th>
                    <th>Key</th>
                    <th>类型</th>
                    <th>必填</th>
                    <th>校验规则</th>
                    <th>展示位置</th>
                    <th>可编辑角色</th>
                    <th v-if="editable">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="field in selectedFeature.fields" :key="field.id">
                    <td><input :value="field.name" :disabled="!editable" @input="updateField(field.id, { name: inputValue($event) })" /></td>
                    <td><input :value="field.key" :disabled="!editable" @input="updateField(field.id, { key: inputValue($event) })" /></td>
                    <td><input :value="field.type" :disabled="!editable" @input="updateField(field.id, { type: inputValue($event) })" /></td>
                    <td><input type="checkbox" :checked="field.required" :disabled="!editable" @change="updateField(field.id, { required: checkedValue($event) })" /></td>
                    <td><input :value="field.validationRule ?? ''" :disabled="!editable" @input="updateField(field.id, { validationRule: inputValue($event) })" /></td>
                    <td><input :value="(field.displayIn ?? []).join('、')" :disabled="!editable" @input="updateField(field.id, { displayIn: toLooseList(inputValue($event)) })" /></td>
                    <td><input :value="(field.editableBy ?? []).join('、')" :disabled="!editable" @input="updateField(field.id, { editableBy: toLooseList(inputValue($event)) })" /></td>
                    <td v-if="editable"><button type="button" class="text-link danger-link" @click="removeField(field.id)">删除</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="subsection">
            <div class="subsection-head">
              <strong>验收标准</strong>
              <button v-if="editable" type="button" class="button ghost" @click="addAcceptance">新增验收</button>
            </div>
            <div class="acceptance-list">
              <article v-for="item in selectedFeature.acceptanceCriteria" :key="item.id" class="acceptance-card">
                <div class="field-grid">
                  <div class="field">
                    <label>场景</label>
                    <input :value="item.scenario" :disabled="!editable" @input="updateAcceptance(item.id, { scenario: inputValue($event) })" />
                  </div>
                  <div v-if="editable" class="field remove-field">
                    <button type="button" class="button ghost" @click="removeAcceptance(item.id)">删除</button>
                  </div>
                </div>
                <div class="field-grid">
                  <div class="field">
                    <label>Given</label>
                    <textarea :value="item.given" :disabled="!editable" rows="2" @input="updateAcceptance(item.id, { given: inputValue($event) })" />
                  </div>
                  <div class="field">
                    <label>When</label>
                    <textarea :value="item.when" :disabled="!editable" rows="2" @input="updateAcceptance(item.id, { when: inputValue($event) })" />
                  </div>
                </div>
                <div class="field">
                  <label>Then</label>
                  <textarea :value="item.then" :disabled="!editable" rows="2" @input="updateAcceptance(item.id, { then: inputValue($event) })" />
                </div>
              </article>
            </div>
          </section>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type {
  FeatureAcceptanceCriterion,
  FeatureComplexity,
  FeatureFieldDefinition,
  FeatureItem,
  FeatureListPlan,
  FeatureModule,
  FeaturePriority
} from "@studio/shared";

const props = defineProps<{
  list: FeatureListPlan | null;
  editable?: boolean;
}>();

const emit = defineEmits<{
  update: [list: FeatureListPlan];
}>();

const localList = ref<FeatureListPlan | null>(null);
const selectedModuleId = ref("");
const selectedFeatureId = ref("");

watch(
  () => props.list,
  (next) => {
    localList.value = next ? clone(next) : null;
    selectedModuleId.value = localList.value?.modules[0]?.id ?? "";
    selectedFeatureId.value = localList.value?.features.find((feature) => feature.moduleId === selectedModuleId.value)?.id ?? "";
  },
  { immediate: true }
);

const sortedModules = computed(() =>
  [...(localList.value?.modules ?? [])].sort((left, right) => left.order - right.order)
);

const selectedModule = computed(() =>
  localList.value?.modules.find((module) => module.id === selectedModuleId.value) ?? null
);

const selectedFeatures = computed(() =>
  (localList.value?.features ?? []).filter((feature) => feature.moduleId === selectedModuleId.value)
);

const selectedFeature = computed(() =>
  localList.value?.features.find((feature) => feature.id === selectedFeatureId.value) ?? selectedFeatures.value[0] ?? null
);

watch(selectedModuleId, () => {
  selectedFeatureId.value = selectedFeatures.value[0]?.id ?? "";
});

function featuresByModule(moduleId: string) {
  return (localList.value?.features ?? []).filter((feature) => feature.moduleId === moduleId);
}

function updateModule(patch: Partial<FeatureModule>) {
  if (!localList.value || !selectedModule.value) return;
  localList.value.modules = localList.value.modules.map((module) =>
    module.id === selectedModule.value?.id ? { ...module, ...patch } : module
  );
  publish();
}

function updateFeature(patch: Partial<FeatureItem>) {
  if (!localList.value || !selectedFeature.value) return;
  localList.value.features = localList.value.features.map((feature) =>
    feature.id === selectedFeature.value?.id ? { ...feature, ...patch } : feature
  );
  publish();
}

function updateField(fieldId: string, patch: Partial<FeatureFieldDefinition>) {
  if (!selectedFeature.value) return;
  updateFeature({
    fields: selectedFeature.value.fields.map((field) =>
      field.id === fieldId ? { ...field, ...patch } : field
    )
  });
}

function updateAcceptance(itemId: string, patch: Partial<FeatureAcceptanceCriterion>) {
  if (!selectedFeature.value) return;
  updateFeature({
    acceptanceCriteria: selectedFeature.value.acceptanceCriteria.map((item) =>
      item.id === itemId ? { ...item, ...patch } : item
    )
  });
}

function addModule() {
  if (!localList.value) return;
  const order = localList.value.modules.length + 1;
  const module: FeatureModule = {
    id: `module-custom-${Date.now()}`,
    name: `新模块 ${order}`,
    description: "补充模块说明。",
    order
  };
  localList.value.modules = [...localList.value.modules, module];
  selectedModuleId.value = module.id;
  publish();
}

function addFeature() {
  if (!localList.value || !selectedModule.value) return;
  const feature: FeatureItem = {
    id: `feature-custom-${Date.now()}`,
    moduleId: selectedModule.value.id,
    name: "新功能点",
    description: "补充功能说明。",
    userRoles: ["业务人员"],
    scenarios: ["日常业务处理"],
    preconditions: ["用户已登录并具备权限"],
    mainFlow: ["进入页面", "填写信息", "提交保存"],
    exceptionFlows: ["必填项缺失时提示补充"],
    businessRules: ["关键操作需要记录日志"],
    priority: "P1",
    complexity: "medium",
    dependsOn: [],
    fields: [
      {
        id: `field-custom-${Date.now()}`,
        name: "名称",
        key: "name",
        type: "string",
        required: true,
        validationRule: "不能为空",
        displayIn: ["列表页", "详情页"],
        editableBy: ["业务人员"]
      }
    ],
    acceptanceCriteria: [
      {
        id: `ac-custom-${Date.now()}`,
        scenario: "成功保存",
        given: "用户具备权限且必填字段完整",
        when: "点击保存",
        then: "系统保存成功并展示提示"
      }
    ]
  };
  localList.value.features = [...localList.value.features, feature];
  selectedFeatureId.value = feature.id;
  publish();
}

function addField() {
  if (!selectedFeature.value) return;
  updateFeature({
    fields: [
      ...selectedFeature.value.fields,
      {
        id: `field-custom-${Date.now()}`,
        name: "新字段",
        key: "newField",
        type: "string",
        required: false,
        displayIn: ["详情页"],
        editableBy: ["业务人员"]
      }
    ]
  });
}

function removeField(fieldId: string) {
  if (!selectedFeature.value) return;
  updateFeature({
    fields: selectedFeature.value.fields.filter((field) => field.id !== fieldId)
  });
}

function addAcceptance() {
  if (!selectedFeature.value) return;
  updateFeature({
    acceptanceCriteria: [
      ...selectedFeature.value.acceptanceCriteria,
      {
        id: `ac-custom-${Date.now()}`,
        scenario: "新增验收场景",
        given: "满足前置条件",
        when: "用户执行操作",
        then: "系统返回预期结果"
      }
    ]
  });
}

function removeAcceptance(itemId: string) {
  if (!selectedFeature.value) return;
  updateFeature({
    acceptanceCriteria: selectedFeature.value.acceptanceCriteria.filter((item) => item.id !== itemId)
  });
}

function publish() {
  if (localList.value) {
    emit("update", clone(localList.value));
  }
}

function inputValue(event: Event) {
  return (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
}

function checkedValue(event: Event) {
  return (event.target as HTMLInputElement).checked;
}

function toLines(value: string) {
  return value.split(/\n+/).map((item) => item.trim()).filter(Boolean);
}

function toLooseList(value: string) {
  return value.split(/[、,\n]+/).map((item) => item.trim()).filter(Boolean);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
</script>

<style scoped>
.feature-editor {
  display: grid;
  gap: 18px;
}

.feature-summary {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: center;
  padding: 16px 18px;
  border: 1px solid #d9e2ef;
  border-radius: 12px;
  background: #ffffff;
}

.feature-summary div:first-child {
  display: grid;
  gap: 6px;
}

.feature-summary strong {
  color: #1d293d;
  font-size: 18px;
}

.feature-summary span {
  color: #536b8b;
  font-size: 13px;
}

.summary-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.summary-tags span {
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 700;
}

.editor-grid {
  display: grid;
  grid-template-columns: 230px minmax(280px, 0.8fr) minmax(420px, 1.4fr);
  gap: 18px;
  align-items: start;
}

.module-rail,
.feature-column,
.detail-column {
  min-width: 0;
  display: grid;
  gap: 14px;
  border: 1px solid #d9e2ef;
  border-radius: 12px;
  padding: 16px;
  background: #ffffff;
}

.rail-head,
.feature-list-head,
.subsection-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.icon-btn {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #ffffff;
  color: #2563eb;
  cursor: pointer;
}

.icon-btn svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

.module-tab,
.feature-card {
  width: 100%;
  border: 1px solid #e3eaf3;
  border-radius: 10px;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
}

.module-tab {
  display: grid;
  gap: 6px;
  padding: 13px 14px;
}

.module-tab span,
.feature-card small {
  color: #536b8b;
  line-height: 1.5;
}

.module-tab.active,
.feature-card.active {
  border-color: #93c5fd;
  background: #eff6ff;
}

.module-form,
.detail-stack,
.subsection,
.acceptance-list {
  display: grid;
  gap: 14px;
}

.feature-card-list {
  display: grid;
  gap: 10px;
  max-height: 680px;
  overflow: auto;
}

.feature-card {
  display: grid;
  gap: 8px;
  padding: 14px;
}

.priority {
  width: max-content;
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 3px 9px;
  background: #e0f2fe;
  color: #0369a1;
  font-size: 12px;
  font-weight: 800;
}

.priority.p0 {
  background: #fee2e2;
  color: #b91c1c;
}

.priority.p1 {
  background: #ffedd5;
  color: #c2410c;
}

.priority.p2 {
  background: #dcfce7;
  color: #15803d;
}

.detail-panels {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.table-wrap {
  overflow-x: auto;
}

.compact-table {
  min-width: 980px;
}

.compact-table th,
.compact-table td {
  padding: 8px;
}

.compact-table input {
  min-height: 34px;
  border-radius: 8px;
}

.compact-table input[type="checkbox"] {
  width: 18px;
  min-height: 18px;
  box-shadow: none;
}

.danger-link {
  color: #be123c;
  background: #fff1f2;
  border-color: #fecdd3;
}

.acceptance-card {
  display: grid;
  gap: 12px;
  border: 1px solid #e3eaf3;
  border-radius: 12px;
  padding: 14px;
}

.remove-field {
  align-content: end;
}

@media (max-width: 1180px) {
  .editor-grid {
    grid-template-columns: 220px minmax(0, 1fr);
  }

  .detail-column {
    grid-column: 1 / -1;
  }
}

@media (max-width: 860px) {
  .feature-summary,
  .editor-grid,
  .detail-panels {
    grid-template-columns: 1fr;
    display: grid;
  }
}
</style>
