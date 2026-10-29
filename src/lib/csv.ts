import { industryLabel, STATUS_LABEL } from "./constants";
import type { Lead } from "./types";

/**
 * Escapes one CSV cell. Cells starting with = + - @ are prefixed with a quote
 * so spreadsheet apps don't run them as formulas (CSV injection).
 */
function cell(value: string | number | null | undefined): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const COLUMNS = [
  "Bedrijf",
  "Branche",
  "Adres",
  "Plaats",
  "Land",
  "Telefoon",
  "E-mail",
  "Website",
  "Score",
  "Reviews",
  "Websitescore",
  "Leadscore",
  "Status",
  "Notities",
];

export function leadsToCsv(leads: Lead[]): string {
  const rows = leads.map((l) => {
    const b = l.business;
    return [
      b.name,
      industryLabel(b.industry),
      b.address,
      b.city,
      b.country,
      b.phone,
      b.email,
      b.website,
      b.rating,
      b.reviewCount,
      l.audit?.score ?? "",
      l.score.total,
      STATUS_LABEL[l.crm.status],
      l.crm.notes.map((n) => n.body).join(" | "),
    ]
      .map(cell)
      .join(",");
  });
  return [COLUMNS.join(","), ...rows].join("\r\n");
}

/** Triggers a file download in the browser. The BOM makes Excel read UTF-8 correctly. */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
