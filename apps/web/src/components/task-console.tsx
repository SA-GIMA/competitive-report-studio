"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AnalysisTask,
  CompetitorCandidate,
  EffectiveModelRouting,
  RetrievalMode,
  RequirementParseResult,
  TaskInputMode,
  UploadedMaterialReference,
  WordTemplateDefinition
} from "@studio/shared";
import { API_BASE_URL, apiFetch } from "../lib/api";
import { SectionCard } from "./section-card";

interface TemplatesResponse {
  items: WordTemplateDefinition[];
}

interface ModelsResponse {
  effectiveRouting: EffectiveModelRouting;
}

interface PreviewResponse {
  parseResult: RequirementParseResult;
  candidates: CompetitorCandidate[];
  sourceCount: number;
}

interface CandidateDraft extends CompetitorCandidate {
  selected: boolean;
  manual?: boolean;
}

interface UploadDraft {
  competitorName: string;
  files: File[];
}

export function TaskConsole() {
  const [inputMode, setInputMode] = useState<TaskInputMode>("search");
  const [prompt, setPrompt] = useState(
    "帮我分析国内 AI 办公助手赛道的主要竞品，做一份面向老板汇报的报告，重点看功能对比、商业模式和机会点。"
  );
  const [templateId, setTemplateId] = useState("tpl-executive-zh");
  const [limit, setLimit] = useState(5);
  const [retrievalMode, setRetrievalMode] = useState<RetrievalMode>("mock");
  const [autoFillChartData, setAutoFillChartData] = useState(false);
  const [templates, setTemplates] = useState<WordTemplateDefinition[]>([]);
  const [effectiveRouting, setEffectiveRouting] = useState<EffectiveModelRouting>({
    plannerModelId: "",
    extractorModelId: "",
    writerModelId: "",
    writerUsesDemoProvider: false
  });
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [candidateDrafts, setCandidateDrafts] = useState<CandidateDraft[]>([]);
  const [manualCandidate, setManualCandidate] = useState("");
  const [createdTask, setCreatedTask] = useState<AnalysisTask | null>(null);
  const [uploadedMaterials, setUploadedMaterials] = useState<UploadedMaterialReference[]>([]);
  const [uploadDraft, setUploadDraft] = useState<UploadDraft>({ competitorName: "", files: [] });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<"preview" | "run" | "upload" | "">("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const preferredStyle = selectedTemplateStyle(templates, templateId);
  const currentInputKey = useMemo(
    () =>
      JSON.stringify({
        inputMode,
        prompt: prompt.trim(),
        limit,
        retrievalMode,
        autoFillChartData,
        uploadedMaterials: uploadedMaterials.map((item) => ({
          id: item.id,
          competitorName: item.competitorName,
          fileName: item.fileName
        }))
      }),
    [inputMode, prompt, limit, retrievalMode, autoFillChartData, uploadedMaterials]
  );
  const [previewInputKey, setPreviewInputKey] = useState("");

  useEffect(() => {
    void loadTemplates();
    void loadRoutingHint();
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
      setCandidateDrafts([]);
      setManualCandidate("");
      setCreatedTask(null);
      setMessage("需求、材料或检索条件已修改，请重新点击“解析需求”以更新解析结果。");
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

  const loadRoutingHint = async () => {
    try {
      const response = await apiFetch<ModelsResponse>("/api/models");
      setEffectiveRouting(response.effectiveRouting);
    } catch {
      // Ignore route hint load failure and let the page continue working.
    }
  };

  const parseRequirement = async () => {
    if (!canSubmitCurrentMode({ inputMode, prompt, uploadedMaterials })) {
      setError(inputMode === "document_upload" ? "请先上传至少一份竞品材料。" : "请输入竞品分析需求后再解析。");
      return;
    }
    setLoading("preview");
    setError("");
    setMessage("");
    try {
      const response = await apiFetch<PreviewResponse>("/api/tasks/preview", {
        method: "POST",
        body: JSON.stringify(buildRequirementPayload({
          inputMode,
          prompt,
          templateId,
          preferredStyle,
          limit,
          retrievalMode,
          autoFillChartData,
          preview,
          uploadedMaterials
        }))
      });
      setPreview(response);
      setCandidateDrafts(
        response.candidates.map((candidate) => ({
          ...candidate,
          selected: true
        }))
      );
      setManualCandidate("");
      setPreviewInputKey(currentInputKey);
      setMessage(
        inputMode === "document_upload"
          ? `已完成材料解析，纳入 ${response.sourceCount} 份上传材料。`
          : `已完成需求解析，命中 ${response.sourceCount} 条来源。`
      );
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "需求解析失败");
    } finally {
      setLoading("");
    }
  };

  const createAndRunTask = async () => {
    if (!canSubmitCurrentMode({ inputMode, prompt, uploadedMaterials })) {
      setError(inputMode === "document_upload" ? "请先上传至少一份竞品材料。" : "请输入竞品分析需求后再创建任务。");
      return;
    }
    setLoading("run");
    setError("");
    setMessage("");
    const canReusePreview = previewInputKey === currentInputKey;
    const confirmedCompetitors = candidateDrafts
      .filter((candidate) => candidate.selected)
      .map((candidate) => candidate.name.trim())
      .filter(Boolean);
    if (canReusePreview && confirmedCompetitors.length === 0) {
      setError("请至少保留一个候选竞品，或手动补充后再创建任务。");
      setLoading("");
      return;
    }
    try {
      const task = await apiFetch<AnalysisTask>("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          ...buildRequirementPayload({
            inputMode,
            prompt,
            templateId,
            preferredStyle,
            limit,
            retrievalMode,
            autoFillChartData,
            preview,
            uploadedMaterials
          }),
          confirmedCompetitors,
          parseResult:
            canReusePreview && preview?.parseResult
              ? {
                  ...preview.parseResult,
                  inferredOutputStyle: preferredStyle
                }
              : undefined
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

  const uploadMaterialsForCompetitor = async () => {
    const competitorName = uploadDraft.competitorName.trim();
    if (!competitorName) {
      setError("请先填写竞品名称，再上传材料。");
      return;
    }
    if (uploadDraft.files.length === 0) {
      setError("请至少选择一个文件后再上传。");
      return;
    }

    setLoading("upload");
    setError("");
    setMessage("");
    try {
      const items: UploadedMaterialReference[] = [];
      for (const file of uploadDraft.files) {
        const fileContentBase64 = await readFileAsBase64(file);
        const uploaded = await apiFetch<UploadedMaterialReference>("/api/materials", {
          method: "POST",
          body: JSON.stringify({
            competitorName,
            fileName: file.name,
            mimeType: file.type || inferMimeType(file.name),
            fileContentBase64
          })
        });
        items.push(uploaded);
      }
      setUploadedMaterials((current) => [...current, ...items]);
      setUploadDraft({ competitorName: "", files: [] });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setMessage(`已上传 ${items.length} 份材料，当前累计 ${uploadedMaterials.length + items.length} 份。`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "上传材料失败");
    } finally {
      setLoading("");
    }
  };

  const removeUploadedMaterial = (materialId: string) => {
    setUploadedMaterials((current) => current.filter((item) => item.id !== materialId));
  };

  const toggleCandidate = (candidateId: string) => {
    setCandidateDrafts((current) =>
      current.map((candidate) =>
        candidate.id === candidateId
          ? { ...candidate, selected: !candidate.selected }
          : candidate
      )
    );
  };

  const removeCandidate = (candidateId: string) => {
    setCandidateDrafts((current) => current.filter((candidate) => candidate.id !== candidateId));
  };

  const updateCandidate = (
    candidateId: string,
    patch: Partial<Pick<CandidateDraft, "name" | "layer" | "confidence" | "matchReason">>
  ) => {
    setCandidateDrafts((current) =>
      current.map((candidate) =>
        candidate.id === candidateId
          ? {
              ...candidate,
              ...patch
            }
          : candidate
      )
    );
  };

  const addManualCandidate = () => {
    const name = manualCandidate.trim();
    if (!name) {
      setError("请输入要手动补充的竞品名称。");
      return;
    }
    if (candidateDrafts.some((candidate) => candidate.name === name)) {
      setError("这个竞品已经在当前候选列表中。");
      return;
    }
    setCandidateDrafts((current) => [
      ...current,
      {
        id: `manual-${Date.now()}`,
        name,
        layer: "direct",
        matchReason: "由用户手动补充",
        confidence: 1,
        supportingSources: [],
        manual: true,
        selected: true
      }
    ]);
    setManualCandidate("");
    setError("");
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

  const controlTask = async (action: "pause" | "resume" | "retry") => {
    if (!createdTask) {
      return;
    }

    setLoading("run");
    setError("");
    setMessage("");
    try {
      const path =
        action === "pause"
          ? `/api/tasks/${createdTask.id}/pause`
          : action === "resume"
            ? `/api/tasks/${createdTask.id}/resume`
            : `/api/tasks/${createdTask.id}/retry`;
      const next = await apiFetch<AnalysisTask>(path, {
        method: "POST",
        body: JSON.stringify({})
      });
      setCreatedTask(next);
      setMessage(
        action === "pause"
          ? "任务已请求暂停。"
          : action === "resume"
            ? "任务已继续执行。"
            : "任务已重新开始执行。"
      );
    } catch (controlError) {
      setError(controlError instanceof Error ? controlError.message : "任务控制失败");
    } finally {
      setLoading("");
    }
  };

  return (
    <div className="page-grid">
      {message ? <div className="banner success toast">{message}</div> : null}
      {error ? <div className="banner error toast">{error}</div> : null}
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
            <div className="inline-actions">
              {["queued", "running"].includes(createdTask.status) ? (
                <button
                  className="button ghost"
                  type="button"
                  onClick={() => void controlTask("pause")}
                  disabled={loading !== ""}
                >
                  暂停
                </button>
              ) : null}
              {(createdTask.status === "paused" ||
                (createdTask.status === "failed" && createdTask.retryable)) ? (
                <button
                  className="button ghost"
                  type="button"
                  onClick={() => void controlTask("resume")}
                  disabled={loading !== ""}
                >
                  继续
                </button>
              ) : null}
              {["paused", "failed", "completed"].includes(createdTask.status) ? (
                <button
                  className="button"
                  type="button"
                  onClick={() => void controlTask("retry")}
                  disabled={loading !== ""}
                >
                  重试
                </button>
              ) : null}
            </div>
          </div>
        </SectionCard>
      ) : null}

      <div className="two-col">
        <SectionCard title="任务输入" description="现在支持联网搜索和上传文档两种输入方式，最终都会输出同样格式的分析报告。">
          <div className="form-grid">
            <div className={`banner ${effectiveRouting.writerUsesDemoProvider ? "error" : ""}`}>
              当前实际写作模型：
              <span className="mono small">
                {" "}
                {effectiveRouting.writerModelLabel ?? effectiveRouting.writerModelId ?? "未设置"}
                {effectiveRouting.writerProvider
                  ? ` · provider=${effectiveRouting.writerProvider}`
                  : ""}
              </span>
              {effectiveRouting.writerUsesDemoProvider
                ? "。当前仍在使用 Demo Writer，生成内容通常会偏短，建议先去模型设置调整写作路由。"
                : "。当前会使用真实模型生成报告正文。"}
            </div>
            <div className="field">
              <label>输入模式</label>
              <div className="route-grid">
                {INPUT_MODE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`route-card ${inputMode === option.value ? "active" : ""}`}
                    onClick={() => setInputMode(option.value)}
                  >
                    <strong>{option.label}</strong>
                    <span className="field-help">{option.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={
                inputMode === "document_upload"
                  ? "可选：补充这次报告重点，比如功能、商业模式、优劣势、机会点等。留空时系统会根据上传材料自动生成默认分析要求。"
                  : undefined
              }
            />

            <div className="field-grid">
              <div className="field">
                <label>报告版本</label>
                <select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                <span className="field-help">
                  这里选择的是报告输出风格与章节结构，例如高层汇报版、深度研究版或简版摘要版。
                </span>
              </div>
              <div className="field">
                <label>竞品数量上限</label>
                <input
                  type="number"
                  value={limit}
                  onChange={(event) => setLimit(Number(event.target.value))}
                  min={1}
                  max={20}
                />
                <span className="field-help">
                  这里控制最终纳入分析的竞品数量上限，数值越大，后续理解和生成耗时通常越长。
                </span>
              </div>
            </div>

            <div className="field">
              <label>图表信息补全</label>
              <label className="toggle-card">
                <input
                  type="checkbox"
                  checked={autoFillChartData}
                  onChange={(event) => setAutoFillChartData(event.target.checked)}
                />
                <span className="toggle-indicator" aria-hidden="true" />
                <span className="toggle-copy">
                  <strong>{autoFillChartData ? "已开启自动补全" : "未开启自动补全"}</strong>
                  <span className="field-help">
                    当图表检索不到足够信息时，允许调用大模型自身知识对图表数据做保守补全。
                  </span>
                </span>
              </label>
            </div>

            {inputMode === "search" ? (
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
            ) : (
              <div className="stack">
                <div className="field-grid">
                  <div className="field">
                    <label>竞品名称</label>
                    <input
                      value={uploadDraft.competitorName}
                      onChange={(event) =>
                        setUploadDraft((current) => ({
                          ...current,
                          competitorName: event.target.value
                        }))
                      }
                      placeholder="例如：钉钉"
                    />
                  </div>
                  <div className="field">
                    <label>选择材料</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md"
                      onChange={(event) =>
                        setUploadDraft((current) => ({
                          ...current,
                          files: Array.from(event.target.files ?? [])
                        }))
                      }
                    />
                    <span className="field-help">
                      支持上传 Word、PPT、PDF、TXT、Markdown 等材料，同一竞品可上传多份。
                    </span>
                  </div>
                </div>
                <div className="inline-actions">
                  <button
                    className="button ghost"
                    type="button"
                    onClick={uploadMaterialsForCompetitor}
                    disabled={loading !== ""}
                  >
                    {loading === "upload" ? "上传中" : "上传材料"}
                  </button>
                </div>
                {uploadedMaterials.length === 0 ? (
                  <div className="empty">还没有上传材料。先按竞品名称分别上传文件，再解析任务。</div>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>竞品</th>
                        <th>文件</th>
                        <th>大小</th>
                        <th>上传时间</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadedMaterials.map((item) => (
                        <tr key={item.id}>
                          <td>{item.competitorName}</td>
                          <td>{item.fileName}</td>
                          <td>{formatBytes(item.size)}</td>
                          <td>{formatDateTime(item.uploadedAt)}</td>
                          <td>
                            <button
                              type="button"
                              className="button ghost"
                              onClick={() => removeUploadedMaterial(item.id)}
                            >
                              删除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div className="field-help">
                  上传模式会把文档先拆成标题/页/表格/幻灯片级内容块，再逐块理解和汇总，避免把整份材料直接塞给上下文较弱的模型。
                </div>
              </div>
            )}

            <div className="inline-actions">
              <button className="button ghost" onClick={parseRequirement} disabled={loading !== ""}>
                {loading === "preview" ? "解析中" : inputMode === "document_upload" ? "解析材料" : "解析需求"}
              </button>
              <button className="button" onClick={createAndRunTask} disabled={loading !== ""}>
                {loading === "run" ? "生成中" : "创建并运行"}
              </button>
            </div>
            <div className="field-help">
              修改需求、模板、材料或模式后，旧解析结果会自动失效，避免误用上一次结果。
            </div>
          </div>
        </SectionCard>

        <SectionCard title="解析结果确认" description="系统会展示它对需求和材料的结构化理解。">
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

      <SectionCard
        title="生成内容预览"
        description="系统会按章节实时展示已生成并完成审核润色的正文内容，方便你在任务执行过程中及时查看。"
      >
        {!createdTask?.executionCheckpoint?.reportDraft?.sections?.length ? (
          <div className="empty">任务开始生成章节后，这里会按章节实时显示正文预览。</div>
        ) : (
          <div className="stack">
            {createdTask.executionCheckpoint.reportDraft.sections.map((section) => (
              <div key={section.sectionId} className="card" style={{ padding: 18 }}>
                <div className="card-head" style={{ marginBottom: 10 }}>
                  <div>
                    <h2 style={{ fontSize: 18 }}>{section.title}</h2>
                    <p>{section.summary}</p>
                  </div>
                </div>
                <div className="preview-markdown">{section.bodyMarkdown}</div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="候选竞品确认" description="这里会列出系统准备纳入分析的竞品，你也可以继续人工修正。">
        {!preview ? (
          <div className="empty">解析完成后，这里会列出候选竞品和置信度。</div>
        ) : (
          <div className="stack">
            <div className="field-grid">
              <div className="field">
                <label>手动补充竞品</label>
                <input
                  value={manualCandidate}
                  onChange={(event) => setManualCandidate(event.target.value)}
                  placeholder="例如：美团外卖"
                />
              </div>
              <div className="field">
                <label>操作</label>
                <button className="button" type="button" onClick={addManualCandidate}>
                  添加到候选列表
                </button>
              </div>
            </div>
            {candidateDrafts.length === 0 ? (
              <div className="empty">
                当前没有发现可用候选竞品，但你可以手动补充、编辑并确认最终名单后继续运行任务。
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>纳入</th>
                    <th>竞品</th>
                    <th>分层</th>
                    <th>置信度</th>
                    <th>来源理由</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {candidateDrafts.map((candidate) => (
                    <tr key={candidate.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={candidate.selected}
                          onChange={() => toggleCandidate(candidate.id)}
                        />
                      </td>
                      <td>
                        <div className="stack">
                          <input
                            value={candidate.name}
                            onChange={(event) =>
                              updateCandidate(candidate.id, { name: event.target.value })
                            }
                          />
                          {candidate.manual ? <div className="muted small">手动补充</div> : null}
                        </div>
                      </td>
                      <td>
                        <select
                          value={candidate.layer}
                          onChange={(event) =>
                            updateCandidate(candidate.id, {
                              layer: event.target.value as CandidateDraft["layer"]
                            })
                          }
                        >
                          <option value="direct">direct</option>
                          <option value="indirect">indirect</option>
                          <option value="substitute">substitute</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          max={1}
                          step={0.01}
                          value={candidate.confidence}
                          onChange={(event) =>
                            updateCandidate(candidate.id, {
                              confidence: clampConfidence(event.target.value)
                            })
                          }
                        />
                      </td>
                      <td>
                        <input
                          value={candidate.matchReason}
                          onChange={(event) =>
                            updateCandidate(candidate.id, { matchReason: event.target.value })
                          }
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="button ghost"
                          onClick={() => removeCandidate(candidate.id)}
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </SectionCard>

      <SectionCard title="执行结果" description="任务执行后会返回报告产物路径，方便你直接打开 Word 文件。">
        {createdTask?.status === "completed" && createdTask.reportId ? (
          <div className="list">
            <div className="list-item">
              <strong>任务 ID</strong>
              <Link className="text-link mono small" href={`/tasks/${createdTask.id}`}>
                {createdTask.id}
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

const buildRequirementPayload = (input: {
  inputMode: TaskInputMode;
  prompt: string;
  templateId: string;
  preferredStyle: WordTemplateDefinition["style"];
  limit: number;
  retrievalMode: RetrievalMode;
  autoFillChartData: boolean;
  preview: PreviewResponse | null;
  uploadedMaterials: UploadedMaterialReference[];
}) => ({
  rawPrompt: input.prompt,
  preferredTemplateId: input.templateId,
  preferredStyle: input.preferredStyle,
  limit: input.limit,
  inputMode: input.inputMode,
  retrievalMode: input.inputMode === "search" ? input.retrievalMode : "mock",
  autoFillChartData: input.autoFillChartData,
  uploadedMaterials: input.inputMode === "document_upload" ? input.uploadedMaterials : [],
  parseResult: input.preview?.parseResult
});

const canSubmitCurrentMode = (input: {
  inputMode: TaskInputMode;
  prompt: string;
  uploadedMaterials: UploadedMaterialReference[];
}) =>
  input.inputMode === "document_upload"
    ? input.uploadedMaterials.length > 0
    : Boolean(input.prompt.trim());

const readFileAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error(`读取文件失败: ${file.name}`));
        return;
      }
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error ?? new Error(`读取文件失败: ${file.name}`));
    reader.readAsDataURL(file);
  });

const inferMimeType = (fileName: string) => {
  const normalized = fileName.toLowerCase();
  if (normalized.endsWith(".pdf")) {
    return "application/pdf";
  }
  if (normalized.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (normalized.endsWith(".doc")) {
    return "application/msword";
  }
  if (normalized.endsWith(".pptx")) {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }
  if (normalized.endsWith(".ppt")) {
    return "application/vnd.ms-powerpoint";
  }
  return "text/plain";
};

const selectedTemplateStyle = (templates: WordTemplateDefinition[], templateId: string) =>
  templates.find((template) => template.id === templateId)?.style ?? "executive";

const INPUT_MODE_OPTIONS: Array<{
  value: TaskInputMode;
  label: string;
  description: string;
}> = [
  {
    value: "search",
    label: "联网搜索模式",
    description: "适合开放赛道，由系统自己联网发现候选竞品和公开来源。"
  },
  {
    value: "document_upload",
    label: "上传文档模式",
    description: "适合你已经有竞品材料的场景，支持自定义竞品名称并上传 Word、PPT、PDF 等文档。"
  }
];

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
    value: "searxng",
    label: "SearXNG",
    description: "调用 SearXNG 聚合搜索接口，适合自建中文互联网检索网关。"
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

const clampConfidence = (value: string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(0, Math.min(1, parsed));
};

const formatBytes = (value: number) => {
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
