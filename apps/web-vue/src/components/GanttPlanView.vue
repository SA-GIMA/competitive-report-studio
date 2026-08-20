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
              @change="emitUpdate(task.id, { phase: inputValue($event) })"
            />
            <template v-else>{{ task.phase }}</template>
          </td>
          <td>
            <input
              v-if="editable"
              :value="task.name"
              @change="emitUpdate(task.id, { name: inputValue($event) })"
            />
            <template v-else>{{ task.name }}</template>
          </td>
          <td>
            <input
              v-if="editable"
              type="date"
              :value="task.startDate"
              @change="emitUpdate(task.id, { startDate: inputValue($event) })"
            />
            <template v-else>{{ task.startDate }}</template>
          </td>
          <td>
            <input
              v-if="editable"
              type="date"
              :value="task.endDate"
              @change="emitUpdate(task.id, { endDate: inputValue($event) })"
            />
            <template v-else>{{ task.endDate }}</template>
          </td>
          <td>
            <input
              v-if="editable"
              type="number"
              min="1"
              :value="task.durationDays"
              @change="emitUpdate(task.id, { durationDays: Number(inputValue($event)) })"
            />
            <template v-else>{{ task.durationDays }} 天</template>
          </td>
          <td><span class="muted small">{{ task.dependsOn.length ? task.dependsOn.join(" / ") : "-" }}</span></td>
        </tr>
      </tbody>
    </table>
  </SectionCard>

  <SectionCard title="甘特图预览" description="按时间轴呈现任务排期，里程碑会高亮显示。">
    <template #action>
      <button v-if="plan && refreshNeeded" class="button primary small" @click="refreshPreview">
        应用修改并刷新预览
      </button>
      <span v-else-if="plan" class="status success small">已是最新</span>
    </template>
    <div v-if="!plan" class="empty">生成计划后，这里会显示甘特图。</div>
    <div v-else class="gantt-board-container">
      <div class="gantt-board" :class="{ 'is-outdated': refreshNeeded }" :key="refreshKey">
        <div v-if="refreshNeeded" class="outdated-overlay">
          <div class="outdated-hint">
            <p>任务清单已修改</p>
            <button class="button small" @click="refreshPreview">刷新预览</button>
          </div>
        </div>
        <div class="gantt-header">
          <div class="gantt-task-col">任务</div>
          <div class="gantt-timeline" :style="{ gridTemplateColumns: `repeat(${displayAxis.length}, minmax(48px, 1fr))` }">
            <div v-for="date in displayAxis" :key="date" class="gantt-date-cell">{{ date.slice(5) }}</div>
          </div>
        </div>
        <div v-for="task in displayTasks" :key="task.id" class="gantt-row">
          <div class="gantt-task-col">
            <strong>{{ task.name }}</strong>
            <div class="muted small">{{ task.phase }}</div>
          </div>
          <div class="gantt-timeline gantt-track" :style="{ gridTemplateColumns: `repeat(${displayAxis.length}, minmax(48px, 1fr))` }">
            <div v-for="date in displayAxis" :key="`${task.id}-${date}`" class="gantt-grid-cell" />
            <div class="gantt-bar" :class="{ milestone: task.milestone }" :style="buildBarStyle(task)" :title="`${task.name}｜${task.startDate} - ${task.endDate}`">
              <span>{{ task.name }}</span>
            </div>
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
import { ref, watch } from "vue";
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
const refreshNeeded = ref(false);
const refreshKey = ref(0);

const displayTasks = ref<GanttTaskItem[]>([]);
const displayAxis = ref<string[]>([]);

watch(() => props.plan?.id, (newId) => {
  if (newId && props.plan) {
    displayTasks.value = JSON.parse(JSON.stringify(props.plan.tasks));
    displayAxis.value = buildDateAxis(props.plan, displayTasks.value);
    refreshNeeded.value = false;
  }
}, { immediate: true });

watch(() => props.plan?.tasks, (newTasks, oldTasks) => {
  if (newTasks && oldTasks) {
    refreshNeeded.value = true;
  }
}, { deep: true });

function refreshPreview() {
  if (!props.plan) return;
  displayTasks.value = JSON.parse(JSON.stringify(props.plan.tasks));
  displayAxis.value = buildDateAxis(props.plan, displayTasks.value);
  refreshNeeded.value = false;
  refreshKey.value++;
}

const emitUpdate = (
  taskId: string,
  patch: Partial<Pick<GanttTaskItem, "phase" | "name" | "startDate" | "endDate" | "durationDays">>
) => emit("updateTask", taskId, patch);

const inputValue = (event: Event) => (event.target as HTMLInputElement).value;

