import type { StudentUpdate } from "../services/opportunities";
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useRequest } from "../pages/AdminWorkflowUI";
import { getApplicationReviewCounts, listApplicationReviewers, updateApplicationReview, type AdminApplication, type ApplicationReview } from "../services/platform";

const queues = {
  mine: "Assigned to me",
  unassigned: "Unassigned",
  overdue: "Overdue",
  awaiting_documents: "Awaiting documents",
  failed_followups: "Follow-ups needing attention",
} as const;

const input = "min-h-10 rounded-lg border border-border bg-[var(--surface)] px-3 py-2 text-sm";

export function ReviewQueueSummary({ operations }: { operations: boolean }) {
  const outcomes = useRequest<{ open_verified: number; submitted: number; placed: number; median_hours_to_status_update: number | null }>(operations ? "/api/admin/opportunity-outcomes" : "");
  const workload = useRequest<{ placements: number; payments: number; support: number }>(operations ? "/api/admin/work-summary" : "");
  const [counts, setCounts] = useState<Awaited<ReturnType<typeof getApplicationReviewCounts>>>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    getApplicationReviewCounts().then(result => { if (active) setCounts(result); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);
  return <section aria-labelledby="todays-work" className="admin-panel space-y-2 p-3 sm:p-5">
    <h2 id="todays-work" className="font-semibold">Today’s work</h2>
    {failed && <p role="status" className="text-sm text-muted-foreground">Counts unavailable. You can still open a queue.</p>}
    <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
      {(Object.keys(queues) as (keyof typeof queues)[]).map(key =>
        <Link key={key} to={`/app/admin/applications?review=${key}`} className="min-w-0 rounded-lg border border-border p-2 hover:bg-muted sm:p-3">
          <span className="block text-sm text-muted-foreground">{queues[key]}</span>
          <span className="block text-xl font-semibold">{counts?.[key] ?? "—"}</span>
        </Link>
      )}
      {operations && ([
        ["placements", "Placements awaiting confirmation", "/app/admin/placements?stage=proposed"],
        ["payments", "Unmatched payments", "/app/admin/finance?view=reconciliation#unmatched-payments"],
        ["support", "Overdue support tickets", "/app/admin/support?overdue=1"],
      ] as const).map(([key, name, to]) =>
        <Link key={key} to={to} className="min-w-0 rounded-lg border border-border p-2 hover:bg-muted sm:p-3">
          <span className="block text-sm text-muted-foreground">{name}</span>
          <span className="block text-xl font-semibold">{workload?.data?.[key] ?? "—"}</span>
        </Link>
      )}
    </div>
    {outcomes?.data && <div className="space-y-2 border-t border-border pt-2">
      <h3 className="text-sm font-semibold">Opportunity outcomes</h3>
      <dl className="grid grid-cols-2 gap-2 text-sm xl:grid-cols-4">
        <div><dt className="text-xs text-muted-foreground">Verified open listings</dt><dd className="font-semibold">{outcomes.data.open_verified}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Applications · past 30 days</dt><dd className="font-semibold">{outcomes.data.submitted}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Accepted placements · 30-day application cohort</dt><dd className="font-semibold">{outcomes.data.placed}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Median to first status change · 30-day application cohort</dt>
          <dd className="font-semibold">{outcomes.data.median_hours_to_status_update == null ? "—" : `${outcomes.data.median_hours_to_status_update} h`}</dd></div>
      </dl>
    </div>}
  </section>;
}

export function ReviewQueueFilter({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <select aria-label="Review queue" value={value} onChange={event => onChange(event.target.value)} className={input}>
    <option value="all">All review queues</option>
    {Object.entries(queues).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
  </select>;
}

export function ApplicationReviewWork({ application, onSaved }: { application: AdminApplication; onSaved: (review: ApplicationReview) => void }) {
  const [reviewers, setReviewers] = useState<Awaited<ReturnType<typeof listApplicationReviewers>>>([]);
  const [reviewer, setReviewer] = useState(application.reviewer_id ?? "");
  const [due, setDue] = useState(application.review_due_date ?? "");
  const [documentRequest, setDocumentRequest] = useState(application.document_request ?? "");
  const [studentUpdate, setStudentUpdate] = useState<StudentUpdate>(application.student_update || { message: "", kind: "update", due: null });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const final = ["accepted", "rejected", "withdrawn"].includes(application.status.toLowerCase());

  useEffect(() => {
    if (final) return;
    let active = true;
    listApplicationReviewers().then(result => { if (active) setReviewers(result); }).catch(() => {
      if (active) { setMessage("Reviewer list unavailable."); setFailed(true); }
    });
    return () => { active = false; };
  }, [final]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const request: Partial<Omit<ApplicationReview, "reviewer_name">> = {};
    if ((reviewer || null) !== application.reviewer_id) request.reviewer_id = reviewer || null;
    if ((due || null) !== application.review_due_date) request.review_due_date = due || null;
    if ((documentRequest.trim() || null) !== application.document_request) request.document_request = documentRequest.trim() || null;
    const publicUpdate = studentUpdate.message.trim() ? { ...studentUpdate, message: studentUpdate.message.trim() } : null;
    const previous = application.student_update;
    if ((previous?.message || "") !== (publicUpdate?.message || "") || previous?.kind !== publicUpdate?.kind || previous?.due !== publicUpdate?.due) {
      if (previous || publicUpdate) request.student_update = publicUpdate;
    }
    if (!Object.keys(request).length) return;
    setSaving(true);
    setMessage("");
    setFailed(false);
    try {
      const updated = await updateApplicationReview(application.id, request);
      onSaved(updated);
      setDocumentRequest(updated.document_request ?? "");
      setMessage((request.document_request || request.student_update) ? "Review details saved and student notified." : "Review details saved.");
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "Unable to save review details.");
    } finally {
      setSaving(false);
    }
  }

  if (final) return <p className="text-sm text-muted-foreground">Reviewer: {application.reviewer_name || "Unassigned"}</p>;
  return <form onSubmit={event => void save(event)} className="space-y-3 border-t border-border pt-4">
    <h3 className="text-sm font-semibold">Review work</h3>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1 text-sm">Reviewer
        <select value={reviewer} onChange={event => setReviewer(event.target.value)} className={input}>
          <option value="">Unassigned</option>
          {application.reviewer_id && !reviewers.some(member => member.id === application.reviewer_id) &&
            <option value={application.reviewer_id}>{application.reviewer_name || "Current reviewer"}</option>}
          {reviewers.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm">Review due date
        <input type="date" value={due} onChange={event => setDue(event.target.value)} className={input} />
      </label>
    </div>
    <label className="grid gap-1 text-sm">Missing documents
      <textarea value={documentRequest} onChange={event => setDocumentRequest(event.target.value)} maxLength={500}
        placeholder="List what the student needs to provide" className={input} rows={2} />
    </label>
    <p className="text-xs text-muted-foreground">Saving a new request sends an in-app notification. Clear the request once the documents have been checked.</p>
    <fieldset className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2">
      <legend className="px-1 text-sm font-semibold">Student-visible update</legend>
      <label className="grid gap-1 text-sm">Update type<select className={input} value={studentUpdate.kind} onChange={event => setStudentUpdate(current => ({ ...current, kind: event.target.value as StudentUpdate["kind"] }))}>
        <option value="update">Progress update</option><option value="action">Action requested</option><option value="interview">Interview</option>
      </select></label>
      <label className="grid gap-1 text-sm">Date for the student<input className={input} type="date" value={studentUpdate.due || ""}
        onChange={event => setStudentUpdate(current => ({ ...current, due: event.target.value || null }))} /></label>
      <label className="grid gap-1 text-sm sm:col-span-2">Message<textarea className={input} rows={3} maxLength={800} value={studentUpdate.message}
        onChange={event => setStudentUpdate(current => ({ ...current, message: event.target.value }))}
        placeholder="Include the next step, interview time and location, or instructions for submitting documents." /></label>
    </fieldset>
    <button type="submit" disabled={saving} className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-60">
      {saving ? "Saving…" : "Save review details"}
    </button>
    {message && <p role={failed ? "alert" : "status"} className="text-sm">{message}</p>}
  </form>;
}
