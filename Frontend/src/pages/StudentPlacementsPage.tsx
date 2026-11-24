import PlacementDocuments from "../components/PlacementDocuments";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useRequest, button, failureMessage, label } from "./AdminWorkflowUI";
import { StudentDisclosure, StudentPage, studentLink } from "../components/StudentPortalUI";
import { apiRequest } from "../services/api";
import type { StudentPlacement } from "../services/opportunities";
import { printCompletionCertificate } from "../services/platform";

export default function StudentPlacementsPage() {
  const [revision, setRevision] = useState(0);
  const result = useRequest<StudentPlacement[]>("/api/student/placements", revision);
  const [open, setOpen] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const items = result?.data;

  async function accept(id: string) {
    if (!window.confirm("Accept this internship placement?")) return;
    setBusy(true);
    setError("");
    try {
      await apiRequest("/api/student/placements/" + encodeURIComponent(id) + "/accept", { method: "POST" });
      setNotice("Placement accepted.");
      setRevision(old => old + 1);
    } catch (error) {
      setError(failureMessage(error));
    } finally { setBusy(false); }
  }

  return <StudentPage title="My placements" description="Review your offers and find your placement dates, supervisor and completion records.">
    {notice && <p className="student-panel p-3 text-sm" role="status">{notice}</p>}
    {error && <p className="student-panel p-3 text-sm" role="alert">{error}</p>}
    {!result ? <p role="status" className="student-panel p-3 text-sm">Loading placements…</p> : result.error ? <p role="alert" className="student-panel flex items-center justify-between gap-2 p-3 text-sm">{result.error}
      <button className={button} onClick={() => setRevision(old => old + 1)}>Try again</button></p> :
      items?.length ? <ul className="student-panel" aria-label="My placements">{items.map(item => {
        const applicationLink = "/app/applications?" + new URLSearchParams({ ref: item.application_id });
        return <StudentDisclosure key={item.id} title={item.title} subtitle={item.employer}
          badge={<span className="inline-block rounded bg-secondary px-2 py-1 font-semibold text-primary">{item.status === "employer_confirmed" ? "Offer ready" : label(item.status)}</span>}
          open={open === item.id} onToggle={() => setOpen(open === item.id ? "" : item.id)}>
          <dl className="student-facts">
            <div><dt>Start date</dt><dd>{item.start_date || "To be confirmed"}</dd></div>
            <div><dt>End date</dt><dd>{item.end_date || "To be confirmed"}</dd></div>
            <div><dt>Supervisor</dt><dd>{item.supervisor || "To be confirmed"}</dd></div>
          </dl>
          {item.placement_files_available ? <PlacementDocuments applicationId={item.application_id} /> :
            <p className="text-sm text-muted-foreground">Placement documents are awaiting issue.</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {item.status === "employer_confirmed" && <button type="button" className={studentLink} disabled={busy} onClick={() => void accept(item.id)}>Accept placement</button>}
            {item.certificate_approved && <button type="button" className={button} onClick={() => void printCompletionCertificate(item.application_id).catch(error => setError(failureMessage(error)))}>Open certificate</button>}
            <Link className={button} to={applicationLink}>Application and assessment</Link>
          </div>
        </StudentDisclosure>;
      })}</ul> : <p className="student-panel p-3 text-sm text-muted-foreground">Confirmed offers and placements will appear here.</p>}
    <details className="student-panel p-3"><summary className="cursor-pointer text-sm font-semibold">Prepare for your placement</summary>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Confirm your start date, working hours and reporting location with your supervisor.</li>
        <li>Bring any documents your employer or institution has requested.</li>
        <li>Agree on learning goals and ask how your supervisor assessment will be completed.</li>
      </ul>
    </details>
  </StudentPage>;
}
