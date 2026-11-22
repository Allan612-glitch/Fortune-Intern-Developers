import FilterMenu from "../components/FilterMenu";
import ReconciliationPanel from "./ReconciliationPanel";
import { useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpRight, BarChart3, CircleDollarSign, CreditCard, FileText, ListChecks, Plus, Receipt, Tags, Wallet } from "lucide-react";
import { AdminTable, TableSelection } from "../components/AdminTable";
import RowActions from "../components/RowActions";
import { previewPdf, saveFile } from "../components/AdminReportActions";
import { apiBlob, apiRequest } from "../services/api";
import { AccountPicker, button, dateTime, failureMessage, Field, field, label, money, monthNow, PageControls, PanelDialog, primary, useDebounced, useRequest } from "./AdminWorkflowUI";

type ManualKind = "income" | "expense";
type Kind = "payment" | "invoice" | ManualKind;
type Categories = Record<ManualKind, { name: string; is_default: boolean }[]>;
type FinanceSummary = {
  payments: number; portal_income: number; internal_income: number; revenue: number; expenses: number; refunds: number; net: number;
  start_date: string; end_date: string; categories: { kind: "payment" | ManualKind; category: string; count: number; amount: number }[];
  trend: { month: string; revenue: number; expenses: number; refunds: number }[];
};
type FinanceRecord = { id: string; kind: Kind; recipient_name: string; amount_minor: number; category: string; description: string; record_date: string; reference: string | null; test_mode: boolean;
  account_id: string | null; recipient_email: string; external_reference: string | null;
  line_items: { description: string; quantity: number; unit_amount_minor: number }[] | null };
type EditableLine = { id: string; description: string; quantity: string; price: string };
const minor = (value: string) => {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return 0;
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
};

const titles = { payment: "Payments & receipts", income: "Internal income", expense: "Expenses & vouchers", invoice: "Invoices" };
const financeViews = [
  { key: "summary", text: "Summary", label: "Summary", icon: BarChart3 },
  { key: "payment", text: "Payments", label: titles.payment, icon: CreditCard },
  { key: "income", text: "Income", label: titles.income, icon: CircleDollarSign },
  { key: "expense", text: "Expenses", label: titles.expense, icon: Wallet },
  { key: "invoice", text: "Invoices", label: titles.invoice, icon: FileText },
  { key: "reconciliation", text: "Match", label: "Reconciliation", icon: ListChecks },
  { key: "categories", text: "Categories", label: "Categories", icon: Tags },
] as const;

type PeriodMode = "all" | "month" | "day" | "range";
const dateFields = ["month", "day", "start_date", "end_date"] as const;
const today = () => new Date().toISOString().slice(0, 10);

function periodParams(params: URLSearchParams) {
  return new URLSearchParams([...params].filter(([key]) => dateFields.some(field => field === key)));
}

function PeriodFilter({ period, onApply, allowAll = false }: {
  period: URLSearchParams; onApply: (period: URLSearchParams) => void; allowAll?: boolean;
}) {
  const [mode, setMode] = useState<PeriodMode>(period.has("day") ? "day" : period.has("start_date") ? "range" :
    period.has("month") || !allowAll ? "month" : "all");
  const [day, setDay] = useState(period.get("day") || today());
  const [month, setMonth] = useState(period.get("month") || monthNow());
  const [from, setFrom] = useState(period.get("start_date") || today());
  const [until, setUntil] = useState(period.get("end_date") || today());

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = new URLSearchParams();
    if (mode === "month") query.set("month", month);
    if (mode === "day") query.set("day", day);
    if (mode === "range") {
      query.set("start_date", from);
      query.set("end_date", until);
    }
    event.currentTarget.closest<HTMLElement>("[popover]:popover-open")?.hidePopover();
    onApply(query);
  }

  return <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
    <Field name="Period"><select aria-label="Period" className={field} value={mode} onChange={event => setMode(event.target.value as PeriodMode)}>
      {allowAll && <option value="all">All dates</option>}
      <option value="month">Month</option><option value="day">Single date</option><option value="range">Date range</option>
    </select></Field>
    {mode === "month" && <Field name="Reporting month"><input type="month" className={field} value={month} required onChange={event => setMonth(event.target.value)} /></Field>}
    {mode === "day" && <Field name="Reporting date"><input type="date" className={field} value={day} required onChange={event => setDay(event.target.value)} /></Field>}
    {mode === "range" && <>
      <Field name="From"><input type="date" className={field} value={from} max={until} required onChange={event => setFrom(event.target.value)} /></Field>
      <Field name="To"><input type="date" className={field} value={until} min={from} required onChange={event => setUntil(event.target.value)} /></Field>
    </>}
    <button className={button}>Apply dates</button>
  </form>;
}

