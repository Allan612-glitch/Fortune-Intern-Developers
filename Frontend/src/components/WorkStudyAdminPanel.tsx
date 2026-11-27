import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useWorkStudyRegistrations, workStudyAvailability, workStudyHours, workStudyLabel, workStudyRoles } from "../services/workStudy";
import { button, dateTime } from "../pages/AdminWorkflowUI";
import { AdminTable } from "./AdminTable";
import AsyncState from "./AsyncState";

const pageSize = 25;

export default function WorkStudyAdminPanel() {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const result = useWorkStudyRegistrations(open ? `/api/work-study?limit=${pageSize + 1}&offset=${page * pageSize}` : "", revision);

  return <section className="admin-panel mt-4 overflow-hidden">
    <button type="button" aria-expanded={open} aria-controls="work-study-admin-records"
      className="flex min-h-12 w-full items-center justify-between gap-3 p-4 text-left font-semibold hover:bg-secondary sm:px-5"
      onClick={() => setOpen(value => !value)}>
      Work and study registrations <ChevronDown aria-hidden="true" className={`size-4 ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div id="work-study-admin-records" className="border-t border-border">
      <p className="p-4 text-sm text-muted-foreground">Registrations are separate from internship applications and do not have a review status or payment.</p>
      {!result ? <AsyncState kind="loading" message="Loading registrations…" /> : result.error ?
        <AsyncState kind="error" message={result.error} onRetry={() => setRevision(value => value + 1)} /> :
        result.data && <>
          {result.data.length === 0 ? <p className="px-4 pb-4 text-sm text-muted-foreground">No registrations on this page.</p> :
            <AdminTable name="Work and study registrations" columns={["Applicant", "Role", "Institution and chapter", "Availability", "Submitted", "Reference"]}>
              {result.data.slice(0, pageSize).map(record => <tr role="row" key={record.id}>
                <td role="cell" data-label="Applicant" className="break-words">
                  <p className="font-semibold">{record.applicant_name}</p>
                  <p className="text-xs text-muted-foreground">{record.email} · {record.phone}</p>
                  {record.requires_minor_review && <p className="mt-1 text-xs font-semibold text-amber-800">Under 18 · verify guardian or institution approval</p>}
                </td>
                <td role="cell" data-label="Role">{workStudyLabel(workStudyRoles, record.preferred_role)}</td>
                <td role="cell" data-label="Institution and chapter">{record.institution} · {record.chapter}</td>
                <td role="cell" data-label="Availability">{workStudyLabel(workStudyAvailability, record.availability)} · {workStudyLabel(workStudyHours, record.weekly_hours)} per week</td>
                <td role="cell" data-label="Submitted">{dateTime(record.created_at)}<p className="mt-1 text-xs text-muted-foreground">Consent: {dateTime(record.consented_at)}</p></td>
                <td role="cell" data-label="Reference" className="break-all">{record.id}</td>
              </tr>)}
            </AdminTable>}
          {(page > 0 || result.data.length > pageSize) && <div className="flex items-center justify-end gap-3 border-t border-border p-4 text-sm">
            <button type="button" className={button} disabled={page === 0} onClick={() => setPage(value => value - 1)}>Previous</button>
            <span>Page {page + 1}</span>
            <button type="button" className={button} disabled={result.data.length <= pageSize} onClick={() => setPage(value => value + 1)}>Next</button>
          </div>}
        </>}
    </div>}
  </section>;
}
