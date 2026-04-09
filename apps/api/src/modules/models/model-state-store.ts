import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { ModelConnectionConfig, ModelRoutingConfig } from "@studio/shared";

interface PersistedModelState {
  models: ModelConnectionConfig[];
  routing?: ModelRoutingConfig;
}

export class ModelStateStore {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  load(): PersistedModelState | null {
    if (!existsSync(this.filePath)) {
      return null;
    }

    try {
      const raw = readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as PersistedModelState;
      return {
        models: Array.isArray(parsed.models) ? parsed.models : [],
        routing: parsed.routing
      };
    } catch {
      return null;
    }
  }

  save(state: PersistedModelState) {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(state, null, 2), "utf8");
  }
}
