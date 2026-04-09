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
  const content = buildChartContent(spec);
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
    <text x="760" y="136" font-size="18" fill="#475569">系列数：${escapeXml(String(spec.series.length))}</text>
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
  ${content}
  <text x="88" y="610" font-size="20" font-weight="700" fill="#0F172A">推断依据</text>
  ${footerNotes}
</svg>`;
};

const buildChartContent = (spec: ChartSpec) => {
  switch (spec.type) {
    case "pie":
      return buildPieSvg(spec);
    case "line":
      return buildLineSvg(spec);
    case "comparison_table":
      return buildComparisonTableSvg(spec);
    case "quadrant":
      return buildQuadrantSvg(spec);
    case "bar":
    default:
      return buildBarSvg(spec);
  }
};

const buildBarSvg = (spec: ChartSpec) => {
  const series = spec.series[0]?.data ?? [];
  const numericSeries = series.map((value) => Number(value) || 0);
  const maxValue = Math.max(...numericSeries, 1);
  return spec.labels
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
};

const buildPieSvg = (spec: ChartSpec) => {
  const values = spec.series[0]?.data.map((value) => Number(value) || 0) ?? [];
  const total = values.reduce((sum, value) => sum + value, 0) || 1;
  const centerX = 300;
  const centerY = 340;
  const radius = 150;
  let startAngle = -Math.PI / 2;
  const colors = ["#2563EB", "#16A34A", "#F59E0B", "#DC2626", "#7C3AED", "#0891B2"];

  const slices = values
    .map((value, index) => {
      const portion = value / total;
      const endAngle = startAngle + portion * Math.PI * 2;
      const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
      const x1 = centerX + radius * Math.cos(startAngle);
      const y1 = centerY + radius * Math.sin(startAngle);
      const x2 = centerX + radius * Math.cos(endAngle);
      const y2 = centerY + radius * Math.sin(endAngle);
      const path = `
        M ${centerX} ${centerY}
        L ${x1} ${y1}
        A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
        Z
      `;
      const result = `<path d="${path}" fill="${colors[index % colors.length]}" stroke="#FFFFFF" stroke-width="2" />`;
      startAngle = endAngle;
      return result;
    })
    .join("");

  const legends = spec.labels
    .map((label, index) => {
      const y = 220 + index * 42;
      const value = values[index] ?? 0;
      const ratio = ((value / total) * 100).toFixed(1);
      return `
        <rect x="560" y="${y - 16}" width="18" height="18" rx="4" fill="${colors[index % colors.length]}" />
        <text x="590" y="${y}" font-size="22" fill="#0F172A">${escapeXml(label)}</text>
        <text x="980" y="${y}" font-size="20" text-anchor="end" fill="#475569">${escapeXml(`${ratio}%`)}</text>
      `;
    })
    .join("");

  return `${slices}${legends}`;
};

const buildLineSvg = (spec: ChartSpec) => {
  const colors = ["#2563EB", "#16A34A", "#F59E0B", "#DC2626", "#7C3AED"];
  const values = spec.series.flatMap((serie) => serie.data.map((value) => Number(value) || 0));
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const chartLeft = 120;
  const chartTop = 180;
  const chartWidth = 560;
  const chartHeight = 300;
  const stepX = spec.labels.length > 1 ? chartWidth / (spec.labels.length - 1) : chartWidth;

  const axes = `
    <line x1="${chartLeft}" y1="${chartTop}" x2="${chartLeft}" y2="${chartTop + chartHeight}" stroke="#CBD5E1" stroke-width="2" />
    <line x1="${chartLeft}" y1="${chartTop + chartHeight}" x2="${chartLeft + chartWidth}" y2="${chartTop + chartHeight}" stroke="#CBD5E1" stroke-width="2" />
  `;

  const labels = spec.labels
    .map((label, index) => {
      const x = chartLeft + index * stepX;
      return `<text x="${x}" y="${chartTop + chartHeight + 32}" text-anchor="middle" font-size="18" fill="#475569">${escapeXml(label)}</text>`;
    })
    .join("");

  const lines = spec.series
    .map((serie, seriesIndex) => {
      const points = serie.data
        .map((value, index) => {
          const numeric = Number(value) || 0;
          const x = chartLeft + index * stepX;
          const y =
            chartTop + chartHeight - ((numeric - minValue) / Math.max(maxValue - minValue, 1)) * chartHeight;
          return { x, y, numeric };
        });
      const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
      const circles = points
        .map(
          (point) =>
            `<circle cx="${point.x}" cy="${point.y}" r="5" fill="${colors[seriesIndex % colors.length]}" />`
        )
        .join("");
      const legendY = 220 + seriesIndex * 34;
      return `
        <path d="${path}" fill="none" stroke="${colors[seriesIndex % colors.length]}" stroke-width="3" />
        ${circles}
        <rect x="760" y="${legendY - 14}" width="18" height="4" rx="2" fill="${colors[seriesIndex % colors.length]}" />
        <text x="790" y="${legendY}" font-size="20" fill="#0F172A">${escapeXml(serie.name)}</text>
      `;
    })
    .join("");

  return `${axes}${labels}${lines}`;
};

const buildComparisonTableSvg = (spec: ChartSpec) => {
  const headers = spec.labels;
  const rows = spec.series.map((serie) => serie.data.map((cell) => String(cell ?? "")));
  const colWidth = 280;
  const startX = 80;
  const startY = 180;
  const rowHeight = 54;

  const headerCells = headers
    .map((header, index) => {
      const x = startX + index * colWidth;
      return `
        <rect x="${x}" y="${startY}" width="${colWidth}" height="${rowHeight}" fill="#DBEAFE" stroke="#BFDBFE" />
        <text x="${x + 16}" y="${startY + 34}" font-size="20" font-weight="700" fill="#1E3A8A">${escapeXml(header)}</text>
      `;
    })
    .join("");

  const bodyRows = rows
    .map((row, rowIndex) =>
      row
        .map((cell, colIndex) => {
          const x = startX + colIndex * colWidth;
          const y = startY + rowHeight * (rowIndex + 1);
          return `
            <rect x="${x}" y="${y}" width="${colWidth}" height="${rowHeight}" fill="#FFFFFF" stroke="#E2E8F0" />
            <text x="${x + 16}" y="${y + 34}" font-size="18" fill="#334155">${escapeXml(truncateText(cell, 18))}</text>
          `;
        })
        .join("")
    )
    .join("");

  return `${headerCells}${bodyRows}`;
};

const buildQuadrantSvg = (spec: ChartSpec) => {
  const centerX = 360;
  const centerY = 320;
  const width = 520;
  const height = 300;
  const labels = spec.labels;
  const values = spec.series[0]?.data.map((value) => Number(value) || 0) ?? [];
  const maxValue = Math.max(...values, 1);
  const points = labels
    .map((label, index) => {
      const x = 100 + ((values[index] ?? 0) / maxValue) * width;
      const y = centerY - ((index + 1) / Math.max(labels.length + 1, 2) - 0.5) * height;
      return `
        <circle cx="${x}" cy="${y}" r="9" fill="#2563EB" />
        <text x="${x + 14}" y="${y + 6}" font-size="18" fill="#0F172A">${escapeXml(label)}</text>
      `;
    })
    .join("");

  return `
    <line x1="100" y1="${centerY}" x2="${100 + width}" y2="${centerY}" stroke="#CBD5E1" stroke-width="2" />
    <line x1="${centerX}" y1="160" x2="${centerX}" y2="500" stroke="#CBD5E1" stroke-width="2" />
    <text x="110" y="180" font-size="18" fill="#64748B">高机会</text>
    <text x="520" y="180" font-size="18" fill="#64748B">高竞争</text>
    <text x="110" y="490" font-size="18" fill="#64748B">低机会</text>
    <text x="520" y="490" font-size="18" fill="#64748B">低竞争</text>
    ${points}
  `;
};

const truncateText = (value: string, maxLength: number) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
