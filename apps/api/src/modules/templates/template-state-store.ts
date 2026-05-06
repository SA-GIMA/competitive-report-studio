import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { WordTemplateDefinition } from "@studio/shared";

export class TemplateStateStore {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  load(): WordTemplateDefinition[] {
    if (!existsSync(this.filePath)) {
      return [];
    }

    try {
      const raw = readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as WordTemplateDefinition[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  save(templates: WordTemplateDefinition[]) {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(templates, null, 2), "utf8");
  }
}