export function FinanceOverview({ initialPeriod = new URLSearchParams({ month: monthNow() }), showTrend = false, revision = 0, onPeriodChange }: {
  initialPeriod?: URLSearchParams; showTrend?: boolean; revision?: number; onPeriodChange?: (dates: URLSearchParams) => void;
}) {
  const [period, setPeriod] = useState(initialPeriod);
  const [reportError, setReportError] = useState("");
  const [exporting, setExporting] = useState(false);
  const result = useRequest<FinanceSummary>("/api/admin/finance/summary?" + period, revision);
  const cards = [
    { key: "portal_income", title: "Student payments", icon: CreditCard, kind: "payment" },
    { key: "internal_income", title: "Internal income", icon: Receipt, kind: "income" },
    { key: "revenue", title: "Total income", icon: Receipt, kind: "summary" },
    { key: "expenses", title: "Expenses", icon: Wallet, kind: "expense" },
    { key: "refunds", title: "Verified refunds", icon: Receipt, kind: "reconciliation" },
    { key: "net", title: "Net cash flow", icon: FileText, kind: "summary" },
  ] as const;
  const data = result?.data;
  const dateLabel = (value: string) => new Date(value + "T00:00:00Z").toLocaleDateString("en-GH", { dateStyle: "medium", timeZone: "UTC" });
  const dateCaption = data ? dateLabel(data.start_date) + (data.start_date === data.end_date ? "" : " – " + dateLabel(data.end_date)) : "";
  function financeLink(view: string, dates = period, category?: string) {
    const query = new URLSearchParams(dates);
    query.set("view", view);
    if (category) query.set("category", category);
    return "/app/admin/finance?" + query + (view === "reconciliation" ? "#processed-refunds" : "");
  }
  async function exportReport(format: string) {
    setExporting(true);
    setReportError("");
    try {
      const query = new URLSearchParams(period);
      query.set("format", format);
      saveFile(await apiBlob("/api/admin/finance/report?" + query), "finance-summary." + format);
    } catch (error) {
      setReportError(failureMessage(error));
    } finally {
      setExporting(false);
    }
  }

  return <section className="mb-5" aria-labelledby="finance-overview-title">
    <div className="mb-2 flex items-center justify-between gap-2">
      <div><h2 id="finance-overview-title" className="text-base font-bold sm:text-lg">Finance summary</h2>
        <p className="text-xs text-muted-foreground">Ghana cedis{dateCaption && " · " + dateCaption}</p></div>
      <FilterMenu label="Reporting dates" active={!period.has("month")}>
        <PeriodFilter key={period.toString()} period={period} onApply={onPeriodChange || setPeriod} />
      </FilterMenu>
    </div>
    {result?.error && <p role="alert" className="mb-3 text-sm">{result.error}</p>}
    {!result && <p role="status" className="sr-only">Loading finance summary</p>}
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2">
      {cards.map(({ key, title, icon: Icon, kind }) => <Link key={key} to={financeLink(kind)}
        className="admin-panel group min-w-0 px-2 py-2 hover:border-primary sm:px-3 sm:py-2.5">
        <span className="flex min-w-0 items-center gap-1.5">
          <Icon className="size-3.5 shrink-0 text-primary sm:size-4" aria-hidden="true" />
          <span className="min-w-0 flex-1 text-xs font-semibold leading-tight sm:text-sm">{title}</span>
          <ArrowUpRight className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
        </span>
        <span className="mt-1 block break-words text-base font-bold leading-tight tabular-nums sm:text-lg">{data ? money(data[key]) : "—"}</span>
        {key === "portal_income" && data && <span className="block text-[11px] leading-tight text-muted-foreground">{data.payments.toLocaleString()} verified</span>}
      </Link>)}
    </div>
    {showTrend && data && <>
      <section className="admin-panel mt-4">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2 sm:px-4">
          <h3 className="font-semibold">Category breakdown</h3>
          <select aria-label="Export finance summary" value="" disabled={exporting} className={button} onChange={event => void exportReport(event.target.value)}>
            <option value="" disabled>Export report</option><option value="pdf">PDF</option><option value="xlsx">Excel</option>
          </select>
        </header>
        {reportError && <p role="alert" className="p-3 text-sm">{reportError}</p>}
        {data.categories.length ? <AdminTable name="Finance category breakdown" columns={["Category", "Source", "Records", "Amount"]}>
          {data.categories.map(row => <tr role="row" key={row.kind + row.category}>
            <td role="cell" data-label="Category"><Link className="font-medium text-primary underline" to={financeLink(row.kind, period, row.category)}>{row.category}</Link></td>
            <td role="cell" data-label="Source">{row.kind === "payment" ? "Student payments" : row.kind === "income" ? "Internal income" : "Expenses"}</td>
            <td role="cell" data-label="Records">{row.count}</td>
            <td role="cell" data-label="Amount" className="whitespace-nowrap tabular-nums">{money(row.amount)}</td>
          </tr>)}
        </AdminTable> : <p className="p-4 text-sm text-muted-foreground">No recorded income or expenses for these dates.</p>}
      </section>
      {data.trend.length > 0 && <section className="admin-panel mt-4">
        <h3 className="border-b border-border p-4 font-semibold">Six-month comparison</h3>
        <AdminTable name="Six-month finance comparison" columns={["Month", "Income", "Expenses", "Refunds", "Net cash flow"]}>
          {[...data.trend].reverse().map(item => <tr role="row" key={item.month}>
            <td role="cell" data-label="Month"><Link className="text-primary underline" to={financeLink("summary", new URLSearchParams({month: item.month}))}>{new Date(item.month + "-01T00:00:00Z").toLocaleDateString("en-GH", { year: "numeric", month: "long", timeZone: "UTC" })}</Link></td>
            <td role="cell" data-label="Income">{money(item.revenue)}</td>
            <td role="cell" data-label="Expenses">{money(item.expenses)}</td>
            <td role="cell" data-label="Refunds">{money(item.refunds)}</td>
            <td role="cell" data-label="Net cash flow">{money(item.revenue - item.expenses - item.refunds)}</td>
          </tr>)}
        </AdminTable>
      </section>}
    </>}
  </section>;
}



