import { StudentDisclosure, StudentPage, studentField, studentLink } from "../components/StudentPortalUI";
import FilterMenu from "../components/FilterMenu";
import { useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { AdminTable, TableSelection } from "../components/AdminTable";
import RowActions from "../components/RowActions";
import { saveFile } from "../components/AdminReportActions";
import { apiBlob, apiRequest } from "../services/api";
import { AccountPicker, button, dateTime, failureMessage, Field, field, label, PageControls, PanelDialog, primary, useDebounced, useRequest } from "./AdminWorkflowUI";

type Status = "open" | "in_progress" | "closed";
type Ticket = { id: string; account_id: string; title: string; description: string; category: string; priority: string; status: Status; updated_at: string; due_date: string | null; resolution: string | null };
type TicketDetail = { ticket: Ticket; requester: string | null; assignee: string | null; updates: { id: string; actor: string | null; status: Status; note: string; created_at: string }[] };
const statuses = ["open", "in_progress", "closed"] as const;
const categories = ["general", "payment", "refund", "application", "system"];

export default function SupportPage({ student = false, canFinance = false }: { student?: boolean; canFinance?: boolean }) {
  const [params, setParams] = useSearchParams();
  const caseAccount = student ? "" : params.get("account_id");
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState("");
  const [overdue, setOverdue] = useState(params.get("overdue") === "1");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [picked, setPicked] = useState<string[]>([]);
  const [detailId, setDetailId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [changeAction, setChangeAction] = useState<Status>("in_progress");
  const [targets, setTargets] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [notice, setNotice] = useState("");
  const createDialog = useRef<HTMLDialogElement>(null);
  const changeDialog = useRef<HTMLDialogElement>(null);
  const detailDialog = useRef<HTMLDialogElement>(null);
  const base = student ? "/api/support" : "/api/admin/support";
  const searchTerm = useDebounced(query);
  const ticketId = student ? params.get("ticket") : null;
  const report = student ? params.get("report") : null;
  const applicationReference = student ? params.get("application") : null;
  const subject = report ? "Report opportunity" : applicationReference ? "Application follow-up" : "";
  const source = report ? "Program reference: " + report : applicationReference ? "Application reference: " + applicationReference : "";
  const search = new URLSearchParams({ q: searchTerm, page: String(page) });
  if (status) search.set("status", status);
  if (overdue) search.set("overdue", "true");
  if (caseAccount) search.set("account_id", caseAccount);
  const list = useRequest<{ items: Ticket[]; total: number } | Ticket[]>(student ? base : base + "?" + search, revision);
  const detail = useRequest<TicketDetail>(detailId && !student ? base + "/" + detailId : "", revision);
  const rows = Array.isArray(list?.data) ? list.data : list?.data?.items || [];
  const selected = rows.filter(row => picked.includes(row.id)).map(row => row.id);
  const all = rows.length > 0 && rows.length === selected.length;

  async function run(work: () => Promise<void>, inDialog = false) {
    setBusy(true); setError(""); setDialogError(""); setNotice("");
    try { await work(); } catch (error) {
      if (inDialog) setDialogError(failureMessage(error)); else setError(failureMessage(error));
    } finally { setBusy(false); }
  }

  function change(ids: string[], next: Status) {
    setTargets(ids); setChangeAction(next); setDialogError("");
    changeDialog.current?.querySelector("form")?.reset();
    changeDialog.current?.showModal();
  }

  function showCreate() {
    setAccountId(""); setDialogError(""); createDialog.current?.querySelector("form")?.reset(); createDialog.current?.showModal();
  }

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run(async () => {
      const saved = await apiRequest<Ticket>(base, { method: "POST", body: JSON.stringify({ ...Object.fromEntries(form), account_id: accountId || null }) });
      createDialog.current?.close(); setRevision(value => value + 1); setStatus(""); setPage(1); setQuery("");
      setNotice("Ticket opened.");
      if (student) setParams({ ticket: saved.id }, { replace: true });
    }, true);
  }

  function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run(async () => {
      await apiRequest(base + "/update", { method: "POST", body: JSON.stringify({
        ids: targets, status: changeAction, note: form.get("note"), assign_to_me: form.has("assignee"),
        due_date: form.get("due_date") || undefined, resolution: form.get("resolution") || undefined,
      }) });
      changeDialog.current?.close(); setPicked([]); setRevision(value => value + 1); setNotice(`Updated ${targets.length} ticket(s).`);
    }, true);
  }

  function exportRecords(format: "pdf" | "xlsx") {
    void run(async () => saveFile(await apiBlob(base + "/export", { method: "POST", body: JSON.stringify({ ids: selected, format }) }), `support-tickets.${format}`));
  }

  const createForm = <PanelDialog dialog={createDialog} title="Open support ticket"><form className="grid gap-4" onSubmit={create}>
      {!student && <AccountPicker value={accountId} onChange={setAccountId} />}
      <Field name="Subject"><input name="title" defaultValue={subject} className={field} minLength={3} maxLength={160} required /></Field>
      <Field name="Category"><select name="category" defaultValue={subject ? "application" : "general"} className={field}>{categories.map(value => <option value={value} key={value}>{label(value)}</option>)}</select></Field>
      {!student && <Field name="Priority"><select name="priority" className={field}>{["normal", "high", "urgent"].map(value => <option value={value} key={value}>{label(value)}</option>)}</select></Field>}
      <Field name="Description"><textarea name="description" defaultValue={source ? source + "\n\n" : ""} className={field} rows={4} required minLength={3} maxLength={4000} /></Field>
      {dialogError && <p role="alert">{dialogError}</p>}
      <button className={primary} disabled={busy}>Open ticket</button>
    </form></PanelDialog>;
  if (student) {
    const visible = rows.filter(row => row.id === ticketId || ((!status || row.status === status) &&
      [row.title, row.category].some(value => value.toLowerCase().includes(query.trim().toLowerCase()))));
    return <StudentPage title="Support tickets" description="Ask a question or follow up on an issue."
      action={<button className={studentLink} onClick={showCreate}><Plus className="size-4" aria-hidden="true" />Open ticket</button>}>
      {subject && <div className="student-panel flex flex-wrap items-center justify-between gap-2 p-3"><p className="text-sm">{subject}</p>
        <button className={studentLink} onClick={showCreate}>Write message</button></div>}
      {notice && <p className="student-panel p-3 text-sm" role="status">{notice}</p>}
      {list?.error && <div className="student-panel p-3 text-sm" role="alert">{list.error} <button className={button} onClick={() => setRevision(n => n + 1)}>Try again</button></div>}
      {!list && <p role="status" className="student-panel p-3 text-sm">Loading tickets…</p>}
      {rows.length > 0 && <div className="student-panel grid grid-cols-[minmax(0,1fr)_auto] gap-2 p-2">
        <input className={studentField} type="search" value={query} onChange={event => setQuery(event.target.value)} aria-label="Search tickets" placeholder="Search tickets" />
        <FilterMenu label="Ticket filters" active={Boolean(status)}>
          <label className="grid gap-1 text-sm">Status<select className={studentField} aria-label="Ticket status" value={status} onChange={event => setStatus(event.target.value)}>
            <option value="">All statuses</option>{statuses.map(value => <option key={value} value={value}>{label(value)}</option>)}
          </select></label>
        </FilterMenu>
      </div>}
      {list?.data && ticketId && !rows.some(row => row.id === ticketId) && <p className="student-panel p-3 text-sm" role="status">This ticket is unavailable.</p>}
      {list?.data && (visible.length ? <ul className="student-panel" aria-label="My support tickets">{visible.map(row => <StudentDisclosure
        key={row.id} title={row.title} subtitle={label(row.category)}
        badge={<span className="inline-block rounded-md bg-secondary px-2 py-1 font-semibold text-primary">{label(row.status)}</span>}
        open={ticketId === row.id} onToggle={() => setParams(ticketId === row.id ? {} : { ticket: row.id }, { replace: true })}>
        <p className="text-xs text-muted-foreground">Updated {dateTime(row.updated_at)}</p>
        <p className="mt-2 whitespace-pre-wrap text-sm">{row.description}</p>
        {row.resolution && <section className="mt-3 rounded-lg bg-secondary p-2.5 text-sm"><h2 className="font-semibold">Resolution</h2><p className="whitespace-pre-wrap">{row.resolution}</p></section>}
      </StudentDisclosure>)}</ul> : <p className="student-panel p-3 text-sm text-muted-foreground">{rows.length ? "No tickets match your filters." : "You have no support tickets yet."}</p>)}
      {createForm}
    </StudentPage>;
  }

  return <section className="admin-page mx-auto w-full max-w-[86rem] space-y-5 p-4 sm:p-6 lg:p-8">
    <header className="admin-section-header flex flex-wrap items-center justify-between gap-4 p-5 sm:p-7">
      <div><h1 className="text-2xl font-bold sm:text-3xl">{student ? "My support tickets" : "Support & incidents"}</h1><p className="mt-1 text-sm text-muted-foreground">{student ? "Ask a question or track an issue you reported." : "Triage queries, assign ownership, and record resolutions."}</p></div>
      <button className={primary} onClick={showCreate}><Plus className="size-4" /> Open ticket</button>
    </header>
    {notice && <p role="status" className="admin-panel p-3 text-sm">{notice}</p>}
    {error && <p role="alert" className="admin-panel p-3 text-sm">{error}</p>}
    <section className="admin-panel overflow-hidden">
      {caseAccount && <div className="flex items-center gap-3 border-b border-border p-4 text-sm">Showing one account <button className={button} onClick={() => { setPage(1); setPicked([]); setParams({}); }}>Show all tickets</button></div>}
      {!student && <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 border-b border-border p-3">
        <Field name="Find tickets"><input className={field} type="search" placeholder="Search title or category" maxLength={120} value={query} onChange={event => { setQuery(event.target.value); setPage(1); setPicked([]); }} /></Field>
        <FilterMenu label="Ticket filters" active={Boolean(status || overdue)}>
        <Field name="Status"><select className={field} value={status} onChange={event => { setStatus(event.target.value); setPage(1); setPicked([]); }}><option value="">All statuses</option>{statuses.map(value => <option key={value} value={value}>{label(value)}</option>)}</select></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={overdue} onChange={event => { setOverdue(event.target.checked); setPage(1); setPicked([]); }} /> Overdue only</label>
        </FilterMenu>
      </div>}
      {!student && selected.length > 0 && <div className="flex flex-wrap items-center gap-2 border-b border-border bg-secondary p-3 text-sm">
        <span className="font-semibold">{selected.length} selected</span>
        <select aria-label="Bulk ticket actions" value="" className={button} disabled={busy} onChange={event => {
          const action = event.target.value;
          if (action === "pdf" || action === "xlsx") exportRecords(action);
          else change(selected, action as Status);
        }}>
          <option value="" disabled>Bulk actions</option><option value="in_progress">Move to In progress</option><option value="closed">Close tickets</option><option value="open">Reopen tickets</option>
          <option value="pdf">Export PDF</option><option value="xlsx">Export Excel</option>
        </select>
        <button className={button} onClick={() => setPicked([])}>Clear selection</button>
      </div>}
      {!list ? <p role="status" className="p-4">Loading tickets…</p> : list.error ? <p role="alert" className="p-4">{list.error}</p> : !rows.length ? <p className="p-5 text-muted-foreground">No tickets match this view.</p> :
        <AdminTable name="Support tickets" columns={[
          ...(!student ? [<TableSelection key="page-selection" label="Select this page" checked={all} mixed={!all && Boolean(selected.length)} onChange={() => setPicked(all ? [] : rows.map(row => row.id))} />] : []),
          "Ticket", "Priority", "Status", "Updated", ...(!student ? ["Actions"] : []),
        ]}>
          {rows.map(row => <tr key={row.id} role="row">
            {!student && <td data-label="Select" role="cell"><TableSelection label={`Select ${row.title}`} checked={selected.includes(row.id)} onChange={() => setPicked(ids => ids.includes(row.id) ? ids.filter(id => id !== row.id) : [...ids, row.id])} /></td>}
            <td data-label="Ticket" role="cell"><button className="break-words text-left font-semibold text-primary hover:underline" onClick={() => { setDetailId(row.id); detailDialog.current?.showModal(); }}>{row.title}</button><div className="compact-secondary text-xs text-muted-foreground">{label(row.category)}{row.due_date && !student ? ` · Due ${row.due_date}` : ""}</div></td>
            <td data-label="Priority" role="cell">{label(row.priority)}</td><td data-label="Status" role="cell"><span className="rounded-md bg-secondary px-2 py-1 text-sm font-medium">{label(row.status)}</span></td>
            <td data-label="Updated" role="cell">{dateTime(row.updated_at)}</td>
            {!student && <td data-label="Actions" role="cell"><RowActions label={`Actions for ${row.title}`} actions={[
              { label: "View details", run: () => { setDetailId(row.id); detailDialog.current?.showModal(); } },
              { label: "Start or update work", disabled: row.status === "closed", run: () => change([row.id], "in_progress") },
              { label: "Close ticket", disabled: row.status !== "in_progress", run: () => change([row.id], "closed") },
              { label: "Reopen ticket", disabled: row.status !== "closed", run: () => change([row.id], "open") },
            ]} /></td>}
          </tr>)}
        </AdminTable>}
      {list?.data && !Array.isArray(list.data) && <PageControls page={page} total={list.data.total} setPage={value => { setPage(value); setPicked([]); }} />}
    </section>
    {createForm}
    <PanelDialog dialog={changeDialog} title={`Move to ${label(changeAction)}`}><form className="grid gap-4" onSubmit={update}>
      <Field name="Internal work note"><textarea name="note" className={field} rows={4} required maxLength={2000} /></Field>
      {changeAction === "closed" ? <Field name="Resolution shared with requester"><textarea name="resolution" className={field} rows={3} required maxLength={2000} /></Field> :
        <Field name="Set a review due date"><input name="due_date" type="date" className={field} /></Field>}
      <label className="flex items-center gap-2 text-sm"><input name="assignee" type="checkbox" defaultChecked={changeAction === "in_progress"} /> Assign to me</label>
      {dialogError && <p role="alert">{dialogError}</p>}
      <button className={primary} disabled={busy}>Save update</button>
    </form></PanelDialog>
    <PanelDialog dialog={detailDialog} title="Ticket details">{(() => {
      const ticket = student ? rows.find(row => row.id === detailId) : detail?.data?.ticket;
      return ticket ? <div className="space-y-4">
        <div><h3 className="break-words text-xl font-bold">{ticket.title}</h3><p className="text-sm text-muted-foreground">{label(ticket.category)} · {label(ticket.status)}</p></div>
        {!student && <p className="text-sm">{detail?.data?.requester || "Account unavailable"} · {detail?.data?.assignee || "Unassigned"}</p>}
        <p className="whitespace-pre-wrap break-words">{ticket.description}</p>
        {ticket.resolution && <div className="rounded-lg border border-border p-3"><h3 className="font-semibold">Resolution</h3><p className="whitespace-pre-wrap text-sm">{ticket.resolution}</p></div>}
        {canFinance && <div className="flex flex-wrap gap-2"><Link className={button} to={`/app/admin/finance?view=payment&account_id=${ticket.account_id}`}>Student receipts</Link><Link className={button} to={`/app/admin/finance?view=invoice&account_id=${ticket.account_id}`}>Student invoices</Link></div>}
        {!student && <section className="border-t border-border pt-3"><h4 className="mb-2 font-semibold">Work history</h4>
          {detail?.data?.updates.length ? <ol className="space-y-3">{detail.data.updates.map(item => <li className="rounded-lg bg-secondary p-3" key={item.id}>
            <p className="text-xs text-muted-foreground">{item.actor || "Former account"} · {label(item.status)} · {dateTime(item.created_at)}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{item.note}</p>
          </li>)}</ol> : <p className="text-sm text-muted-foreground">No updates yet.</p>}
        </section>}
      </div> : <p role={detail?.error ? "alert" : "status"}>{detail?.error || "Loading ticket…"}</p>;
    })()}</PanelDialog>
  </section>;
}
