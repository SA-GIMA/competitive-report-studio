import { readFile, mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import MarkdownIt from "markdown-it";
import {
  AlignmentType,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType
} from "docx";
import type {
  GeneratedChartAsset,
  ReportDraft,
  ReportArtifact,
  ReportSectionDraft,
  SourceCitation
} from "@studio/shared";

type TextRunStyle = Exclude<ConstructorParameters<typeof TextRun>[0], string>;
type ParagraphSpacingOverrides = {
  line?: number;
  before?: number;
  after?: number;
  firstLine?: number;
};
const BODY_FONT = "宋体";
const BODY_TEXT_SIZE = 32;
const TITLE_TEXT_SIZE = 44;
const LINE_SPACING = 360;
const FIRST_LINE_INDENT = 640;
const markdown = new MarkdownIt({
  html: false,
  linkify: false,
  typographer: false
});

export interface RenderDocxInput {
  reportId: string;
  title: string;
  templatePath: string;
  outputDir: string;
  reportDraft: ReportDraft;
  chartAssets: GeneratedChartAsset[];
}

export class WordTemplateEngine {
  async render(input: RenderDocxInput): Promise<ReportArtifact> {
    const editableDocxPath = join(input.outputDir, `${input.reportId}.editable.docx`);
    const finalDocxPath = join(input.outputDir, `${input.reportId}.final.docx`);

    await mkdir(dirname(editableDocxPath), { recursive: true });

    const document = await this.buildDocument(input.reportDraft, input.chartAssets);
    const buffer = await Packer.toBuffer(document);

    await writeFile(editableDocxPath, buffer);
    await writeFile(finalDocxPath, buffer);

    return {
      reportId: input.reportId,
      editableDocxPath,
      finalDocxPath,
      chartAssets: input.chartAssets,
      generatedAt: new Date().toISOString()
    };
  }

  validatePlaceholders(placeholders: string[]) {
    return placeholders.every((key) =>
      [
        "{{report.title}}",
        "{{report.executive_summary}}",
        "{{section.industry_background}}",
        "{{section.competitor_list}}",
        "{{section.feature_comparison}}",
        "{{section.business_model}}",
        "{{section.opportunities}}",
        "{{charts.feature_matrix}}",
        "{{appendix.sources}}"
      ].includes(key)
    );
  }

  buildSourceAppendix(sources: SourceCitation[]) {
    return sources.map((source, index) => ({
      index: index + 1,
      line: `${source.title} | ${source.url} | 抓取时间：${source.crawledAt}`
    }));
  }

  private async buildDocument(draft: ReportDraft, chartAssets: GeneratedChartAsset[]) {
    const chartBlocks = await this.buildChartBlocks(chartAssets);

    return new Document({
      creator: "Competitive Report Studio",
      title: draft.title,
      description: "自动生成的中文竞品分析报告",
      sections: [
        {
          children: [
            buildTitleParagraph(draft.title),
            buildBodyParagraph(draft.executiveSummary, { after: 260 }),
            ...draft.sections.flatMap((section) => this.buildSectionBlocks(section, chartBlocks)),
            buildTitleParagraph("附录：参考资料"),
            ...this.buildAppendixParagraphs(draft.appendixSources)
          ]
        }
      ]
    });
  }

  private buildSectionBlocks(
    section: ReportSectionDraft,
    chartBlocks: Map<string, Paragraph[]>
  ): Array<Paragraph | Table> {
    const blocks: Array<Paragraph | Table> = [
      buildTitleParagraph(section.title),
      buildBodyParagraph(section.summary, { after: 180 }, { bold: true }),
      ...renderMarkdownBlocks(section.bodyMarkdown)
    ];

    if (section.tables?.length) {
      blocks.push(this.buildTable(section.tables));
    }

    for (const chartId of section.chartIds ?? []) {
      const chartParagraphs = chartBlocks.get(chartId);
      if (chartParagraphs) {
        blocks.push(...chartParagraphs);
      }
    }

    return blocks;
  }

  private buildTable(rows: Array<Record<string, string | number>>) {
    const keys = Object.keys(rows[0] ?? {});
    return new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE
      },
      rows: [
        new TableRow({
          children: keys.map(
            (key) =>
              new TableCell({
                children: [buildTableParagraph(key, true)]
              })
          )
        }),
        ...rows.map(
          (row) =>
            new TableRow({
              children: keys.map(
                (key) =>
                  new TableCell({
                    children: [
                      buildTableParagraph(String(row[key] ?? ""))
                    ]
                  })
              )
            })
        )
      ]
    });
  }

  private buildAppendixParagraphs(sources: SourceCitation[]) {
    return this.buildSourceAppendix(sources).map(
      (entry) =>
        buildBodyParagraph(`${entry.index}. ${entry.line}`, { after: 120 })
    );
  }

  private async buildChartBlocks(chartAssets: GeneratedChartAsset[]) {
    const result = new Map<string, Paragraph[]>();

    for (const asset of chartAssets) {
      const caption = buildBodyParagraph(
        `图表：${asset.spec.title}`,
        { before: 200, after: 100 },
        { bold: true }
      );

      const note = buildBodyParagraph(
        `数据依据：${asset.spec.inferenceNotes?.join("；") ?? "公开资料整理"}`,
        { after: 140 }
      );

      try {
        const imageBuffer = await readFile(asset.filePath);
        const imageType = detectImageType(asset.filePath);

        if (imageType === "svg") {
          result.set(asset.id, [
            caption,
            buildBodyParagraph(`图表文件：${asset.filePath}`),
            note
          ]);
          continue;
        }

        result.set(asset.id, [
          caption,
          new Paragraph({
            children: [
              new ImageRun({
                data: imageBuffer,
                type: imageType,
                transformation: {
                  width: 600,
                  height: 360
                }
              })
            ]
          }),
          note
        ]);
      } catch {
        result.set(asset.id, [
          caption,
          buildBodyParagraph(`图表文件读取失败：${basename(asset.filePath)}`),
          note
        ]);
      }
    }

    return result;
  }
}