export function RecentActivity() {
  const result = useRequest<{ id: string; action: string; timestamp: string; actor_name: string | null; actor_type: string; outcome: string }[]>("/api/admin/recent-activity");
  return <section className="admin-panel overflow-hidden" aria-labelledby="recent-activity">
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4 sm:p-5">
      <h2 id="recent-activity" className="text-lg font-bold">Recent activity</h2>
      <Link className={button} to="/app/admin/audit">View audit trail <ArrowUpRight className="size-4" /></Link>
    </header>
    {!result ? <p className="p-4" role="status">Loading activity…</p> : result.error ? <p className="p-4" role="alert">{result.error}</p> :
      result.data?.length ? <ul className="divide-y divide-border">{result.data.map(event => {
        const timestamp = event.timestamp;
        return <li className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm sm:px-5" key={event.id}>
          <div><Link to={`/app/admin/audit?view=evidence&event=${event.id}`} className="font-semibold hover:underline">{label(event.action)}</Link><p className="text-muted-foreground">{event.actor_name || label(event.actor_type)} · {label(event.outcome)}</p></div>
          {timestamp && <time className="text-muted-foreground" dateTime={timestamp}>{dateTime(timestamp)}</time>}
        </li>;
      })}</ul> : <p className="p-4 text-muted-foreground">No recorded activity yet.</p>}
  </section>;
}

