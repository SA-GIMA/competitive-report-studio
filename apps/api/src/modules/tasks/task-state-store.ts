import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { AnalysisTask } from "@studio/shared";

export class TaskStateStore {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  load(): AnalysisTask[] {
    if (!existsSync(this.filePath)) {
      return [];
    }

    try {
      const raw = readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as AnalysisTask[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  save(tasks: AnalysisTask[]) {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(tasks, null, 2), "utf8");
  }
}
