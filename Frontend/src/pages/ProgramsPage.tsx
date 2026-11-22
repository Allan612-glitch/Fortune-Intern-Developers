import { getProfile, type ProfileData } from "../services/auth";
import { emptyOpportunity, matchReasons, opportunityKinds, studentOpportunitiesPath, updateOpportunityState, workModes, type SavedOpportunity } from "../services/opportunities";
import { button, failureMessage, money, useRequest } from "./AdminWorkflowUI";
import { useEffect, useState } from "react";
import { ArrowRight, Bell, Bookmark, ShieldCheck } from "lucide-react";
import { Link, useMatch, useNavigate, useSearchParams } from "react-router-dom";
import type { AppUser } from "../App";
import ApplyFormModal from "../components/ApplyFormModal";
import AsyncState from "../components/AsyncState";
import FilterMenu from "../components/FilterMenu";
import { StudentDisclosure, StudentPage, studentField, studentLink } from "../components/StudentPortalUI";
import { listPrograms, type Program } from "../services/platform";

const programPath = (id: string) => "/app/programs/" + encodeURIComponent(id);
const isOpen = (p: Program) => p.status === "open" && !p.cycle_closed_at && (!p.deadline || new Date(p.deadline).getTime() > Date.now());
const isRemote = (p: Program) => p.opportunity?.work_mode ? ["remote", "hybrid"].includes(p.opportunity.work_mode) : /remote|hybrid/i.test(p.location);

