"use client";

import { useEffect, useState } from "react";
import type {
  EffectiveModelRouting,
  ModelConnectionConfig,
  ModelRoutingConfig,
  RetrievalRuntimeConfig
} from "@studio/shared";
import { apiFetch } from "../lib/api";
import { SectionCard } from "./section-card";

interface ModelsResponse {
  items: ModelConnectionConfig[];
  routing: ModelRoutingConfig;
  effectiveRouting: EffectiveModelRouting;
}

const emptyRetrievalConfig: RetrievalRuntimeConfig = {
  searchApiEndpoint: "",
  searchApiKey: "",
  searxngEndpoint: "",
  searxngKey: "",
  serpApiKey: "",
  skillBridgeEndpoint: "",
  skillBridgeKey: ""
};

const emptyModel: ModelConnectionConfig = {
  id: "",
  provider: "openai-compatible",
  label: "",
  baseUrl: "https://api.openai.com/v1",
  apiKeyRef: "",
  model: "",
  timeoutMs: 30000,
  temperature: 0.4,
  maxTokens: 2400,
  enabled: true
};

export function SettingsConsole() {
  const [models, setModels] = useState<ModelConnectionConfig[]>([]);
  const [routing, setRouting] = useState<ModelRoutingConfig>({
    plannerModelId: "",
    extractorModelId: "",
    writerModelId: ""
  });
  const [effectiveRouting, setEffectiveRouting] = useState<EffectiveModelRouting>({
    plannerModelId: "",
    extractorModelId: "",
    writerModelId: "",
    writerUsesDemoProvider: false
  });
  const [selectedId, setSelectedId] = useState<string>("");
  const [draft, setDraft] = useState<ModelConnectionConfig>(emptyModel);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [checkingId, setCheckingId] = useState<string>("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [retrievalConfig, setRetrievalConfig] =
    useState<RetrievalRuntimeConfig>(emptyRetrievalConfig);
  const [checkingRetrieval, setCheckingRetrieval] = useState<
    "" | "search_api" | "searxng" | "serpapi_baidu" | "skill_bridge"
  >(
    ""
  );

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    try {
      const response = await apiFetch<ModelsResponse>("/api/models");
      const retrieval = await apiFetch<RetrievalRuntimeConfig>("/api/retrieval-config");
      setModels(response.items);
      setRouting(response.routing);
      setEffectiveRouting(response.effectiveRouting);
      setRetrievalConfig(retrieval);
      const current = response.items[0];
      if (current) {
        setSelectedId(current.id);
        setDraft(current);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载模型配置失败");
    }
  };

  const selectModel = (modelId: string) => {
    const model = models.find((item) => item.id === modelId);
    if (!model) {
      return;
    }
    setSelectedId(modelId);
    setDraft(model);
    setMessage("");
    setError("");
  };

  const saveModel = async () => {
    setError("");
    setMessage("");
    const errors = validateDraft(draft);
    setValidationErrors(errors);
    if (errors.length > 0) {
      setError("请先修正模型配置中的必填项和格式问题。");
      return;
    }
    try {
      const hasExisting = models.some((item) => item.id === draft.id);
      const payload = {
        ...draft,
        timeoutMs: Number(draft.timeoutMs),
        temperature: Number(draft.temperature),
        maxTokens: Number(draft.maxTokens ?? 2400)
      };
      const saved = hasExisting
        ? await apiFetch<ModelConnectionConfig>(`/api/models/${draft.id}`, {
            method: "PUT",
            body: JSON.stringify(payload)
          })
        : await apiFetch<ModelConnectionConfig>("/api/models", {
            method: "POST",
            body: JSON.stringify(payload)
          });
      setMessage(`模型 ${saved.label} 已保存`);
      await load();
      setSelectedId(saved.id);
      setDraft(saved);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存模型失败");
    }
  };

  const applyPreset = (preset: ModelPreset) => {
    if (!preset.supported) {
      setError(preset.note);
      return;
    }

    const modelId = preset.id ?? `${normalizeModelId(preset.model)}-config`;
    setDraft({
      ...emptyModel,
      id: modelId,
      label: preset.label,
      provider: "openai-compatible",
      baseUrl: preset.baseUrl ?? "",
      model: preset.model,
      timeoutMs: 30000,
      temperature: 0.4,
      maxTokens: 2400,
      enabled: true
    });
    setSelectedId(modelId);
    setMessage(`已应用预设：${preset.label}。${preset.note}`);
    setError("");
  };

  const checkModel = async (modelId: string) => {
    const persisted = models.some((item) => item.id === modelId);
    if (!persisted) {
      setError("请先保存模型，再执行可用性检测。");
      return;
    }
    setCheckingId(modelId);
    setError("");
    setMessage("");
    try {
      const response = await apiFetch<{ ok: boolean; message: string }>(
        `/api/models/${modelId}/check`
      );
      setMessage(`${modelId} 检测结果：${response.message}`);
    } catch (checkError) {
      setError(checkError instanceof Error ? checkError.message : "模型检测失败");
    } finally {
      setCheckingId("");
    }
  };

  const saveRouting = async (nextRouting: ModelRoutingConfig) => {
    setRouting(nextRouting);
    try {
      await apiFetch<ModelRoutingConfig>("/api/models/routing", {
        method: "POST",
        body: JSON.stringify(nextRouting)
      });
      setMessage("模型路由已更新");
    } catch (routingError) {
      setError(routingError instanceof Error ? routingError.message : "模型路由更新失败");
    }
  };

  const deleteModel = async (modelId: string) => {
    try {
      await apiFetch<{ success: boolean }>(`/api/models/${modelId}`, {
        method: "DELETE"
      });
      setMessage(`模型 ${modelId} 已删除`);
      if (selectedId === modelId) {
        setSelectedId("");
        setDraft(emptyModel);
      }
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除模型失败");
    }
  };

  const saveRetrievalConfig = async () => {
    try {
      await apiFetch<RetrievalRuntimeConfig>("/api/retrieval-config", {
        method: "PUT",
        body: JSON.stringify(retrievalConfig)
      });
      setMessage("检索配置已更新");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存检索配置失败");
    }
  };

  const validateRetrieval = async (
    target: "search_api" | "searxng" | "serpapi_baidu" | "skill_bridge"
  ) => {
    setCheckingRetrieval(target);
    setError("");
    setMessage("");
    try {
      const response = await apiFetch<{ ok: boolean; message: string; sampleCount: number }>(
        target === "search_api"
          ? "/api/retrieval-config/check/search-api"
          : target === "searxng"
            ? "/api/retrieval-config/check/searxng"
          : target === "serpapi_baidu"
            ? "/api/retrieval-config/check/serpapi-baidu"
            : "/api/retrieval-config/check/skill-bridge"
      );
      setMessage(
        `${
          target === "search_api"
            ? "Search API"
            : target === "searxng"
              ? "SearXNG"
            : target === "serpapi_baidu"
              ? "SerpAPI(Baidu)"
              : "Skill Bridge"
        } 检测结果：${response.message}，样本数 ${response.sampleCount}`
      );
    } catch (validateError) {
      setError(validateError instanceof Error ? validateError.message : "检索配置检测失败");
    } finally {
      setCheckingRetrieval("");
    }
  };

  return (
    <div className="page-grid">
      {message ? <div className="banner success toast">{message}</div> : null}
      {error ? <div className="banner error toast">{error}</div> : null}

      <div className="split">
        <SectionCard
          title="模型列表"
          description="这里不再只是静态展示，每个模型都可以切换、编辑、保存和检测。内部 ID 和远程模型名会明确分开。"
          action={
            <div className="inline-actions">
              <button
                className="button ghost"
                onClick={() => {
                  const created = {
                    ...emptyModel,
                    id: `custom-${Date.now()}`,
                    label: "新模型连接"
                  };
                  setSelectedId(created.id);
                  setDraft(created);
                  setValidationErrors([]);
                }}
              >
                新建模型
              </button>
              <button
                className="button danger"
                onClick={async () => {
                  try {
                    const response = await apiFetch<{
                      models: ModelsResponse;
                      retrievalConfig: RetrievalRuntimeConfig;
                    }>("/api/config/reset", {
                      method: "POST",
                      body: JSON.stringify({})
                    });
                    setModels(response.models.items);
                    setRouting(response.models.routing);
                    setEffectiveRouting(response.models.effectiveRouting);
                    setRetrievalConfig(response.retrievalConfig);
                    const current = response.models.items[0];
                    if (current) {
                      setSelectedId(current.id);
                      setDraft(current);
                    }
                    setMessage("已恢复所有模型与检索配置到初始化状态。");
                    setError("");
                  } catch (resetError) {
                    setError(resetError instanceof Error ? resetError.message : "恢复初始化失败");
                  }
                }}
              >
                恢复初始化
              </button>
            </div>
          }
        >
          <div className="stack">
            {models.map((model) => (
              <button
                key={model.id}
                className="list-item"
                style={{
                  textAlign: "left",
                  cursor: "pointer",
                  outline: model.id === selectedId ? "2px solid rgba(37,99,235,.35)" : "none"
                }}
                onClick={() => selectModel(model.id)}
              >
                <strong>{model.label}</strong>
                <p className="muted small">{model.provider}</p>
                <div className="inline-actions">
                  <span className={`status ${model.enabled ? "success" : "warning"}`}>
                    {model.enabled ? "已启用" : "已停用"}
                  </span>
                  <span className="status">{model.model}</span>
                  <span className="status mono small">{model.id}</span>
                </div>
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="模型详情"
          description="支持编辑连接参数、启停、保存和连通性检测。请特别注意：模型 ID 是系统内部标识，模型名称才是发给供应商的真实 model。"
          action={
            <div className="inline-actions">
              <button
                className="button ghost"
                onClick={() => checkModel(draft.id)}
                disabled={!draft.id || !models.some((item) => item.id === draft.id)}
              >
                {checkingId === draft.id ? "检测中" : "检测可用性"}
              </button>
              <button className="button" onClick={saveModel}>
                保存模型
              </button>
              {models.some((item) => item.id === draft.id) ? (
                <button className="button danger" onClick={() => deleteModel(draft.id)}>
                  删除模型
                </button>
              ) : null}
            </div>
          }
        >
          <div className="field" style={{ marginBottom: 16 }}>
            <label>主流模型预设</label>
            <select
              className="fancy-select"
              value=""
              onChange={(event) => {
                const preset = MODEL_PRESETS.find((item) => item.key === event.target.value);
                if (preset) {
                  applyPreset(preset);
                }
              }}
            >
              <option value="">自定义</option>
              {MODEL_PRESETS.map((preset) => (
                <option key={preset.key} value={preset.key}>
                  {preset.label}
                </option>
              ))}
            </select>
            <span className="field-help">
              默认使用“自定义”。如果你选择了某个主流模型，下面的 Base URL 和 Model 会自动填充为预设值。像 Claude、百灵这类当前系统未原生支持的接口，会提示你需要兼容网关或手动确认。
            </span>
          </div>
          <div className="kv-list" style={{ marginBottom: 14 }}>
            <div className="kv-item">
              <strong>模型 ID</strong>
              <span className="field-help">
                系统内部标识，用于路由和查找，例如 `mimo-v2-pro-config`。保存、检测和任务路由都依赖它。
              </span>
            </div>
            <div className="kv-item">
              <strong>模型名称</strong>
              <span className="field-help">
                真实发送给模型供应商的 `model` 字段，例如 `mimo-v2-pro`。
              </span>
            </div>
          </div>
          {validationErrors.length > 0 ? (
            <div className="banner error" style={{ marginBottom: 14 }}>
              {validationErrors.join("；")}
            </div>
          ) : null}
          <div className="form-grid">
            <div className="field-grid">
              <div className="field">
                <label>模型显示名称</label>
                <input
                  value={draft.label}
                  onChange={(event) => setDraft({ ...draft, label: event.target.value })}
                  placeholder="例如：Mimo V2 Pro"
                />
                <span className="field-help">用于页面中展示给用户看的名字。</span>
              </div>
              <div className="field">
                <label>模型 ID</label>
                <input
                  value={draft.id}
                  onChange={(event) =>
                    setDraft({ ...draft, id: normalizeModelId(event.target.value) })
                  }
                  placeholder="例如：mimo-v2-pro-config"
                />
                <span className="field-help">
                  建议使用英文、小写、短横线。不要直接把它理解成远程模型名。
                </span>
              </div>
            </div>
            <div className="field-grid">
              <div className="field">
                <label>Provider</label>
                <select
                  value={draft.provider}
                  onChange={(event) => setDraft({ ...draft, provider: event.target.value })}
                >
                  <option value="openai-compatible">OpenAI Compatible</option>
                  <option value="demo">Demo</option>
                </select>
                <span className="field-help">
                  若你的供应商兼容 OpenAI 接口，通常选择 `OpenAI Compatible`。
                </span>
              </div>
              <div className="field">
                <label>模型名称</label>
                <input
                  value={draft.model}
                  onChange={(event) => {
                    const nextModel = event.target.value;
                    setDraft((current) => ({
                      ...current,
                      model: nextModel,
                      id:
                        current.id.startsWith("custom-") || current.id === ""
                          ? `${normalizeModelId(nextModel)}-config`
                          : current.id
                    }));
                  }}
                  placeholder="例如：mimo-v2-pro"
                />
                <span className="field-help">这是实际发给供应商 API 的 `model` 值。</span>
              </div>
            </div>
            <div className="field">
              <label>API Base URL</label>
              <input
                value={draft.baseUrl}
                onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })}
                placeholder="例如：https://api.xiaomimimo.com/v1"
              />
            </div>
            <div className="field">
              <label>API Key 或环境变量引用</label>
              <input
                value={draft.apiKeyRef}
                onChange={(event) => setDraft({ ...draft, apiKeyRef: event.target.value })}
                placeholder="例如：sk-xxx 或 ${MIMO_API_KEY}"
              />
              <span className="field-help">
                当前版本会原样保存。为了安全，推荐后续改成环境变量引用。
              </span>
            </div>
            <div className="field-grid">
              <div className="field">
                <label>超时毫秒</label>
                <input
                  value={draft.timeoutMs}
                  onChange={(event) =>
                    setDraft({ ...draft, timeoutMs: Number(event.target.value) })
                  }
                  placeholder="30000"
                  type="number"
                />
              </div>
              <div className="field">
                <label>温度</label>
                <input
                  value={draft.temperature}
                  onChange={(event) =>
                    setDraft({ ...draft, temperature: Number(event.target.value) })
                  }
                  placeholder="0.4"
                  type="number"
                  step="0.1"
                />
              </div>
            </div>
            <div className="field-grid">
              <div className="field">
                <label>Max Tokens</label>
                <input
                  value={draft.maxTokens ?? 2400}
                  onChange={(event) =>
                    setDraft({ ...draft, maxTokens: Number(event.target.value) })
                  }
                  placeholder="2400"
                  type="number"
                />
              </div>
              <div className="field">
                <label>启停状态</label>
                <select
                  value={String(draft.enabled)}
                  onChange={(event) =>
                    setDraft({ ...draft, enabled: event.target.value === "true" })
                  }
                >
                  <option value="true">启用</option>
                  <option value="false">停用</option>
                </select>
              </div>
            </div>
            <div className="banner">
              推荐示例：
              <span className="mono small">
                {" "}
                Base URL=`https://api.xiaomimimo.com/v1`，模型名称=`mimo-v2-pro`，模型
                ID=`mimo-v2-pro-config`
              </span>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="任务路由"
        description="把规划、抽取、写作映射到不同模型。现在不再是普通下拉框，而是更清晰的卡片式选择。"
      >
        <div className={`banner ${effectiveRouting.writerUsesDemoProvider ? "error" : ""}`} style={{ marginBottom: 12 }}>
          当前实际写作模型：
          <span className="mono small">
            {" "}
            {effectiveRouting.writerModelLabel ?? effectiveRouting.writerModelId ?? "未设置"}
            {effectiveRouting.writerProvider
              ? ` · provider=${effectiveRouting.writerProvider}`
              : ""}
          </span>
          {effectiveRouting.writerUsesDemoProvider
            ? "。当前仍在使用 Demo Writer，报告内容通常会明显偏短。"
            : "。当前不是 Demo Writer，报告正文会使用真实模型生成。"}
        </div>
        <div className="field">
          <label>规划模型</label>
          <div className="route-grid">
            {models.map((model) => (
              <button
                key={`planner-${model.id}`}
                type="button"
                className={`route-card ${routing.plannerModelId === model.id ? "active" : ""}`}
                onClick={() =>
                  void saveRouting({ ...routing, plannerModelId: model.id })
                }
              >
                <strong>{model.label}</strong>
                <span className="field-help">
                  ID: {model.id} · Provider: {model.provider}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label>抽取模型</label>
          <div className="route-grid">
            {models.map((model) => (
              <button
                key={`extractor-${model.id}`}
                type="button"
                className={`route-card ${routing.extractorModelId === model.id ? "active" : ""}`}
                onClick={() =>
                  void saveRouting({ ...routing, extractorModelId: model.id })
                }
              >
                <strong>{model.label}</strong>
                <span className="field-help">
                  ID: {model.id} · Provider: {model.provider}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label>写作模型</label>
          <div className="route-grid">
            {models.map((model) => (
              <button
                key={`writer-${model.id}`}
                type="button"
                className={`route-card ${routing.writerModelId === model.id ? "active" : ""}`}
                onClick={() =>
                  void saveRouting({ ...routing, writerModelId: model.id })
                }
              >
                <strong>{model.label}</strong>
                <span className="field-help">
                  ID: {model.id} · Provider: {model.provider}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="banner" style={{ marginTop: 12 }}>
          当前路由会直接影响需求解析、结构化抽取和报告写作结果。
        </div>
      </SectionCard>

      <SectionCard
        title="检索配置"
        description="在这里配置真实 Search API、SearXNG、SerpAPI(Baidu) 和 Skill Bridge。配置完成后，可在新建任务页切换检索模式。"
        action={
          <button className="button" onClick={saveRetrievalConfig}>
            保存检索配置
          </button>
        }
      >
        <div className="form-grid">
          <div className="field">
            <label>Search API Endpoint</label>
            <input
              value={retrievalConfig.searchApiEndpoint ?? ""}
              onChange={(event) =>
                setRetrievalConfig((current) => ({
                  ...current,
                  searchApiEndpoint: event.target.value
                }))
              }
              placeholder="例如：https://your-search-api.example.com/search"
            />
            <span className="field-help">
              需要返回统一的检索 JSON 结构。适合直接接通真实搜索服务。
            </span>
            <div className="inline-actions">
              <button
                className="button ghost"
                onClick={() => validateRetrieval("search_api")}
                type="button"
              >
                {checkingRetrieval === "search_api" ? "检测中" : "测试 Search API"}
              </button>
            </div>
          </div>
          <div className="field">
            <label>Search API Key</label>
            <input
              value={retrievalConfig.searchApiKey ?? ""}
              onChange={(event) =>
                setRetrievalConfig((current) => ({
                  ...current,
                  searchApiKey: event.target.value
                }))
              }
              placeholder="可选"
            />
          </div>
          <div className="field">
            <label>SerpAPI(Baidu) Key</label>
            <input
              value={retrievalConfig.serpApiKey ?? ""}
              onChange={(event) =>
                setRetrievalConfig((current) => ({
                  ...current,
                  serpApiKey: event.target.value
                }))
              }
              placeholder="填写 SerpAPI 的 api_key"
            />
            <span className="field-help">
              SerpAPI(Baidu) 已作为专用模式接入，不要再把它填进通用 Search API Endpoint。
            </span>
            <div className="inline-actions">
              <button
                className="button ghost"
                onClick={() => validateRetrieval("serpapi_baidu")}
                type="button"
              >
                {checkingRetrieval === "serpapi_baidu" ? "检测中" : "测试 SerpAPI(Baidu)"}
              </button>
            </div>
          </div>
          <div className="field">
            <label>SearXNG Endpoint</label>
            <input
              value={retrievalConfig.searxngEndpoint ?? ""}
              onChange={(event) =>
                setRetrievalConfig((current) => ({
                  ...current,
                  searxngEndpoint: event.target.value
                }))
              }
              placeholder="例如：http://127.0.0.1:8080/search"
            />
            <span className="field-help">
              推荐接入自建 SearXNG 实例的 `/search` 接口。系统会自动按 `format=json`、`language=zh-CN` 和时间范围参数发起查询。
            </span>
            <div className="inline-actions">
              <button
                className="button ghost"
                onClick={() => validateRetrieval("searxng")}
                type="button"
              >
                {checkingRetrieval === "searxng" ? "检测中" : "测试 SearXNG"}
              </button>
            </div>
          </div>
          <div className="field">
            <label>SearXNG Key</label>
            <input
              value={retrievalConfig.searxngKey ?? ""}
              onChange={(event) =>
                setRetrievalConfig((current) => ({
                  ...current,
                  searxngKey: event.target.value
                }))
              }
              placeholder="可选"
            />
            <span className="field-help">
              只有你的 SearXNG 网关前置了认证层时才需要填写。
            </span>
          </div>
          <div className="field">
            <label>Skill Bridge Endpoint</label>
            <input
              value={retrievalConfig.skillBridgeEndpoint ?? ""}
              onChange={(event) =>
                setRetrievalConfig((current) => ({
                  ...current,
                  skillBridgeEndpoint: event.target.value
                }))
              }
              placeholder="例如：http://127.0.0.1:4200/search"
            />
            <span className="field-help">
              用于桥接检索 Skill，主系统只调用这个 HTTP 接口。
            </span>
            <div className="inline-actions">
              <button
                className="button ghost"
                onClick={() => validateRetrieval("skill_bridge")}
                type="button"
              >
                {checkingRetrieval === "skill_bridge" ? "检测中" : "测试 Skill Bridge"}
              </button>
            </div>
          </div>
          <div className="field">
            <label>Skill Bridge Key</label>
            <input
              value={retrievalConfig.skillBridgeKey ?? ""}
              onChange={(event) =>
                setRetrievalConfig((current) => ({
                  ...current,
                  skillBridgeKey: event.target.value
                }))
              }
              placeholder="可选"
            />
          </div>
          <div className="banner">
            推荐搭配：
            <span className="mono small">
              {" "}
              中文开放赛道优先尝试 `SerpAPI(Baidu)`、`SearXNG` 或 `Hybrid`；如果你有统一搜索网关，再选
              `Search API`；如果你要接已有 Skill 工作流，再选 `Skill Bridge`。
            </span>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

interface ModelPreset {
  key: string;
  label: string;
  id?: string;
  baseUrl?: string;
  model: string;
  supported: boolean;
  note: string;
}

const MODEL_PRESETS: ModelPreset[] = [
  {
    key: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    supported: true,
    note: "DeepSeek 官方 OpenAI 兼容接口。"
  },
  {
    key: "zhipu",
    label: "智谱清言",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    model: "glm-4.5-flash",
    supported: true,
    note: "按智谱开放平台兼容方式预设。"
  },
  {
    key: "kimi",
    label: "月之暗面 Kimi",
    baseUrl: "https://api.moonshot.cn/v1",
    model: "kimi-thinking-preview",
    supported: true,
    note: "基于 Moonshot 官方 API 示例模型。"
  },
  {
    key: "siliconflow",
    label: "SiliconFlow",
    baseUrl: "https://api.siliconflow.cn/v1",
    model: "deepseek-ai/DeepSeek-V3",
    supported: true,
    note: "基于 SiliconFlow 官方 OpenAI 兼容说明。"
  },
  {
    key: "qwen",
    label: "Qwen",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-plus",
    supported: true,
    note: "阿里云百炼通义千问 OpenAI 兼容接口。"
  },
  {
    key: "minimax",
    label: "MiniMax",
    id: "minimax-official-m2-5-config",
    baseUrl: "https://api.minimaxi.com/v1",
    model: "MiniMax-M2.5",
    supported: true,
    note: "MiniMax 官方 OpenAI 兼容接口。"
  },
  {
    key: "codingplan",
    label: "移动云 CodingPlan",
    id: "codingplan-minimax-m2-5-config",
    baseUrl: "https://zhenze-huhehaote.cmecloud.cn/api/coding/v1",
    model: "minimax-m2.5",
    supported: true,
    note: "按你提供的 CodingPlan 地址预设。该端点若不提供 /models，系统现在会自动回退到 /chat/completions 做检测。"
  },
  {
    key: "xiaomi-mimo",
    label: "xiaomi MIMO",
    baseUrl: "https://api.xiaomimimo.com/v1",
    model: "mimo-v2-pro",
    supported: true,
    note: "按当前可用兼容地址预设。"
  },
  {
    key: "bailing",
    label: "百灵大模型",
    baseUrl: "https://api.tbox.cn/api/llm/v1/",
    model: "Ling-1T",
    supported: true,
    note: "按你提供的百灵大模型兼容地址与模型 ID 预设。"
  },
  {
    key: "qianfan",
    label: "百度千帆",
    baseUrl: "https://qianfan.baidubce.com/v2",
    model: "ERNIE-4.5-Turbo-32K",
    supported: true,
    note: "百度千帆官方 OpenAI 兼容方式。"
  },
  {
    key: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4.1-mini",
    supported: true,
    note: "OpenAI 官方 API。"
  },
  {
    key: "claude",
    label: "Claude",
    baseUrl: "https://api.anthropic.com/v1",
    model: "claude-sonnet-4-20250514",
    supported: false,
    note: "当前系统只支持 OpenAI 兼容接口，Claude 原生 Messages API 需单独扩展 provider 或使用兼容网关。"
  },
  {
    key: "custom",
    label: "自定义",
    baseUrl: "",
    model: "",
    supported: true,
    note: "自定义填写兼容接口。"
  }
];

const normalizeModelId = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const validateDraft = (draft: ModelConnectionConfig) => {
  const errors: string[] = [];

  if (!draft.label.trim()) {
    errors.push("模型显示名称不能为空");
  }
  if (!draft.id.trim()) {
    errors.push("模型 ID 不能为空");
  }
  if (!/^[a-z0-9][a-z0-9-_]*$/i.test(draft.id)) {
    errors.push("模型 ID 只能包含英文、数字、中划线和下划线");
  }
  if (!draft.model.trim()) {
    errors.push("模型名称不能为空");
  }
  if (!draft.baseUrl.trim()) {
    errors.push("API Base URL 不能为空");
  }
  if (!/^https?:\/\//.test(draft.baseUrl)) {
    errors.push("API Base URL 需要以 http:// 或 https:// 开头");
  }
  if (!draft.apiKeyRef.trim()) {
    errors.push("API Key 不能为空");
  }
  if (!Number.isFinite(draft.timeoutMs) || draft.timeoutMs <= 0) {
    errors.push("超时毫秒必须大于 0");
  }
  if (!Number.isFinite(draft.temperature) || draft.temperature < 0 || draft.temperature > 2) {
    errors.push("温度建议填写 0 到 2 之间的数值");
  }

  return errors;
};
