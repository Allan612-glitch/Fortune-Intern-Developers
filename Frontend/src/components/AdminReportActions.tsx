import { useState } from "react";
import { exportTable, type ReportTable } from "../services/platform";

export async function previewPdf(load: () => Promise<Blob>) {
  const tab = window.open("about:blank", "_blank");
  if (!tab) throw new Error("Allow pop-ups to preview the PDF.");
  tab.opener = null;
  try {
    const file = await load();
    if (await file.slice(0, 5).text() !== "%PDF-") throw new Error("This file cannot be previewed as a PDF.");
    const url = URL.createObjectURL(file.slice(0, file.size, "application/pdf"));
    tab.location.replace(url);
    window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
  } catch (error) {
    tab.close();
    throw error;
  }
}

export function saveFile(file: Blob, filename: string) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function AdminReportActions({ table, ids, label, onError }: {
  table: ReportTable;
  ids: string[];
  label: string;
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const run = async (action: string) => {
    setBusy(true);
    onError("");
    try {
      if (action === "preview") await previewPdf(() => exportTable(table, ids, "pdf"));
      else if (action === "pdf" || action === "xlsx") {
        saveFile(await exportTable(table, ids, action), `fortune-intern-${table}.${action}`);
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : "The report could not be opened.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <select aria-label={`Export ${label}`} value="" disabled={busy || (ids.length === 0 && table !== "roles")}
      className="min-h-10 rounded-lg border border-border bg-white px-3 text-xs font-semibold text-primary disabled:opacity-50"
      onChange={(event) => { if (event.target.value) void run(event.target.value); }}>
      <option value="">{busy ? "Preparing report…" : "Export…"}</option>
      <option value="preview">Preview PDF</option>
      <option value="pdf">Download PDF</option>
      <option value="xlsx">Download Excel</option>
    </select>
  );
}
