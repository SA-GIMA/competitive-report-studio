import { join } from "node:path";
import { getAppConfig } from "@studio/config";
import { randomUUID } from "node:crypto";
import { parseJsonWithRepair } from "@studio/orchestrator";
import type {
  GanttPlan,
  GanttPlanningRequest,
  GanttTaskDraft,
  GanttTaskItem
} from "@studio/shared";
import { ModelService } from "../models/model-service.ts";
import { GanttStateStore } from "./gantt-state-store.ts";

export class GanttService {
  private readonly modelService: ModelService;
  private readonly plans = new Map<string, GanttPlan>();
  private readonly store = new GanttStateStore(
    join(process.cwd(), getAppConfig().storage.appStateDir, "gantt-plans.json")
  );

  constructor(modelService: ModelService) {
    this.modelService = modelService;
    for (const plan of this.store.load()) {
      this.plans.set(plan.id, plan);
    }
  }

  async generatePlan(input: GanttPlanningRequest): Promise<GanttPlan> {
    const normalized = normalizeRequest(input);
    const routing = this.modelService.getRouting();
    const modelId = normalized.modelId || routing.plannerModelId;
    const config = this.modelService.getConfigsMap()[modelId];
    if (!config) {
      throw new Error(`未找到指定的规划模型 (${modelId})，无法生成甘特图。`);
    }

    const json = await this.modelService.getProvider(modelId).generateText(config, {
      systemPrompt: ganttPlanningSystemPrompt,
      userPrompt: JSON.stringify(normalized),
      responseFormat: "json"
    });

    const parsed = parseGanttDraft(json);
    const draftedTasks = ensureTaskDrafts(parsed.tasks, normalized);
    const scheduledTasks = scheduleTasks(draftedTasks, normalized);
    const projectStart = getMinDate(scheduledTasks.map((task) => task.startDate)) ?? normalized.targetEndDate;
    const projectEnd = getMaxDate(scheduledTasks.map((task) => task.endDate)) ?? normalized.targetEndDate;

    const plan: GanttPlan = {
      id: `gantt-${randomUUID().slice(0, 8)}`,
      projectName: normalized.projectName,
      projectSummary: normalized.projectSummary,
      targetEndDate: normalized.targetEndDate,
      durationDays: normalized.durationDays,
      planningMode: normalized.planningMode,
      workingDaysMode: normalized.workingDaysMode,
      startDate: projectStart,
      endDate: projectEnd,
      createdAt: new Date().toISOString(),
      assumptions: parsed.assumptions.length
        ? parsed.assumptions
        : buildDefaultAssumptions(normalized),
      riskNotes: parsed.riskNotes.length
        ? parsed.riskNotes
        : ["若关键评审节点延误，整体计划的收口和验收时间可能被动压缩。"],
      tasks: scheduledTasks
    };
    this.plans.set(plan.id, plan);
    this.persist();
    return plan;
  }

  listPlans() {
    return Array.from(this.plans.values()).sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    );
  }

  getPlan(planId: string) {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`甘特图计划不存在: ${planId}`);
    }
    return plan;
  }

  updatePlan(
    planId: string,
    patch: Partial<Pick<GanttPlan, "projectName" | "projectSummary" | "startDate" | "endDate" | "targetEndDate" | "tasks" | "assumptions" | "riskNotes">>
  ) {
    const current = this.getPlan(planId);
    const next: GanttPlan = {
      ...current,
      ...patch,
      tasks: patch.tasks ?? current.tasks
    };
    this.plans.set(planId, next);
    this.persist();
    return next;
  }

  private persist() {
    this.store.save(this.listPlans());
  }
}

const ganttPlanningSystemPrompt = `
你是项目排期规划师。请根据项目目标、截止时间、工期和约束，输出一份适合生成甘特图的结构化任务清单。
要求：
1. 输出严格 JSON。
2. 任务按执行顺序排列。
3. 每个任务要有 phase、name、durationDays、dependsOn，可选 description 和 milestone。
4. durationDays 必须是正整数；里程碑任务可设为 1 天。
5. 任务总数控制在 6-16 个之间，避免过粗或过细。
6. 如果没有特殊信息，请按常见项目流程拆成需求澄清、方案设计、执行产出、联调校验、材料收口、验收准备等阶段。
返回格式：
{
  "tasks": [
    {
      "id": "task-1",
      "phase": "阶段名",
      "name": "任务名",
      "description": "任务说明",
      "durationDays": 3,
      "dependsOn": [],
      "milestone": false
    }
  ],
  "assumptions": ["假设1"],
  "riskNotes": ["风险1"]
}
`;

