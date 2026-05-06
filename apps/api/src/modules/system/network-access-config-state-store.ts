import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { NetworkAccessConfig } from "@studio/shared";

export class NetworkAccessConfigStateStore {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  load(): NetworkAccessConfig | null {
    if (!existsSync(this.filePath)) {
      return null;
    }

    try {
      return JSON.parse(readFileSync(this.filePath, "utf8")) as NetworkAccessConfig;
    } catch {
      return null;
    }
  }

  save(state: NetworkAccessConfig) {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(state, null, 2), "utf8");
  }
}
