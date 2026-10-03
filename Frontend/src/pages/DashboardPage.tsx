import { useEffect, useState } from "react";
import { getDashboard, type DashboardSummary } from "../services/platform";

export default function DashboardPage({
  email,
  onApplications,
}: {
  email: string;
  onApplications: () => void;
}) {
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getDashboard()
      .then((result) => {
        if (active) setDashboard(result);
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Unable to load dashboard.");
      });
    return () => {
      active = false;
    };
  }, [email]);

  const applications = dashboard?.recent_applications || [];

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
          ["Total Applications", dashboard?.total_applications ?? 0],
          ["Active Applications", dashboard?.active_applications ?? 0],
          ["Interviews", dashboard?.interviews ?? 0],
          ["Accepted", dashboard?.accepted_applications ?? 0],
          ["Open Programs", dashboard?.open_programs ?? 0],
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
      {error && <p className="mb-4 text-sm text-red-600" role="alert">{error}</p>}
      {dashboard && applications.length === 0 ? (
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
                  key={application.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-border rounded-xl p-4"
              >
                <div>
                  <p className="font-semibold text-sm">{application.program_name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(application.created_at).toLocaleDateString()} · {application.id}
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
