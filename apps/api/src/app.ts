import Fastify from "fastify";
import cors from "@fastify/cors";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { getAppConfig } from "@studio/config";
import type {
  EffectiveModelRouting,
  GanttPlan,
  GanttPlanningRequest,
  ModelConnectionConfig,
  ModelRoutingConfig,
  NaturalLanguageRequirement,
  NetworkAccessConfig,
  RequirementParseResult,
  RetrievalRuntimeConfig,
  TaskDetailResponse,
  WordTemplateDefinition
} from "@studio/shared";
import { ModelService } from "./modules/models/model-service.ts";
import { MaterialService } from "./modules/materials/material-service.ts";
import { PipelineService } from "./modules/pipeline/pipeline-service.ts";
import { GanttService } from "./modules/gantt/gantt-service.ts";
import { RetrievalConfigService } from "./modules/retrieval/retrieval-config-service.ts";
import { ReportService } from "./modules/reports/report-service.ts";
import { NetworkAccessConfigService } from "./modules/system/network-access-config-service.ts";
import { TaskService } from "./modules/tasks/task-service.ts";
import { TemplateService } from "./modules/templates/template-service.ts";

export const buildApp = () => {
  const config = getAppConfig();
  assertSafeServerBinding(config.apiHost, config.apiToken);
  const app = Fastify({
    logger: true,
    bodyLimit: 50 * 1024 * 1024
  });
  const modelService = new ModelService();
  const taskService = new TaskService();
  const templateService = new TemplateService();
  const reportService = new ReportService();
  const retrievalConfigService = new RetrievalConfigService();
  const networkAccessConfigService = new NetworkAccessConfigService();
  const materialService = new MaterialService(config.storage.materialsDir);
  const ganttService = new GanttService(modelService);
  const pipelineService = new PipelineService(
    modelService,
    taskService,
    templateService,
    reportService,
    retrievalConfigService,
    materialService
  );

  void app.register(cors, {
    origin: (origin, callback) => {
      if (networkAccessConfigService.isCorsOriginAllowed(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  });

  app.addHook("onRequest", async (request, reply) => {
    if (!config.apiToken || request.url === "/api/health") {
      return;
    }

    const expected = `Bearer ${config.apiToken}`;
    if (request.headers.authorization !== expected) {
      await reply.code(401).send({ message: "未授权，请提供有效 API Token。" });
    }
  });

  app.get("/api/health", async () => ({ ok: true }));

  app.get("/api/network-access-config", async () => networkAccessConfigService.get());

  app.put("/api/network-access-config", async (request) => {
    const body = request.body as Partial<NetworkAccessConfig>;
    return networkAccessConfigService.update(body);
  });

  app.get("/api/gantt/plans", async () => ({
    items: ganttService.listPlans()
  }));

  app.get("/api/gantt/plans/:id", async (request) => {
    const params = request.params as { id: string };
    return ganttService.getPlan(params.id);
  });

  app.put("/api/gantt/plans/:id", async (request) => {
    const params = request.params as { id: string };
    const body = request.body as Partial<GanttPlanningRequest> & {
      projectName?: string;
      projectSummary?: string;
      startDate?: string;
      endDate?: string;
      targetEndDate?: string;
      tasks?: GanttPlan["tasks"];
      assumptions?: string[];
      riskNotes?: string[];
    };
    return ganttService.updatePlan(params.id, body);
  });

  app.post("/api/gantt/plans", async (request) => {
    const body = request.body as GanttPlanningRequest;
    return ganttService.generatePlan(body);
  });

  app.get("/api/models", async () => ({
    items: modelService.listPublic(),
    routing: modelService.getRouting(),
    effectiveRouting: modelService.getEffectiveRouting() satisfies EffectiveModelRouting
  }));

  app.get("/api/models/:id/check", async (request) => {
    const params = request.params as { id: string };
    return modelService.healthCheck(params.id);
  });

  app.post("/api/models/discover", async (request) => {
    const body = request.body as ModelConnectionConfig;
    return modelService.discoverAvailableModels(body);
  });

  app.post("/api/models", async (request) => {
    const body = request.body as ModelConnectionConfig;
    return modelService.toPublicModel(modelService.upsert(body));
  });

  app.put("/api/models/:id", async (request) => {
    const params = request.params as { id: string };
    const body = request.body as Partial<ModelConnectionConfig>;
    return modelService.toPublicModel(modelService.update(params.id, body));
  });

  app.delete("/api/models/:id", async (request) => {
    const params = request.params as { id: string };
    return modelService.remove(params.id);
  });

  app.post("/api/models/routing", async (request) => {
    const body = request.body as ModelRoutingConfig;
    return modelService.updateRouting(body);
  });

  app.get("/api/retrieval-config", async () => retrievalConfigService.getPublic());

  void retrievalConfigService.warmupEmbeddedSearxng().catch(() => undefined);

  app.put("/api/retrieval-config", async (request) => {
    const body = request.body as Partial<RetrievalRuntimeConfig>;
    return retrievalConfigService.updatePublic(body);
  });

  app.get("/api/retrieval-config/searxng/embedded/status", async () => {
    return retrievalConfigService.getEmbeddedSearxngStatus();
  });

  app.post("/api/retrieval-config/searxng/embedded/start", async () => {
    return retrievalConfigService.startEmbeddedSearxng();
  });

  app.post("/api/retrieval-config/searxng/embedded/stop", async () => {
    return retrievalConfigService.stopEmbeddedSearxng();
  });

  app.post("/api/config/reset", async () => ({
    models: modelService.resetToDefaults(),
    retrievalConfig: retrievalConfigService.resetPublic()
  }));

  app.get("/api/retrieval-config/check/search-api", async () => {
    return retrievalConfigService.validateSearchApi();
  });

  app.get("/api/retrieval-config/check/serpapi-baidu", async () => {
    return retrievalConfigService.validateSerpApiBaidu();
  });

  app.get("/api/retrieval-config/check/searxng", async () => {
    return retrievalConfigService.validateSearxng();
  });

  app.get("/api/retrieval-config/check/searxng/runtime", async () => {
    return retrievalConfigService.checkSearxngRuntime();
  });

  app.get("/api/retrieval-config/check/skill-bridge", async () => {
    return retrievalConfigService.validateSkillBridge();
  });

  app.get("/api/templates", async () => ({
    items: templateService.list()
  }));

  app.get("/api/templates/:id", async (request) => {
    const params = request.params as { id: string };
    return templateService.get(params.id);
  });

  app.post("/api/templates", async (request) => {
    const body = request.body as WordTemplateDefinition;
    return templateService.upsert(body);
  });

  app.put("/api/templates/:id", async (request) => {
    const params = request.params as { id: string };
    const body = request.body as Partial<WordTemplateDefinition>;
    return templateService.update(params.id, body);
  });

  app.post("/api/templates/upload", async (request) => {
    const body = request.body as {
      name: string;
      style: WordTemplateDefinition["style"];
      description: string;
      fileName: string;
      fileContentBase64: string;
    };
    return templateService.upload(body);
  });

  app.get("/api/tasks", async () => ({
    items: taskService.list()
  }));

  app.post("/api/materials", async (request) => {
    const body = request.body as {
      competitorName: string;
      fileName: string;
      mimeType: string;
      fileContentBase64: string;
    };
    return materialService.upload(body);
  });

  app.get("/api/tasks/:id", async (request) => {
    const params = request.params as { id: string };
    const task = taskService.get(params.id);
    const reportId = task.reportId ?? `report-${task.id}`;
    const artifact = reportService.getOptional(reportId);
    const snapshot = reportService.getSnapshot(task.id);
    const response: TaskDetailResponse = {
      task,
      artifact,
      snapshot
    };
    return response;
  });

  app.post("/api/tasks/preview", async (request) => {
    const body = request.body as NaturalLanguageRequirement;
    return pipelineService.previewRequirement(body);
  });

  app.post("/api/tasks", async (request) => {
    const body = request.body as NaturalLanguageRequirement & {
      parseResult?: RequirementParseResult;
    };
    return pipelineService.createTask(body);
  });

  app.post("/api/tasks/:id/run", async (request) => {
    const params = request.params as { id: string };
    return pipelineService.runTask(params.id);
  });

  app.post("/api/tasks/:id/pause", async (request) => {
    const params = request.params as { id: string };
    return pipelineService.pauseTask(params.id);
  });

  app.post("/api/tasks/:id/resume", async (request) => {
    const params = request.params as { id: string };
    return pipelineService.resumeTask(params.id);
  });

  app.post("/api/tasks/:id/retry", async (request) => {
    const params = request.params as { id: string };
    return pipelineService.retryTask(params.id);
  });

  app.get("/api/reports/:id", async (request) => {
    const params = request.params as { id: string };
    return reportService.get(params.id);
  });

  app.get("/api/reports/:id/download/:kind", async (request, reply) => {
    const params = request.params as { id: string; kind: "final" | "editable" };
    const filePath = reportService.getReportFile(params.id, params.kind);
    const downloadName = reportService.getReportDownloadName(params.id, params.kind) ?? basename(filePath);
    const fileBuffer = await readFile(filePath);
    reply.header(
      "Content-Disposition",
      `inline; filename="${basename(filePath)}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`
    );
    reply.type(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    return reply.send(fileBuffer);
  });

  app.get("/api/reports/:id/charts/:chartId", async (request, reply) => {
    const params = request.params as { id: string; chartId: string };
    const filePath = reportService.getChartFile(params.id, params.chartId);
    const fileBuffer = await readFile(filePath);
    reply.header("Content-Disposition", `inline; filename="${basename(filePath)}"`);
    reply.type("image/png");
    return reply.send(fileBuffer);
  });

  return app;
};

const assertSafeServerBinding = (host: string, apiToken: string | undefined) => {
  const normalizedHost = host.trim().toLowerCase();
  const isLoopback =
    normalizedHost === "127.0.0.1" ||
    normalizedHost === "localhost" ||
    normalizedHost === "::1";

  if (!isLoopback && !apiToken) {
    console.warn("API_HOST 绑定到非本机地址时建议设置 API_TOKEN。");
  }
};
