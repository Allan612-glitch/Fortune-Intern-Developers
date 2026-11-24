import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AsyncState from "../components/AsyncState";
import { getProgramApplicationSummary, getProgramDetail, type Program } from "../services/platform";
import { applicationStatusLabel } from "../services/applications";

export default function ProgramOverview({ id, canReview, refresh, canManagePrograms, canInvestigate }: { id: string; canReview: boolean; refresh: number; canManagePrograms: boolean; canInvestigate: boolean }) {
  const [program, setProgram] = useState<Program | null>(null);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getProgramApplicationSummary>> | null>(null);
  const [error, setError] = useState("");
  const [summaryError, setSummaryError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    getProgramDetail(id).then(row => { if (active) setProgram(row); }).catch(failure => {
      if (active) setError(failure instanceof Error ? failure.message : "Unable to load this program.");
    });
    return () => { active = false; };
  }, [id, retry]);

  useEffect(() => {
    if (!canReview) return;
    let active = true;
    getProgramApplicationSummary(id).then(data => { if (active) { setSummary(data); setSummaryError(false); } }).catch(() => {
      if (active) setSummaryError(true);
    });
    return () => { active = false; };
  }, [canReview, id, refresh, retry]);

  const breakdown = new Map<string, number>();
  for (const [status, count] of Object.entries(summary?.statuses || {})) {
    const label = applicationStatusLabel(status);
    breakdown.set(label, (breakdown.get(label) ?? 0) + count);
  }

  return (
    <div className="mb-5 space-y-4">
      <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 text-sm text-muted-foreground">
        <Link to={canManagePrograms ? "/app/admin/programs" : "/app/admin/applications"} className="font-semibold text-primary hover:underline">{canManagePrograms ? "Programs" : "Applications"}</Link>
        <span aria-hidden="true">/</span><span aria-current="page">{program?.name || "Program details"}</span>
      </nav>
      {error ? <AsyncState kind="error" message={error} onRetry={() => { setError(""); setRetry(n => n + 1); }} />
        : !program ? <AsyncState kind="loading" message="Loading program…" />
          : (
            <header className="admin-panel p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="min-w-0 break-words text-2xl font-bold tracking-tight sm:text-3xl">{program.name}</h1>
                {canInvestigate && <Link to={`/app/admin/audit?${new URLSearchParams({entity_type: "program", entity: id})}`}
                  className="text-sm font-semibold text-primary underline">View audit history</Link>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{program.company} · {program.category}</p>
              {program.description && <p className="mt-4 max-w-3xl whitespace-pre-wrap break-words text-sm">{program.description}</p>}
              <dl className="mt-4 grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-3">
                <div><dt className="text-xs text-muted-foreground">Location</dt><dd>{program.location}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Duration</dt><dd>{program.duration}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Deadline</dt><dd>{program.deadline ? new Date(program.deadline).toLocaleString() : "No deadline"}</dd></div>
              </dl>
              {program.skills.length > 0 && <ul aria-label="Skills" className="mt-4 flex flex-wrap gap-2">
                {program.skills.map((skill, index) => <li key={index} className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-primary">{skill}</li>)}
              </ul>}
            </header>
          )}
      {summaryError && <AsyncState kind="error" message="Unable to load program totals." onRetry={() => setRetry(n => n + 1)} />}
      {!summaryError && summary && (
        <section aria-label="Program analytics" className="admin-panel grid grid-cols-2 gap-4 p-5 sm:grid-cols-4 lg:grid-cols-6">
          {[["Applications", summary.total], ["Applicant accounts", summary.applicant_accounts], ...breakdown].map(([name, count]) => (
            <div key={name}><p className="text-2xl font-bold text-primary">{count.toLocaleString()}</p><p className="text-xs text-muted-foreground">{name}</p></div>
          ))}
        </section>
      )}
    </div>
  );
}
