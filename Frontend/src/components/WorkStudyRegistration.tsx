import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { AppUser } from "../App";
import { apiRequest } from "../services/api";
import { useWorkStudyRegistrations, workStudyAvailability, workStudyHours, workStudyLabel, workStudyRoles, type WorkStudyRegistration as Registration } from "../services/workStudy";
import { studentField, studentLink } from "./StudentPortalUI";

const pageSize = 25;

export default function WorkStudyRegistration({ user }: { user: AppUser }) {
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const result = useWorkStudyRegistrations(`/api/work-study/mine?limit=${pageSize + 1}&offset=${page * pageSize}`, revision);
  const loading = !result;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState<Registration | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) || "").trim();
    const payload = {
      applicant_name: text("applicant_name"), date_of_birth: text("date_of_birth"),
      phone: text("phone"), institution: text("institution"), chapter: text("chapter"),
      preferred_role: text("preferred_role"), availability: text("availability"),
      weekly_hours: text("weekly_hours"), consent: form.has("consent"),
    };
    if (!Object.values(payload).every(Boolean)) {
      setError("Please complete all fields and confirm your consent.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await apiRequest<Registration>("/api/work-study", {
        method: "POST", body: JSON.stringify(payload),
      });
      setSubmitted(result);
      setPage(0);
      setRevision(value => value + 1);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to submit your registration.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="space-y-4">
    <p className="rounded-lg border border-border bg-secondary p-3 text-sm">
      No payment is collected with this registration. Contact the FIN desk for current fee information.
    </p>
    {loading ? <p role="status" className="text-sm text-muted-foreground">Loading your registrations…</p> :
      result.error ? <p role="alert" className="text-sm">{result.error} <button type="button" className="font-semibold text-primary underline" onClick={() => setRevision(value => value + 1)}>Try again</button></p> :
      result.data && (result.data.length > 0 || page > 0) && <section className="rounded-lg border border-border p-3">
        <h3 className="font-semibold">Your registrations</h3>
        <ul className="mt-2 space-y-2 text-sm">{result.data.slice(0, pageSize).map(record => <li key={record.id} className="border-t border-border pt-2">
          <p className="font-semibold">{workStudyLabel(workStudyRoles, record.preferred_role)}</p>
          <p className="text-muted-foreground">{record.institution} · {record.chapter}</p>
          <p className="break-words text-muted-foreground">{record.applicant_name} · {record.email} · {record.phone}</p>
          <p className="text-muted-foreground">{workStudyLabel(workStudyAvailability, record.availability)} · {workStudyLabel(workStudyHours, record.weekly_hours)} per week</p>
          <p className="break-all">Reference: {record.id}</p>
          {record.requires_minor_review && <p className="text-muted-foreground">Guardian or institution approval is required for applicants under 18.</p>}
        </li>)}</ul>
        {(page > 0 || result.data.length > pageSize) && <div className="mt-3 flex items-center gap-3">
          <button type="button" className="min-h-10 font-semibold text-primary underline disabled:opacity-50" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Previous</button>
          <span>Page {page + 1}</span>
          <button type="button" className="min-h-10 font-semibold text-primary underline disabled:opacity-50" disabled={result.data.length <= pageSize} onClick={() => setPage(value => value + 1)}>Next</button>
        </div>}
      </section>}
    {submitted ? <div role="status" className="rounded-lg border border-border bg-secondary p-4 text-sm">
      <h3 className="font-bold">Registration submitted</h3>
      <p className="mt-1 break-all">Reference: {submitted.id}</p>
      <p className="mt-2">Your registration has been saved. No payment was collected.</p>
      {submitted.requires_minor_review && <p className="mt-2">Guardian or institution approval is required for applicants under 18.</p>}
      <button type="button" className={`${studentLink} mt-3 disabled:opacity-50`} disabled={loading} onClick={() => setSubmitted(null)}>Start another registration</button>
    </div> : <form onSubmit={submit} className="space-y-4">
      <h3 className="font-semibold">Personal information</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 font-semibold">Full name <input className={studentField} name="applicant_name" autoComplete="name" defaultValue={user.name} maxLength={200} required /></label>
        <label className="grid gap-1 font-semibold">Account email <input className={studentField} value={user.email} readOnly /></label>
        <label className="grid gap-1 font-semibold">Phone number <input className={studentField} name="phone" type="tel" autoComplete="tel" maxLength={40} required /></label>
        <label className="grid gap-1 font-semibold">Date of birth <input className={studentField} name="date_of_birth" type="date" max={new Date().toISOString().slice(0, 10)} required /></label>
      </div>
      <p className="text-xs text-muted-foreground">Applicants must be at least 16. Applicants under 18 need guardian or institution approval.</p>
      <h3 className="font-semibold">Institution and availability</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 font-semibold">Institution <input className={studentField} name="institution" defaultValue={user.school} maxLength={200} required /></label>
        <label className="grid gap-1 font-semibold">Chapter <input className={studentField} name="chapter" placeholder="Chapter or location" maxLength={200} required /></label>
        <label className="grid gap-1 font-semibold">Preferred role <select className={studentField} name="preferred_role" defaultValue="" required>
          <option value="">Select a role</option>{workStudyRoles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <label className="grid gap-1 font-semibold">Availability <select className={studentField} name="availability" defaultValue="" required>
          <option value="">Select availability</option>{workStudyAvailability.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <label className="grid gap-1 font-semibold">Hours per week <select className={studentField} name="weekly_hours" defaultValue="" required>
          <option value="">Select hours</option>{workStudyHours.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
      </div>
      <label className="flex items-start gap-2"><input className="mt-1" type="checkbox" name="consent" required />
        <span>I confirm these details are mine and accurate, and consent to processing under the <Link className="font-semibold text-primary underline" to="/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>.</span>
      </label>
      {error && <p role="alert" className="text-red-600">{error}</p>}
      <button className={`${studentLink} disabled:opacity-50`} type="submit" disabled={saving || loading}>{saving ? "Submitting…" : "Submit registration"}</button>
    </form>}
  </div>;
}
