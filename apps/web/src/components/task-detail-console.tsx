"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AnalysisTask, TaskDetailResponse } from "@studio/shared";
import { API_BASE_URL, apiFetch } from "../lib/api";
import { SectionCard } from "./section-card";

export function TaskDetailConsole(props: { taskId: string }) {
  const [detail, setDetail] = useState<TaskDetailResponse | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [controlling, setControlling] = useState(false);

  useEffect(() => {
    void load();
  }, [props.taskId]);

  useEffect(() => {
    if (!detail || !["queued", "running"].includes(detail.task.status)) {
      return;
    }

    const timer = window.setInterval(() => {
      void load();
    }, 1500);

    return () => window.clearInterval(timer);
  }, [detail?.task.status, props.taskId]);

  const load = async () => {
    try {
      const response = await apiFetch<TaskDetailResponse>(`/api/tasks/${props.taskId}`);
      setDetail(response);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载任务详情失败");
    }
  };

  const controlTask = async (action: "pause" | "resume" | "retry") => {
    setControlling(true);
    setError("");
    setMessage("");
    try {
      const path =
        action === "pause"
          ? `/api/tasks/${props.taskId}/pause`
          : action === "resume"
            ? `/api/tasks/${props.taskId}/resume`
            : `/api/tasks/${props.taskId}/retry`;
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
    } catch (controlError) {
      setError(controlError instanceof Error ? controlError.message : "任务控制失败");
    } finally {
      setControlling(false);
    }
  };

  if (error) {
    return <div className="banner error toast">{error}</div>;
  }

  if (!detail) {
    return <div className="empty">正在加载任务详情...</div>;
  }

  const { task, artifact, snapshot } = detail;

  return (
    <div className="page-grid">
      {message ? <div className="banner success toast">{message}</div> : null}
      <SectionCard
        title="任务概览"
        description="查看任务状态、创建时间、模板、错误信息和报告入口。"
        action={
          <div className="inline-actions">
            <Link className="button ghost" href="/tasks">
              返回历史列表
            </Link>
            <Link className="button" href="/tasks/new">
              新建任务
            </Link>
            {["queued", "running"].includes(task.status) ? (
              <button
                className="button ghost"
                onClick={() => void controlTask("pause")}
                disabled={controlling}
              >
                {controlling ? "处理中" : "暂停"}
              </button>
            ) : null}
            {(task.status === "paused" || (task.status === "failed" && task.retryable)) ? (
              <button
                className="button ghost"
                onClick={() => void controlTask("resume")}
                disabled={controlling}
              >
                {controlling ? "处理中" : "继续"}
              </button>
            ) : null}
            {["paused", "failed", "completed"].includes(task.status) ? (
              <button
                className="button"
                onClick={() => void controlTask("retry")}
                disabled={controlling}
              >
                {controlling ? "处理中" : "重试"}
              </button>
            ) : null}
          </div>
        }
      >
        <div className="list">
          <div className="list-item">
            <strong>任务状态</strong>
            <span className={`status ${task.status === "completed" ? "success" : task.status === "failed" ? "warning" : ""}`}>
              {task.status}
            </span>
          </div>
          <div className="list-item">
            <strong>任务 ID</strong>
            <span className="mono small">{task.id}</span>
          </div>
          <div className="list-item">
            <strong>原始需求</strong>
            <span className="muted">{task.prompt}</span>
          </div>
          <div className="list-item">
            <strong>模板 ID</strong>
            <span className="muted">{task.templateId ?? "未指定"}</span>
          </div>
          <div className="list-item">
            <strong>输入模式</strong>
            <span className="muted">{task.inputMode ?? "search"}</span>
          </div>
          <div className="list-item">
            <strong>检索模式</strong>
            <span className="muted">{task.retrievalMode ?? "mock"}</span>
          </div>
          <div className="list-item">
            <strong>图表自动补全</strong>
            <span className="muted">{task.autoFillChartData ? "已开启" : "未开启"}</span>
          </div>
          <div className="list-item">
            <strong>更新时间</strong>
            <span className="muted">{formatDateTime(task.updatedAt)}</span>
          </div>
          {task.errorMessage ? (
            <div className="list-item">
              <strong>失败原因</strong>
              <span className="muted">{task.errorMessage}</span>
            </div>
          ) : null}
          {task.failureCategory ? (
            <div className="list-item">
              <strong>失败分类</strong>
              <span className="muted">
                {formatFailureCategory(task.failureCategory)}
                {task.retryable ? " · 可重试" : " · 需先修复配置或输入"}
              </span>
            </div>
          ) : null}
        </div>
      </SectionCard>

      <div className="panel-grid">
        <SectionCard title="解析结果" description="显示系统对需求的结构化理解。">
          {task.parseResult ? (
            <div className="list">
              {Object.entries(task.parseResult).map(([key, value]) => (
                <div key={key} className="list-item">
                  <strong>{key}</strong>
                  <span className="muted">
                    {Array.isArray(value) ? value.join(" / ") : String(value)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">当前任务还没有解析结果。</div>
          )}
        </SectionCard>

        <SectionCard title="报告产物" description="生成成功后，可在这里直接打开 Word 和图表。">
          {artifact ? (
            <div className="list">
              <div className="list-item">
                <strong>最终版报告</strong>
                <a
                  className="text-link mono small"
                  href={`${API_BASE_URL}/api/reports/${artifact.reportId}/download/final`}
                  target="_blank"
                  rel="noreferrer"
                >
                  打开 / 下载最终版
                </a>
              </div>
              <div className="list-item">
                <strong>图表资源</strong>
                <div className="stack">
                  {artifact.chartAssets.map((asset) => (
                    <a
                      key={asset.id}
                      className="text-link mono small"
                      href={`${API_BASE_URL}/api/reports/${artifact.reportId}/charts/${asset.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {asset.spec.title} ({asset.format})
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty">当前任务还没有生成报告产物。</div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="候选竞品" description="记录本次任务最终纳入分析的竞品。">
        {task.selectedCompetitors?.length ? (
          <div className="chip-row">
            {task.selectedCompetitors.map((name) => (
              <span key={name} className="chip">
                {name}
              </span>
            ))}
          </div>
        ) : (
          <div className="empty">当前没有可展示的竞品名单。</div>
        )}
      </SectionCard>

      <SectionCard title="上传材料" description="上传文档模式下，这里会记录本次任务引用的材料。">
        {task.uploadedMaterials?.length ? (
          <div className="list">
            {task.uploadedMaterials.map((item) => (
              <div key={item.id} className="list-item">
                <strong>{item.competitorName}</strong>
                <span className="muted">
                  {item.fileName} · {formatBytes(item.size)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">当前任务没有上传材料记录。</div>
        )}
      </SectionCard>

      <SectionCard title="流水线快照" description="用于追溯本次任务实际生成时使用的查询、图表和竞品信息。">
        {snapshot ? (
          <div className="list">
            <div className="list-item">
              <strong>检索 Queries</strong>
              <div className="stack">
                {snapshot.queries.map((query) => (
                  <span key={query.keyword} className="muted">
                    {query.keyword}
                  </span>
                ))}
              </div>
            </div>
            <div className="list-item">
              <strong>图表</strong>
              <div className="stack">
                {snapshot.charts.map((chart) => (
                  <span key={chart.id} className="muted">
                    {chart.title}
                  </span>
                ))}
              </div>
            </div>
            <div className="list-item">
              <strong>生成时间</strong>
              <span className="muted">{formatDateTime(snapshot.generatedAt)}</span>
            </div>
          </div>
        ) : (
          <div className="empty">当前没有保留到流水线快照。</div>
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

const formatBytes = (value: number) => {
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

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
