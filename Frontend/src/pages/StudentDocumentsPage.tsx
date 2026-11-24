import { StudentDisclosure, StudentPage } from "../components/StudentPortalUI";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Download, Eye } from "lucide-react";
import { apiBlob } from "../services/api";
import { previewPdf, saveFile } from "../components/AdminReportActions";
import { button, failureMessage, money, PageControls, useRequest } from "./AdminWorkflowUI";

type Document = { id: string; kind: "payment" | "invoice"; description: string; record_date: string; amount_minor: number; test_mode: boolean;
  line_items: { description: string; quantity: number; unit_amount_minor: number }[] | null;
  due_date: string | null; reference: string | null;
};

export default function StudentDocumentsPage() {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const result = useRequest<{ items: Document[]; total: number }>("/api/finance/documents?page=" + page, revision);
  const items = result?.data?.items ?? [];
  return <StudentPage title="Finance documents" description="Receipts for verified payments and invoices issued to your account.">
    <section className="student-panel">
      {(error || result?.error) && <div className="p-3 text-sm" role="alert">
        <p>{error || result?.error}</p>{result?.error && <button className={button} onClick={() => setRevision(n => n + 1)}>Try again</button>}
      </div>}
      {!result ? <p role="status" className="p-3">Loading documents…</p> : !result.error && !items.length ? <p className="p-3 text-sm">You have no finance documents yet.</p> : null}
      <ul aria-label="Finance documents" className="divide-y divide-border">{items.map(item => {
        const path = `/api/finance/documents/${item.id}`;
        const title = item.kind === "payment" ? "Payment receipt" : "Invoice";
        return <StudentDisclosure key={item.id} title={title + (item.test_mode ? " · Test" : "")} subtitle={item.record_date}
          badge={<strong className="tabular-nums">{money(item.amount_minor)}</strong>} open={open === item.id} onToggle={() => setOpen(current => current === item.id ? null : item.id)}>
            {item.due_date && <p className="text-xs text-muted-foreground">Due {item.due_date}</p>}
            {item.reference && <p className="break-all text-xs text-muted-foreground">Reference {item.reference}</p>}
            <ul aria-label="Line items" className="my-2 divide-y divide-border border-y border-border">
              {(item.line_items ?? [{ description: item.description, quantity: 1, unit_amount_minor: item.amount_minor }]).map((line, index) => (
                <li key={index} className="flex items-start justify-between gap-2 py-2 text-sm">
                  <span className="min-w-0 break-words">{line.description}{line.quantity > 1 && <small className="block text-muted-foreground">{line.quantity} × {money(line.unit_amount_minor)}</small>}</span>
                  <span className="shrink-0 font-medium">{money(line.quantity * line.unit_amount_minor)}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={button} onClick={() => { setError(""); void previewPdf(() => apiBlob(path)).catch(error => setError(failureMessage(error))); }}><Eye className="size-4" aria-hidden="true" /> Preview PDF</button>
              <button type="button" className={button} onClick={() => { setError(""); void apiBlob(path).then(file => saveFile(file, `${item.kind}-${item.id}.pdf`)).catch(error => setError(failureMessage(error))); }}><Download className="size-4" aria-hidden="true" /> Download</button>
            </div>
            <Link className="mt-2 inline-block text-sm text-primary underline" to="/terms#refunds">Terms and refund policy</Link>
        </StudentDisclosure>;
      })}</ul>
      {result?.data && <PageControls page={page} total={result.data.total} setPage={value => { setOpen(null); setError(""); setPage(value); }} />}
    </section>
  </StudentPage>;
}