function CategorySettings({ data, onSaved }: { data?: Categories; onSaved: () => void }) {
  const [categoryKind, setCategoryKind] = useState<ManualKind>("income");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ message: "", error: false });
  async function save(name: string, isDefault: boolean, form?: HTMLFormElement) {
    setSaving(true);
    setStatus({message: "", error: false});
    try {
      await apiRequest("/api/admin/finance/categories", { method: "POST", body: JSON.stringify({ kind: categoryKind, name, is_default: isDefault }) });
      form?.reset();
      setStatus({ message: isDefault ? "Default category updated." : "Category saved.", error: false });
      onSaved();
    } catch (error) {
      setStatus({ message: failureMessage(error), error: true });
    } finally {
      setSaving(false);
    }
  }

  return <section className="admin-panel overflow-hidden">
    <div className="space-y-3 border-b border-border p-3 sm:p-4">
      <h2 className="font-semibold">Income and expense categories</h2>
      <div className="flex flex-wrap items-end gap-2">
        <Field name="Category type"><select aria-label="Category type" className={field} disabled={saving} value={categoryKind} onChange={event => { setCategoryKind(event.target.value as ManualKind); setStatus({message: "", error: false}); }}>
          <option value="income">Internal income</option><option value="expense">Expenses</option>
        </select></Field>
        <form className="flex flex-wrap items-end gap-2" onSubmit={event => {
          event.preventDefault();
          const form = event.currentTarget;
          void save(String(new FormData(form).get("category")), false, form);
        }}>
          <Field name="Category name"><input name="category" className={field} maxLength={60} required /></Field>
          <button className={primary} disabled={saving}>Add category</button>
        </form>
      </div>
      {status.message && <p role={status.error ? "alert" : "status"} className="text-sm">{status.message}</p>}
    </div>
    <ul className="divide-y divide-border" aria-label="Configured categories">
      {data?.[categoryKind].map(item => <li key={item.name} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm sm:px-4">
        <span className="font-medium">{item.name}</span>
        {item.is_default ? <span className="rounded bg-secondary px-2 py-1 text-xs font-semibold">Default</span> :
          <button className={button} disabled={saving} onClick={() => void save(item.name, true)}>Set as default</button>}
      </li>)}
    </ul>
  </section>;
}