const normalizeRequest = (input: GanttPlanningRequest): GanttPlanningRequest => {
  if (!input.projectName.trim()) {
    throw new Error("请输入项目名称后再生成甘特图。");
  }
  if (!input.projectSummary.trim()) {
    throw new Error("请输入项目目标或一句话描述后再生成甘特图。");
  }
  if (!input.targetEndDate) {
    throw new Error("请输入截止时间后再生成甘特图。");
  }
  if (!Number.isFinite(input.durationDays) || input.durationDays <= 0) {
    throw new Error("工期必须是大于 0 的整数。");
  }
  return {
    ...input,
    projectName: input.projectName.trim(),
    projectSummary: input.projectSummary.trim(),
    constraints: input.constraints?.trim() ?? ""
  };
};

const parseGanttDraft = (raw: string): {
  tasks: GanttTaskDraft[];
  assumptions: string[];
  riskNotes: string[];
} => {
  try {
    const parsed = parseJsonWithRepair<{
      tasks?: Array<Partial<GanttTaskDraft>>;
      assumptions?: string[];
      riskNotes?: string[];
    }>(raw);
    return {
      tasks: Array.isArray(parsed.tasks)
        ? parsed.tasks
            .filter((item) => item && typeof item.name === "string")
            .map((item, index) => ({
              id: item.id?.trim() || `task-${index + 1}`,
              phase: item.phase?.trim() || "执行阶段",
              name: item.name?.trim() || `任务 ${index + 1}`,
              description: item.description?.trim() || "",
              durationDays: clampDuration(item.durationDays),
              dependsOn: Array.isArray(item.dependsOn)
                ? item.dependsOn.filter(
                    (dep): dep is string => typeof dep === "string" && Boolean(dep.trim())
                  )
                : [],
              milestone: Boolean(item.milestone)
            }))
        : [],
      assumptions: Array.isArray(parsed.assumptions)
        ? parsed.assumptions.filter((item): item is string => typeof item === "string")
        : [],
      riskNotes: Array.isArray(parsed.riskNotes)
        ? parsed.riskNotes.filter((item): item is string => typeof item === "string")
        : []
    };
  } catch {
    return {
      tasks: [],
      assumptions: [],
      riskNotes: []
    };
  }
};

const ensureTaskDrafts = (
  tasks: GanttTaskDraft[],
  input: GanttPlanningRequest
): GanttTaskDraft[] => {
  if (tasks.length > 0) {
    return tasks.map((task, index) => ({
      ...task,
      id: task.id || `task-${index + 1}`,
      dependsOn:
        task.dependsOn.length > 0 ? task.dependsOn : index === 0 ? [] : [tasks[index - 1].id]
    }));
  }

  return [
    { id: "task-1", phase: "准备阶段", name: "需求澄清与范围确认", durationDays: 2, dependsOn: [] },
    { id: "task-2", phase: "方案阶段", name: "方案设计与任务拆解", durationDays: 3, dependsOn: ["task-1"] },
    { id: "task-3", phase: "执行阶段", name: "核心产出制作", durationDays: Math.max(3, Math.floor(input.durationDays * 0.35)), dependsOn: ["task-2"] },
    { id: "task-4", phase: "联调阶段", name: "联调、校验与修正", durationDays: Math.max(2, Math.floor(input.durationDays * 0.2)), dependsOn: ["task-3"] },
    { id: "task-5", phase: "收口阶段", name: "成果收口与内部演练", durationDays: 2, dependsOn: ["task-4"] },
    { id: "task-6", phase: "里程碑", name: "最终验收节点", durationDays: 1, dependsOn: ["task-5"], milestone: true }
  ];
};

