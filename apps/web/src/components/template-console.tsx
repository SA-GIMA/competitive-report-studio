"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReportSectionTemplate, WordTemplateDefinition } from "@studio/shared";
import { apiFetch } from "../lib/api";
import { SectionCard } from "./section-card";

interface TemplatesResponse {
  items: WordTemplateDefinition[];
}

export function TemplateConsole() {
  const [templates, setTemplates] = useState<WordTemplateDefinition[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [draft, setDraft] = useState<WordTemplateDefinition | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("新上传模板");
  const [uploadDescription, setUploadDescription] = useState("由界面上传的新模板");
  const [uploadStyle, setUploadStyle] =
    useState<WordTemplateDefinition["style"]>("executive");

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === selectedId) ?? null,
    [templates, selectedId]
  );

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    try {
      const response = await apiFetch<TemplatesResponse>("/api/templates");
      setTemplates(response.items);
      if (!selectedId && response.items[0]) {
        setSelectedId(response.items[0].id);
        setDraft(response.items[0]);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载模板失败");
    }
  };

  const selectTemplate = (templateId: string) => {
    const template = templates.find((item) => item.id === templateId);
    if (!template) {
      return;
    }
    setSelectedId(templateId);
    setDraft(template);
    setMessage("");
    setError("");
  };

  const updateSection = (index: number, patch: Partial<ReportSectionTemplate>) => {
    if (!draft) {
      return;
    }
    const sections = draft.sections.map((section, currentIndex) =>
      currentIndex === index ? { ...section, ...patch } : section
    );
    setDraft({ ...draft, sections });
  };

  const moveSection = (index: number, offset: number) => {
    if (!draft) {
      return;
    }
    const targetIndex = index + offset;
    if (targetIndex < 0 || targetIndex >= draft.sections.length) {
      return;
    }
    const sections = [...draft.sections];
    const [item] = sections.splice(index, 1);
    sections.splice(targetIndex, 0, item);
    setDraft({
      ...draft,
      sections: sections.map((section, currentIndex) => ({
        ...section,
        order: currentIndex + 1
      }))
    });
  };

  const addSection = () => {
    if (!draft) {
      return;
    }
    const nextOrder = draft.sections.length + 1;
    setDraft({
      ...draft,
      sections: [
        ...draft.sections,
        {
          id: `section_${nextOrder}`,
          title: `新增章节 ${nextOrder}`,
          description: "请补充章节说明",
          order: nextOrder,
          enabled: true,
          placeholderKey: `section.new_${nextOrder}`
        }
      ]
    });
  };

  const removeSection = (index: number) => {
    if (!draft) {
      return;
    }
    setDraft({
      ...draft,
      sections: draft.sections
        .filter((_, currentIndex) => currentIndex !== index)
        .map((section, currentIndex) => ({
          ...section,
          order: currentIndex + 1
        }))
    });
  };

  const resetSections = () => {
    if (!draft || !selectedTemplate) {
      return;
    }

    setDraft({
      ...draft,
      sections: selectedTemplate.sections.map((section) => ({ ...section }))
    });
    setMessage(`已还原 ${selectedTemplate.name} 的原始章节设置`);
    setError("");
  };

  const saveTemplate = async () => {
    if (!draft) {
      return;
    }
    try {
      const saved = await apiFetch<WordTemplateDefinition>(`/api/templates/${draft.id}`, {
        method: "PUT",
        body: JSON.stringify(draft)
      });
      setMessage(`模板 ${saved.name} 已保存`);
      await load();
      setSelectedId(saved.id);
      setDraft(saved);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存模板失败");
    }
  };

  const uploadTemplate = async () => {
    if (!uploadFile) {
      setError("请先选择一个 .docx 模板文件");
      return;
    }

    try {
      const base64 = await fileToBase64(uploadFile);
      const uploaded = await apiFetch<WordTemplateDefinition>("/api/templates/upload", {
        method: "POST",
        body: JSON.stringify({
          name: uploadName,
          style: uploadStyle,
          description: uploadDescription,
          fileName: uploadFile.name,
          fileContentBase64: base64
        })
      });
      setMessage(`模板 ${uploaded.name} 上传成功`);
      await load();
      setSelectedId(uploaded.id);
      setDraft(uploaded);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "模板上传失败");
    }
  };

  return (
    <div className="page-grid">
      {message ? <div className="banner success toast">{message}</div> : null}
      {error ? <div className="banner error toast">{error}</div> : null}

      <div className="split">
        <SectionCard title="模板列表" description="模板可选、可切换、可编辑。">
          <div className="stack">
            {templates.map((template) => (
              <button
                key={template.id}
                className="list-item"
                style={{
                  textAlign: "left",
                  cursor: "pointer",
                  outline:
                    template.id === selectedId ? "2px solid rgba(37,99,235,.35)" : "none"
                }}
                onClick={() => selectTemplate(template.id)}
              >
                <strong>{template.name}</strong>
                <p className="muted small">{template.description}</p>
                <div className="inline-actions">
                  <span className="status">{template.style}</span>
                  <span className="status success">{template.sections.length} 个章节</span>
                </div>
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="上传模板"
          description="现在支持把本地 .docx 模板上传到系统并生成模板记录。"
          action={
            <button className="button" onClick={uploadTemplate}>
              上传并创建模板
            </button>
          }
        >
          <div className="form-grid">
            <div className="upload-box">
              <input
                type="file"
                accept=".docx"
                onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
              />
              <p className="muted small">
                当前选择：{uploadFile ? uploadFile.name : "未选择文件"}
              </p>
            </div>
            <div className="field-grid">
              <input value={uploadName} onChange={(event) => setUploadName(event.target.value)} />
              <select
                value={uploadStyle}
                onChange={(event) =>
                  setUploadStyle(event.target.value as WordTemplateDefinition["style"])
                }
              >
                <option value="executive">高层汇报版</option>
                <option value="research">深度研究版</option>
                <option value="brief">简版摘要版</option>
              </select>
            </div>
            <input
              value={uploadDescription}
              onChange={(event) => setUploadDescription(event.target.value)}
            />
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="模板章节配置"
        description="支持新增、删改、启停、上下移动，解决之前完全不能调整的问题。"
        action={
          <div className="inline-actions">
            <button className="button ghost" onClick={addSection} disabled={!draft}>
              新增章节
            </button>
            <button
              className="button secondary"
              onClick={resetSections}
              disabled={!draft || !selectedTemplate}
            >
              还原章节设置
            </button>
            <button className="button" onClick={saveTemplate} disabled={!draft}>
              保存模板配置
            </button>
          </div>
        }
      >
        {!draft ? (
          <div className="empty">请选择一个模板后再编辑章节配置。</div>
        ) : (
          <div className="stack">
            <div className="banner">
              当前模板文件：<span className="mono small">{selectedTemplate?.fileKey}</span>
            </div>
            <div className="field-help">
              如果误删或误改了章节，可以点击“还原章节设置”，恢复到这个模板最近一次已保存的版本。
            </div>
            {draft.sections.map((section, index) => (
              <div key={`${section.id}-${index}`} className="section-row">
                <div className="field-grid">
                  <input
                    value={section.title}
                    onChange={(event) => updateSection(index, { title: event.target.value })}
                  />
                  <input
                    value={section.placeholderKey}
                    onChange={(event) =>
                      updateSection(index, { placeholderKey: event.target.value })
                    }
                  />
                </div>
                <div className="field-grid single">
                  <input
                    value={section.description}
                    onChange={(event) =>
                      updateSection(index, { description: event.target.value })
                    }
                  />
                </div>
                <div className="inline-actions">
                  <button className="button ghost" onClick={() => moveSection(index, -1)}>
                    上移
                  </button>
                  <button className="button ghost" onClick={() => moveSection(index, 1)}>
                    下移
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => updateSection(index, { enabled: !section.enabled })}
                  >
                    {section.enabled ? "停用章节" : "启用章节"}
                  </button>
                  <button className="button danger" onClick={() => removeSection(index)}>
                    删除章节
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("文件读取失败"));
        return;
      }
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
