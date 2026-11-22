import { AdminTable } from "../components/AdminTable";
import RowActions from "../components/RowActions";
import FilterMenu from "../components/FilterMenu";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { PanelDialog, primary } from "./AdminWorkflowUI";
import { useSearchParams } from "react-router-dom";
import { apiRequest } from "../services/api";

type Stage = "proposed" | "employer_confirmed" | "student_accepted" | "started" | "completed" | "cancelled";
type Choice = { id: string; name: string };
type Employer = Choice & { contact_email: string; location: string };
type Opening = { id: string; title: string; employer: string; program: string; capacity: number; available: number; active: boolean };
type Catalog = { employers: Employer[]; programs: Choice[]; openings: Opening[] };
type Placement = { id: string; student: string; opening: string; employer: string; status: Stage; start_date: string | null; end_date: string | null; supervisor_name: string; feedback: string };
const base = "/api/admin/placements";
const field = "w-full rounded-lg border border-border bg-[var(--surface)] px-3 py-2 text-sm";
const button = primary;
const labels: Record<Stage, string> = {
  proposed: "Proposed", employer_confirmed: "Employer confirmed", student_accepted: "Student accepted",
  started: "Started", completed: "Completed", cancelled: "Cancelled",
};
const next: Partial<Record<Stage, Stage>> = { proposed: "employer_confirmed", employer_confirmed: "student_accepted", student_accepted: "started", started: "completed" };

