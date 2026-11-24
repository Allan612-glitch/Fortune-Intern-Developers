import { opportunityKinds, workModes, type OpportunityDetails } from "../services/opportunities";
import { studentField } from "./StudentPortalUI";

export default function OpportunityFields({ value, onChange, courses, onCoursesChange }: {
  value: OpportunityDetails;
  courses: string;
  onCoursesChange: (value: string) => void; onChange: (value: OpportunityDetails) => void;
}) {
  function set<K extends keyof OpportunityDetails>(key: K, next: OpportunityDetails[K]) {
    onChange({ ...value, [key]: next });
  }
  const options = (items: Record<string, string>) => Object.entries(items).map(([key, title]) => <option key={key} value={key}>{title}</option>);
  const choices = (key: "accepts_ghana_remote" | "requires_institution_letter", title: string) => <label className="grid gap-1 text-sm">{title}
    <select className={studentField} value={value[key] === null ? "" : String(value[key])} onChange={event => set(key, event.target.value === "" ? null : event.target.value === "true")}>
      <option value="">Unspecified</option><option value="true">Yes</option><option value="false">No</option>
    </select>
  </label>;

  return <details className="rounded-lg border border-border p-3 sm:col-span-2">
    <summary className="cursor-pointer text-sm font-semibold">Verification and eligibility</summary>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1 text-sm">Opportunity type
        <select className={studentField} value={value.kind} onChange={event => set("kind", event.target.value as OpportunityDetails["kind"])}>{options(opportunityKinds)}</select>
      </label>
      <label className="grid gap-1 text-sm">Work mode
        <select className={studentField} value={value.work_mode} onChange={event => set("work_mode", event.target.value as OpportunityDetails["work_mode"])}><option value="">Unspecified</option>{options(workModes)}</select>
      </label>
      <label className="grid gap-1 text-sm">Compensation
        <select className={studentField} value={value.compensation} onChange={event => set("compensation", event.target.value as OpportunityDetails["compensation"])}>
          {options({ unspecified: "Unspecified", paid: "Paid", unpaid: "Unpaid" })}
        </select>
      </label>
      <label className="grid gap-1 text-sm">Pay or stipend details
        <input className={studentField} maxLength={160} value={value.compensation_details} onChange={event => set("compensation_details", event.target.value)} />
      </label>
      <label className="grid gap-1 text-sm">Expected response date
        <input type="date" className={studentField} value={value.response_by || ""} onChange={event => set("response_by", event.target.value || null)} />
      </label>
      {choices("accepts_ghana_remote", "Accepts Ghana-based remote applicants")}
      {choices("requires_institution_letter", "Institution letter required")}
      <label className="grid gap-1 text-sm">Eligible courses (comma-separated)
        <input className={studentField} maxLength={420} value={courses} onChange={event => onCoursesChange(event.target.value)} />
      </label>
      <fieldset className="sm:col-span-2">
        <legend className="text-sm">Eligible years of study</legend>
        <div className="flex flex-wrap gap-x-3">{[1, 2, 3, 4, 5, 6].map(year => <label key={year} className="flex min-h-10 items-center gap-1.5 text-xs">
          <input type="checkbox" checked={value.eligible_years.includes(year)} onChange={event => set("eligible_years", event.target.checked ?
            [...value.eligible_years, year].sort() : value.eligible_years.filter(item => item !== year))} />Year {year}
        </label>)}</div>
      </fieldset>
      <label className="grid gap-1 text-sm sm:col-span-2">Eligibility and required documents
        <textarea className={studentField + " py-2"} rows={3} maxLength={1600} value={value.eligibility} onChange={event => set("eligibility", event.target.value)} />
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" checked={value.employer_verified} onChange={event => set("employer_verified", event.target.checked)} />
        I have checked this employer’s identity and confirmed this opportunity.
      </label>
    </div>
  </details>;
}
