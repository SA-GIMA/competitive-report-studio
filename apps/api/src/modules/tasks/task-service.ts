import { join } from "node:path";
import { getAppConfig } from "@studio/config";
import { randomUUID } from "node:crypto";
import type {
  AnalysisTask,
  NaturalLanguageRequirement,
  RequirementParseResult
} from "@studio/shared";
import { TaskStateStore } from "./task-state-store.ts";

export class TaskService {
  private readonly tasks = new Map<string, AnalysisTask>();
  private readonly store = new TaskStateStore(
    join(process.cwd(), getAppConfig().storage.appStateDir, "analysis-tasks.json")
  );

  constructor() {
    let mutated = false;
    for (const task of this.store.load()) {
      const normalizedTask = normalizeLoadedTask(task);
      if (normalizedTask !== task) {
        mutated = true;
      }
      this.tasks.set(task.id, normalizedTask);
    }
    if (mutated) {
      this.persist();
    }
  }

  create(input: NaturalLanguageRequirement & { parseResult?: RequirementParseResult }) {
    const id = randomUUID();
    const now = new Date().toISOString();
    const task: AnalysisTask = {
      id,
      prompt: input.rawPrompt,
      inputMode: input.inputMode ?? "search",
      templateId: input.preferredTemplateId,
      limit: input.limit,
      retrievalMode: input.retrievalMode ?? "mock",
      autoFillChartData: input.autoFillChartData ?? false,
      confirmedCompetitors: input.confirmedCompetitors ?? [],
      uploadedMaterials: input.uploadedMaterials ?? [],
      parseResult: input.parseResult,
      status: "draft",
      retryable: true,
      autoResumeAttempts: 0,
      currentStep: "等待执行",
      progressPercent: 0,
      createdAt: now,
      updatedAt: now
    };
    this.tasks.set(id, task);
    this.persist();
    return task;
  }

  list() {
    return Array.from(this.tasks.values()).sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    );
  }

  get(taskId: string) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`任务不存在: ${taskId}`);
    }
    return task;
  }

  update(taskId: string, patch: Partial<AnalysisTask>) {
    const existing = this.get(taskId);
    const next = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString()
    };
    this.tasks.set(taskId, next);
    this.persist();
    return next;
  }

  private persist() {
    this.store.save(this.list());
  }
}

const normalizeLoadedTask = (task: AnalysisTask): AnalysisTask => {
  if (task.status !== "failed" || !task.errorMessage) {
    return task;
  }

  if (/LLM 返回内容为空|empty response|模型返回为空/i.test(task.errorMessage)) {
    return {
      ...task,
      retryable: true,
      failureCategory: "provider"
    };
  }

  return task;
};
