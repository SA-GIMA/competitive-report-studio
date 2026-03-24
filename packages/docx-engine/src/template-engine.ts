import { readFile, mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import {
  Document,
  HeadingLevel,
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
            new Paragraph({
              text: draft.title,
              heading: HeadingLevel.TITLE
            }),
            new Paragraph({
              spacing: { after: 260 },
              children: [new TextRun({ text: draft.executiveSummary, size: 24 })]
            }),
            ...draft.sections.flatMap((section) => this.buildSectionBlocks(section, chartBlocks)),
            new Paragraph({
              text: "附录：参考资料",
              heading: HeadingLevel.HEADING_1
            }),
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
      new Paragraph({
        text: section.title,
        heading: HeadingLevel.HEADING_1
      }),
      new Paragraph({
        spacing: { after: 180 },
        children: [new TextRun({ text: section.summary, bold: true })]
      }),
      ...renderMarkdownParagraphs(section.bodyMarkdown)
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
                children: [new Paragraph({ children: [new TextRun({ text: key, bold: true })] })]
              })
          )
        }),
        ...rows.map(
          (row) =>
            new TableRow({
              children: keys.map(
                (key) =>
                  new TableCell({
                    children: [new Paragraph(String(row[key] ?? ""))]
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
        new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun(`${entry.index}. ${entry.line}`)]
        })
    );
  }

  private async buildChartBlocks(chartAssets: GeneratedChartAsset[]) {
    const result = new Map<string, Paragraph[]>();

    for (const asset of chartAssets) {
      const caption = new Paragraph({
        spacing: { before: 200, after: 100 },
        children: [new TextRun({ text: `图表：${asset.spec.title}`, bold: true })]
      });

      const note = new Paragraph({
        spacing: { after: 140 },
        children: [
          new TextRun({
            text: `数据依据：${asset.spec.inferenceNotes?.join("；") ?? "公开资料整理"}`
          })
        ]
      });

      try {
        const imageBuffer = await readFile(asset.filePath);
        const imageType = detectImageType(asset.filePath);

        if (imageType === "svg") {
          result.set(asset.id, [
            caption,
            new Paragraph(`图表文件：${asset.filePath}`),
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
          new Paragraph(`图表文件读取失败：${basename(asset.filePath)}`),
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

const renderMarkdownParagraphs = (markdown: string) => {
  const lines = markdown.split("\n");
  const paragraphs: Paragraph[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (line.startsWith("### ")) {
      paragraphs.push(
        new Paragraph({
          text: stripMarkdownSyntax(line.replace(/^###\s+/, "")),
          heading: HeadingLevel.HEADING_3
        })
      );
      continue;
    }

    if (line.startsWith("## ")) {
      paragraphs.push(
        new Paragraph({
          text: stripMarkdownSyntax(line.replace(/^##\s+/, "")),
          heading: HeadingLevel.HEADING_2
        })
      );
      continue;
    }

    if (line.startsWith("# ")) {
      paragraphs.push(
        new Paragraph({
          text: stripMarkdownSyntax(line.replace(/^#\s+/, "")),
          heading: HeadingLevel.HEADING_1
        })
      );
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      paragraphs.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 120 },
          children: [new TextRun(stripMarkdownSyntax(line.replace(/^[-*]\s+/, "")))]
        })
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      paragraphs.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun(stripMarkdownSyntax(line))]
        })
      );
      continue;
    }

    if (line.startsWith(">")) {
      paragraphs.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun({ text: stripMarkdownSyntax(line.replace(/^>\s?/, "")), italics: true })]
        })
      );
      continue;
    }

    paragraphs.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun(stripMarkdownSyntax(line))]
      })
    );
  }

  return paragraphs;
};

const stripMarkdownSyntax = (value: string) =>
  value
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/^>\s?/gm, "")
    .trim();
