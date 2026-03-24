"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  AnalysisTask,
  CompetitorCandidate,
  RetrievalMode,
  RequirementParseResult,
  WordTemplateDefinition
} from "@studio/shared";
import { API_BASE_URL, apiFetch } from "../lib/api";
import { SectionCard } from "./section-card";

interface TemplatesResponse {
  items: WordTemplateDefinition[];
}

interface PreviewResponse {
  parseResult: RequirementParseResult;
  candidates: CompetitorCandidate[];
  sourceCount: number;
}

export function TaskConsole() {
  const [prompt, setPrompt] = useState(
    "帮我分析国内 AI 办公助手赛道的主要竞品，做一份面向老板汇报的报告，重点看功能对比、商业模式和机会点。"
  );
  const [templateId, setTemplateId] = useState("tpl-executive-zh");
  const [limit, setLimit] = useState(5);
  const [retrievalMode, setRetrievalMode] = useState<RetrievalMode>("mock");
  const [templates, setTemplates] = useState<WordTemplateDefinition[]>([]);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [createdTask, setCreatedTask] = useState<AnalysisTask | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<"preview" | "run" | "">("");
  const preferredStyle = selectedTemplateStyle(templates, templateId);
  const currentInputKey = useMemo(
    () =>
      JSON.stringify({ prompt: prompt.trim(), templateId, limit, preferredStyle, retrievalMode }),
    [prompt, templateId, limit, preferredStyle, retrievalMode]
  );
  const [previewInputKey, setPreviewInputKey] = useState("");

  useEffect(() => {
    void loadTemplates();
  }, []);

  useEffect(() => {
    if (!createdTask || !["queued", "running"].includes(createdTask.status)) {
      return;
    }

    const timer = window.setInterval(() => {
      void refreshTask(createdTask.id);
    }, 1500);

    return () => window.clearInterval(timer);
  }, [createdTask?.id, createdTask?.status]);

  useEffect(() => {
    if (previewInputKey && previewInputKey !== currentInputKey) {
      setPreview(null);
      setCreatedTask(null);
      setMessage("需求或模板已修改，请重新点击“解析需求”以获得新的解析结果。");
    }
  }, [currentInputKey, previewInputKey]);

  const loadTemplates = async () => {
    try {
      const response = await apiFetch<TemplatesResponse>("/api/templates");
      setTemplates(response.items);
      if (response.items[0]) {
        setTemplateId(response.items[0].id);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载模板失败");
    }
  };

  const parseRequirement = async () => {
    if (!prompt.trim()) {
      setError("请输入竞品分析需求后再解析。");
      return;
    }
    setLoading("preview");
    setError("");
    setMessage("");
    try {
      const response = await apiFetch<PreviewResponse>("/api/tasks/preview", {
        method: "POST",
        body: JSON.stringify({
          rawPrompt: prompt,
          preferredTemplateId: templateId,
          preferredStyle,
          limit,
          retrievalMode,
          parseResult: preview?.parseResult
        })
      });
      setPreview(response);
      setPreviewInputKey(currentInputKey);
      setMessage(`已完成需求解析，命中 ${response.sourceCount} 条来源。`);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "需求解析失败");
    } finally {
      setLoading("");
    }
  };

  const createAndRunTask = async () => {
    if (!prompt.trim()) {
      setError("请输入竞品分析需求后再创建任务。");
      return;
    }
    setLoading("run");
    setError("");
    setMessage("");
    const canReusePreview = previewInputKey === currentInputKey;
    try {
      const task = await apiFetch<AnalysisTask>("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          rawPrompt: prompt,
          preferredTemplateId: templateId,
          preferredStyle,
          limit,
          retrievalMode,
          parseResult: canReusePreview ? preview?.parseResult : undefined
        })
      });
      setCreatedTask(task);
      const result = await apiFetch<AnalysisTask>(`/api/tasks/${task.id}/run`, {
        method: "POST",
        body: JSON.stringify({})
      });
      setCreatedTask((current) => ({
        ...(current ?? task),
        status: result.status,
        currentStep: result.currentStep,
        progressPercent: result.progressPercent
      }));
      setMessage("任务已提交，系统正在后台分阶段执行。");
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "任务执行失败");
    } finally {
      setLoading("");
    }
  };

  const refreshTask = async (taskId: string) => {
    try {
      const detail = await apiFetch<{
        task: AnalysisTask;
        artifact?: Record<string, unknown>;
      }>(`/api/tasks/${taskId}`);
      setCreatedTask(detail.task);
      if (detail.task.status === "completed" && detail.artifact) {
        setMessage("任务已完成，可以查看报告和图表。");
      }
      if (detail.task.status === "failed" && detail.task.errorMessage) {
        setError(detail.task.errorMessage);
      }
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "刷新任务进度失败");
    }
  };

  return (
    <div className="page-grid">
      {message ? <div className="banner success">{message}</div> : null}
      {error ? <div className="banner error">{error}</div> : null}
      {createdTask ? (
        <SectionCard title="执行进度" description="任务已改为后台分阶段执行，下面会实时更新当前步骤和进度。">
          <div className="stack">
            <div className="inline-actions">
              <span className={`status ${createdTask.status === "completed" ? "success" : createdTask.status === "failed" ? "warning" : ""}`}>
                {createdTask.status}
              </span>
              <span className="muted">{createdTask.currentStep ?? "等待执行"}</span>
              <span className="mono small">{createdTask.progressPercent ?? 0}%</span>
            </div>
            <div className="progress">
              <span style={{ width: `${createdTask.progressPercent ?? 0}%` }} />
            </div>
          </div>
        </SectionCard>
      ) : null}

      <div className="two-col">
        <SectionCard title="自然语言输入" description="这里已经接上 API，可以解析需求，也可以直接创建并运行任务。">
          <div className="form-grid">
            <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} />
            <div className="field-grid">
              <select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
                min={1}
                max={20}
              />
            </div>
            <div className="field">
              <label>检索模式</label>
              <div className="route-grid">
                {RETRIEVAL_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`route-card ${retrievalMode === option.value ? "active" : ""}`}
                    onClick={() => setRetrievalMode(option.value)}
                  >
                    <strong>{option.label}</strong>
                    <span className="field-help">{option.description}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="inline-actions">
              <button className="button ghost" onClick={parseRequirement} disabled={loading !== ""}>
                {loading === "preview" ? "解析中" : "解析需求"}
              </button>
              <button className="button" onClick={createAndRunTask} disabled={loading !== ""}>
                {loading === "run" ? "生成中" : "创建并运行"}
              </button>
            </div>
            <div className="field-help">
              修改需求、模板或数量后，旧解析结果会自动失效，避免误用上一次的解析结果。
            </div>
          </div>
        </SectionCard>

        <SectionCard title="解析结果确认" description="用户现在可以看到实际解析结果，而不是固定写死的数据。">
          {!preview ? (
            <div className="empty">先点击“解析需求”，这里会显示结构化结果。</div>
          ) : (
            <div className="list">
              {Object.entries(preview.parseResult).map(([key, value]) => (
                <div key={key} className="list-item">
                  <strong>{key}</strong>
                  <span className="muted">
                    {Array.isArray(value) ? value.join(" / ") : String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="候选竞品确认" description="当前是自动发现结果，后续还可以加勾选、删改和手动补充。">
        {!preview ? (
          <div className="empty">解析完成后，这里会列出候选竞品和置信度。</div>
        ) : preview.candidates.length === 0 ? (
          <div className="empty">
            当前没有发现可用候选竞品。若解析结果是正确的，但这里为空，通常说明当前示例检索源尚未覆盖这个赛道。
            <br />
            接入真实中文互联网检索后，这里的候选结果才会更可靠。
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>竞品</th>
                <th>分层</th>
                <th>置信度</th>
                <th>来源理由</th>
              </tr>
            </thead>
            <tbody>
              {preview.candidates.map((candidate) => (
                <tr key={candidate.id}>
                  <td>{candidate.name}</td>
                  <td>{candidate.layer}</td>
                  <td>{candidate.confidence.toFixed(2)}</td>
                  <td>{candidate.matchReason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      <SectionCard title="执行结果" description="任务执行后会返回报告产物路径，方便你直接打开 Word 文件。">
        {createdTask?.status === "completed" && createdTask.reportId ? (
          <div className="list">
            <div className="list-item">
              <strong>任务 ID</strong>
              <Link className="text-link mono small" href={`/tasks/${createdTask?.id}`}>
                {createdTask?.id}
              </Link>
            </div>
            <div className="list-item">
              <strong>最终版报告</strong>
              <a
                className="text-link mono small"
                href={`${API_BASE_URL}/api/reports/${createdTask.reportId}/download/final`}
                target="_blank"
                rel="noreferrer"
              >
                打开 / 下载最终版报告
              </a>
            </div>
            <div className="list-item">
              <strong>可编辑版报告</strong>
              <a
                className="text-link mono small"
                href={`${API_BASE_URL}/api/reports/${createdTask.reportId}/download/editable`}
                target="_blank"
                rel="noreferrer"
              >
                打开 / 下载可编辑版报告
              </a>
            </div>
            <div className="list-item">
              <strong>图表资源</strong>
              <div className="stack">
                <Link className="text-link mono small" href={`/tasks/${createdTask.id}`}>
                  去任务详情页查看图表列表
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty">运行任务后，这里会展示最终报告路径。</div>
        )}
      </SectionCard>
    </div>
  );
}

const selectedTemplateStyle = (templates: WordTemplateDefinition[], templateId: string) =>
  templates.find((template) => template.id === templateId)?.style ?? "executive";

const RETRIEVAL_OPTIONS: Array<{
  value: RetrievalMode;
  label: string;
  description: string;
}> = [
  {
    value: "mock",
    label: "Mock",
    description: "只使用本地示例检索，适合演示和离线调试。"
  },
  {
    value: "search_api",
    label: "Search API",
    description: "调用配置好的真实搜索接口，适合开放赛道。"
  },
  {
    value: "serpapi_baidu",
    label: "SerpAPI(Baidu)",
    description: "直接使用 SerpAPI 的百度搜索能力，适合中文互联网。"
  },
  {
    value: "skill_bridge",
    label: "Skill Bridge",
    description: "通过桥接服务调用检索 Skill 结果。"
  },
  {
    value: "hybrid",
    label: "Hybrid",
    description: "优先真实检索，必要时再回退到示例结果。"
  }
];