const buildBarStyle = (task: GanttTaskItem) => {
  const startStr = normalizeDate(task.startDate);
  const endStr = normalizeDate(task.endDate);
  const startIndex = displayAxis.value.indexOf(startStr);
  const endIndex = displayAxis.value.indexOf(endStr);
  const columnStart = startIndex >= 0 ? startIndex + 1 : 1;
  const columnEnd = endIndex >= 0 ? endIndex + 2 : columnStart + 1;
  return { gridColumn: `${columnStart} / ${columnEnd}` };
};

function normalizeDate(val: string) {
  if (!val) return "";
  const d = new Date(`${val.trim()}T00:00:00`);
  return isNaN(d.getTime()) ? "" : formatDateOnly(d);
}

const exportPlan = (format: "png" | "pdf" | "html") => {
  if (!props.plan) return;
  const currentPlan = { ...props.plan, tasks: displayTasks.value };
  if (format === "png") {
    exportAsPng(currentPlan, displayAxis.value);
  } else if (format === "html") {
    const html = buildExportHtml(currentPlan, displayAxis.value);
    downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), `${props.plan.projectName}.html`);
  } else {
    const html = buildExportHtml(currentPlan, displayAxis.value);
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

function buildDateAxis(plan: GanttPlan, tasks: GanttTaskItem[]) {
  const allDates: string[] = [];
  [plan.startDate, plan.endDate, plan.targetEndDate].forEach((date) => {
    const normalized = normalizeDate(date);
    if (normalized) allDates.push(normalized);
  });
  tasks.forEach((t) => {
    const s = normalizeDate(t.startDate);
    const e = normalizeDate(t.endDate);
    if (s) allDates.push(s);
    if (e) allDates.push(e);
  });
  if (allDates.length === 0) return [];
  allDates.sort();
  const minDate = allDates[0];
  const maxDate = allDates[allDates.length - 1];
  const start = new Date(`${minDate}T00:00:00`);
  const end = new Date(`${maxDate}T00:00:00`);
  const dates: string[] = [];
  const cursor = new Date(start);
  let limit = 0;
  while (cursor <= end && limit < 1000) {
    dates.push(formatDateOnly(cursor));
    cursor.setDate(cursor.getDate() + 1);
    limit++;
  }
  return dates;
}

function formatDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function exportAsPng(plan: GanttPlan, axis: string[]) {
  const taskColWidth = 200;
  const cellWidth = 48;
  const rowHeight = 36;
  const headerHeight = 32;
  const titleHeight = 36;
  const padding = 24;

  const width = taskColWidth + axis.length * cellWidth + padding * 2;
  const height = titleHeight + headerHeight + plan.tasks.length * rowHeight + padding * 2;

  const canvas = document.createElement("canvas");
  const dpr = 2;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 16px Arial, sans-serif";
  ctx.fillText(plan.projectName, padding, padding + 16);

  const headerY = padding + titleHeight;
  ctx.fillStyle = "#5b6b84";
  ctx.font = "bold 12px Arial, sans-serif";
  ctx.fillText("任务", padding, headerY + 14);
  axis.forEach((date, i) => {
    const x = taskColWidth + padding + i * cellWidth + 2;
    ctx.fillText(date.slice(5), x, headerY + 14);
  });

  ctx.strokeStyle = "#d9e2ef";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, headerY + headerHeight);
  ctx.lineTo(width - padding, headerY + headerHeight);
  ctx.stroke();

  plan.tasks.forEach((task, rowIndex) => {
    const y = headerY + headerHeight + rowIndex * rowHeight;
    ctx.fillStyle = "#0f172a";
    ctx.font = "12px Arial, sans-serif";
    const displayName = task.name.length > 14 ? task.name.slice(0, 14) + "..." : task.name;
    ctx.fillText(displayName, padding, y + 22);

    const startIdx = axis.indexOf(task.startDate);
    const endIdx = axis.indexOf(task.endDate);
    if (startIdx >= 0 && endIdx >= 0) {
      const barX = taskColWidth + padding + startIdx * cellWidth;
      const barWidth = (endIdx - startIdx + 1) * cellWidth;
      ctx.fillStyle = task.milestone ? "#f59e0b" : "#2563eb";
      ctx.beginPath();
      const r = 4;
      ctx.moveTo(barX + r, y + 6);
      ctx.lineTo(barX + barWidth - r, y + 6);
      ctx.quadraticCurveTo(barX + barWidth, y + 6, barX + barWidth, y + 6 + r);
      ctx.lineTo(barX + barWidth, y + 26 - r);
      ctx.quadraticCurveTo(barX + barWidth, y + 26, barX + barWidth - r, y + 26);
      ctx.lineTo(barX + r, y + 26);
      ctx.quadraticCurveTo(barX, y + 26, barX, y + 26 - r);
      ctx.lineTo(barX, y + 6 + r);
      ctx.quadraticCurveTo(barX, y + 6, barX + r, y + 6);
      ctx.fill();

      if (barWidth > 40) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "10px Arial, sans-serif";
        const barText = task.name.length > 10 ? task.name.slice(0, 10) + "..." : task.name;
        ctx.fillText(barText, barX + 6, y + 20);
      }
    }

    if (rowIndex < plan.tasks.length - 1) {
      ctx.strokeStyle = "rgba(148,163,184,0.18)";
      ctx.beginPath();
      ctx.moveTo(padding, y + rowHeight);
      ctx.lineTo(width - padding, y + rowHeight);
      ctx.stroke();
    }
  });

  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, `${plan.projectName}.png`);
  });
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