const detectImageType = (filePath: string) => {
  if (filePath.endsWith(".png")) {
    return "png" as const;
  }
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) {
    return "jpg" as const;
  }
  return "svg" as const;
};

const renderMarkdownBlocks = (markdown: string): Array<Paragraph | Table> => {
  const normalizedMarkdown = markdown
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, "  ");
  const lines = normalizedMarkdown.split("\n");
  const blocks: Array<Paragraph | Table> = [];
  let insideCodeFence = false;
  let codeFenceLines: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();

    if (line.startsWith("```")) {
      if (insideCodeFence) {
        blocks.push(
          buildBodyParagraph(codeFenceLines.join("\n"), { after: 120 }, { font: "SFMono-Regular" })
        );
        codeFenceLines = [];
        insideCodeFence = false;
      } else {
        insideCodeFence = true;
      }
      continue;
    }

    if (insideCodeFence) {
      codeFenceLines.push(rawLine);
      continue;
    }

    if (!line) {
      continue;
    }

    if (/^---+$/.test(line) || /^___+$/.test(line) || /^\*\*\*+$/.test(line)) {
      continue;
    }

    if (looksLikeTableHeader(line) && looksLikeTableDivider(lines[index + 1] ?? "")) {
      const tableLines = [line];
      index += 1;
      while (index + 1 < lines.length && looksLikeTableRow(lines[index + 1] ?? "")) {
        tableLines.push(lines[index + 1].trim());
        index += 1;
      }
      const table = buildMarkdownTable(tableLines);
      if (table) {
        blocks.push(table);
        continue;
      }
    }

    if (line.startsWith("### ")) {
      blocks.push(
        buildTitleParagraph(stripMarkdownSyntax(line.replace(/^###\s+/, "")))
      );
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push(
        buildTitleParagraph(stripMarkdownSyntax(line.replace(/^##\s+/, "")))
      );
      continue;
    }

    if (line.startsWith("# ")) {
      blocks.push(
        buildTitleParagraph(stripMarkdownSyntax(line.replace(/^#\s+/, "")))
      );
      continue;
    }

    if (/^\s*[-*]\s+\[[xX ]\]\s+/.test(rawLine)) {
      const checked = /\[[xX]\]/.test(rawLine);
      blocks.push(
        buildBodyParagraph(
          `${checked ? "已完成" : "待处理"}：${rawLine.replace(/^\s*[-*]\s+\[[xX ]\]\s+/, "")}`,
          { after: 120 }
        )
      );
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      blocks.push(
        buildBodyParagraph(line.replace(/^[-*]\s+/, ""), { after: 120 })
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      blocks.push(
        buildBodyParagraph(line, { after: 120 })
      );
      continue;
    }

    if (line.startsWith(">")) {
      blocks.push(
        buildBodyParagraph(line.replace(/^>\s?/, ""), { after: 120 }, { italics: true })
      );
      continue;
    }

    blocks.push(
      buildBodyParagraph(line, { after: 120 })
    );
  }

  if (codeFenceLines.length > 0) {
    blocks.push(
      buildBodyParagraph(codeFenceLines.join("\n"), { after: 120 }, { font: "SFMono-Regular" })
    );
  }

  return blocks;
};

const looksLikeTableHeader = (line: string) => line.includes("|");

const looksLikeTableDivider = (line: string) =>
  /^\s*\|?[\s:-|]+\|?\s*$/.test(line.trim());

const looksLikeTableRow = (line: string) => line.trim().includes("|");

const buildMarkdownTable = (tableLines: string[]) => {
  if (tableLines.length < 2) {
    return null;
  }

  const rows = tableLines
    .filter((_, index) => index !== 1)
    .map(parseMarkdownTableLine)
    .filter((cells) => cells.length > 0);

  if (rows.length === 0) {
    return null;
  }

  return new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE
    },
    rows: rows.map((cells, rowIndex) => {
      const isHeader = rowIndex === 0;
      return new TableRow({
        children: cells.map(
          (cell) =>
            new TableCell({
              children: [
                new Paragraph({
                  ...createBodyParagraphOptions({ firstLine: 0 }),
                  children: [createTextRun(stripMarkdownSyntax(cell), { bold: isHeader })]
                })
              ]
            })
        )
      });
    })
  });
};

const parseMarkdownTableLine = (line: string) =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());

const buildInlineTextRuns = (
  value: string,
  baseStyle: TextRunStyle = {}
) => {
  const runs: TextRun[] = [];
  const normalized = value
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1")
    .replace(/\[\^([^\]]+)\]/g, "$1")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\\([\\`*_{}\[\]()#+\-.!|>~])/g, "$1");
  const inlineTokens = markdown.parseInline(normalized, {});
  let bold = false;
  let italics = false;
  let strike = false;
  let link = false;

  for (const token of inlineTokens) {
    for (const child of token.children ?? []) {
      if (child.type === "strong_open") {
        bold = true;
      } else if (child.type === "strong_close") {
        bold = false;
      } else if (child.type === "em_open") {
        italics = true;
      } else if (child.type === "em_close") {
        italics = false;
      } else if (child.type === "s_open") {
        strike = true;
      } else if (child.type === "s_close") {
        strike = false;
      } else if (child.type === "link_open") {
        link = true;
      } else if (child.type === "link_close") {
        link = false;
      } else if (child.type === "text") {
        pushTextRun(runs, child.content, {
          ...defaultTextRunStyle(),
          ...baseStyle,
          bold,
          italics,
          strike,
          color: link ? "2563EB" : baseStyle.color
        });
      } else if (child.type === "code_inline") {
        pushTextRun(runs, child.content, {
          ...defaultTextRunStyle(),
          ...baseStyle,
          font: "SFMono-Regular",
          bold,
          italics
        });
      } else if (child.type === "softbreak" || child.type === "hardbreak") {
        pushTextRun(runs, "\n", {
          ...defaultTextRunStyle(),
          ...baseStyle,
          bold,
          italics,
          strike
        });
      } else if (child.type === "image") {
        pushTextRun(runs, child.content, {
          ...defaultTextRunStyle(),
          ...baseStyle,
          bold,
          italics,
          strike
        });
      }
    }
  }

  if (runs.length === 0) {
    pushTextRun(runs, stripMarkdownSyntax(normalized), {
      ...defaultTextRunStyle(),
      ...baseStyle
    });
  }

  return runs;
};

const pushTextRun = (
  runs: TextRun[],
  value: string,
  style: TextRunStyle = {}
) => {
  const cleaned = stripMarkdownSyntax(value);
  if (!cleaned) {
    return;
  }

  const parts = cleaned.split("\n");
  parts.forEach((part, index) => {
    if (index > 0) {
      runs.push(new TextRun({ text: "", break: 1, ...style }));
    }
    if (part) {
      runs.push(new TextRun({ text: part, ...style }));
    }
  });
};

const buildTitleParagraph = (text: string) =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: {
      line: LINE_SPACING,
      before: 200,
      after: 200
    },
    children: [
      createTextRun(text, {
        bold: true,
        size: TITLE_TEXT_SIZE
      })
    ]
  });

const buildBodyParagraph = (
  text: string,
  spacingOverrides: ParagraphSpacingOverrides = {},
  textStyle: TextRunStyle = {}
) =>
  new Paragraph({
    ...createBodyParagraphOptions(spacingOverrides),
    children: buildInlineTextRuns(text, textStyle)
  });

const buildTableParagraph = (text: string, bold = false) =>
  new Paragraph({
    ...createBodyParagraphOptions({ firstLine: 0 }),
    children: [createTextRun(text, { bold })]
  });

const createBodyParagraphOptions = (
  spacingOverrides: ParagraphSpacingOverrides = {}
) => ({
  spacing: {
    line: LINE_SPACING,
    after: 120,
    before: 0,
    ...spacingOverrides
  },
  indent: {
    firstLine:
      spacingOverrides.firstLine === undefined ? FIRST_LINE_INDENT : spacingOverrides.firstLine
  }
});

const createTextRun = (text: string, style: TextRunStyle = {}) =>
  new TextRun({
    ...defaultTextRunStyle(),
    text,
    ...style
  });

const defaultTextRunStyle = (): TextRunStyle => ({
  font: BODY_FONT,
  size: BODY_TEXT_SIZE
});

const stripMarkdownSyntax = (value: string) =>
  value
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+\[[xX ]\]\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/^>\s?/gm, "")
    .replace(/\\([\\`*_{}\[\]()#+\-.!|>~])/g, "$1")
    .trim();
