import { useState } from "react";
import { apiRequest } from "../services/api";
import { button, dateTime, failureMessage, field, Field, primary, useRequest } from "../pages/AdminWorkflowUI";

type Message = { id: string; template: string; status: string; attempts: number; created_at: string };
const templates = { document_reminder: "Document reminder", status_update: "Application status update" } as const;

export default function ApplicationFollowUps({ applicationId, needsDocuments }: { applicationId: string; needsDocuments: boolean }) {
  const path = `/api/admin/applications/${applicationId}/messages`;
  const [revision, refresh] = useState(0);
  const history = useRequest<Message[]>(path, revision);
  const [template, setTemplate] = useState<keyof typeof templates>("status_update");
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  async function send(id?: string) {
    setBusy(true); setMessage(""); setFailed(false);
    try {
      const result = await apiRequest<Message>(id ? `${path}/${id}/retry` : path, {
        method: "POST",
        body: id ? undefined : JSON.stringify({ id: requestId, template }),
      });
      if (!id) setRequestId(crypto.randomUUID());
      setFailed(result.status !== "accepted");
      setMessage(result.status === "accepted" ? "Email accepted by the provider." : "Email needs attention. Check its entry below before retrying.");
    } catch (error) { setFailed(true); setMessage(failureMessage(error)); }
    finally { setBusy(false); refresh(value => value + 1); }
  }

  return <section className="space-y-3 border-t border-border pt-4">
    <h3 className="font-semibold">Student follow-up emails</h3>
    <div className="flex flex-wrap items-end gap-2">
      <Field name="Email template"><select className={field} value={template} onChange={event => {
        setTemplate(event.target.value as keyof typeof templates); setRequestId(crypto.randomUUID());
      }}>
        <option value="status_update">{templates.status_update}</option>
        <option value="document_reminder" disabled={!needsDocuments}>{templates.document_reminder}</option>
      </select></Field>
      <button type="button" disabled={busy || (template === "document_reminder" && !needsDocuments)} className={primary} onClick={() => void send()}>Send follow-up</button>
    </div>
    {message && <p role={failed ? "alert" : "status"} className="text-sm">{message}</p>}
    {history?.error && <p role="alert" className="text-sm">{history.error}</p>}
    <ul className="divide-y divide-border">{history?.data?.map(row => <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
      <div className="text-sm"><p>{templates[row.template as keyof typeof templates] ?? row.template}</p><p className="text-muted-foreground">
        {row.status === "accepted" ? "Accepted by provider" : row.status === "failed" ? "Needs attention" : "Queued"} · {dateTime(row.created_at)} · {row.attempts} attempts
      </p></div>
      {row.status !== "accepted" && <button type="button" className={button} disabled={busy} onClick={() => void send(row.id)}>Retry email</button>}
    </li>)}</ul>
  </section>;
}
