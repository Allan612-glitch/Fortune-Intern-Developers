import { useEffect, useState } from "react";
import {
  loadApplications,
  type ApplicationRecord,
} from "../services/applications";

export default function DashboardPage({
  email,
  onApplications,
}: {
  email: string;
  onApplications: () => void;
}) {
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);

  useEffect(() => {
    const refresh = () => setApplications(loadApplications(email));
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("fortune-applications-updated", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("fortune-applications-updated", refresh);
    };
  }, [email]);

  const count = (status: ApplicationRecord["status"]) =>
    applications.filter((application) => application.status === status).length;

  return (
    <div className="p-4 lg:p-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your current internship application activity
          </p>
        </div>
        <button
          onClick={onApplications}
          className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90"
        >
          Open My Applications
        </button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {[
          ["Total Applications", applications.length],
          ["Under Review", count("Under Review")],
          ["Shortlisted", count("Shortlisted")],
          ["Accepted", count("Accepted")],
          ["Rejected", count("Rejected")],
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
        <div className="bg-white border border-border rounded-2xl p-8 text-center shadow-sm">
          <h2 className="font-semibold">No applications yet</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Your submitted applications and status updates will appear here.
          </p>
          <button
            onClick={onApplications}
            className="mt-5 px-5 py-3 rounded-xl bg-secondary text-primary text-sm font-semibold"
          >
            View My Applications
          </button>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">Recent Applications</h2>
            <button
              onClick={onApplications}
              className="text-xs font-semibold text-primary hover:underline"
            >
              View all
            </button>
          </div>
          <div className="space-y-3">
            {applications.slice(0, 5).map((application) => (
              <div
                key={application.reference}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-border rounded-xl p-4"
              >
                <div>
                  <p className="font-semibold text-sm">
                    {application.opportunity}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {application.company} · {application.reference}
                  </p>
                </div>
                <span className="self-start sm:self-auto px-2.5 py-1 rounded-full bg-secondary text-primary text-xs font-semibold">
                  {application.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
