"use client";

import { useMemo, useState } from "react";
import type {
  GanttPlan,
  GanttPlanningMode,
  GanttPlanningRequest,
  GanttTaskItem,
  GanttWorkingDaysMode
} from "@studio/shared";
import { apiFetch } from "../lib/api";
import { SectionCard } from "./section-card";

export function GanttConsole() {
  const [form, setForm] = useState<GanttPlanningRequest>({
    projectName: "新产品发布排期",
    projectSummary: "围绕一个新产品版本发布，自动拆解阶段任务、验收节点和整体时间计划。",
    targetEndDate: buildDefaultTargetDate(),
    durationDays: 15,
    workingDaysMode: "five_day",
    planningMode: "backward",
    constraints: "正式验收前至少预留 1 天演练；联调与修正阶段不能少于 2 天。"
  });
  const [plan, setPlan] = useState<GanttPlan | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const dateAxis = useMemo(() => buildDateAxis(plan?.tasks ?? []), [plan?.tasks]);

  const generatePlan = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const nextPlan = await apiFetch<GanttPlan>("/api/gantt/plans", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setPlan(nextPlan);
      setMessage("已生成一版甘特图计划，你可以继续微调任务和日期。");
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "甘特图生成失败");
    } finally {
      setLoading(false);
    }
  };

  const updateTask = (
    taskId: string,
    patch: Partial<Pick<GanttTaskItem, "phase" | "name" | "startDate" | "endDate" | "durationDays">>
  ) => {
    setPlan((current) => {
      if (!current) {
        return current;
      }
      const tasks = current.tasks.map((task) => {
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
      return {
        ...current,
        tasks,
        startDate: tasks[0]?.startDate ?? current.startDate,
        endDate: tasks[tasks.length - 1]?.endDate ?? current.endDate
      };
    });
  };

  return (
    <div className="page-grid">
      {message ? <div className="banner success toast">{message}</div> : null}
      {error ? <div className="banner error toast">{error}</div> : null}

      <div className="two-col">
        <SectionCard
          title="排期输入"
          description="输入开始时间或截止时间、工期和项目背景，系统会调用模型自动拆解阶段、任务和里程碑。"
          action={
            <button className="button" onClick={generatePlan} disabled={loading}>
              {loading ? "生成中" : "生成甘特图"}
            </button>
          }
        >
          <div className="form-grid">
            <div className="field-grid">
              <div className="field">
                <label>项目名称</label>
                <input
                  value={form.projectName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, projectName: event.target.value }))
                  }
                />
              </div>
              <div className="field">
                <label>截止时间</label>
                <input
                  type="date"
                  value={form.targetEndDate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, targetEndDate: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="field-grid">
              <div className="field">
                <label>总工期（天）</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={form.durationDays}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      durationDays: Number(event.target.value)
                    }))
                  }
                />
              </div>
              <div className="field">
                <label>排期方式</label>
                <select
                  className="fancy-select"
                  value={form.planningMode}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      planningMode: event.target.value as GanttPlanningMode
                    }))
                  }
                >
                  <option value="backward">按截止时间倒排</option>
                  <option value="forward">按开始时间正排</option>
                </select>
              </div>
            </div>
            <div className="field-grid">
              <div className="field">
                <label>工作日规则</label>
                <select
                  className="fancy-select"
                  value={form.workingDaysMode}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      workingDaysMode: event.target.value as GanttWorkingDaysMode
                    }))
                  }
                >
                  <option value="five_day">双休</option>
                  <option value="six_day">单休</option>
                  <option value="calendar_day">自然日</option>
                </select>
              </div>
              <div className="field">
                <label>开始时间（正排时可选）</label>
                <input
                  type="date"
                  value={form.startDate ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      startDate: event.target.value || undefined
                    }))
                  }
                />
              </div>
            </div>
            <div className="field">
              <label>项目目标描述</label>
              <textarea
                value={form.projectSummary}
                onChange={(event) =>
                  setForm((current) => ({ ...current, projectSummary: event.target.value }))
                }
              />
            </div>
            <div className="field">
              <label>关键约束（可选）</label>
              <textarea
                value={form.constraints ?? ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, constraints: event.target.value }))
                }
                placeholder="例如：联调至少 5 天；验收前需要 1 天内部演练。"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="生成说明" description="系统会先让模型拆出阶段和任务，再结合截止时间或开始时间自动倒排/正排。">
          <div className="list">
            <div className="list-item">
              <strong>输出内容</strong>
              <span className="muted">阶段、任务、起止时间、依赖关系、里程碑、风险提示</span>
            </div>
            <div className="list-item">
              <strong>可编辑项</strong>
              <span className="muted">任务名称、阶段、开始/结束时间、工期</span>
            </div>
            <div className="list-item">
              <strong>适用场景</strong>
              <span className="muted">产品发布、项目启动、交付计划、活动筹备、方案执行</span>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="任务清单" description="生成后可直接在表格里微调任务、阶段和日期。">
        {!plan ? (
          <div className="empty">先生成一版甘特图计划，这里会显示任务清单。</div>
        ) : (
          <table className="table gantt-table">
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
              {plan.tasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    <input
                      value={task.phase}
                      onChange={(event) => updateTask(task.id, { phase: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      value={task.name}
                      onChange={(event) => updateTask(task.id, { name: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={task.startDate}
                      onChange={(event) => updateTask(task.id, { startDate: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={task.endDate}
                      onChange={(event) => updateTask(task.id, { endDate: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      value={task.durationDays}
                      onChange={(event) =>
                        updateTask(task.id, { durationDays: Number(event.target.value) })
                      }
                    />
                  </td>
                  <td>
                    <span className="muted small">
                      {task.dependsOn.length ? task.dependsOn.join(" / ") : "-"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      <SectionCard title="甘特图预览" description="右侧按时间轴呈现任务排期，里程碑会用高亮标记。">
        {!plan ? (
          <div className="empty">生成计划后，这里会显示甘特图。</div>
        ) : (
          <div className="gantt-board">
            <div className="gantt-header">
              <div className="gantt-task-col">任务</div>
              <div className="gantt-timeline" style={{ gridTemplateColumns: `repeat(${dateAxis.length}, minmax(48px, 1fr))` }}>
                {dateAxis.map((date) => (
                  <div key={date} className="gantt-date-cell">
                    {date.slice(5)}
                  </div>
                ))}
              </div>
            </div>
            {plan.tasks.map((task) => (
              <div key={task.id} className="gantt-row">
                <div className="gantt-task-col">
                  <strong>{task.name}</strong>
                  <div className="muted small">{task.phase}</div>
                </div>
                <div className="gantt-timeline gantt-track" style={{ gridTemplateColumns: `repeat(${dateAxis.length}, minmax(48px, 1fr))` }}>
                  {dateAxis.map((date) => (
                    <div key={`${task.id}-${date}`} className="gantt-grid-cell" />
                  ))}
                  <div
                    className={`gantt-bar ${task.milestone ? "milestone" : ""}`}
                    style={buildBarStyle(task, dateAxis)}
                    title={`${task.name}｜${task.startDate} - ${task.endDate}`}
                  >
                    <span>{task.name}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="two-col">
        <SectionCard title="排期假设" description="帮助你理解模型默认采用的排期规则。">
          {!plan ? (
            <div className="empty">生成计划后，这里会显示排期假设。</div>
          ) : (
            <div className="list">
              {plan.assumptions.map((item) => (
                <div key={item} className="list-item">
                  <strong>假设</strong>
                  <span className="muted">{item}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="风险提示" description="用于提醒哪些节点可能拖慢整体进度。">
          {!plan ? (
            <div className="empty">生成计划后，这里会显示风险提示。</div>
          ) : (
            <div className="list">
              {plan.riskNotes.map((item) => (
                <div key={item} className="list-item">
                  <strong>风险</strong>
                  <span className="muted">{item}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

const buildDefaultTargetDate = () => {
  const next = new Date();
  next.setDate(next.getDate() + 21);
  return next.toISOString().slice(0, 10);
};

const buildDateAxis = (tasks: GanttTaskItem[]) => {
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
};

const buildBarStyle = (task: GanttTaskItem, axis: string[]) => {
  const startIndex = axis.indexOf(task.startDate);
  const endIndex = axis.indexOf(task.endDate);
  const columnStart = Math.max(1, startIndex + 1);
  const columnEnd = Math.max(columnStart + 1, endIndex + 2);
  return {
    gridColumn: `${columnStart} / ${columnEnd}`
  };
};

const calculateDurationDays = (startDate: string, endDate: string) => {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const diff = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return Math.max(1, diff + 1);
};

const addCalendarDays = (startDate: string, offset: number) => {
  const next = new Date(`${startDate}T00:00:00`);
  next.setDate(next.getDate() + offset);
  return next.toISOString().slice(0, 10);
};
