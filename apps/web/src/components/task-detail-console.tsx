"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TaskDetailResponse } from "@studio/shared";
import { API_BASE_URL, apiFetch } from "../lib/api";
import { SectionCard } from "./section-card";

export function TaskDetailConsole(props: { taskId: string }) {
  const [detail, setDetail] = useState<TaskDetailResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void load();
  }, [props.taskId]);

  const load = async () => {
    try {
      const response = await apiFetch<TaskDetailResponse>(`/api/tasks/${props.taskId}`);
      setDetail(response);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载任务详情失败");
    }
  };

  if (error) {
    return <div className="banner error">{error}</div>;
  }

  if (!detail) {
    return <div className="empty">正在加载任务详情...</div>;
  }

  const { task, artifact, snapshot } = detail;

  return (
    <div className="page-grid">
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
            <strong>检索模式</strong>
            <span className="muted">{task.retrievalMode ?? "mock"}</span>
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
                <strong>可编辑版报告</strong>
                <a
                  className="text-link mono small"
                  href={`${API_BASE_URL}/api/reports/${artifact.reportId}/download/editable`}
                  target="_blank"
                  rel="noreferrer"
                >
                  打开 / 下载可编辑版
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
