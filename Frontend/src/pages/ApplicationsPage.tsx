import { useCallback, useEffect, useMemo, useState } from "react";
import AsyncState from "../components/AsyncState";
import {
  printApplicationLetter,
  fromBackendApplication,
  type ApplicationRecord,
  type ApplicationStatus,
} from "../services/applications";
import { listApplications, saveResumeDownload } from "../services/platform";

const statuses: Array<ApplicationStatus | "All"> = [
  "All",
  "Submitted",
  "Under Review",
  "Shortlisted",
  "Accepted",
  "Rejected",
  "Withdrawn",
];
const timeline = [
  "Application Submitted",
  "Payment Confirmed",
  "Application Under Review",
  "Shortlisted",
  "Accepted / Rejected",
];

const statusStyles: Record<ApplicationStatus, string> = {
  Submitted: "bg-sky-50 text-sky-700",
  "Under Review": "bg-amber-50 text-amber-700",
  Shortlisted: "bg-violet-50 text-violet-700",
  Accepted: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-red-50 text-red-700",
  Withdrawn: "bg-muted text-muted-foreground",
};

function stageIndex(application: ApplicationRecord) {
  if (application.status === "Submitted") return 0;
  if (application.status === "Under Review") return 2;
  if (application.status === "Shortlisted") return 3;
  return 4;
}

