import PlacementDocuments from "../components/PlacementDocuments";
import { Link, useSearchParams } from "react-router-dom";
import { StudentDisclosure, StudentPage, studentField, studentLink } from "../components/StudentPortalUI";
import FilterMenu from "../components/FilterMenu";
import { previewPdf } from "../components/AdminReportActions";
import { useCallback, useEffect, useRef, useState, useId } from "react";
import ApplicationHistory from "../components/ApplicationHistory";
import AsyncState from "../components/AsyncState";
import Spinner from "../components/ui/Spinner";
import {
  applicationNextSteps,
  fromBackendApplication,
  type ApplicationRecord,
  type ApplicationStatus,
} from "../services/applications";
import {
  listApplications,
  printCompletionCertificate,
  saveResumeDownload,
  getResumeFile,
  uploadSupervisorAssessment,
} from "../services/platform";

const statuses: Array<ApplicationStatus | "All"> = [
  "All",
  "Submitted",
  "Under Review",
  "Shortlisted",
  "Accepted",
  "Rejected",
  "Withdrawn",
];
const statusStyles: Record<ApplicationStatus, string> = {
  Submitted: "bg-sky-50 text-sky-700",
  "Under Review": "bg-amber-50 text-amber-700",
  Shortlisted: "bg-violet-50 text-violet-700",
  Accepted: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-red-50 text-red-700",
  Withdrawn: "bg-muted text-muted-foreground",
};

export default function ApplicationsPage() {
  const [params, setParams] = useSearchParams();
  const reference = params.get("ref");
  const activeFilter = params.get("status") || "All";
  const [expanded, setExpanded] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"recent" | "oldest">("recent");
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const selected = reference ? applications.find(item => item.reference === reference) : undefined;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setApplications((await listApplications()).map(fromBackendApplication));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to load applications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const term = query.trim().toLowerCase();
  const rows = applications.filter(item => {
    const matchesStatus = activeFilter === "All" || item.status === activeFilter ||
      (activeFilter === "active" && ["Submitted", "Under Review", "Shortlisted"].includes(item.status));
    return matchesStatus && (!term || [item.opportunity, item.company, item.reference, item.studentIndexNumber].some(value => value.toLowerCase().includes(term)));
  }).sort((a, b) => (sort === "recent" ? -1 : 1) * (Date.parse(a.applicationDate) - Date.parse(b.applicationDate)));

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  }

  return <StudentPage title="My applications" description="Track decisions, next steps and placement documents."
    action={<Link className={studentLink} to="/app/programs">Browse programs</Link>}>
    {loading ? <AsyncState kind="loading" message="Loading your applications…" /> : error ? <AsyncState kind="error" message={error} onRetry={() => void refresh()} /> : <>
      {reference && !selected && <p className="student-panel p-3 text-sm" role="status">This application is unavailable.</p>}
      {applications.length === 0 ? <AsyncState kind="empty" message="You have no applications yet." /> : <>
        <div className="student-panel grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 p-2">
          <input className={studentField} type="search" value={query} aria-label="Search my applications" placeholder="Search by program or reference"
            onChange={event => setQuery(event.target.value)} />
          <FilterMenu label="My application filters" active={activeFilter !== "All" || sort !== "recent"}>
            <label className="grid gap-1 text-sm">Status<select className={studentField} aria-label="Filter by status" value={activeFilter}
              onChange={event => update("status", event.target.value === "All" ? "" : event.target.value)}>
              <option value="All">All statuses</option><option value="active">In progress</option>
              {statuses.slice(1).map(status => <option key={status}>{status}</option>)}
            </select></label>
            <label className="grid gap-1 text-sm">Sort<select className={studentField} aria-label="Sort applications" value={sort} onChange={event => setSort(event.target.value as "recent" | "oldest")}>
              <option value="recent">Most recent</option><option value="oldest">Oldest</option>
            </select></label>
          </FilterMenu>
        </div>
        {rows.length ? <ul className="student-panel" aria-label="My application results">{rows.map(application => <StudentDisclosure
          key={application.reference} title={application.opportunity}
          subtitle={application.company || new Date(application.applicationDate).toLocaleDateString("en-GH", { dateStyle: "medium" })}
          badge={<span className={`inline-block rounded-md px-2 py-1 font-semibold ${statusStyles[application.status]}`}>{application.status}</span>}
          open={expanded === application.reference}
          onToggle={() => setExpanded(current => current === application.reference ? null : application.reference)}>
          <p className="text-sm">{applicationNextSteps[application.status]}</p>
          <dl className="student-facts"><div><dt>Reference</dt><dd>{application.reference}</dd></div>
            <div><dt>Submitted</dt><dd>{new Date(application.applicationDate).toLocaleDateString("en-GH", { dateStyle: "medium" })}</dd></div>
            <div><dt>Student index</dt><dd>{application.studentIndexNumber || "Not recorded"}</dd></div></dl>
          <button type="button" className={studentLink} onClick={() => update("ref", application.reference)}>Track application</button>
        </StudentDisclosure>)}</ul> : <AsyncState kind="empty" message="No applications match your filters." />}
      </>}
    </>}
    {selected && <TrackingModal key={selected.reference} application={selected} onClose={() => update("ref", "")} onAssessmentUploaded={refresh} />}
  </StudentPage>;
}