const scheduleTasks = (
  tasks: GanttTaskDraft[],
  input: GanttPlanningRequest
): GanttTaskItem[] => {
  if (tasks.length === 0) return [];

  const taskMap = new Map<string, GanttTaskItem>();

  // 1. Forward pass using a dummy start date to calculate relative working day positions
  const dummyStart = new Date("2000-01-01T00:00:00");

  for (const draft of tasks) {
    let earliestStart = dummyStart;
    if (draft.dependsOn && draft.dependsOn.length > 0) {
      let maxEnd = dummyStart;
      for (const depId of draft.dependsOn) {
        const depTask = taskMap.get(depId);
        if (depTask) {
          const depEnd = parseDateOnly(depTask.endDate);
          const next = nextWorkingDay(depEnd, input.workingDaysMode);
          if (next > maxEnd) maxEnd = next;
        }
      }
      earliestStart = maxEnd;
    } else {
      earliestStart = alignToWorkingDay(dummyStart, input.workingDaysMode, 1);
    }

    const duration = Math.max(1, draft.durationDays);
    const taskEnd = moveByWorkingDays(earliestStart, duration - 1, input.workingDaysMode);

    taskMap.set(draft.id, {
      ...draft,
      durationDays: duration,
      startDate: formatDateOnly(earliestStart),
      endDate: formatDateOnly(taskEnd)
    });
  }

  const scheduled = Array.from(taskMap.values());

  // Find overall min/max in dummy schedule
  const relStarts = scheduled.map((t) => parseDateOnly(t.startDate));
  const relEnds = scheduled.map((t) => parseDateOnly(t.endDate));
  const relMinStart = new Date(Math.min(...relStarts.map((d) => d.getTime())));
  const relMaxEnd = new Date(Math.max(...relEnds.map((d) => d.getTime())));

  // 2. Determine actual project start date
  let actualProjectStart: Date;
  if (input.planningMode === "forward") {
    actualProjectStart = alignToWorkingDay(
      parseDateOnly(input.startDate || input.targetEndDate),
      input.workingDaysMode,
      1
    );
  } else {
    // Backward planning: align relMaxEnd to targetEndDate
    const targetEnd = alignToWorkingDay(parseDateOnly(input.targetEndDate), input.workingDaysMode, -1);
    const totalWorkingDays = countWorkingDays(relMinStart, relMaxEnd, input.workingDaysMode);
    actualProjectStart = moveByWorkingDays(targetEnd, -(totalWorkingDays - 1), input.workingDaysMode);
  }

  // 3. Shift all tasks to their final positions based on actual project start
  return scheduled.map((task) => {
    const startRelOffset = countWorkingDays(relMinStart, parseDateOnly(task.startDate), input.workingDaysMode) - 1;
    const endRelOffset = countWorkingDays(relMinStart, parseDateOnly(task.endDate), input.workingDaysMode) - 1;

    const finalStart = moveByWorkingDays(actualProjectStart, startRelOffset, input.workingDaysMode);
    const finalEnd = moveByWorkingDays(actualProjectStart, endRelOffset, input.workingDaysMode);

    return {
      ...task,
      startDate: formatDateOnly(finalStart),
      endDate: formatDateOnly(finalEnd)
    };
  });
};

const countWorkingDays = (
  start: Date,
  end: Date,
  mode: GanttPlanningRequest["workingDaysMode"]
): number => {
  let count = 0;
  let current = new Date(start);
  while (current <= end) {
    if (isWorkingDay(current, mode)) {
      count++;
    }
    current = moveByCalendarDays(current, 1);
  }
  return count;
};

const buildDefaultAssumptions = (input: GanttPlanningRequest) => [
  input.workingDaysMode === "calendar_day"
    ? "默认按自然日排期。"
    : input.workingDaysMode === "six_day"
      ? "默认按单休节奏排期。"
      : "默认按双休工作制排期。",
  input.planningMode === "backward"
    ? "默认按截止时间倒排，确保最终里程碑节点准时落到目标结束日期。"
    : "默认按起始日正排。"
];

const clampDuration = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }
  return Math.max(1, Math.min(30, Math.round(parsed)));
};

const parseDateOnly = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`日期格式无效: ${value}`);
  }
  return date;
};

const formatDateOnly = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getMinDate = (dates: string[]) =>
  dates.filter(Boolean).reduce<string | undefined>(
    (current, date) => (!current || date < current ? date : current),
    undefined
  );

const getMaxDate = (dates: string[]) =>
  dates.filter(Boolean).reduce<string | undefined>(
    (current, date) => (!current || date > current ? date : current),
    undefined
  );

const moveByWorkingDays = (date: Date, offset: number, mode: GanttPlanningRequest["workingDaysMode"]) => {
  let current = new Date(date);
  if (offset === 0) {
    return alignToWorkingDay(current, mode, 1);
  }
  const step = offset > 0 ? 1 : -1;
  let remaining = Math.abs(offset);
  while (remaining > 0) {
    current = moveByCalendarDays(current, step);
    if (isWorkingDay(current, mode)) {
      remaining -= 1;
    }
  }
  return current;
};

const nextWorkingDay = (date: Date, mode: GanttPlanningRequest["workingDaysMode"]) => {
  let current = moveByCalendarDays(date, 1);
  while (!isWorkingDay(current, mode)) {
    current = moveByCalendarDays(current, 1);
  }
  return current;
};

const alignToWorkingDay = (date: Date, mode: GanttPlanningRequest["workingDaysMode"], direction: 1 | -1) => {
  let current = new Date(date);
  while (!isWorkingDay(current, mode)) {
    current = moveByCalendarDays(current, direction);
  }
  return current;
};

const isWorkingDay = (date: Date, mode: GanttPlanningRequest["workingDaysMode"]) => {
  const day = date.getDay();
  if (mode === "calendar_day") {
    return true;
  }
  if (mode === "six_day") {
    return day !== 0;
  }
  return day !== 0 && day !== 6;
};

const moveByCalendarDays = (date: Date, offset: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
};

const differenceInDays = (left: Date, right: Date) =>
  Math.round((left.getTime() - right.getTime()) / (24 * 60 * 60 * 1000));