export default function ProgramsPage({ user, initialSelectedProgramId, onInitialSelectionHandled }: {
  user: AppUser;
  initialSelectedProgramId?: string | null;
  onInitialSelectionHandled?: () => void;
}) {
  const navigate = useNavigate();
  const selectedId = useMatch("/app/programs/:id")?.params.id;
  const [params, setParams] = useSearchParams();
  const search = params.get("q") || "";
  const category = params.get("category") || "";
  const remote = params.get("remote") === "1";
  const verifiedOnly = params.get("verified") === "1";
  const view = params.get("view") || "all";
  const [savedRevision, setSavedRevision] = useState(0);
  const [profile, setProfile] = useState<ProfileData>();
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!initialSelectedProgramId) return;
    const next = new URLSearchParams(params);
    next.delete("program");
    if (!selectedId || params.has("program")) {
      navigate({ pathname: programPath(selectedId || initialSelectedProgramId), search: next.toString() }, { replace: true });
    }
    onInitialSelectionHandled?.();
  }, [initialSelectedProgramId, navigate, onInitialSelectionHandled, params, selectedId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    listPrograms().then(items => { if (active) setPrograms(items); })
      .catch(failure => { if (active) setError(failure instanceof Error ? failure.message : "Unable to load programs."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);

  useEffect(() => {
    let active = true;
    getProfile().then(profile => { if (active) setProfile(profile); }).catch(() => {});
    return () => { active = false; };
  }, [user.email]);

  const savedResult = useRequest<SavedOpportunity[]>(studentOpportunitiesPath, savedRevision);
  const savedList = savedResult?.data ?? [];
  const savedById = new Map(savedList.map(item => [item.program.id, item]));
  const programIsListed = programs.some(p => p.id === selectedId);
  const detail = useRequest<Program>(selectedId && !loading && !programIsListed && !savedById.has(selectedId) ?
    "/api/programs/" + encodeURIComponent(selectedId) : "");
  const matches = (p: Program) => profile ? matchReasons(p, profile) : [];
  const source = view === "saved" ? savedList.map(item => item.program) : programs;
  const categories = [...new Set(programs.map(p => p.category).filter(Boolean))].sort();
  const query = search.trim().toLowerCase();
  const results = source.filter(p => (view !== "matches" || matches(p).length > 0) && (!verifiedOnly || p.opportunity?.employer_verified) && (!category || p.category === category) && (!remote || isRemote(p)) &&
    (!query || [p.name, p.company, p.description, p.location, p.duration, p.category, ...p.skills].some(v => v.toLowerCase().includes(query))));
  const selected = programs.find(p => p.id === selectedId) || savedById.get(selectedId || "")?.program || detail?.data;
  const shown = selected && !results.some(p => p.id === selectedId) ? [selected, ...results] : results;
  const applying = params.get("apply") === "1" && selected && isOpen(selected) ? selected : null;

  async function save(id: string, changes: { saved?: boolean; remind?: boolean; draft?: null }) {
    setSaving(true); setSaveError("");
    try { await updateOpportunityState(id, changes); setSavedRevision(old => old + 1); }
    catch (error) { setSaveError(failureMessage(error)); }
    finally { setSaving(false); }
  }

  function filter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    next.delete("apply");
    setParams(next, { replace: true, preventScrollReset: true });
  }

  function toggle(id: string) {
    const next = new URLSearchParams(params);
    next.delete("apply");
    navigate({ pathname: selectedId === id ? "/app/programs" : programPath(id), search: next.toString() }, { preventScrollReset: true, state: { keepScroll: true } });
  }

  return <StudentPage title="Programs">
    <nav aria-label="Opportunity views" className="student-panel flex flex-wrap gap-1 p-1.5">
      {[["all", "Open opportunities"], ["saved", "Saved and drafts"], ["matches", "Matches for you"]].map(([id, label]) => <button type="button" key={id} aria-pressed={view === id}
        className="min-h-10 rounded-md px-3 text-xs font-semibold hover:bg-secondary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
        onClick={() => navigate({ pathname: "/app/programs", search: id === "all" ? "" : "?view=" + id })}>{label}</button>)}
    </nav>
    {saveError && <p className="student-panel p-3 text-sm" role="alert">{saveError}</p>}
    {savedResult?.error && <p className="student-panel flex flex-wrap items-center justify-between gap-2 p-3 text-xs" role="alert">Saved opportunities are unavailable.
      <button type="button" className={button} onClick={() => setSavedRevision(old => old + 1)}>Try again</button></p>}
    <div className="student-panel grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 p-2">
      <input type="search" aria-label="Search programs" placeholder="Search programs, companies or skills" className={studentField}
        value={search} maxLength={120} onChange={event => filter("q", event.target.value)} />
      <FilterMenu label="Program filters" active={Boolean(category || remote || verifiedOnly)}>
        <label className="grid gap-1 text-sm">Category<select aria-label="Program category" className={studentField} value={category} onChange={event => filter("category", event.target.value)}>
          <option value="">All categories</option>{categories.map(item => <option key={item}>{item}</option>)}
        </select></label>
        <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" checked={remote} onChange={event => filter("remote", event.target.checked ? "1" : "")} />Remote or hybrid</label>
        <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" checked={verifiedOnly} onChange={event => filter("verified", event.target.checked ? "1" : "")} />Verified employers only</label>
      </FilterMenu>
    </div>
    {(loading || (view === "saved" && !savedResult)) ? <AsyncState kind="loading" message="Loading programs…" /> : error ? <AsyncState kind="error" message={error} onRetry={() => setRevision(v => v + 1)} /> : <>
      {selectedId && !selected && detail?.error && <p role="status" className="student-panel p-3 text-sm">This program is unavailable. You can browse the current listings below.</p>}
      {selected && params.get("apply") === "1" && !applying && <p role="status" className="student-panel p-3 text-sm">Applications for this program are closed.</p>}
      {shown.length ? <ul className="student-panel" aria-label="Program results">{shown.map(program => {
        const details = program.opportunity || emptyOpportunity;
        const saved = savedById.get(program.id);
        const reasons = matches(program);
        return <StudentDisclosure
        key={program.id} title={program.name} subtitle={[program.company, program.location].filter(Boolean).join(" · ")}
        badge={<span className="flex flex-col items-end gap-1">
          <span className={isOpen(program) ? "whitespace-nowrap rounded-md bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800" : "whitespace-nowrap rounded-md bg-muted px-2 py-0.5 font-semibold"}>{isOpen(program) ? "Open" : "Closed"}</span>
          <span className="text-[11px] text-muted-foreground">{details.employer_verified ? "Verified" : "Unverified"}</span>
        </span>}
        open={program.id === selectedId} onToggle={() => toggle(program.id)}>
        <p className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-primary">
          {details.employer_verified && <ShieldCheck className="size-4" aria-hidden="true" />}
          {details.employer_verified ? "Employer verified by Fortune Intern" : "Unverified employer"}
        </p>
        <dl className="student-facts">
          <div><dt>Opportunity</dt><dd>{opportunityKinds[details.kind]}</dd></div>
          <div><dt>Work mode</dt><dd>{details.work_mode ? workModes[details.work_mode] : "Not specified"}</dd></div>
          <div><dt>Compensation</dt><dd>{details.compensation === "unspecified" ? "Not specified" : details.compensation === "paid" ? "Paid" : "Unpaid"}{details.compensation_details ? " · " + details.compensation_details : ""}</dd></div>
          <div><dt>Application fee</dt><dd>{program.application_fee_minor == null ? "Shown before submission" : money(program.application_fee_minor)}</dd></div>
          <div><dt>Expected response</dt><dd>{details.response_by || "Not specified"}</dd></div>
          <div><dt>Institution letter</dt><dd>{details.requires_institution_letter === null ? "Not specified" : details.requires_institution_letter ? "Required" : "Not required"}</dd></div>
          {isRemote(program) && <div><dt>Remote applicants based in Ghana</dt><dd>{details.accepts_ghana_remote === null ? "Not specified" : details.accepts_ghana_remote ? "Accepted" : "Not accepted"}</dd></div>}
          <div><dt>Category</dt><dd>{program.category || "—"}</dd></div>
          <div><dt>Duration</dt><dd>{program.duration || "—"}</dd></div>
          <div><dt>Deadline</dt><dd>{program.deadline ? new Date(program.deadline).toLocaleDateString("en-GH", { dateStyle: "medium" }) : "No deadline listed"}</dd></div>
        </dl>
        {(details.eligibility || details.eligible_courses.length || details.eligible_years.length) && <section className="mb-3 rounded-lg border border-border p-2.5 text-sm">
          <h2 className="font-semibold">Who can apply</h2>
          {details.eligible_courses.length > 0 && <p>Courses · {details.eligible_courses.join(", ")}</p>}
          {details.eligible_years.length > 0 && <p>Years of study · {details.eligible_years.join(", ")}</p>}
          {details.eligibility && <p className="whitespace-pre-wrap">{details.eligibility}</p>}
        </section>}
        {reasons.length > 0 && <p className="mb-2 text-xs text-muted-foreground">{reasons.join(" · ")}. Check the full eligibility details before applying.</p>}
        {program.description && <p className="whitespace-pre-wrap text-sm leading-relaxed">{program.description}</p>}
        {program.skills.length > 0 && <div className="mt-3"><h2 className="text-sm font-semibold">Skills</h2><ul className="mt-1 flex flex-wrap gap-1.5">{program.skills.map(skill => <li key={skill} className="rounded-md bg-secondary px-2 py-1 text-xs">{skill}</li>)}</ul></div>}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {isOpen(program) && <button type="button" className={studentLink} onClick={() => filterApply(true)}>{saved?.has_draft ? "Resume draft" : "Apply"} <ArrowRight className="size-4" aria-hidden="true" /></button>}
          {(isOpen(program) || saved?.saved) && <button type="button" className={button} disabled={!savedResult?.data || saving}
            onClick={() => void save(program.id, { saved: !saved?.saved })}><Bookmark className="size-4" aria-hidden="true" />{saved?.saved ? "Unsave" : "Save"}</button>}
          {saved?.saved && program.deadline && isOpen(program) && <button type="button" className={button} disabled={saving} aria-pressed={saved.remind}
            onClick={() => void save(program.id, { remind: !saved.remind })}><Bell className="size-4" aria-hidden="true" />{saved.remind ? "Reminder on" : "Remind me"}</button>}
          {saved?.has_draft && <button type="button" className={button} disabled={saving} onClick={() => { if (window.confirm("Discard this application draft?")) void save(program.id, { draft: null }); }}>Discard draft</button>}
          <Link className="inline-flex min-h-10 items-center text-xs font-semibold text-primary underline"
            to={"/app/support?" + new URLSearchParams({ report: program.id })}>Report listing</Link>
        </div>
        {saved?.remind && <p className="mt-1 text-xs text-muted-foreground">This deadline will appear on your dashboard up to three days beforehand.</p>}
      </StudentDisclosure>;
      })}</ul> : <AsyncState kind="empty" message={view === "saved" ? "You have no saved opportunities or drafts to show." :
        view === "matches" ? "No matches for your current career profile." : search || category || remote || verifiedOnly ? "No programs match your filters." : "There are no open programs right now."}>
        {view === "matches" ? <Link className="text-sm text-primary underline" to="/app/account">Update career profile</Link> :
          (search || category || remote || verifiedOnly || view === "saved") && <Link className="text-sm text-primary underline" to="/app/programs">Browse opportunities</Link>}
      </AsyncState>}
    </>}
    {applying && <ApplyFormModal prefilledCompany={applying.company} prefilledRole={applying.name} programId={applying.id}
      ownerEmail={user.email} ownerName={user.name} onClose={() => { filterApply(false); setSavedRevision(old => old + 1); }}
      onViewApplications={() => navigate("/app/applications")} onBackDashboard={() => navigate("/app/programs")} />}
  </StudentPage>;

  function filterApply(open: boolean) {
    const next = new URLSearchParams(params);
    if (open) next.set("apply", "1"); else next.delete("apply");
    setParams(next, { replace: true, preventScrollReset: true });
  }
}
