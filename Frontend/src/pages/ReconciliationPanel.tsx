import { previewPdf } from "../components/AdminReportActions";
import { AdminTable } from "../components/AdminTable";
import RowActions from "../components/RowActions";
import { useState, type FormEvent, type ReactNode } from "react";
import { apiRequest, apiBlob } from "../services/api";
import { button, failureMessage, dateTime, field, Field, label, money, primary, useRequest } from "./AdminWorkflowUI";

const base = "/api/admin/finance/reconciliation";
type Data = {
  invoices: { id: string; recipient: string; amount_minor: number; linked: boolean; refunded_minor: number }[];
  unmatched_payments: { reference: string; recipient: string; amount_minor: number }[];
  refunds: { id: string; reference: string; amount_minor: number; refunded_at: string; test_mode: boolean }[];
};
type Settlement = { items: { reference: string; amount_minor: number; result: string }[]; has_next: boolean; test_mode: boolean };

export default function ReconciliationPanel({ refundPeriod, periodFilter }: { refundPeriod: URLSearchParams; periodFilter: ReactNode }) {
  const [revision, refresh] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [settlementId, setSettlementId] = useState("");
  const [settlementPage, setSettlementPage] = useState(1);
  const [settlementQuery, setSettlementQuery] = useState("");
  const query = new URLSearchParams(refundPeriod);
  query.set("page", String(page));
  const result = useRequest<Data>(base + "?" + query, revision);
  const settlement = useRequest<Settlement>(settlementQuery
    ? base + "/settlement?" + new URLSearchParams({ settlement_id: settlementQuery, page: String(settlementPage) }) : "");

  async function save(work: () => Promise<unknown>, message: string) {
    setBusy(true); setError(""); setNotice("");
    try { await work(); refresh(value => value + 1); setNotice(message); }
    catch (cause) { setError(failureMessage(cause)); }
    finally { setBusy(false); }
  }

  function match(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const reference = String(new FormData(event.currentTarget).get("reference")).trim();
    void save(() => apiRequest(base + "/invoices/" + id, { method: "PUT", body: JSON.stringify({ reference }) }), "Invoice matched.");
  }

  function refund(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    void save(() => apiRequest(base + "/refunds", { method: "POST", body: JSON.stringify(data) }), "Processed refund recorded.");
  }

  return <div className="grid gap-4">
    {error && <p role="alert" className="admin-panel p-4 text-sm">{error}</p>}
    {notice && <p role="status" className="admin-panel p-4 text-sm">{notice}</p>}
    {result?.error && <p role="alert" className="admin-panel p-4 text-sm">{result.error}</p>}
    <section className="admin-panel space-y-3 p-5">
      <h2 className="font-semibold">Invoice matches</h2>
      <AdminTable name="Invoice matches" columns={["Invoice", "Amount", "Status", "Reference", "Payment match"]} titleToggles>
        {result?.data?.invoices.map(row => <tr role="row" key={row.id}>
          <td role="cell" data-label="Invoice" className="font-semibold">{row.recipient}</td>
          <td role="cell" data-label="Amount">{money(row.amount_minor)}</td>
          <td role="cell" data-label="Status"><span className="rounded bg-secondary px-2 py-1 text-xs">{row.linked ? "Matched" : "Unmatched"}</span></td>
          <td role="cell" data-label="Reference">{row.id}{row.refunded_minor > 0 && <p className="text-xs text-muted-foreground">Refunded {money(row.refunded_minor)}</p>}</td>
          <td role="cell" data-label="Payment match">
            {row.linked ? <button type="button" className={button} disabled={busy} onClick={() => void save(
              () => apiRequest(base + "/invoices/" + row.id, { method: "DELETE" }), "Invoice match removed.")}>Remove match</button> :
              <form className="flex flex-wrap items-end gap-2" onSubmit={event => match(event, row.id)}>
                <Field name="Paystack payment reference"><input name="reference" required minLength={4} maxLength={100} className={field}/></Field>
                <button className={primary} disabled={busy}>Match payment</button>
              </form>}
          </td>
        </tr>)}
      </AdminTable>
      {result?.data && !result.data.invoices.length && <p className="text-sm text-muted-foreground">No invoices on this page.</p>}
    </section>
    <section id="unmatched-payments" className="admin-panel space-y-3 p-5">
      <h2 className="font-semibold">Unmatched payments</h2>
      <AdminTable name="Unmatched payments" columns={["Payer", "Reference", "Amount"]} titleToggles>
        {result?.data?.unmatched_payments.map(row => <tr role="row" key={row.reference}>
          <td role="cell" data-label="Payer" className="font-semibold">{row.recipient}</td>
          <td role="cell" data-label="Reference">{row.reference}</td>
          <td role="cell" data-label="Amount" className="tabular-nums">{money(row.amount_minor)}</td>
        </tr>)}
      </AdminTable>
      {result?.data && !result.data.unmatched_payments.length && <p className="text-sm text-muted-foreground">No unmatched live payments on this page.</p>}
    </section>
    <section id="processed-refunds" className="admin-panel space-y-3 p-3 sm:p-5">
      <h2 className="font-semibold">Processed refunds</h2>
      {periodFilter}
      {refundPeriod.size > 0 && <p className="text-xs text-muted-foreground">Verified refunds · {refundPeriod.get("day") || refundPeriod.get("month") || [refundPeriod.get("start_date"), refundPeriod.get("end_date")].join(" – ")}</p>}
      <form className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_auto]" onSubmit={refund}>
        <Field name="Original payment reference"><input name="reference" required minLength={4} maxLength={100} className={field}/></Field>
        <Field name="Paystack refund ID"><input name="refund_id" required inputMode="numeric" pattern="[1-9][0-9]{0,18}" className={field}/></Field>
        <button className={primary} disabled={busy}>Verify and record</button>
      </form>
      <AdminTable name="Processed refunds" columns={["Reference", "Refunded", "Amount", "Actions"]}>
        {result?.data?.refunds.map(row => {
          const preview = () => void previewPdf(() => apiBlob(base + "/refunds/" + encodeURIComponent(row.id) + "/document")).catch(cause => setError(failureMessage(cause)));
          return <tr role="row" key={row.id}>
            <td role="cell" data-label="Reference"><button type="button" className="text-left font-semibold text-primary hover:underline" onClick={preview}>{row.reference}</button></td>
            <td role="cell" data-label="Refunded">{dateTime(row.refunded_at)}{row.test_mode ? " · Test" : ""}</td>
            <td role="cell" data-label="Amount" className="tabular-nums">{money(row.amount_minor)}</td>
            <td role="cell" data-label="Actions" className="admin-table-actions">
              <RowActions label={`Actions for refund ${row.reference}`} actions={[{ label: "Preview refund confirmation", run: preview }]} />
            </td>
          </tr>;
        })}
      </AdminTable>
      {result?.data && !result.data.refunds.length && <p className="text-sm text-muted-foreground">No recorded refunds match these dates.</p>}
    </section>
    <div className="flex flex-wrap items-center gap-2">
      <button className={button} disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous records</button><span>Page {page}</span>
      <button className={button} disabled={!result?.data || Math.max(result.data.invoices.length, result.data.refunds.length, result.data.unmatched_payments.length) < 25}
        onClick={() => setPage(value => value + 1)}>Next records</button>
    </div>
    <section className="admin-panel space-y-3 p-5">
      <h2 className="font-semibold">Check a Paystack settlement</h2>
      <form className="flex flex-wrap items-end gap-2" onSubmit={event => {
        event.preventDefault(); setSettlementPage(1); setSettlementQuery(settlementId.trim());
      }}>
        <Field name="Settlement ID"><input value={settlementId} onChange={event => setSettlementId(event.target.value)}
          inputMode="numeric" pattern="[1-9][0-9]{0,18}" required className={field}/></Field>
        <button className={primary}>Compare receipts</button>
      </form>
      {settlement?.error && <p role="alert" className="text-sm">{settlement.error}</p>}
      {settlement?.data && <><p className="text-sm text-muted-foreground">{settlement.data.test_mode ? "Test · " : ""}GHS transactions in the Paystack settlement</p>
        <AdminTable name="Settlement results" columns={["Reference", "Amount", "Status"]} titleToggles>
          {settlement.data.items.map((row, index) => <tr role="row" key={`${row.reference}-${index}`}>
            <td role="cell" data-label="Reference" className="font-semibold">{row.reference}</td>
            <td role="cell" data-label="Amount" className="tabular-nums">{money(row.amount_minor)}</td>
            <td role="cell" data-label="Status"><span className="rounded bg-secondary px-2 py-1 text-xs">{label(row.result)}</span></td>
          </tr>)}
        </AdminTable>
        <div className="flex items-center gap-3">
          <button className={button} disabled={settlementPage <= 1} onClick={() => setSettlementPage(value => value - 1)}>Previous page</button>
          <button className={button} disabled={!settlement.data.has_next} onClick={() => setSettlementPage(value => value + 1)}>Next page</button>
        </div>
      </>}
    </section>
  </div>;
}
