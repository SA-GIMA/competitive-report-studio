"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AnalysisTask } from "@studio/shared";
import { apiFetch } from "../lib/api";
import { SectionCard } from "./section-card";

interface TasksResponse {
  items: AnalysisTask[];
}

export function TaskHistoryConsole() {
  const [tasks, setTasks] = useState<AnalysisTask[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    try {
      const response = await apiFetch<TasksResponse>("/api/tasks");
      setTasks(response.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载任务历史失败");
    }
  };

  return (
    <div className="page-grid">
      {error ? <div className="banner error">{error}</div> : null}

      <SectionCard
        title="历史任务列表"
        description="这里会展示已创建的历史任务，支持进入详情页查看解析结果、候选竞品和报告产物。"
        action={
          <Link className="button" href="/tasks/new">
            新建任务
          </Link>
        }
      >
        {tasks.length === 0 ? (
          <div className="empty">目前还没有历史任务，可以先去新建一个分析任务。</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>任务</th>
                <th>状态</th>
                <th>模板</th>
                <th>检索模式</th>
                <th>更新时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    <strong>{task.prompt.slice(0, 36)}</strong>
                    <div className="muted small mono">{task.id}</div>
                  </td>
                  <td>
                    <span className={`status ${mapTaskStatus(task.status)}`}>
                      {formatTaskStatus(task.status)}
                    </span>
                  </td>
                  <td>{task.templateId ?? "未指定"}</td>
                  <td>{task.retrievalMode ?? "mock"}</td>
                  <td>{formatDateTime(task.updatedAt)}</td>
                  <td>
                    <Link className="text-link" href={`/tasks/${task.id}`}>
                      查看详情
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  );
}

const formatTaskStatus = (status: AnalysisTask["status"]) => {
  switch (status) {
    case "draft":
      return "草稿";
    case "running":
      return "运行中";
    case "completed":
      return "已完成";
    case "failed":
      return "失败";
    case "queued":
      return "排队中";
    case "awaiting_confirmation":
      return "待确认";
    default:
      return status;
  }
};

const mapTaskStatus = (status: AnalysisTask["status"]) => {
  if (status === "completed") {
    return "success";
  }
  if (status === "failed") {
    return "warning";
  }
  return "";
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
