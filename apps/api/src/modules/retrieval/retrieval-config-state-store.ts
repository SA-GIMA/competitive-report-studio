import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { RetrievalRuntimeConfig } from "@studio/shared";

export class RetrievalConfigStateStore {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  load(): RetrievalRuntimeConfig | null {
    if (!existsSync(this.filePath)) {
      return null;
    }

    try {
      const raw = readFileSync(this.filePath, "utf8");
      return JSON.parse(raw) as RetrievalRuntimeConfig;
    } catch {
      return null;
    }
  }

  save(state: RetrievalRuntimeConfig) {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(state, null, 2), "utf8");
  }
}