function TrackingModal({
  application,
  onClose,
  onAssessmentUploaded,
}: {
  application: ApplicationRecord;
  onClose: () => void;
  onAssessmentUploaded: () => Promise<void>;
}) {
  const [assessmentFile, setAssessmentFile] = useState<File | null>(null);
  const [assessmentBusy, setAssessmentBusy] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [assessmentError, setAssessmentError] = useState("");
  const [certificateBusy, setCertificateBusy] = useState(false);
  const assessmentInput = useRef<HTMLInputElement>(null);
  const submitAssessment = async () => {
    if (!assessmentFile) return;
    setAssessmentBusy(true);
    setAssessmentError("");
    try {
      await uploadSupervisorAssessment(application.reference, assessmentFile);
      setAssessmentFile(null);
      if (assessmentInput.current) assessmentInput.current.value = "";
      await onAssessmentUploaded();
    } catch (error) {
      setAssessmentError(error instanceof Error ? error.message : "Unable to submit supervisor assessment.");
    } finally {
      setAssessmentBusy(false);
    }
  };
  const printCertificate = async () => {
    setCertificateBusy(true);
    setAssessmentError("");
    try {
      await printCompletionCertificate(application.reference);
    } catch (error) {
      setAssessmentError(
        error instanceof Error
          ? error.message
          : "Unable to prepare certificate for printing.",
      );
    } finally {
      setCertificateBusy(false);
    }
  };
  const modal = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => { modal.current?.showModal(); }, []);
  return (
    <dialog ref={modal} onClose={onClose} aria-labelledby={titleId}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-3xl overflow-y-auto rounded-xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/55">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-card p-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Application tracking</p>
          <h2 id={titleId} className="break-words text-base font-bold">{application.opportunity}</h2>
        </div>
        <button type="button" onClick={() => modal.current?.close()} className="size-10 shrink-0 rounded-lg hover:bg-secondary" aria-label="Close application details">×</button>
      </div>
      <div className="grid min-w-0 gap-4 p-3 sm:p-4 lg:grid-cols-2">
          <ApplicationNextActions application={application} />
          {application.placementFilesAvailable && <section className="lg:col-span-2"><PlacementDocuments applicationId={application.reference} /></section>}
          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-secondary p-4">
              <p className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[application.status]}`}>{application.status}</p>
              <p className="mt-2 text-sm">{applicationNextSteps[application.status]}</p>
            </div>
            <ApplicationHistory id={application.reference} status={application.status} />
          </div>
          <div className="space-y-5">
            <div>
              <h3 className="font-semibold text-sm mb-3">
                Application Information
              </h3>
              <Info
                label="Application reference"
                value={application.reference}
                copy
              />
              <Info label="Organization" value={application.company} />
              <Info label="Applicant" value={application.applicantName || "Not recorded"} />
              <Info label="Gender" value={application.gender || "Not recorded"} />
              <Info
                label="Student Index Number"
                value={application.studentIndexNumber || "Not recorded"}
              />
              <Info label="Year of study" value={application.yearOfStudy || "Not recorded"} />
              <Info
                label="Date submitted"
                value={new Date(
                  application.applicationDate,
                ).toLocaleDateString()}
              />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-3">
                Submitted Documents
              </h3>
              <p className="text-sm font-medium">
                {application.resumeName || "No document recorded"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {application.resumeType || "Resume / CV"}
                {application.resumeName && application.resumeUploadedAt &&
                  ` · Uploaded ${new Date(application.resumeUploadedAt).toLocaleDateString()}`}
              </p>
              {application.resumeName?.toLowerCase().endsWith(".pdf") && (
                <button type="button" onClick={() => void previewPdf(() => getResumeFile(application.reference)).catch(failure =>
                  setDownloadError(failure instanceof Error ? failure.message : "Unable to open PDF."))}
                  className="mr-4 mt-3 text-xs font-semibold text-primary underline">Preview resume</button>
              )}
              {application.resumeName && (
                <button
                  onClick={() => void saveResumeDownload(application.reference).catch((error) => setDownloadError(error instanceof Error ? error.message : "Unable to download resume."))}
                  className="mt-3 text-xs font-semibold text-primary underline"
                >
                  Download resume
                </button>
              )}
              {downloadError && <p className="mt-2 text-xs text-red-600" role="alert">{downloadError}</p>}
            </div>
            <div className="border-t border-border pt-4">
              <h3 className="font-semibold text-sm mb-2">Supervisor Assessment</h3>
              {application.status !== "Accepted" ? (
                <p className="text-xs text-muted-foreground">
                  Your supervisor assessment can be submitted after your application is accepted.
                </p>
              ) : !application.documentsSent ? (
                <p className="text-xs text-amber-700">
                  Your assessment form is being prepared. You can upload it here once it has been sent.
                </p>
              ) : application.supervisorAssessmentName ? (
                <>
                  <p className="text-sm font-medium break-all">{application.supervisorAssessmentName}</p>
                  {application.certificateApproved ? (
                    <button
                      onClick={() => void printCertificate()}
                      disabled={certificateBusy}
                      aria-busy={certificateBusy}
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-70"
                    >
                      {certificateBusy && (
                        <span aria-hidden="true">
                          <Spinner />
                        </span>
                      )}
                      {certificateBusy ? "Preparing PDF..." : "Print / Save as PDF"}
                    </button>
                  ) : (
                    <p className="text-xs text-amber-700 mt-2">
                      Submitted. An admin must review your assessment before the certificate is available.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-3">
                    Upload the completed assessment from your host supervisor for admin review.
                  </p>
                  <input
                    ref={assessmentInput}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(event) => setAssessmentFile(event.target.files?.[0] || null)}
                    className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-xs file:font-semibold"
                  />
                  <button
                    onClick={() => void submitAssessment()}
                    disabled={!assessmentFile || assessmentBusy}
                    className="mt-3 px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold disabled:opacity-50"
                  >
                    {assessmentBusy ? "Submitting..." : "Submit supervisor assessment"}
                  </button>
                </>
              )}
              {assessmentError && <p className="mt-2 text-xs text-red-600" role="alert">{assessmentError}</p>}
            </div>
          </div>
        </div>
    </dialog>
  );
}

function ApplicationNextActions({ application }: { application: ApplicationRecord }) {
  const active = ["Submitted", "Under Review", "Shortlisted"].includes(application.status);
  const date = application.responseBy;
  const now = new Date().toISOString().slice(0, 10);
  const update = application.studentUpdate;
  const support = "/app/support?" + new URLSearchParams({ application: application.reference });
  if (!active || !(update || application.documentRequest || date)) return null;
  return <section className="space-y-2 rounded-lg border border-border bg-secondary/40 p-3 lg:col-span-2">
    <h3 className="text-sm font-semibold">Next steps</h3>
    {update && <div className="text-sm">
      <strong>{update.kind === "interview" ? "Interview" : update.kind === "action" ? "Action requested" : "Progress update"}</strong>
      {update.due && <span className="ml-2 text-xs text-muted-foreground">{update.due}</span>}
      <p className="mt-1 whitespace-pre-wrap break-words">{update.message}</p>
    </div>}
    {application.documentRequest && <div className="text-sm"><strong>Documents requested</strong><p className="whitespace-pre-wrap break-words">{application.documentRequest}</p></div>}
    {update?.kind === "interview" && <details className="text-sm"><summary className="cursor-pointer font-semibold text-primary">Prepare for the interview</summary>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
        <li>Confirm the time, location or meeting link with the contact listed.</li>
        <li>Review the role and prepare an example of work that shows a relevant skill.</li>
        <li>Prepare one question about the work or supervision.</li>
      </ul>
    </details>}
    {date && <p className="text-xs text-muted-foreground">Expected response date · {date}</p>}
    {(application.documentRequest || (date && date < now)) && <Link className="inline-flex min-h-9 items-center text-sm font-semibold text-primary underline" to={support}>Follow up with support</Link>}
  </section>;
}

function Info({
  label,
  value,
  copy = false,
}: {
  label: string;
  value: string;
  copy?: boolean;
}) {
  const copyValue = async () => {
    await navigator.clipboard?.writeText(value);
  };
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold text-right">
        {value}{" "}
        {copy && (
          <button onClick={copyValue} className="ml-1 text-primary underline">
            Copy
          </button>
        )}
      </span>
    </div>
  );
}
