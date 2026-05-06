import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { PipelineSnapshot, ReportArtifact } from "@studio/shared";

interface PersistedReportState {
  reports: ReportArtifact[];
  snapshots: PipelineSnapshot[];
}

export class ReportStateStore {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  load(): PersistedReportState {
    if (!existsSync(this.filePath)) {
      return { reports: [], snapshots: [] };
    }

    try {
      const raw = readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as PersistedReportState;
      return {
        reports: Array.isArray(parsed.reports) ? parsed.reports : [],
        snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots : []
      };
    } catch {
      return { reports: [], snapshots: [] };
    }
  }

  save(state: PersistedReportState) {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(state, null, 2), "utf8");
  }
}
