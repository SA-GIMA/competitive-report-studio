import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";
import type { ChartSpec, GeneratedChartAsset } from "@studio/shared";

export interface ChartRenderer {
  render(spec: ChartSpec, outputDir: string): Promise<GeneratedChartAsset>;
}

export class PngChartRenderer implements ChartRenderer {
  async render(spec: ChartSpec, outputDir: string): Promise<GeneratedChartAsset> {
    const filePath = join(outputDir, `${spec.id}.png`);
    await mkdir(dirname(filePath), { recursive: true });
    await sharp(Buffer.from(buildSvg(spec), "utf-8")).png().toFile(filePath);

    return {
      id: spec.id,
      filePath,
      width: 1200,
      height: 720,
      format: "png",
      spec
    };
  }
}

const buildSvg = (spec: ChartSpec) => {
  const series = spec.series[0]?.data ?? [];
  const numericSeries = series.map((value) => Number(value) || 0);
  const maxValue = Math.max(...numericSeries, 1);
  const rows = spec.labels
    .map((label, index) => {
      const value = numericSeries[index] ?? 0;
      const width = Math.max((value / maxValue) * 520, 8);
      const top = 184 + index * 84;
      return `
        <text x="88" y="${top}" font-size="24" font-weight="600" fill="#0F172A">${escapeXml(label)}</text>
        <rect x="88" y="${top + 18}" width="560" height="20" rx="10" fill="#DBEAFE" />
        <rect x="88" y="${top + 18}" width="${width}" height="20" rx="10" fill="url(#barGradient)" />
        <text x="672" y="${top + 35}" font-size="22" font-weight="700" fill="#1D4ED8">${escapeXml(
          String(value)
        )}</text>
      `;
    })
    .join("");
  const footerNotes = (spec.inferenceNotes ?? ["基于公开资料整理"]).slice(0, 3)
    .map(
      (note, index) =>
        `<text x="88" y="${640 + index * 26}" font-size="18" fill="#64748B">${escapeXml(
          `${index + 1}. ${note}`
        )}</text>`
    )
    .join("");
  const meta = `
    <text x="760" y="108" font-size="18" fill="#475569">图表类型：${escapeXml(spec.type)}</text>
    <text x="760" y="136" font-size="18" fill="#475569">系列：${escapeXml(spec.series[0]?.name ?? "统计值")}</text>
    <text x="760" y="164" font-size="18" fill="#475569">来源数：${escapeXml(String(spec.sourceRefs.length))}</text>
  `;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
  <defs>
    <linearGradient id="barGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#2563EB" />
      <stop offset="100%" stop-color="#38BDF8" />
    </linearGradient>
  </defs>
  <rect width="1200" height="720" fill="#F8FBFF" />
  <rect x="42" y="42" width="1116" height="636" rx="28" fill="#FFFFFF" stroke="#DBEAFE" stroke-width="2" />
  <text x="72" y="84" font-size="34" font-weight="700" fill="#0F172A">${escapeXml(spec.title)}</text>
  <text x="72" y="118" font-size="18" fill="#475569">统一图表主题输出，可直接插入 Word 报告。</text>
  ${meta}
  ${rows}
  <text x="88" y="610" font-size="20" font-weight="700" fill="#0F172A">推断依据</text>
  ${footerNotes}
</svg>`;
};

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
