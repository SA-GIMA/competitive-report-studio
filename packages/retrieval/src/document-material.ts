import { promisify } from "node:util";
import { execFile as execFileCallback } from "node:child_process";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import type {
  UploadedMaterial,
  UploadedMaterialBlock,
  UploadedMaterialDigest
} from "@studio/shared";

const execFile = promisify(execFileCallback);
const BLOCK_MAX_CHARS = 1200;
const MAX_ARCHIVE_ENTRIES = 400;
const MAX_XML_ENTRY_BYTES = 5 * 1024 * 1024;
const MAX_ARCHIVE_UNCOMPRESSED_BYTES = 40 * 1024 * 1024;

export async function extractUploadedMaterial(
  material: UploadedMaterial
): Promise<UploadedMaterialDigest> {
  const extension = material.extension.toLowerCase();
  let blocks: UploadedMaterialBlock[] = [];

  if (extension === ".docx") {
    blocks = await extractDocxBlocks(material);
  } else if (extension === ".pptx") {
    blocks = await extractPptxBlocks(material);
  } else if ([".txt", ".md", ".markdown"].includes(extension)) {
    blocks = await extractPlainTextBlocks(material);
  } else {
    blocks = await extractWithMacOsTextTools(material);
  }

  if (blocks.length === 0) {
    blocks = await extractWithMacOsTextTools(material);
  }

  const normalizedBlocks = splitOversizedBlocks(material, blocks).filter((block) => block.text);
  return {
    materialId: material.id,
    competitorName: material.competitorName,
    fileName: material.fileName,
    summary: buildMaterialSummary(normalizedBlocks),
    blocks: normalizedBlocks,
    extractedAt: new Date().toISOString()
  };
}

async function extractPlainTextBlocks(material: UploadedMaterial) {
  const raw = await readFile(material.storagePath, "utf8");
  return buildBlocksFromSections(material, splitIntoSections(raw, "段落"));
}

async function extractDocxBlocks(material: UploadedMaterial) {
  const buffer = await readFile(material.storagePath);
  const zip = await JSZip.loadAsync(buffer);
  assertSafeOfficeArchive(zip);
  const documentXml = await zip.file("word/document.xml")?.async("string");
  if (!documentXml) {
    return [];
  }

  const tokens = documentXml.match(/<w:tbl[\s\S]*?<\/w:tbl>|<w:p[\s\S]*?<\/w:p>/g) ?? [];
  const sections: Array<{ title: string; text: string; blockType: UploadedMaterialBlock["blockType"] }> = [];
  let headingContext = "";

  for (const token of tokens) {
    if (token.startsWith("<w:tbl")) {
      const rows = token.match(/<w:tr[\s\S]*?<\/w:tr>/g) ?? [];
      const tableText = rows
        .map((row) => {
          const cells = row.match(/<w:tc[\s\S]*?<\/w:tc>/g) ?? [];
          return cells.map((cell) => extractXmlText(cell, /<w:t[^>]*>([\s\S]*?)<\/w:t>/g)).join(" | ");
        })
        .filter(Boolean)
        .join("\n");
      if (tableText) {
        sections.push({
          title: headingContext ? `${headingContext} / 表格` : "表格",
          text: tableText,
          blockType: "table"
        });
      }
      continue;
    }

    const text = extractXmlText(token, /<w:t[^>]*>([\s\S]*?)<\/w:t>/g);
    if (!text) {
      continue;
    }
    const style = token.match(/<w:pStyle[^>]*w:val="([^"]+)"/)?.[1] ?? "";
    const isHeading = /^Heading|^heading|标题/.test(style);
    if (isHeading) {
      headingContext = text;
    }
    sections.push({
      title: isHeading ? text : headingContext || "正文",
      text,
      blockType: isHeading ? "heading" : "paragraph"
    });
  }

  return buildBlocksFromSections(material, sections);
}

async function extractPptxBlocks(material: UploadedMaterial) {
  const buffer = await readFile(material.storagePath);
  const zip = await JSZip.loadAsync(buffer);
  assertSafeOfficeArchive(zip);
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((left, right) => extractNumericSuffix(left) - extractNumericSuffix(right));

  const sections: Array<{ title: string; text: string; blockType: UploadedMaterialBlock["blockType"] }> = [];
  for (const slideFile of slideFiles) {
    const xml = await zip.file(slideFile)?.async("string");
    if (!xml) {
      continue;
    }
    const texts = Array.from(xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g))
      .map((item) => decodeXmlEntities(item[1] ?? ""))
      .map((item) => item.trim())
      .filter(Boolean);
    if (texts.length === 0) {
      continue;
    }
    sections.push({
      title: texts[0] || `幻灯片 ${sections.length + 1}`,
      text: texts.join("\n"),
      blockType: "slide"
    });
  }

  return buildBlocksFromSections(material, sections);
}

