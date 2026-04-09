"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { GanttPlan } from "@studio/shared";
import { apiFetch } from "../lib/api";
import { SectionCard } from "./section-card";

export function GanttHistoryConsole() {
  const [plans, setPlans] = useState<GanttPlan[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    try {
      const response = await apiFetch<{ items: GanttPlan[] }>("/api/gantt/plans");
      setPlans(response.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载甘特图历史失败");
    }
  };

  return (
    <div className="page-grid">
      {error ? <div className="banner error toast">{error}</div> : null}
      <SectionCard
        title="历史任务"
        description="这里会展示已经生成过的甘特图计划，方便回看项目名称、起止时间和排期模式。"
        action={
          <Link className="button" href="/gantt/new">
            新建任务
          </Link>
        }
      >
        {plans.length === 0 ? (
          <div className="empty">目前还没有历史甘特图计划，先去生成一版试试。</div>
        ) : (
          <table className="table">
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
              {plans.map((plan) => (
                <tr key={plan.id}>
                  <td>
                    <strong>{plan.projectName}</strong>
                    <div className="muted small mono">{plan.id}</div>
                  </td>
                  <td>{plan.startDate}</td>
                  <td>{plan.targetEndDate}</td>
                  <td>{plan.durationDays} 天</td>
                  <td>{plan.planningMode === "backward" ? "倒排" : "正排"}</td>
                  <td>{formatDateTime(plan.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  );
}

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
