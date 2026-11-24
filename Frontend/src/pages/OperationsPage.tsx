import { operationTone } from "./operationStatus";
import SystemHealth from "./SystemHealth";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AsyncState from "../components/AsyncState";
import { getOperations } from "../services/audit";

export default function OperationsPage({ canInvestigate }: { canInvestigate: boolean }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof getOperations>> | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setError("");
    getOperations().then(value => { if (active) setData(value); }).catch(failure => {
      if (active) setError(failure instanceof Error ? failure.message : "Unable to load operations.");
    });
    return () => { active = false; };
  }, [retry]);

  return (
    <section className="admin-page mx-auto w-full max-w-[86rem] space-y-4 px-4 py-5 sm:px-6 lg:px-8">
      <header className="admin-panel flex flex-wrap items-center justify-between gap-3 p-5">
        <div><h1 className="text-2xl font-bold">Operations & analytics</h1><p className="mt-1 text-sm text-muted-foreground">Application activity, program availability, and recorded system outcomes.</p></div>
        {canInvestigate && <Link to="/app/admin/audit" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Open audit trail</Link>}
      </header>
      <SystemHealth />
      {error ? <AsyncState kind="error" message={error} onRetry={() => setRetry(n => n + 1)} /> : !data ? <AsyncState kind="loading" message="Loading operations…" /> : (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {([["New applications · 30 days", data.new_applications], ["New accounts · 30 days", data.new_accounts], ["Announcements · 30 days", data.announcements], ["Open programs · now", data.open_programs]] as const).map(([label, count]) => (
              <div className="admin-panel p-4" key={label}><p className="text-2xl font-bold text-primary">{count.toLocaleString()}</p><p className="mt-1 text-sm text-muted-foreground">{label}</p></div>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Breakdown title="Application pipeline · all records" counts={data.application_statuses} />
            <Breakdown title="Recorded audit outcomes · last 30 days" counts={data.audit_outcomes} audit={canInvestigate} />
          </div>
        </>
      )}
    </section>
  );
}

function Breakdown({ title, counts, audit }: { title: string; counts: Record<string, number>; audit?: boolean }) {
  const highest = Math.max(1, ...Object.values(counts));
  return (
    <section className="admin-panel space-y-4 p-5">
      <h2 className="font-semibold">{title}</h2>
      {Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
        <div key={name}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            {audit ? <Link to={`/app/admin/audit?outcome=${encodeURIComponent(name)}`} className="capitalize text-primary underline">{name}</Link>
              : <span className="capitalize">{name.replace(/_/g, " ")}</span>}
            <span className="font-semibold">{count.toLocaleString()}</span>
          </div>
          <div className="h-2 rounded-full bg-secondary" aria-hidden="true"><div className="operation-bar h-full rounded-full" data-tone={operationTone(name)} style={{width: `${count / highest * 100}%`}} /></div>
        </div>
      ))}
      {!Object.keys(counts).length && <p className="text-sm text-muted-foreground">No records in this period.</p>}
    </section>
  );
}
