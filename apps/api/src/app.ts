import Fastify from "fastify";
import cors from "@fastify/cors";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import type {
  ModelConnectionConfig,
  ModelRoutingConfig,
  NaturalLanguageRequirement,
  RequirementParseResult,
  RetrievalRuntimeConfig,
  TaskDetailResponse,
  WordTemplateDefinition
} from "@studio/shared";
import { ModelService } from "./modules/models/model-service.ts";
import { PipelineService } from "./modules/pipeline/pipeline-service.ts";
import { RetrievalConfigService } from "./modules/retrieval/retrieval-config-service.ts";
import { ReportService } from "./modules/reports/report-service.ts";
import { TaskService } from "./modules/tasks/task-service.ts";
import { TemplateService } from "./modules/templates/template-service.ts";

export const buildApp = () => {
  const app = Fastify({ logger: true });
  const modelService = new ModelService();
  const taskService = new TaskService();
  const templateService = new TemplateService();
  const reportService = new ReportService();
  const retrievalConfigService = new RetrievalConfigService();
  const pipelineService = new PipelineService(
    modelService,
    taskService,
    templateService,
    reportService,
    retrievalConfigService
  );

  void app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
  });

  app.get("/api/health", async () => ({ ok: true }));

  app.get("/api/models", async () => ({
    items: modelService.list(),
    routing: modelService.getRouting()
  }));

  app.get("/api/models/:id/check", async (request) => {
    const params = request.params as { id: string };
    return modelService.healthCheck(params.id);
  });

  app.post("/api/models", async (request) => {
    const body = request.body as ModelConnectionConfig;
    return modelService.upsert(body);
  });

  app.put("/api/models/:id", async (request) => {
    const params = request.params as { id: string };
    const body = request.body as Partial<ModelConnectionConfig>;
    return modelService.update(params.id, body);
  });

  app.delete("/api/models/:id", async (request) => {
    const params = request.params as { id: string };
    return modelService.remove(params.id);
  });

  app.post("/api/models/routing", async (request) => {
    const body = request.body as ModelRoutingConfig;
    return modelService.updateRouting(body);
  });

  app.get("/api/retrieval-config", async () => retrievalConfigService.get());

  app.put("/api/retrieval-config", async (request) => {
    const body = request.body as Partial<RetrievalRuntimeConfig>;
    return retrievalConfigService.update(body);
  });

  app.get("/api/retrieval-config/check/search-api", async () => {
    return retrievalConfigService.validateSearchApi();
  });

  app.get("/api/retrieval-config/check/serpapi-baidu", async () => {
    return retrievalConfigService.validateSerpApiBaidu();
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

  app.get("/api/reports/:id", async (request) => {
    const params = request.params as { id: string };
    return reportService.get(params.id);
  });

  app.get("/api/reports/:id/download/:kind", async (request, reply) => {
    const params = request.params as { id: string; kind: "final" | "editable" };
    const filePath = reportService.getReportFile(params.id, params.kind);
    const fileBuffer = await readFile(filePath);
    reply.header(
      "Content-Disposition",
      `inline; filename="${basename(filePath)}"`
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
