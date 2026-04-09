import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import type { UploadedMaterial, UploadedMaterialReference } from "@studio/shared";

export interface MaterialUploadPayload {
  competitorName: string;
  fileName: string;
  mimeType: string;
  fileContentBase64: string;
}

export class MaterialService {
  private readonly storageDir: string;
  private readonly materials = new Map<string, UploadedMaterial>();

  constructor(storageDir: string) {
    this.storageDir = storageDir;
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
}

const toReference = (material: UploadedMaterial): UploadedMaterialReference => ({
  id: material.id,
  competitorName: material.competitorName,
  fileName: material.fileName,
  mimeType: material.mimeType,
  size: material.size,
  uploadedAt: material.uploadedAt
});
