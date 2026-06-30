"use client";

import type { ReportColumn } from "@/types";

type Row = Record<string, string | number>;

function slug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number | undefined): string {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportCsv(
  title: string,
  columns: ReportColumn[],
  rows: Row[],
): void {
  const header = columns.map((c) => csvCell(c.label)).join(",");
  const lines = rows.map((r) =>
    columns.map((c) => csvCell(r[c.key])).join(","),
  );
  const csv = [header, ...lines].join("\n");
  downloadBlob(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    `${slug(title)}.csv`,
  );
}

export async function exportExcel(
  title: string,
  columns: ReportColumn[],
  rows: Row[],
): Promise<void> {
  const XLSX = await import("xlsx");
  const data = rows.map((r) =>
    Object.fromEntries(columns.map((c) => [c.label, r[c.key] ?? ""])),
  );
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${slug(title)}.xlsx`);
}

export async function exportPdf(
  title: string,
  columns: ReportColumn[],
  rows: Row[],
): Promise<void> {
  const { default: JsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new JsPDF();
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, 22);
  autoTable(doc, {
    startY: 28,
    head: [columns.map((c) => c.label)],
    body: rows.map((r) => columns.map((c) => String(r[c.key] ?? ""))),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [0, 132, 205] },
  });
  doc.save(`${slug(title)}.pdf`);
}