<style scoped>
.gantt-table { font-size: 13px; }
.gantt-table input { min-height: 32px; padding: 4px 8px; border-radius: 8px; font-size: 13px; }
.gantt-board-container { position: relative; }
.gantt-board { display: grid; gap: 0; border: 1px solid var(--line); border-radius: 12px; overflow: auto; background: var(--panel); position: relative; }
.gantt-board.is-outdated { opacity: 0.8; }
.outdated-overlay { position: absolute; inset: 0; z-index: 10; background: rgba(255, 255, 255, 0.4); backdrop-filter: blur(2px); display: grid; place-items: center; }
.outdated-hint { background: var(--panel); padding: 16px 24px; border-radius: 12px; border: 1px solid var(--accent); box-shadow: 0 8px 24px rgba(37, 99, 235, 0.15); text-align: center; }
.outdated-hint p { margin: 0 0 12px; font-weight: 700; color: var(--text); }
.gantt-header { display: grid; grid-template-columns: 180px 1fr; border-bottom: 1px solid var(--line); background: #f8fafd; position: sticky; top: 0; z-index: 1; }
.gantt-task-col { padding: 10px 14px; font-size: 13px; font-weight: 700; color: var(--muted); border-right: 1px solid var(--line); display: flex; flex-direction: column; justify-content: center; min-width: 180px; }
.gantt-row .gantt-task-col { font-weight: 600; color: var(--text); }
.gantt-row .gantt-task-col strong { font-size: 13px; line-height: 1.3; }
.gantt-timeline { display: grid; overflow: hidden; }
.gantt-date-cell { padding: 10px 4px; text-align: center; font-size: 11px; font-weight: 700; color: var(--muted); border-right: 1px solid rgba(148, 163, 184, 0.1); white-space: nowrap; }
.gantt-row { display: grid; grid-template-columns: 180px 1fr; border-bottom: 1px solid rgba(148, 163, 184, 0.12); min-height: 44px; }
.gantt-row:last-child { border-bottom: none; }
.gantt-track { position: relative; align-items: center; }
.gantt-grid-cell { border-right: 1px solid rgba(148, 163, 184, 0.06); }
.gantt-bar { position: absolute; inset: 8px 0; border-radius: 6px; background: var(--accent); display: flex; align-items: center; padding: 0 8px; color: #ffffff; font-size: 11px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; z-index: 1; transition: opacity 0.15s ease; }
.gantt-bar:hover { opacity: 0.85; }
.gantt-bar.milestone { background: linear-gradient(135deg, #f59e0b, #d97706); }
.modal-overlay { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; background: rgba(15, 23, 42, 0.35); backdrop-filter: blur(6px); }
.modal-panel { position: relative; width: min(480px, 90vw); background: var(--panel); border: 1px solid var(--line); border-radius: 18px; box-shadow: 0 24px 64px rgba(15, 23, 42, 0.15); padding: 28px; }
.modal-close { position: absolute; top: 14px; right: 14px; width: 32px; height: 32px; display: grid; place-items: center; border: none; background: transparent; color: var(--muted); font-size: 20px; cursor: pointer; border-radius: 8px; }
.modal-header { margin-bottom: 18px; }
.modal-header h2 { margin: 0; font-size: 18px; font-weight: 800; color: var(--text); }
.modal-body { display: grid; gap: 16px; }
.export-option-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.export-option { display: grid; gap: 6px; padding: 18px 14px; border: 1px solid var(--line); border-radius: 14px; background: var(--panel); cursor: pointer; text-align: center; }
.export-option:hover { border-color: var(--accent); }
.export-option strong { font-size: 16px; font-weight: 800; color: var(--accent); }
.field-help { font-size: 12px; color: var(--muted); line-height: 1.4; }
@media (max-width: 720px) {
  .gantt-header, .gantt-row { grid-template-columns: 120px 1fr; }
  .gantt-task-col { min-width: 120px; padding: 8px 10px; }
  .export-option-grid { grid-template-columns: 1fr; }
}
</style>
