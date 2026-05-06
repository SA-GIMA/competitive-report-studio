import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { getAppConfig } from "@studio/config";
import type { UploadedMaterial, UploadedMaterialReference } from "@studio/shared";
import { MaterialStateStore } from "./material-state-store.ts";

export interface MaterialUploadPayload {
  competitorName: string;
  fileName: string;
  mimeType: string;
  fileContentBase64: string;
}

const MAX_MATERIAL_BYTES = 20 * 1024 * 1024;
const ALLOWED_MATERIAL_EXTENSIONS = new Set([".docx", ".pptx", ".txt", ".md", ".markdown", ".pdf"]);
const ALLOWED_MATERIAL_MIME_PREFIXES = ["text/"];
const ALLOWED_MATERIAL_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/octet-stream",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation"
]);

export class MaterialService {
  private readonly storageDir: string;
  private readonly materials = new Map<string, UploadedMaterial>();
  private readonly store = new MaterialStateStore(
    join(process.cwd(), getAppConfig().storage.appStateDir, "materials.json")
  );

  constructor(storageDir: string) {
    this.storageDir = storageDir;
    for (const material of this.store.load()) {
      if (material?.id) {
        this.materials.set(material.id, material);
      }
    }
  }

  async upload(input: MaterialUploadPayload): Promise<UploadedMaterialReference> {
    const fileName = input.fileName.trim();
    const competitorName = input.competitorName.trim();

    if (!fileName) {
      throw new Error("上传材料时缺少文件名。");
    }

    if (!competitorName) {
      throw new Error("请先填写竞品名称，再上传材料。");
    }

    const buffer = Buffer.from(input.fileContentBase64, "base64");
    if (!buffer.length) {
      throw new Error("上传材料为空，请重新选择文件。");
    }

    const id = randomUUID();
    const extension = extname(fileName).toLowerCase();
    if (!ALLOWED_MATERIAL_EXTENSIONS.has(extension)) {
      throw new Error("上传材料仅支持 docx、pptx、txt、md 和 pdf 文件。");
    }
    if (buffer.length > MAX_MATERIAL_BYTES) {
      throw new Error("上传材料不能超过 20MB。");
    }
    if (!isAllowedMaterialMime(input.mimeType)) {
      throw new Error("上传材料类型不在允许范围内。");
    }
    const storedName = `${id}${extension || ""}`;
    const storagePath = join(this.storageDir, storedName);
    const uploadedAt = new Date().toISOString();

    await mkdir(this.storageDir, { recursive: true });
    await writeFile(storagePath, buffer);

    const material: UploadedMaterial = {
      id,
      competitorName,
      fileName,
      mimeType: input.mimeType || "application/octet-stream",
      size: buffer.length,
      uploadedAt,
      storagePath,
      extension
    };
    this.materials.set(id, material);
    this.persist();
    return toReference(material);
  }

  get(id: string) {
    const material = this.materials.get(id);
    if (!material) {
      throw new Error(`上传材料不存在: ${id}`);
    }
    return material;
  }

  getMany(ids: string[]) {
    return ids.map((id) => this.get(id));
  }

  private persist() {
    this.store.save(Array.from(this.materials.values()));
  }
}

const toReference = (material: UploadedMaterial): UploadedMaterialReference => ({
  id: material.id,
  competitorName: material.competitorName,
  fileName: material.fileName,
  mimeType: material.mimeType,
  size: material.size,
  uploadedAt: material.uploadedAt
});

const isAllowedMaterialMime = (mimeType: string) => {
  const normalized = (mimeType || "application/octet-stream").toLowerCase();
  return (
    ALLOWED_MATERIAL_MIME_TYPES.has(normalized) ||
    ALLOWED_MATERIAL_MIME_PREFIXES.some((prefix) => normalized.startsWith(prefix))
  );
};
