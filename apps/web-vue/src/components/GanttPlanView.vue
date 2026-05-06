<template>
  <SectionCard title="任务清单" description="生成后可直接查看或微调任务、阶段和日期。">
    <template #action>
      <button v-if="plan" class="button ghost" @click="showExportModal = true">导出</button>
    </template>
    <div v-if="!plan" class="empty">生成计划后，这里会显示任务清单。</div>
    <table v-else class="table gantt-table">
      <thead>
        <tr>
          <th>阶段</th>
          <th>任务</th>
          <th>开始时间</th>
          <th>结束时间</th>
          <th>工期</th>
          <th>依赖</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="task in plan.tasks" :key="task.id">
          <td>
            <input
              v-if="editable"
              :value="task.phase"
              @input="emitUpdate(task.id, { phase: inputValue($event) })"
            />
            <template v-else>{{ task.phase }}</template>
          </td>
          <td>
            <input
              v-if="editable"
              :value="task.name"
              @input="emitUpdate(task.id, { name: inputValue($event) })"
            />
            <template v-else>{{ task.name }}</template>
          </td>
          <td>
            <input
              v-if="editable"
              type="date"
              :value="task.startDate"
              @input="emitUpdate(task.id, { startDate: inputValue($event) })"
            />
            <template v-else>{{ task.startDate }}</template>
          </td>
          <td>
            <input
              v-if="editable"
              type="date"
              :value="task.endDate"
              @input="emitUpdate(task.id, { endDate: inputValue($event) })"
            />
            <template v-else>{{ task.endDate }}</template>
          </td>
          <td>
            <input
              v-if="editable"
              type="number"
              min="1"
              :value="task.durationDays"
              @input="emitUpdate(task.id, { durationDays: Number(inputValue($event)) })"
            />
            <template v-else>{{ task.durationDays }} 天</template>
          </td>
          <td><span class="muted small">{{ task.dependsOn.length ? task.dependsOn.join(" / ") : "-" }}</span></td>
        </tr>
      </tbody>
    </table>
  </SectionCard>

  <SectionCard title="甘特图预览" description="按时间轴呈现任务排期，里程碑会高亮显示。">
    <div v-if="!plan" class="empty">生成计划后，这里会显示甘特图。</div>
    <div v-else class="gantt-board">
      <div class="gantt-header">
        <div class="gantt-task-col">任务</div>
        <div class="gantt-timeline" :style="{ gridTemplateColumns: `repeat(${dateAxis.length}, minmax(48px, 1fr))` }">
          <div v-for="date in dateAxis" :key="date" class="gantt-date-cell">{{ date.slice(5) }}</div>
        </div>
      </div>
      <div v-for="task in plan.tasks" :key="task.id" class="gantt-row">
        <div class="gantt-task-col">
          <strong>{{ task.name }}</strong>
          <div class="muted small">{{ task.phase }}</div>
        </div>
        <div class="gantt-timeline gantt-track" :style="{ gridTemplateColumns: `repeat(${dateAxis.length}, minmax(48px, 1fr))` }">
          <div v-for="date in dateAxis" :key="`${task.id}-${date}`" class="gantt-grid-cell" />
          <div class="gantt-bar" :class="{ milestone: task.milestone }" :style="buildBarStyle(task)" :title="`${task.name}｜${task.startDate} - ${task.endDate}`">
            <span>{{ task.name }}</span>
          </div>
        </div>
      </div>
    </div>
  </SectionCard>

  <div class="two-col">
    <SectionCard title="排期假设" description="帮助理解模型默认采用的排期规则。">
      <div v-if="!plan" class="empty">生成计划后，这里会显示排期假设。</div>
      <div v-else class="list">
        <div v-for="item in plan.assumptions" :key="item" class="list-item">
          <strong>假设</strong>
          <span class="muted">{{ item }}</span>
        </div>
      </div>
    </SectionCard>

    <SectionCard title="风险提示" description="用于提醒哪些节点可能拖慢整体进度。">
      <div v-if="!plan" class="empty">生成计划后，这里会显示风险提示。</div>
      <div v-else class="list">
        <div v-for="item in plan.riskNotes" :key="item" class="list-item">
          <strong>风险</strong>
          <span class="muted">{{ item }}</span>
        </div>
      </div>
    </SectionCard>
  </div>

  <div v-if="showExportModal && plan" class="modal-overlay" role="dialog" aria-modal="true" @click="showExportModal = false">
    <div class="modal-panel glass-panel" @click.stop>
      <button class="modal-close" aria-label="关闭" @click="showExportModal = false">×</button>
      <div class="modal-header"><h2>导出甘特图</h2></div>
      <div class="modal-body">
        <div class="export-option-grid">
          <button class="export-option" @click="exportPlan('png')">
            <strong>PNG</strong>
            <span class="field-help">导出当前甘特图为静态图片。</span>
          </button>
          <button class="export-option" @click="exportPlan('pdf')">
            <strong>PDF</strong>
            <span class="field-help">打开打印窗口导出为 PDF。</span>
          </button>
          <button class="export-option" @click="exportPlan('html')">
            <strong>HTML</strong>
            <span class="field-help">导出一份可独立打开的网页版本。</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { GanttPlan, GanttTaskItem } from "@studio/shared";
