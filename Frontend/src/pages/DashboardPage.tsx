import type { StudentAction } from "../services/opportunities";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Briefcase, CheckCircle2, ClipboardList, Clock3, FileText, LifeBuoy, UserRound } from "lucide-react";
import AsyncState from "../components/AsyncState";
import { StudentPage, studentLink } from "../components/StudentPortalUI";
import { applicationStatusLabel } from "../services/applications";
import type { DashboardSummary } from "../services/platform";
import { dateTime, useRequest } from "./AdminWorkflowUI";

export default function DashboardPage() {
  const [revision, setRevision] = useState(0);
  const result = useRequest<DashboardSummary>("/api/dashboard", revision);
  const data = result?.data;
  const actions = useRequest<StudentAction[]>("/api/student/actions", revision);
  return <StudentPage title="Dashboard" action={<Link className={studentLink} to="/app/programs"><Briefcase className="size-4" aria-hidden="true" />Browse programs</Link>}>
    {!result ? <AsyncState kind="loading" message="Loading your dashboard…" /> : result.error ? <AsyncState kind="error" message={result.error} onRetry={() => setRevision(v => v + 1)} /> : data && <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Applications", value: data.total_applications, Icon: ClipboardList, path: "/app/applications" },
          { label: "In progress", value: data.active_applications, Icon: Clock3, path: "/app/applications?status=active" },
          { label: "Accepted", value: data.accepted_applications, Icon: CheckCircle2, path: "/app/applications?status=Accepted" },
          { label: "Open programs", value: data.open_programs, Icon: Briefcase, path: "/app/programs" },
        ].map(({ label, value, Icon, path }) => <Link className="student-panel p-2.5 sm:p-3 hover:border-primary" to={path} key={label}>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />{label}</span>
          <strong className="mt-1 block text-xl">{value}</strong>
        </Link>)}
      </div>
      {actions?.data?.length ? <section className="student-panel">
        <h2 className="px-3 py-2.5 text-sm font-semibold">Needs your attention</h2>
        <ul className="divide-y divide-border border-t border-border">{actions.data.map(item => <li key={item.id}>
          <Link to={item.path} className="flex min-h-11 flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-secondary">
            <span className="font-semibold">{item.title}</span>{item.due && <time className="text-xs text-muted-foreground" dateTime={item.due}>{item.due}</time>}
          </Link>
        </li>)}</ul>
      </section> : null}
      <div className="grid min-w-0 items-start gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="student-panel">
          <header className="flex items-center justify-between gap-2 px-3 py-2">
            <h2 className="text-sm font-semibold">Recent applications</h2>
            <Link to="/app/applications" className="inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-primary hover:underline">View all <ArrowRight className="size-3.5" aria-hidden="true" /></Link>
          </header>
          {data.recent_applications.length ? <ul className="divide-y divide-border border-t border-border">
            {data.recent_applications.slice(0, 5).map(item => <li key={item.id}>
              <Link to={"/app/applications?" + new URLSearchParams({ ref: item.id })} className="flex min-h-12 items-center justify-between gap-3 px-3 py-2 hover:bg-secondary">
                <span className="min-w-0 break-words text-sm font-semibold">{item.program_name}</span>
                <span className="max-w-[7rem] rounded bg-secondary px-2 py-1 text-xs text-primary">{applicationStatusLabel(item.status)}</span>
              </Link>
            </li>)}
          </ul> : <p className="border-t border-border p-3 text-sm text-muted-foreground">Your submitted applications will appear here.</p>}
        </section>
        <section className="student-panel">
          <h2 className="px-3 py-3 text-sm font-semibold">Quick links</h2>
          <ul className="divide-y divide-border border-t border-border">{[
            { label: "Student profile", path: "/app/account", Icon: UserRound },
            { label: "My placements", path: "/app/placements", Icon: Briefcase },
            { label: "Finance documents", path: "/app/documents", Icon: FileText },
            { label: "Support tickets", path: "/app/support", Icon: LifeBuoy },
          ].map(({ label, path, Icon }) => <li key={path}><Link to={path} className="flex min-h-11 items-center gap-2 px-3 text-sm hover:bg-secondary"><Icon className="size-4 text-primary" aria-hidden="true" />{label}</Link></li>)}</ul>
          {data.next_deadline && <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">Next program deadline · {dateTime(data.next_deadline)}</p>}
        </section>
      </div>
    </>}
  </StudentPage>;
}