function Field({ name, children }: { name: string; children: ReactNode }) {
  return <label className="grid gap-1 text-sm font-medium">{name}{children}</label>;
}
function ChoiceField({ name, label, options, onChange }: { name: string; label: string; options: Choice[]; onChange?: (value: string) => void }) {
  return <Field name={label}><select name={name} required className={field} onChange={event => onChange?.(event.target.value)}>
    <option value="">Select {label.toLowerCase()}</option>
    {options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
  </select></Field>;
}

export default function PlacementsPage() {
  const [params, setParams] = useSearchParams();
  const caseId = params.get("application") || "";
  const [catalog, setCatalog] = useState<Catalog>();
  const [rows, setRows] = useState<{ items: Placement[]; more: boolean }>();
  const [candidates, setCandidates] = useState<Choice[]>([]);
  const [opening, setOpening] = useState("");
  const [candidateSearch, setCandidateSearch] = useState("");
  const [stage, setStage] = useState(params.get("stage") || "");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [tab, setTab] = useState<"placements" | "employers" | "openings">("placements");
  const createDialog = useRef<HTMLDialogElement>(null);
  const editDialog = useRef<HTMLDialogElement>(null);
  const [formError, setFormError] = useState("");
  const [editor, setEditor] = useState<Placement>();
  const [editEmployer, setEditEmployer] = useState<Employer>();
  const [editOpening, setEditOpening] = useState<Opening>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    apiRequest<Catalog>(base + "/catalog").then(result => { if (active) setCatalog(result); })
      .catch(cause => { if (active) setError(cause.message); });
    return () => { active = false; };
  }, [revision]);
  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ stage, page: String(page) });
    if (caseId) query.set("application_id", caseId);
    apiRequest<{ items: Placement[]; more: boolean }>(base + "?" + query).then(result => { if (active) setRows(result); })
      .catch(cause => { if (active) setError(cause.message); });
    return () => { active = false; };
  }, [stage, page, revision, caseId]);
  useEffect(() => {
    let active = true;
    if (!opening) return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ opening_id: opening, q: candidateSearch });
      apiRequest<Choice[]>(base + "/candidates?" + params).then(result => { if (active) setCandidates(result); })
        .catch(cause => { if (active) setError(cause.message); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [opening, candidateSearch, revision]);

  async function submit(event: FormEvent<HTMLFormElement>, path: string, method: string, receipt: string, onSuccess?: () => void) {
    event.preventDefault();
    const form = event.currentTarget;
    const data: Record<string, string | number | boolean> = Object.fromEntries(
      [...new FormData(form)].filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    );
    if (typeof data.capacity === "string") data.capacity = Number(data.capacity);
    if (typeof data.active === "string") data.active = data.active === "true";
    for (const key of ["start_date", "end_date"]) if (data[key] === "") delete data[key];
    setBusy(true); setFormError(""); setMessage("");
    try {
      await apiRequest(path, { method, body: JSON.stringify(data) });
      form.reset();
      onSuccess?.();
      createDialog.current?.close();
      editDialog.current?.close();
      setMessage(receipt);
      setRevision(value => value + 1);
    } catch (cause) { setFormError(cause instanceof Error ? cause.message : "Unable to save changes."); }
    finally { setBusy(false); }
  }

  return <div className="admin-page mx-auto grid max-w-[86rem] gap-3 px-3 py-4 sm:gap-4 sm:px-6 sm:py-6 lg:px-8">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-xl font-semibold sm:text-2xl">Employers & placements</h1>
      <button type="button" className={primary} onClick={() => {
        setEditEmployer(undefined); setEditOpening(undefined); setFormError("");
        createDialog.current?.querySelector("form")?.reset();
        setOpening(""); setCandidates([]); setCandidateSearch("");
        createDialog.current?.showModal();
      }}><Plus className="size-4" aria-hidden="true" />
        {{ placements: "Add placement", employers: "Add employer", openings: "Add opening" }[tab]}
      </button>
    </header>
    <nav aria-label="Placement views" className="flex flex-wrap gap-2">
      {(["placements", "employers", "openings"] as const).map(view =>
        <button type="button" key={view} aria-pressed={tab === view} onClick={() => { setTab(view); setError(""); setMessage(""); }}
          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold capitalize aria-pressed:bg-primary aria-pressed:text-primary-foreground">{view[0].toUpperCase() + view.slice(1)}</button>
      )}
    </nav>
    {caseId && <div className="flex items-center gap-3 text-sm">Showing one application <button className="text-primary underline" onClick={() => { setPage(1); setParams({}); }}>Show all placements</button></div>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {message && <p role="status" className="rounded-lg border border-border p-3 text-sm">{message}</p>}
    {tab === "employers" && <>
      <PanelDialog dialog={createDialog} title={editEmployer ? "Edit employer" : "Add employer"}>
        <form key={editEmployer?.id ?? "new"} className="grid gap-3 sm:grid-cols-2"
          onSubmit={event => void submit(event, base + "/employers" + (editEmployer ? "/" + editEmployer.id : ""), editEmployer ? "PUT" : "POST", "Employer saved.", () => setEditEmployer(undefined))}>
          <Field name="Employer name"><input name="name" required maxLength={160} defaultValue={editEmployer?.name} className={field}/></Field>
          <Field name="Contact email"><input name="contact_email" type="email" maxLength={254} defaultValue={editEmployer?.contact_email} className={field}/></Field>
          <Field name="Location"><input name="location" maxLength={160} defaultValue={editEmployer?.location} className={field}/></Field>
          <div className="self-end"><button className={button} disabled={busy}>Save employer</button></div>
          {formError && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{formError}</p>}
        </form>
      </PanelDialog>
      {catalog?.employers.length ? <div className="admin-panel">
        <AdminTable name="Employers" columns={["Employer", "Location", "Contact email", "Actions"]} titleToggles>
          {catalog.employers.map(item => <tr role="row" key={item.id}>
            <td role="cell" data-label="Employer" className="font-semibold">{item.name}</td>
            <td role="cell" data-label="Location">{item.location || "—"}</td>
            <td role="cell" data-label="Contact email">{item.contact_email ? <a className="break-all text-primary hover:underline" href={`mailto:${item.contact_email}`}>{item.contact_email}</a> : "—"}</td>
            <td role="cell" data-label="Actions" className="admin-table-actions">
              <RowActions label={`Actions for ${item.name}`} actions={[{ label: "Edit employer", run: () => { setEditEmployer(item); setFormError(""); createDialog.current?.showModal(); } }]} />
            </td>
          </tr>)}
        </AdminTable>
      </div> : catalog && <p className="admin-panel p-3 text-sm text-muted-foreground">No employers recorded yet.</p>}
    </>}
    {tab === "openings" && <>
      <PanelDialog dialog={createDialog} title={editOpening ? "Update opening" : "Add opening"}>
        <form key={editOpening?.id ?? "new"} className="grid gap-3 sm:grid-cols-2"
          onSubmit={event => void submit(event, base + "/openings" + (editOpening ? "/" + editOpening.id : ""), editOpening ? "PUT" : "POST", "Opening saved.", () => setEditOpening(undefined))}>
          {editOpening ? <Field name="Availability"><select name="active" className={field} defaultValue={String(editOpening.active)}><option value="true">Open</option><option value="false">Closed</option></select></Field> :
            <>
              <ChoiceField name="employer_id" label="Employer" options={catalog?.employers ?? []}/>
              <ChoiceField name="program_id" label="Program" options={catalog?.programs ?? []}/>
              <Field name="Opening title"><input name="title" required maxLength={160} className={field}/></Field>
            </>}
          <Field name="Capacity"><input name="capacity" required type="number" min="1" max="10000" defaultValue={editOpening?.capacity ?? 1} className={field}/></Field>
          <div><button className={button} disabled={busy}>Save opening</button></div>
          {formError && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{formError}</p>}
        </form>
      </PanelDialog>
      {catalog?.openings.length ? <div className="admin-panel">
        <AdminTable name="Openings" columns={["Opening", "Employer", "Program", "Capacity", "Status", "Actions"]} titleToggles>
          {catalog.openings.map(item => <tr role="row" key={item.id}>
            <td role="cell" data-label="Opening" className="font-semibold">{item.title}</td>
            <td role="cell" data-label="Employer">{item.employer}</td>
            <td role="cell" data-label="Program">{item.program}</td>
            <td role="cell" data-label="Capacity">{item.available} of {item.capacity} available</td>
            <td role="cell" data-label="Status"><span className="rounded bg-secondary px-2 py-1 text-xs">{item.active ? "Open" : "Closed"}</span></td>
            <td role="cell" data-label="Actions" className="admin-table-actions">
              <RowActions label={`Actions for ${item.title}`} actions={[{ label: "Edit opening", run: () => { setEditOpening(item); setFormError(""); createDialog.current?.showModal(); } }]} />
            </td>
          </tr>)}
        </AdminTable>
      </div> : catalog && <p className="admin-panel p-3 text-sm text-muted-foreground">No openings recorded yet.</p>}
    </>}
    {tab === "placements" && <>
      <PanelDialog dialog={createDialog} title="Propose a placement">
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={event => void submit(event, base, "POST", "Placement proposed.", () => { setOpening(""); setCandidates([]); setCandidateSearch(""); })}>
          <ChoiceField name="opening_id" label="Opening" options={(catalog?.openings ?? []).filter(item => item.active && item.available > 0)
            .map(item => ({ id: item.id, name: `${item.title} · ${item.employer} (${item.available} available)` }))}
            onChange={value => { setOpening(value); setCandidates([]); }}/>
          <Field name="Find accepted applicant"><input type="search" placeholder="Search name" maxLength={150} disabled={!opening} value={candidateSearch}
            onChange={event => setCandidateSearch(event.target.value)} className={field}/></Field>
          <ChoiceField key={opening} name="application_id" label="Applicant" options={candidates}/>
          <Field name="Supervisor name"><input name="supervisor_name" maxLength={160} className={field}/></Field>
          <div><button className={button} disabled={busy || !candidates.length}>Propose placement</button></div>
          {formError && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{formError}</p>}
        </form>
      </PanelDialog>
      <PanelDialog dialog={editDialog} title={editor ? "Update placement · " + editor.student : "Update placement"}>
        {editor && <form key={editor.id} className="grid gap-3 sm:grid-cols-2" onSubmit={event => void submit(event, base + "/" + editor.id, "PATCH", "Placement updated.", () => setEditor(undefined))}>
          <Field name="Placement stage"><select name="status" defaultValue={editor.status} className={field}>
            <option value={editor.status}>{labels[editor.status]}</option>
            {next[editor.status] && <option value={next[editor.status]}>{labels[next[editor.status]!]}</option>}
            <option value="cancelled">Cancelled</option>
          </select></Field>
          <Field name="Supervisor name"><input name="supervisor_name" defaultValue={editor.supervisor_name} maxLength={160} className={field}/></Field>
          <Field name="Start date"><input name="start_date" type="date" defaultValue={editor.start_date ?? ""} className={field}/></Field>
          <Field name="End date"><input name="end_date" type="date" defaultValue={editor.end_date ?? ""} className={field}/></Field>
          <Field name="Supervisor feedback"><textarea name="feedback" defaultValue={editor.feedback} maxLength={2000} className={field}/></Field>
          <div className="self-end"><button className={button} disabled={busy}>Save placement</button></div>
          {formError && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{formError}</p>}
        </form>}
      </PanelDialog>
      <section className="admin-panel p-3 sm:p-5">
        <header className="flex items-center justify-between gap-2 border-b border-border pb-2"><h2 className="font-semibold">Placements</h2>
        <FilterMenu label="Placement filters" active={Boolean(stage)}>
        <Field name="Placement stage"><select value={stage} onChange={event => { setStage(event.target.value); setPage(1); }} className={field}>
          <option value="">All stages</option>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></Field>
        </FilterMenu></header>
        {rows?.items.length ? <AdminTable name="Placements" columns={["Student", "Opening", "Employer", "Status", "Dates", "Supervisor", "Feedback", "Actions"]} titleToggles>
          {rows.items.map(item => <tr role="row" key={item.id}>
            <td role="cell" data-label="Student" className="font-semibold">{item.student}</td>
            <td role="cell" data-label="Opening">{item.opening}</td>
            <td role="cell" data-label="Employer">{item.employer}</td>
            <td role="cell" data-label="Status"><span className="rounded bg-secondary px-2 py-1 text-xs">{labels[item.status]}</span></td>
            <td role="cell" data-label="Dates">{[item.start_date, item.end_date].filter(Boolean).join(" – ") || "—"}</td>
            <td role="cell" data-label="Supervisor">{item.supervisor_name || "—"}</td>
            <td role="cell" data-label="Feedback">{item.feedback || "—"}</td>
            <td role="cell" data-label="Actions" className="admin-table-actions">
              {next[item.status] && <RowActions label={`Actions for ${item.student}`} actions={[{ label: "Update placement", run: () => { setEditor(item); setFormError(""); editDialog.current?.showModal(); } }]} />}
            </td>
          </tr>)}
        </AdminTable> : rows && <p className="py-3 text-sm text-muted-foreground">No placements in this stage.</p>}
        <div className="flex items-center gap-3 text-sm"><button className="min-h-10 disabled:opacity-50" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {page}</span>
          <button className="min-h-10 disabled:opacity-50" disabled={!rows?.more} onClick={() => setPage(value => value + 1)}>Next</button></div>
      </section>
    </>}
  </div>;
}