function assertSafeOfficeArchive(zip: JSZip) {
  const entries = Object.values(zip.files);
  if (entries.length > MAX_ARCHIVE_ENTRIES) {
    throw new Error("上传文档包含过多内部文件，已拒绝解析。");
  }

  let totalUncompressedSize = 0;
  for (const entry of entries) {
    const metadata = entry as typeof entry & {
      _data?: {
        uncompressedSize?: number;
      };
    };
    const size = metadata._data?.uncompressedSize ?? 0;
    totalUncompressedSize += size;
    if (entry.name.endsWith(".xml") && size > MAX_XML_ENTRY_BYTES) {
      throw new Error("上传文档内部 XML 过大，已拒绝解析。");
    }
  }

  if (totalUncompressedSize > MAX_ARCHIVE_UNCOMPRESSED_BYTES) {
    throw new Error("上传文档解压后体积过大，已拒绝解析。");
  }
}

async function extractWithMacOsTextTools(material: UploadedMaterial) {
  const content = await extractTextWithMdls(material.storagePath) || await extractTextWithTextutil(material.storagePath);
  return buildBlocksFromSections(material, splitIntoSections(content, "页面"), "page");
}

async function extractTextWithMdls(filePath: string) {
  try {
    const { stdout } = await execFile("/usr/bin/mdls", [
      "-name",
      "kMDItemTextContent",
      "-raw",
      filePath
    ]);
    const text = stdout.trim();
    return text === "(null)" ? "" : text;
  } catch {
    return "";
  }
}

async function extractTextWithTextutil(filePath: string) {
  try {
    const { stdout } = await execFile("/usr/bin/textutil", [
      "-convert",
      "txt",
      "-stdout",
      filePath
    ]);
    return stdout.trim();
  } catch {
    return "";
  }
}

function buildBlocksFromSections(
  material: UploadedMaterial,
  sections: Array<{ title: string; text: string; blockType?: UploadedMaterialBlock["blockType"] }>,
  fallbackType: UploadedMaterialBlock["blockType"] = "paragraph"
) {
  return sections
    .map((section, index) => ({
      id: `${material.id}-block-${index + 1}`,
      materialId: material.id,
      competitorName: material.competitorName,
      fileName: material.fileName,
      title: section.title || `${material.fileName} - 内容块 ${index + 1}`,
      blockType: section.blockType ?? fallbackType,
      order: index + 1,
      text: normalizeWhitespace(section.text)
    }))
    .filter((block) => block.text);
}

function splitIntoSections(raw: string, fallbackTitle: string) {
  const normalized = normalizeWhitespace(raw).replace(/\f/g, "\n\n");
  if (!normalized) {
    return [];
  }

  const lines = normalized.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  return lines.map((text, index) => ({
    title: `${fallbackTitle} ${index + 1}`,
    text
  }));
}

function splitOversizedBlocks(material: UploadedMaterial, blocks: UploadedMaterialBlock[]) {
  const nextBlocks: UploadedMaterialBlock[] = [];

  for (const block of blocks) {
    if (block.text.length <= BLOCK_MAX_CHARS) {
      nextBlocks.push(block);
      continue;
    }

    const parts = chunkText(block.text, BLOCK_MAX_CHARS);
    parts.forEach((part, index) => {
      nextBlocks.push({
        ...block,
        id: `${block.id}-part-${index + 1}`,
        order: block.order * 100 + index + 1,
        title: `${block.title}（分段 ${index + 1}）`,
        text: part
      });
    });
  }

  return nextBlocks
    .sort((left, right) => left.order - right.order)
    .map((block, index) => ({
      ...block,
      id: `${material.id}-block-${index + 1}`,
      order: index + 1
    }));
}

function buildMaterialSummary(blocks: UploadedMaterialBlock[]) {
  return blocks
    .slice(0, 4)
    .map((block) => `${block.title}: ${truncate(block.text, 120)}`)
    .join("；");
}

function extractXmlText(input: string, matcher: RegExp) {
  return Array.from(input.matchAll(matcher))
    .map((item) => decodeXmlEntities(item[1] ?? ""))
    .map((item) => item.trim())
    .filter(Boolean)
    .join(" ");
}

function decodeXmlEntities(input: string) {
  return input
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function normalizeWhitespace(input: string) {
  return input
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function chunkText(text: string, maxChars: number) {
  const paragraphs = text.split(/\n+/).map((item) => item.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n${paragraph}` : paragraph;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) {
      chunks.push(current);
    }
    current = paragraph;
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.length > 0 ? chunks : [truncate(text, maxChars)];
}

function truncate(text: string, maxChars: number) {
  return text.length <= maxChars ? text : `${text.slice(0, Math.max(0, maxChars - 1))}…`;
}

function extractNumericSuffix(value: string) {
  const matched = value.match(/(\d+)\.xml$/)?.[1];
  return Number(matched ?? "0");
}
