import { randomUUID } from "node:crypto";
import type { AnalysisTask, NaturalLanguageRequirement, RequirementParseResult } from "@studio/shared";

export class TaskService {
  private readonly tasks = new Map<string, AnalysisTask>();

  create(input: NaturalLanguageRequirement & { parseResult?: RequirementParseResult }) {
    const id = randomUUID();
    const now = new Date().toISOString();
    const task: AnalysisTask = {
      id,
      prompt: input.rawPrompt,
      templateId: input.preferredTemplateId,
      limit: input.limit,
      retrievalMode: input.retrievalMode ?? "mock",
      parseResult: input.parseResult,
      status: "draft",
      currentStep: "等待执行",
      progressPercent: 0,
      createdAt: now,
      updatedAt: now
    };
    this.tasks.set(id, task);
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
    return next;
  }
}