export default function FinancePage() {
  const [params, setParams] = useSearchParams();
  const view = params.get("view") || "summary";
  const kind: Kind = view === "expense" || view === "invoice" || view === "income" ? view : "payment";
  const period = periodParams(params);
  const isRecordView = Object.prototype.hasOwnProperty.call(titles, view);
  const q = params.get("q") || "";
  const searchTerm = useDebounced(q);
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [revision, setRevision] = useState(0);
  const search = new URLSearchParams(period);
  search.set("kind", kind);
  search.set("q", searchTerm);
  search.set("page", String(page));
  if (params.get("test") === "1" && kind === "payment") search.set("include_test", "true");
  const categoryFilter = params.get("category") || "";
  if (categoryFilter) search.set("category", categoryFilter);
  const linkedAccount = params.get("account_id");
  if (linkedAccount) search.set("account_id", linkedAccount);
  const result = useRequest<{ items: FinanceRecord[]; total: number }>(isRecordView ? "/api/admin/finance?" + search : "", revision);
  const categories = useRequest<Categories>("/api/admin/finance/categories", revision);
  const [editing, setEditing] = useState<FinanceRecord | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [recipient, setRecipient] = useState("");
  const [error, setError] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [draftLines, setDraftLines] = useState<EditableLine[]>([]);
  const computedTotal = draftLines.reduce((sum, line) => sum + Number(line.quantity) * minor(line.price), 0);
  function editLine(id: string, key: "description" | "quantity" | "price", value: string) {
    setDraftLines(lines => lines.map(line => line.id === id ? { ...line, [key]: value } : line));
  }
  const [formKind, setFormKind] = useState<Kind>("expense");
  const isManual = formKind === "income" || formKind === "expense";
  const dialog = useRef<HTMLDialogElement>(null);
  const rows = result?.data?.items ?? [];
  const selected = rows.filter(row => picked.includes(row.id)).map(row => row.id);
  const all = rows.length > 0 && rows.length === selected.length;

  function change(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== "page") next.delete("page");
    if (key === "view") {
      next.delete("category");
      next.delete("q");
    }
    setPicked([]);
    setParams(next, { replace: key === "q" });
  }

  function applyDates(dates: URLSearchParams) {
    const next = new URLSearchParams(params);
    dateFields.forEach(key => next.delete(key));
    dates.forEach((value, key) => next.set(key, value));
    next.delete("page");
    setPicked([]);
    setParams(next);
  }

  async function run(work: () => Promise<void>, inDialog = false) {
    setBusy(true);
    setError("");
    setDialogError("");
    setNotice("");
    try { await work(); } catch (error) {
      if (inDialog) setDialogError(failureMessage(error)); else setError(failureMessage(error));
    } finally { setBusy(false); }
  }

  function openForm(next: Kind, record: FinanceRecord | null = null) {
    setFormKind(next);
    setEditing(record);
    setRecipient(record?.account_id || "");
    setDraftLines(record?.line_items?.map(line => ({
      id: crypto.randomUUID(), description: line.description, quantity: String(line.quantity), price: (line.unit_amount_minor / 100).toFixed(2),
    })) ?? []);
    setDialogError("");
    setFormKey(key => key + 1);
    dialog.current?.showModal();
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run(async () => {
      const path = formKind === "payment" ? "/api/admin/finance/payments/verify" : "/api/admin/finance" + (editing ? "/" + editing.id : "");
      if ((formKind === "payment" || formKind === "invoice") && !recipient) throw new Error("Select a recipient account.");
      const lineItems = draftLines.map(line => ({
        description: line.description.trim(), quantity: Number(line.quantity), unit_amount_minor: minor(line.price),
      }));
      const amount = draftLines.length ? computedTotal : minor(String(form.get("amount") || ""));
      if (formKind !== "payment" && (!Number.isSafeInteger(amount) || amount <= 0 || amount > 100000000
          || lineItems.some(line => !line.description || line.unit_amount_minor <= 0))) throw new Error("Enter valid line items and an amount from GHS 0.01 to GHS 1,000,000.");
      const payload = formKind === "payment" ? { account_id: recipient, reference: String(form.get("reference")).trim() } :
        { kind: formKind, account_id: recipient || null, amount_minor: amount, description: form.get("description"),
          category: form.get("category"), record_date: form.get("date"), recipient_name: form.get("payee") || "", recipient_email: form.get("email") || "",
          due_date: form.get("due_date") || null, external_reference: String(form.get("document_reference") || "").trim() || null,
          line_items: draftLines.length ? lineItems : null };
      await apiRequest(path, { method: editing ? "PUT" : "POST", body: JSON.stringify(payload) });
      dialog.current?.close();
      setNotice(formKind === "payment" ? "Payment verified and recorded. Test payments are available through the test filter." : editing ? "Record updated." : "Document created.");
      if (view !== formKind) change("view", formKind);
      setRevision(count => count + 1);
    }, true);
  }

  function email(row: FinanceRecord) {
    if (!window.confirm(`Email this ${row.kind === "payment" || row.kind === "income" ? "receipt" : row.kind === "expense" ? "voucher" : "invoice"} to the recipient on file for ${row.recipient_name}?`)) return;
    void run(async () => {
      const result = await apiRequest<{ message: string }>(`/api/admin/finance/${row.id}/send`, { method: "POST" });
      setNotice(result.message);
    });
  }

  function download(format: "pdf" | "xlsx") {
    void run(async () => {
      const file = await apiBlob("/api/admin/finance/export", { method: "POST", body: JSON.stringify({ ids: selected, format }) });
      saveFile(file, `finance-records.${format}`);
    });
  }

  return <div className="admin-page mx-auto w-full max-w-[86rem] space-y-3 p-4 sm:space-y-4 sm:p-6 lg:p-8">
    <header className="admin-section-header flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
      <h1 className="text-xl font-bold sm:text-2xl">Finance</h1>
      {isRecordView && <button className={primary} onClick={() => openForm(kind)}><Plus className="size-4" />
        {{ invoice: "New invoice", expense: "Log expense", income: "Record income", payment: "Verify payment" }[kind]}</button>}
    </header>
    <nav className="admin-panel grid grid-cols-4 gap-0.5 p-1 sm:grid-cols-7 sm:gap-1" aria-label="Finance views">
      {financeViews.map(({ key, text, label: fullLabel, icon: Icon }) => <button
        type="button" key={key} aria-pressed={view === key} aria-label={fullLabel} title={fullLabel}
        className="flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-md px-0.5 text-center text-[11px] font-semibold leading-tight text-foreground hover:bg-secondary aria-pressed:bg-primary aria-pressed:text-primary-foreground sm:flex-row sm:gap-1.5 sm:px-1 sm:text-xs"
        onClick={() => change("view", key)}>
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <span>{text}</span>
      </button>)}
    </nav>
    {notice && <p className="admin-panel p-3 text-sm" role="status">{notice}</p>}
    {error && <p className="admin-panel p-3 text-sm" role="alert">{error}</p>}
    {view === "summary" ? <FinanceOverview key={period.toString()} initialPeriod={period.size ? period : undefined} showTrend revision={revision} onPeriodChange={applyDates} /> : view === "reconciliation" ? <ReconciliationPanel key={period.toString()} refundPeriod={period} periodFilter={<PeriodFilter period={period} onApply={applyDates} allowAll />} /> : view === "categories" ? <CategorySettings data={categories?.data} onSaved={() => setRevision(value => value + 1)} /> : <section className="admin-panel overflow-hidden">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 border-b border-border p-3">
        {linkedAccount && <div className="col-span-full flex flex-wrap items-center gap-2 text-sm">Showing one account <button type="button" className={button} onClick={() => change("account_id", "")}>Show all accounts</button></div>}
        <Field name="Search records"><input type="search" className={field} value={q} maxLength={120} onChange={event => change("q", event.target.value)} placeholder="Recipient, category or reference" /></Field>
        <FilterMenu label="Finance filters" active={Boolean(period.size || categoryFilter || params.get("test"))}>
        <PeriodFilter key={period.toString()} period={period} onApply={applyDates} allowAll />
        {(kind === "income" || kind === "expense") && <Field name="Category"><select aria-label="Category" className={field} value={categoryFilter} onChange={event => change("category", event.target.value)}>
          <option value="">All categories</option>
          {categoryFilter && !categories?.data?.[kind].some(item => item.name === categoryFilter) && <option>{categoryFilter}</option>}
          {categories?.data?.[kind].map(item => <option key={item.name}>{item.name}</option>)}
        </select></Field>}
        {categoryFilter && kind !== "income" && kind !== "expense" && <button type="button" className={button} onClick={() => change("category", "")}>Clear category</button>}
        {kind === "payment" && <label className="inline-flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={params.get("test") === "1"} onChange={event => change("test", event.target.checked ? "1" : "")} /> Include test payments</label>}
        </FilterMenu>
        {period.size > 0 && <p className="col-span-full text-xs text-muted-foreground">
          {period.get("day") || period.get("month") || [period.get("start_date"), period.get("end_date")].filter(Boolean).join(" – ")}
        </p>}
      </div>
      {selected.length > 0 && <div className="flex flex-wrap items-center gap-2 border-b border-border bg-secondary p-3 text-sm">
        <span className="font-semibold">{selected.length} selected</span>
        <select aria-label="Bulk actions" className={button} value="" disabled={busy} onChange={event => download(event.target.value as "pdf" | "xlsx")}>
          <option value="" disabled>Bulk actions</option><option value="pdf">Export PDF</option><option value="xlsx">Export Excel</option>
        </select>
        <button className={button} onClick={() => setPicked([])}>Clear selection</button>
      </div>}
      {!result ? <p className="p-4" role="status">Loading records…</p> : result.error ? <p className="p-4" role="alert">{result.error}</p> : !rows.length ? <p className="p-5 text-muted-foreground">No records match this view.</p> :
        <AdminTable name={titles[kind]} columns={[
          <TableSelection key="page-selection" label="Select this page" checked={all} mixed={!all && Boolean(selected.length)} onChange={() => setPicked(all ? [] : rows.map(row => row.id))} />,
          "Recipient", "Category", "Date", "Amount", "Actions",
        ]}>
          {rows.map(row => <tr key={row.id} role="row" className={selected.includes(row.id) ? "admin-table-selected" : ""}>
            <td data-label="Select" role="cell"><TableSelection label={`Select record for ${row.recipient_name}`} checked={selected.includes(row.id)} onChange={() => setPicked(ids => ids.includes(row.id) ? ids.filter(id => id !== row.id) : [...ids, row.id])} /></td>
            <td data-label="Recipient" role="cell"><button type="button" className="text-left font-semibold text-primary hover:underline" onClick={() => void run(() => previewPdf(() => apiBlob(`/api/admin/finance/${row.id}/document`)))}>{row.recipient_name}</button><div className="compact-secondary break-words text-xs text-muted-foreground">{row.description}{row.test_mode ? " · Test payment" : ""}</div></td>
            <td data-label="Category" role="cell">{row.category}</td><td data-label="Date" role="cell">{row.record_date}</td>
            <td data-label="Amount" role="cell"><span className="whitespace-nowrap font-semibold tabular-nums">{money(row.amount_minor)}</span></td>
            <td data-label="Actions" role="cell"><RowActions label={`Document actions for ${row.recipient_name}`} actions={[
              ...((row.kind === "income" || row.kind === "expense") && !row.reference && !row.test_mode ? [
                { label: "Edit record", run: () => openForm(row.kind, row) },
              ] : []),
              { label: "Preview PDF", run: () => void run(() => previewPdf(() => apiBlob(`/api/admin/finance/${row.id}/document`))) },
              { label: "Download PDF", run: () => void run(async () => saveFile(await apiBlob(`/api/admin/finance/${row.id}/document`), `${row.kind}-${row.id}.pdf`)) },
              { label: "Share PDF", run: () => void run(async () => {
                const blob = await apiBlob(`/api/admin/finance/${row.id}/document`);
                const file = new File([blob], `${row.kind}-${row.id}.pdf`, { type: "application/pdf" });
                if (navigator.canShare?.({ files: [file] })) {
                  try { await navigator.share({ files: [file], title: titles[row.kind] }); }
                  catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) throw error; }
                } else { saveFile(file, file.name); setNotice("PDF downloaded. You can attach it from your downloads."); }
              }) },
              { label: "Send or resend by email", disabled: busy || row.test_mode, run: () => email(row) },
            ]} /></td>
          </tr>)}
        </AdminTable>}
      {result?.data && <PageControls total={result.data.total} page={page} setPage={value => change("page", String(value))} />}
    </section>}
    <PanelDialog dialog={dialog} title={editing ? "Edit record" : { invoice: "Create invoice", expense: "Log expense", income: "Record income", payment: "Verify student payment" }[formKind]}>
      <form key={formKey} className="grid gap-3" onSubmit={save}>
        {editing?.account_id && recipient === editing.account_id ?
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 text-sm"><span>Linked account · {editing.recipient_name}</span>
            <button type="button" className={button} onClick={() => setRecipient("")}>Change account</button></div> :
          <AccountPicker value={recipient} onChange={setRecipient} required={!isManual} />}
        {formKind === "payment" ? <Field name="Paystack reference"><input name="reference" className={field} minLength={4} maxLength={100} required /></Field> : <>
          {isManual && !recipient && <><Field name={formKind === "income" ? "Received from" : "Payee name"}><input name="payee" defaultValue={editing?.recipient_name} className={field} required maxLength={180} /></Field><Field name="Contact email (optional)"><input name="email" type="email" defaultValue={editing?.recipient_email} className={field} maxLength={254} /></Field></>}
          <div className="grid gap-3 sm:grid-cols-2"><Field name="Amount (GHS)"><input name="amount" type="text" inputMode="decimal" pattern="\d+(\.\d{1,2})?" defaultValue={editing ? (editing.amount_minor / 100).toFixed(2) : ""} className={field} disabled={Boolean(draftLines.length)} required={!draftLines.length} /></Field><Field name={formKind === "invoice" ? "Issue date" : "Transaction date"}><input name="date" type="date" defaultValue={editing?.record_date || today()} className={field} required /></Field></div>
          {isManual ? <Field name="Category"><select aria-label="Category" name="category" className={field} defaultValue={editing?.category || ""}>
            <option value="">Use default{categories?.data?.[formKind].find(item => item.is_default)?.name ? " · " + categories.data[formKind].find(item => item.is_default)?.name : ""}</option>
            {editing && !categories?.data?.[formKind].some(item => item.name === editing.category) && <option>{editing.category}</option>}
            {categories?.data?.[formKind].map(item => <option key={item.name}>{item.name}</option>)}
          </select></Field> : <Field name="Category"><input name="category" className={field} required maxLength={60} /></Field>}
          <Field name="Description"><textarea name="description" defaultValue={editing?.description} className={field} required maxLength={300} /></Field>
          {formKind === "invoice" && <Field name="Due date (optional)"><input name="due_date" type="date" className={field} /></Field>}
          <details className="rounded-lg border border-border p-3">
            <summary className="cursor-pointer text-sm font-semibold">Line items and reference{draftLines.length ? ` · ${draftLines.length}` : ""}</summary>
            <div className="mt-3 space-y-3">
              <Field name="Reference (optional)"><input name="document_reference" defaultValue={editing?.external_reference || ""} className={field} maxLength={100} /></Field>
              {draftLines.map((line, index) => <div className="grid min-w-0 grid-cols-2 gap-2 border-t border-border pt-2" key={line.id}>
                <div className="col-span-full"><Field name={`Item ${index + 1}`}><input className={field} required maxLength={180}
                  value={line.description} onChange={event => editLine(line.id, "description", event.target.value)} /></Field></div>
                <Field name="Quantity"><input type="number" className={field} min="1" max="9999" step="1" required value={line.quantity}
                  onChange={event => editLine(line.id, "quantity", event.target.value)} /></Field>
                <Field name="Unit price (GHS)"><input inputMode="decimal" pattern="\d+(\.\d{1,2})?" className={field} required value={line.price}
                  onChange={event => editLine(line.id, "price", event.target.value)} /></Field>
                <button type="button" className={button} onClick={() => setDraftLines(lines => lines.filter(item => item.id !== line.id))}>Remove item</button>
              </div>)}
              <button type="button" className={button} disabled={draftLines.length >= 40} onClick={() => setDraftLines(lines =>
                [...lines, { id: crypto.randomUUID(), description: "", quantity: "1", price: "" }])}>Add line item</button>
              {draftLines.length > 0 && <p aria-live="polite" className="font-semibold">Total {money(computedTotal)}</p>}
            </div>
          </details>
        </>}
        {dialogError && <p role="alert" className="text-sm">{dialogError}</p>}
        <button className={primary} disabled={busy}>{busy ? "Saving…" : formKind === "payment" ? "Verify and record" : editing ? "Save changes" : "Create document"}</button>
      </form>
    </PanelDialog>
  </div>;
}
