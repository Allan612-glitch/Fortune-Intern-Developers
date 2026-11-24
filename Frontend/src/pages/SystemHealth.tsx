import { operationTone } from "./operationStatus";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { button, dateTime, useRequest } from "./AdminWorkflowUI";

type Health = {
  checked_at: string;
  checks: { label: string; route: string; status: string; http_status: number | null; duration_ms: number | null }[];
  integrations: { label: string; configured: boolean }[];
};

export default function SystemHealth() {
  const [revision, setRevision] = useState(0);
  const result = useRequest<Health>("/api/admin/system-health", revision);
  return <section className="admin-panel space-y-4 p-4 sm:p-5">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-bold">System health</h2><p className="text-sm text-muted-foreground">{result?.data ? `Checked ${dateTime(result.data.checked_at)}` : "Checks run from the current backend instance."}</p></div>
      <button className={button} disabled={!result} onClick={() => setRevision(value => value + 1)}><RefreshCw className="size-4" /> Run checks</button>
    </header>
    {!result ? <p role="status">Running health checks…</p> : result.error ? <p role="alert">{result.error}</p> : <>
      <ul className="grid gap-3 sm:grid-cols-3">{result.data?.checks.map(check => <li key={check.route} className="min-w-0 rounded-lg border border-border p-3">
        <p className="font-semibold">{check.label}</p><p className="break-all text-xs text-muted-foreground">{check.route}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="operation-status" data-tone={operationTone(check.status)}>{check.status}</span>
          <span className="text-xs text-muted-foreground">{[check.http_status && `HTTP ${check.http_status}`, check.duration_ms !== null && `${check.duration_ms} ms`].filter(Boolean).join(" · ")}</span>
        </div>
      </li>)}</ul>
      <div className="flex flex-wrap gap-2 text-sm">{result.data?.integrations.map(item => <span className="operation-status" data-tone={operationTone(item.configured ? "Configured" : "Setup required")} key={item.label}>{item.label} · {item.configured ? "Configured" : "Setup required"}</span>)}</div>
    </>}
  </section>;
}
