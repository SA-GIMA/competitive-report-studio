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
  const [message, setMessage] = useState("");
  const [retryingId, setRetryingId] = useState("");

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

  const retryTask = async (taskId: string) => {
    await controlTask(taskId, "retry");
  };

  const controlTask = async (taskId: string, action: "pause" | "resume" | "retry") => {
    setRetryingId(taskId);
    setError("");
    setMessage("");
    try {
      const path =
        action === "pause"
          ? `/api/tasks/${taskId}/pause`
          : action === "resume"
            ? `/api/tasks/${taskId}/resume`
            : `/api/tasks/${taskId}/retry`;
      await apiFetch<AnalysisTask>(path, {
        method: "POST",
        body: JSON.stringify({})
      });
      setMessage(
        action === "pause"
          ? "任务已请求暂停。"
          : action === "resume"
            ? "任务已继续执行。"
            : "任务已重新开始执行。"
      );
      await load();
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : "任务控制失败");
    } finally {
      setRetryingId("");
    }
  };

  return (
    <div className="page-grid">
      {message ? <div className="banner success toast">{message}</div> : null}
      {error ? <div className="banner error toast">{error}</div> : null}

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
                <th>失败情况</th>
                <th>模板</th>
                <th>输入 / 检索</th>
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
                  <td>
                    {task.status === "failed" ? (
                      <div className="stack">
                        <span className="muted small">
                          {formatFailureCategory(task.failureCategory)}
                          {task.retryable ? " · 可重试" : " · 需先修复"}
                        </span>
                        {task.errorMessage ? (
                          <span className="muted small">
                            {truncate(task.errorMessage, 60)}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="muted small">-</span>
                    )}
                  </td>
                  <td>{task.templateId ?? "未指定"}</td>
                  <td>
                    {task.inputMode === "document_upload"
                      ? "上传文档"
                      : `联网搜索 / ${task.retrievalMode ?? "mock"}`}
                  </td>
                  <td>{formatDateTime(task.updatedAt)}</td>
                  <td>
                    <div className="inline-actions">
                      <Link className="text-link" href={`/tasks/${task.id}`}>
                        查看详情
                      </Link>
                      {["queued", "running"].includes(task.status) ? (
                        <button
                          type="button"
                          className="button ghost"
                          onClick={() => controlTask(task.id, "pause")}
                          disabled={retryingId === task.id}
                        >
                          {retryingId === task.id ? "处理中" : "暂停"}
                        </button>
                      ) : null}
                      {(task.status === "paused" ||
                        (task.status === "failed" && task.retryable)) ? (
                        <button
                          type="button"
                          className="button ghost"
                          onClick={() => controlTask(task.id, "resume")}
                          disabled={retryingId === task.id}
                        >
                          {retryingId === task.id ? "处理中" : "继续"}
                        </button>
                      ) : null}
                      {task.status === "failed" && task.retryable ? (
                        <button
                          type="button"
                          className="button ghost"
                          onClick={() => retryTask(task.id)}
                          disabled={retryingId === task.id}
                        >
                          {retryingId === task.id ? "重试中" : "重试"}
                        </button>
                      ) : null}
                    </div>
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

const formatFailureCategory = (category: AnalysisTask["failureCategory"]) => {
  switch (category) {
    case "configuration":
      return "配置问题";
    case "input":
      return "输入问题";
    case "temporary":
      return "临时异常";
    case "provider":
      return "模型 / 外部服务异常";
    case "unknown":
      return "未知异常";
    default:
      return "未分类";
  }
};

const truncate = (value: string, maxLength: number) =>
  value.length <= maxLength ? value : `${value.slice(0, Math.max(0, maxLength - 1))}…`;
