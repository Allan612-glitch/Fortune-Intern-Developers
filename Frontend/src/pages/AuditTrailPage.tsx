import FilterMenu from "../components/FilterMenu";
import { useEffect, useRef, useState } from "react";
import { GitBranch, History, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { AdminTable } from "../components/AdminTable";
import { saveFile } from "../components/AdminReportActions";
import AsyncState from "../components/AsyncState";
import RowActions from "../components/RowActions";
import { exportAudit, inspectAudit, listAudit, type AuditEvent } from "../services/audit";
import "./AuditTrailPage.css";

const fields = ["q", "actor", "module", "action", "outcome", "entity_type", "entity", "correlation", "workflow", "date_from", "date_to"];
const control = "min-h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground";
const button = "min-h-10 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground disabled:opacity-50";
const readable = (value: string) => value.replace(/[._]/g, " ").replace(/^./, char => char.toUpperCase());
const labels: Record<string, string> = {
  "application.create": "Application submitted", "application.status.update": "Application status changed",
  "application.documents.delivery": "Application document delivery", "announcement.create": "Announcement published",
  "announcement.email.dispatch": "Announcement email dispatch", "program.bulk_unpublish": "Programs unpublished in bulk",
  "user.bulk_suspension": "Student account access changed in bulk",
};
const actionName = (event: AuditEvent) => labels[event.action] ?? readable(event.action);
const actor = (event: AuditEvent) => event.actor_name || event.actor_id || (event.actor_type === "anonymous" ? "Unauthenticated" : event.actor_type === "system" ? "System" : "Unrecorded");
const time = (event: AuditEvent) => new Date(event.timestamp).toLocaleString();
const idLabel = (event: AuditEvent) => event.entity_id || "—";
const parent = (event: AuditEvent) => event.retry_of_id || event.reversal_of_id || event.parent_id;

function Outcome({ value }: { value: string }) {
  return <span className="audit-outcome inline-flex rounded-md px-2 py-1 text-xs font-semibold" data-outcome={value}>{readable(value)}</span>;
}

function apiFilters(listKey: string) {
  const values = Object.fromEntries(new URLSearchParams(listKey));
  for (const field of ["date_from", "date_to"]) {
    if (!values[field]) continue;
    const date = new Date(values[field] + "T00:00:00");
    if (field === "date_to") date.setDate(date.getDate() + 1);
    if (!Number.isNaN(date.getTime())) values[field] = date.toISOString();
    else delete values[field];
  }
  return values;
}

export default function AuditTrailPage() {
  const [params, setParams] = useSearchParams();
  const view = params.get("view") === "table" ? "table" : params.get("view") === "evidence" ? "evidence" : "story";
  const selected = params.get("event");
  const page = Math.max(0, Math.min(33000, Math.floor(Number(params.get("page")) || 0)));
  const listKey = new URLSearchParams(fields.flatMap(field => params.get(field) ? [[field, params.get(field)!]] : [])).toString();
  const [listing, setListing] = useState<Awaited<ReturnType<typeof listAudit>> | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof inspectAudit>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [retry, setRetry] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [branch, setBranch] = useState<AuditEvent[]>([]);
  const [branchMore, setBranchMore] = useState(false);
  const [branchBusy, setBranchBusy] = useState(false);
  const opened = useRef(false);
  const snapshot = useRef<{ key: string; time: string } | null>(null);
  const branchRequest = useRef(0);


  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const timer = window.setTimeout(() => {
      const filter = apiFilters(listKey);
      const key = `${retry}:${listKey}`;
      if (snapshot.current?.key === key) filter.as_of = snapshot.current.time;
      void listAudit(filter, page * 30, !opened.current).then(result => {
        if (active) {
          opened.current = true;
          snapshot.current = { key, time: result.as_of };
          setListing(result);
        }
      }).catch(failure => { if (active) setError(failure instanceof Error ? failure.message : "Unable to load audit events."); })
        .finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [listKey, page, retry]);

  useEffect(() => {
    let active = true;
    setDetailError("");
    setDetail(null);
    if (selected) void inspectAudit(selected).then(result => { if (active) setDetail(result); }).catch(failure => {
      if (active) setDetailError(failure instanceof Error ? failure.message : "Unable to open this event.");
    });
    return () => { active = false; };
  }, [selected]);

  const change = (field: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(field, value); else next.delete(field);
    if (fields.includes(field)) next.delete("page");
    setParams(next, { replace: ["q", "actor", "action", "entity", "correlation", "workflow"].includes(field) });
  };

  async function loadBranch(event: AuditEvent, more = false) {
    const request = ++branchRequest.current;
    if (expanded === event.id && !more) { setExpanded(null); setBranchBusy(false); return; }
    if (!more) { setExpanded(event.id); setBranch([]); setBranchMore(false); }
    setBranchBusy(true);
    setDetailError("");
    try {
      const result = await inspectAudit(event.id, more ? branch.length : 0);
      if (request !== branchRequest.current) return;
      setBranch(current => more ? [...current, ...result.related] : result.related);
      setBranchMore(result.has_more);
    } catch (failure) {
      if (request === branchRequest.current) setDetailError(failure instanceof Error ? failure.message : "Unable to load related events.");
    } finally { if (request === branchRequest.current) setBranchBusy(false); }
  }

  async function download(format: "pdf" | "xlsx" | "json") {
    setExporting(true);
    setError("");
    try {
      const filter = apiFilters(listKey);
      if (snapshot.current?.key === `${retry}:${listKey}`) filter.as_of = snapshot.current.time;
      saveFile(await exportAudit(format, filter), `fortune-intern-audit.${format}`);
    }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to export audit events."); }
    finally { setExporting(false); }
  }

  const filters = Object.fromEntries(new URLSearchParams(listKey));
  const events = listing?.events ?? [];
  const connected = new Set([...(detail?.related.map(item => item.id) ?? []), detail?.event.parent_id, detail?.event.retry_of_id, detail?.event.reversal_of_id]);

  return (
    <section className="audit-page admin-page mx-auto w-full max-w-[86rem] space-y-4 px-4 py-5 sm:px-6 lg:px-8">
      <header className="admin-panel flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
        <div><h1 className="flex items-center gap-2 text-2xl font-bold"><History aria-hidden="true" className="size-6" /> Audit trail</h1>
          <p className="mt-1 text-sm text-muted-foreground">Investigate recorded activity and follow related events.</p></div>
        <label className="text-xs font-semibold">Export filtered results
          <select aria-label="Export audit" className={control} value="" disabled={exporting || loading} onChange={event => {
            const choice = event.target.value;
            if (choice === "pdf" || choice === "xlsx" || choice === "json") void download(choice);
          }}>
            <option value="">{exporting ? "Preparing…" : "Choose format"}</option><option value="pdf">PDF</option><option value="xlsx">Excel</option><option value="json">JSON</option>
          </select>
        </label>
      </header>
      <section aria-label="Search and filter audit events" className="admin-panel grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 p-3">
          <label className="text-xs font-semibold">Search events<input type="search" value={filters.q || ""} maxLength={150} onChange={event => change("q", event.target.value)} className={control} /></label>
          <FilterMenu label="Audit filters" active={Boolean(listKey)}>
          <label className="text-xs font-semibold">Module<select value={filters.module || ""} onChange={event => change("module", event.target.value)} className={control}>
            <option value="">All modules</option>{["application", "announcement", "audit", "program", "security", "staff", "system", "user"].map(value => <option key={value} value={value}>{readable(value)}</option>)}
          </select></label>
          <label className="text-xs font-semibold">Outcome<select value={filters.outcome || ""} onChange={event => change("outcome", event.target.value)} className={control}>
            <option value="">All outcomes</option>{["success", "failure", "partial", "pending", "rejected", "reversed", "skipped"].map(value => <option key={value} value={value}>{readable(value)}</option>)}
          </select></label>
        <details open={filters.entity || filters.workflow || filters.correlation ? true : undefined}>
          <summary className="cursor-pointer text-sm font-semibold text-primary">More filters</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {([["actor","Actor name or ID"],["action","Event type"],["entity_type","Record type"],["entity","Record ID"],["correlation","Correlation ID"],["workflow","Workflow ID"],["date_from","From date"],["date_to","Through date"]]).map(([field, label]) => (
              <label key={field} className="text-xs font-semibold">{label}<input type={field.startsWith("date") ? "date" : "text"} value={filters[field] || ""} maxLength={180}
                className={control} onChange={event => change(field, event.target.value)} /></label>
            ))}
          </div>
        </details>
        {listKey && <button type="button" className={button} onClick={() => setParams(view === "story" ? {} : {view})}>Clear filters</button>}
        </FilterMenu>
      </section>
      <nav aria-label="Audit views" className="flex flex-wrap gap-2">
        {(["story", "table", "evidence"] as const).map(mode => (
          <button type="button" key={mode} aria-pressed={view === mode} className={`${button} ${view === mode ? "audit-active" : ""}`} onClick={() => change("view", mode)}>
            {readable(mode)} view
          </button>
        ))}
      </nav>
      {error && <AsyncState kind="error" message={error} onRetry={() => setRetry(count => count + 1)} />}
      {view !== "evidence" && (loading ? <AsyncState kind="loading" message="Loading audit events…" /> :
        events.length === 0 ? <p className="admin-panel p-5 text-sm text-muted-foreground">No events match these filters.</p> :
        view === "table" ? (
          <div className="admin-panel overflow-hidden">
            <AdminTable name="Audit events" columns={["Date and time", "Actor", "Action", "Module", "Record", "Outcome", "Details"]}>
              {events.map(event => <tr role="row" key={event.id} data-selected={event.id === selected || connected.has(event.id)}>
                <td role="cell" data-label="Date and time">{time(event)}</td><td role="cell" data-label="Actor">{actor(event)}</td>
                <td role="cell" data-label="Action"><button type="button" className="text-left font-semibold text-primary hover:underline" onClick={() => change("event", event.id)}>{actionName(event)}</button></td>
                <td role="cell" data-label="Module">{readable(event.module)}</td><td role="cell" data-label="Record" className="audit-record">{idLabel(event)}</td>
                <td role="cell" data-label="Outcome"><Outcome value={event.outcome} /></td><td role="cell" className="admin-table-actions"><RowActions label={`Actions for ${actionName(event)}`} actions={[{label: "Inspect event", run: () => change("event", event.id)}]} /></td>
              </tr>)}
            </AdminTable>
          </div>
        ) : (
          <ol className="audit-story admin-panel space-y-3 p-4 sm:p-6">
            {events.map(event => (
              <li key={event.id} className="audit-node" data-outcome={event.outcome} data-connected={selected === event.id || connected.has(event.id)}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <button type="button" aria-current={selected === event.id ? "true" : undefined} onClick={() => change("event", event.id)} className="text-left font-semibold text-primary hover:underline">
                    {actionName(event)}
                  </button>
                  <Outcome value={event.outcome} />
                </div>
                <p className="mt-1 break-words text-xs text-muted-foreground">{time(event)} · {actor(event)} · {readable(event.module)}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-4">
                  {parent(event) && <button type="button" onClick={() => change("event", parent(event)!)} className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-primary">
                    <GitBranch aria-hidden="true" className="size-3.5" /> {event.retry_of_id ? "Retry of earlier event" : event.reversal_of_id ? "Reverses earlier event" : "View parent event"}
                  </button>}
                  <button type="button" aria-expanded={expanded === event.id} onClick={() => void loadBranch(event)} className="min-h-9 text-xs font-semibold text-primary">{expanded === event.id ? "Collapse branch" : "Explore branch"}</button>
                </div>
                {expanded === event.id && (
                  <div className="audit-branch pl-3">
                    {branch.map(child => <button type="button" key={child.id} onClick={() => change("event", child.id)} className="block min-h-10 text-left text-sm text-primary hover:underline">{actionName(child)} · {time(child)}</button>)}
                    {branchBusy ? <p role="status" className="py-2 text-xs">Loading relationships…</p> : branch.length === 0 ? <p className="py-2 text-xs text-muted-foreground">No recorded child events.</p> : null}
                    {branchMore && <button type="button" disabled={branchBusy} onClick={() => void loadBranch(event, true)} className={button}>Load more related events</button>}
                  </div>
                )}
              </li>
            ))}
          </ol>
        ))}
      {!loading && (page > 0 || listing?.has_more) && <nav aria-label="Audit pages" className="flex items-center justify-end gap-3 text-sm">
        <button type="button" className={button} disabled={page === 0} onClick={() => change("page", String(page - 1))}>Previous</button>Page {page + 1}
        <button type="button" className={button} disabled={!listing?.has_more} onClick={() => change("page", String(page + 1))}>Next</button>
      </nav>}
      {(view === "evidence" || selected || detailError) && (
        <section aria-label="Event evidence" className={`admin-panel audit-evidence space-y-3 p-4 sm:p-5 ${view === "evidence" ? "" : "fixed inset-x-3 bottom-3 z-50 max-h-[70dvh] overflow-auto shadow-xl sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[min(32rem,calc(100%-2rem))]"}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">Event evidence</h2>
            {view === "evidence" && !loading && events.length > 0 && <label className="text-xs font-semibold">Select event
              <select className={control} value={events.some(event => event.id === selected) ? selected! : ""} onChange={event => change("event", event.target.value)}>
                <option value="">Choose an event from this page</option>{events.map(event => <option key={event.id} value={event.id}>{actionName(event)} · {time(event)}</option>)}
              </select>
            </label>}
            {selected && <button type="button" className={button} aria-label="Close event evidence" onClick={() => change("event", "")}><X aria-hidden="true" className="size-4" /></button>}
          </div>
          {detailError ? <p role="alert" className="text-sm text-red-700">{detailError}</p> :
            detail ? (
              <>
                <div className="flex flex-wrap items-center gap-3"><h3 className="font-semibold">{actionName(detail.event)}</h3><Outcome value={detail.event.outcome} /></div>
                <p className="break-words text-sm text-muted-foreground">{actor(detail.event)} · {time(detail.event)} · {idLabel(detail.event)}</p>
                {typeof detail.event.details?.context?.reason === "string" && <p className="text-sm"><strong>Reason</strong> · {readable(detail.event.details.context.reason)}</p>}
                {Object.entries(detail.event.details?.changes || {}).length > 0 && <dl className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(detail.event.details?.changes || {}).map(([name, values]) => <div key={name} className="rounded-lg bg-secondary p-3 text-sm">
                    <dt className="font-semibold">{readable(name)}</dt><dd>{String(values.before ?? "—")} → {String(values.after ?? "—")}</dd>
                  </div>)}
                </dl>}
                <div className="flex flex-wrap gap-2">
                  {parent(detail.event) && <button type="button" className={button} onClick={() => change("event", parent(detail.event)!)}>Earlier related event</button>}
                  {detail.event.workflow_id && <button type="button" className={button} onClick={() => setParams({view, event: detail.event.id, workflow: detail.event.workflow_id!})}>Filter to this workflow</button>}
                  {detail.event.correlation_id && <button type="button" className={button} onClick={() => setParams({view, event: detail.event.id, correlation: detail.event.correlation_id!})}>Filter to this request</button>}
                </div>
                <details open={view === "evidence" ? true : undefined}>
                  <summary className="cursor-pointer text-sm font-semibold">Structured evidence (JSON)</summary>
                  <pre className="mt-2 max-h-[50dvh] overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-white">{JSON.stringify(detail, null, 2)}</pre>
                </details>
              </>
            ) : <p className="text-sm text-muted-foreground">{selected ? "Loading event…" : "Choose an event to inspect its evidence."}</p>}
        </section>
      )}
    </section>
  );
}
