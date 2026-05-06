import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { UploadedMaterial } from "@studio/shared";

export class MaterialStateStore {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  load(): UploadedMaterial[] {
    if (!existsSync(this.filePath)) {
      return [];
    }

    try {
      const raw = readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as UploadedMaterial[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  save(materials: UploadedMaterial[]) {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(materials, null, 2), "utf8");
  }
}