import SectionCard from "@/components/SectionCard.vue";

const props = defineProps<{
  plan: GanttPlan | null;
  editable?: boolean;
}>();

const emit = defineEmits<{
  updateTask: [taskId: string, patch: Partial<Pick<GanttTaskItem, "phase" | "name" | "startDate" | "endDate" | "durationDays">>];
}>();

const showExportModal = ref(false);

const dateAxis = computed(() => buildDateAxis(props.plan?.tasks ?? []));

const emitUpdate = (
  taskId: string,
  patch: Partial<Pick<GanttTaskItem, "phase" | "name" | "startDate" | "endDate" | "durationDays">>
) => emit("updateTask", taskId, patch);

const inputValue = (event: Event) => (event.target as HTMLInputElement).value;

const buildBarStyle = (task: GanttTaskItem) => {
  const startIndex = dateAxis.value.indexOf(task.startDate);
  const endIndex = dateAxis.value.indexOf(task.endDate);
  const columnStart = Math.max(1, startIndex + 1);
  const columnEnd = Math.max(columnStart + 1, endIndex + 2);
  return { gridColumn: `${columnStart} / ${columnEnd}` };
};

const exportPlan = (format: "png" | "pdf" | "html") => {
  if (!props.plan) {
    return;
  }
  const html = buildExportHtml(props.plan, dateAxis.value);
  if (format === "html") {
    downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), `${props.plan.projectName}.html`);
  } else if (format === "png") {
    downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), `${props.plan.projectName}.png.html`);
  } else {
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      win.print();
    }
  }
  showExportModal.value = false;
};

function buildDateAxis(tasks: GanttTaskItem[]) {
  if (tasks.length === 0) {
    return [];
  }
  const start = new Date(`${tasks[0].startDate}T00:00:00`);
  const end = new Date(`${tasks[tasks.length - 1].endDate}T00:00:00`);
  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function buildExportHtml(plan: GanttPlan, axis: string[]) {
  const rows = plan.tasks
    .map((task) => {
      const cells = axis
        .map((date) => `<div class="cell ${date >= task.startDate && date <= task.endDate ? "active" : ""}"></div>`)
        .join("");
      return `<div class="row"><div class="task"><strong>${task.name}</strong><div>${task.phase}</div></div><div class="timeline">${cells}</div></div>`;
    })
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${plan.projectName}</title><style>
  body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}
  .grid{display:grid;gap:12px}
  .row{display:grid;grid-template-columns:220px 1fr;gap:12px;align-items:center}
  .timeline{display:grid;grid-template-columns:repeat(${axis.length}, minmax(24px, 1fr));gap:4px}
  .cell{height:24px;background:#e2e8f0;border-radius:6px}
  .cell.active{background:#2563eb}
  .axis{display:grid;grid-template-columns:220px 1fr;gap:12px;margin-bottom:12px}
  .axis-line{display:grid;grid-template-columns:repeat(${axis.length}, minmax(24px, 1fr));gap:4px;font-size:10px}
  </style></head><body><h1>${plan.projectName}</h1><p>${plan.projectSummary}</p><div class="axis"><div>时间轴</div><div class="axis-line">${axis.map((date) => `<div>${date.slice(5)}</div>`).join("")}</div></div><div class="grid">${rows}</div></body></html>`;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
</script>