export default function ApplicationsPage({ email }: { email: string }) {
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ApplicationStatus | "All">("All");
  const [sort, setSort] = useState<"recent" | "oldest">("recent");
  const [selected, setSelected] = useState<ApplicationRecord | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const latest = (await listApplications()).map((application) =>
        fromBackendApplication(application, email),
      );
      setApplications(latest);
      setSelected((current) => current
        ? latest.find((application) => application.reference === current.reference) || null
        : null);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load applications.");
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const visibleApplications = useMemo(
    () =>
      applications
        .filter(
          (application) => filter === "All" || application.status === filter,
        )
        .filter((application) => {
          const value = query.trim().toLowerCase();
          return (
            !value ||
            [
              application.opportunity,
              application.company,
              application.reference,
              application.studentIndexNumber,
            ].some((field) => field.toLowerCase().includes(value))
          );
        })
        .sort((a, b) =>
          sort === "recent"
            ? new Date(b.applicationDate).getTime() -
              new Date(a.applicationDate).getTime()
            : new Date(a.applicationDate).getTime() -
              new Date(b.applicationDate).getTime(),
        ),
    [applications, filter, query, sort],
  );

  const count = (status: ApplicationStatus) =>
    applications.filter((application) => application.status === status).length;

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs uppercase tracking-widest font-bold text-emerald-700">
            Student dashboard
          </p>
          <h1 className="text-2xl font-bold mt-1">My Applications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track submitted applications, payment, and letter availability.
          </p>
        </div>
      </div>
      {loading ? (
        <AsyncState kind="loading" message="Loading your applications..." />
      ) : error ? (
        <AsyncState
          kind="error"
          message={error}
          onRetry={() => void refresh()}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {[
              ["Total Applications", applications.length],
              ["Under Review", count("Under Review")],
              ["Shortlisted", count("Shortlisted")],
              ["Accepted", count("Accepted")],
              ["Rejected", count("Rejected")],
              ["Submitted", count("Submitted")],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="bg-white border border-border rounded-xl p-4 shadow-sm"
              >
                <p className="text-2xl font-bold text-primary">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>

          {applications.length === 0 ? (
            <AsyncState kind="empty" message="You have no applications yet." />
          ) : (
            <>
              <div className="bg-white border border-border rounded-2xl p-4 mb-4 grid md:grid-cols-[1fr_auto_auto] gap-3">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search title, organization, reference, or index number"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/30 text-sm outline-none focus:ring-2"
                />
                <select
                  value={filter}
                  onChange={(event) =>
                    setFilter(event.target.value as ApplicationStatus | "All")
                  }
                  className="px-3 py-2.5 rounded-xl border border-border bg-white text-sm"
                >
                  <option value="All">All statuses</option>
                  {statuses.slice(1).map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
                <select
                  value={sort}
                  onChange={(event) =>
                    setSort(event.target.value as "recent" | "oldest")
                  }
                  className="px-3 py-2.5 rounded-xl border border-border bg-white text-sm"
                >
                  <option value="recent">Most recent</option>
                  <option value="oldest">Oldest</option>
                </select>
              </div>
              {visibleApplications.length === 0 ? (
                <AsyncState
                  kind="empty"
                  message="No applications match your search."
                />
              ) : (
                <div className="space-y-3">
                  {visibleApplications.map((application) => (
                    <ApplicationCard
                      key={application.reference}
                      application={application}
                      onTrack={() => setSelected(application)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {selected && (
        <TrackingModal
          application={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function ApplicationCard({
  application,
  onTrack,
}: {
  application: ApplicationRecord;
  onTrack: () => void;
}) {
  return (
    <article className="bg-white border border-border rounded-2xl p-5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-base truncate">
            {application.opportunity}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {application.company}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-3">
            <span>
              Reference:{" "}
              <strong className="text-foreground">
                {application.reference}
              </strong>
            </span>
            <span>
              Index:{" "}
              <strong className="text-foreground">
                {application.studentIndexNumber || "Not recorded"}
              </strong>
            </span>
            <span>
              Applied:{" "}
              {new Date(application.applicationDate).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyles[application.status]}`}
          >
            {application.status}
          </span>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${application.paymentStatus === "Payment Successful" || (application.paymentStatus as string) === "Paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
          >
            {(application.paymentStatus as string) === "Paid"
              ? "Payment Successful"
              : application.paymentStatus}
          </span>
          <button
            onClick={onTrack}
            className="px-3 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90"
          >
            Track Application
          </button>
        </div>
      </div>
    </article>
  );
}

function TrackingModal({
  application,
  onClose,
}: {
  application: ApplicationRecord;
  onClose: () => void;
}) {
  const [downloadError, setDownloadError] = useState("");
  const current = stageIndex(application);
  const paymentSuccessful =
    application.paymentStatus === "Payment Successful" ||
    (application.paymentStatus as string) === "Paid";
  return (
    <div
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm p-4 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-border p-5 flex items-center justify-between z-10">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
              Application tracking
            </p>
            <h2 className="font-bold text-lg mt-1">
              {application.opportunity}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-secondary"
            aria-label="Close application details"
          >
            ×
          </button>
        </div>
        <div className="p-5 sm:p-7 grid lg:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold text-sm mb-4">Progress timeline</h3>
            <div className="space-y-0">
              {timeline.map((stage, index) => {
                const completed =
                  index < current || (index === 1 && paymentSuccessful);
                const active = index === current;
                return (
                  <div key={stage} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${completed ? "bg-emerald-100 text-emerald-700" : active ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}
                      >
                        {completed ? "✓" : index + 1}
                      </span>
                      {index < timeline.length - 1 && (
                        <span
                          className={`w-px h-10 ${completed ? "bg-emerald-300" : "bg-border"}`}
                        />
                      )}
                    </div>
                    <div className="pb-6">
                      <p
                        className={`text-sm font-semibold ${active ? "text-primary" : ""}`}
                      >
                        {stage}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {completed
                          ? "Completed"
                          : active
                            ? "Current stage"
                            : "Pending"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
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
              <Info
                label="Last updated"
                value={new Date(
                  application.lastUpdated || application.applicationDate,
                ).toLocaleDateString()}
              />
              <Info label="Current status" value={application.status} />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-3">Payment</h3>
              <p
                className={`text-sm font-semibold ${paymentSuccessful ? "text-emerald-700" : "text-amber-700"}`}
              >
                {paymentSuccessful
                  ? "Payment Successful — GH₵4"
                  : application.paymentStatus}
              </p>
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
                {application.resumeUploadedAt &&
                  ` · Uploaded ${new Date(application.resumeUploadedAt).toLocaleDateString()}`}
              </p>
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
              {application.applicationLetterAvailable ? (
                <>
                  <p className="text-sm font-semibold text-emerald-700 mb-3">
                    Application Letter Ready
                  </p>
                  <button
                    onClick={() => printApplicationLetter(application)}
                    className="w-full py-3 rounded-xl bg-primary text-white text-sm font-semibold"
                  >
                    Print Application
                  </button>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Application letter will be available once your application has
                  been successfully processed.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
