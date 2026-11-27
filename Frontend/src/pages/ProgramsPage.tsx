import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Bell, Bookmark, CalendarDays, Clock3, MapPin, Search, ShieldCheck, X } from "lucide-react";
import { Link, useMatch, useNavigate, useSearchParams } from "react-router-dom";
import type { AppUser } from "../App";
import ApplyFormModal from "../components/ApplyFormModal";
import AsyncState from "../components/AsyncState";
import FilterMenu from "../components/FilterMenu";
import { StudentPage, studentField, studentLink } from "../components/StudentPortalUI";
import { getProfile, type ProfileData } from "../services/auth";
import { emptyOpportunity, matchReasons, opportunityKinds, studentOpportunitiesPath, updateOpportunityState, workModes, type SavedOpportunity } from "../services/opportunities";
import { applicationCheckoutEnabled } from "../services/applicationCheckout";
import { listPrograms, type Program } from "../services/platform";
import { button, failureMessage, money, useRequest } from "./AdminWorkflowUI";
import "./ProgramsPage.css";

const programPath = (id: string) => "/app/programs/" + encodeURIComponent(id);
const isOpen = (program: Program) => program.status === "open" && !program.cycle_closed_at &&
  (!program.deadline || new Date(program.deadline).getTime() > Date.now());
const isRemote = (program: Program) => program.opportunity?.work_mode
  ? ["remote", "hybrid"].includes(program.opportunity.work_mode)
  : /remote|hybrid/i.test(program.location);
const isWorkStudyProgram = (program: Program) => {
  const category = program.category.toLowerCase().replace(/[&-]/g, " ").replace(/\s+/g, " ").trim();
  return category === "work and study" || category === "work study";
};
const opportunityLabel = (program: Program) => isWorkStudyProgram(program)
  ? "Work and Study"
  : opportunityKinds[(program.opportunity || emptyOpportunity).kind];
const formatDate = (value: string) => new Date(value).toLocaleDateString("en-GH", { dateStyle: "medium" });
const displayStatus = (program: Program) => {
  if (isOpen(program)) return "Open";
  if (program.cycle_closed_at || (program.deadline && new Date(program.deadline).getTime() <= Date.now())) return "Closed";
  return program.status.replace(/(^|[_\s])\w/g, value => value.toUpperCase()).replace(/_/g, " ");
};
const closingLabel = (program: Program) => {
  if (!program.deadline) return "No closing date listed";
  const days = Math.ceil((new Date(program.deadline).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return `Closed ${formatDate(program.deadline)}`;
  if (days === 1) return `Closes in 1 day · ${formatDate(program.deadline)}`;
  if (days <= 7) return `Closes in ${days} days · ${formatDate(program.deadline)}`;
  return `Closes ${formatDate(program.deadline)}`;
};

async function listAllOpenPrograms() {
  const pageSize = 200;
  const all: Program[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await listPrograms("", "All", "open", { limit: pageSize, offset });
    all.push(...page);
    if (page.length < pageSize) return all;
  }
}

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
  const view = params.get("view") || "all";
  const sort = params.get("sort") || "closing";
  const remoteOnly = params.get("remote") === "1";
  const verifiedOnly = params.get("verified") === "1";
  const paramsRef = useRef(params);
  const applyingRef = useRef(params.get("apply") === "1");
  paramsRef.current = params;
  applyingRef.current = params.get("apply") === "1";
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [savedRevision, setSavedRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [profile, setProfile] = useState<ProfileData>();
  const [profileError, setProfileError] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileRevision, setProfileRevision] = useState(0);
  const closeButton = useRef<HTMLButtonElement>(null);

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
    listAllOpenPrograms()
      .then(items => { if (active) setPrograms(items); })
      .catch(failure => { if (active) setError(failure instanceof Error ? failure.message : "Unable to load programs."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);

  useEffect(() => {
    let active = true;
    setProfileLoading(true);
    setProfileError("");
    setProfile(undefined);
    getProfile()
      .then(value => { if (active) setProfile(value); })
      .catch(failure => { if (active) setProfileError(failureMessage(failure)); })
      .finally(() => { if (active) setProfileLoading(false); });
    return () => { active = false; };
  }, [profileRevision, user.email]);

  const savedResult = useRequest<SavedOpportunity[]>(studentOpportunitiesPath, savedRevision);
  const savedPrograms = savedResult?.data ?? [];
  const savedById = useMemo(() => new Map(savedPrograms.map(item => [item.program.id, item])), [savedPrograms]);
  const source = view === "saved" ? savedPrograms.map(item => item.program) : programs;
  const categories = useMemo(() => [...new Set(programs.map(program => program.category).filter(Boolean))].sort(), [programs]);
  const query = search.trim().toLowerCase();
  const results = useMemo(() => {
    const matches = source.filter(program => {
      if (view === "matches" && (!profile || !matchReasons(program, profile).length)) return false;
      if (category && program.category !== category) return false;
      if (remoteOnly && !isRemote(program)) return false;
      if (verifiedOnly && !program.opportunity?.employer_verified) return false;
      if (!query) return true;
      const opportunity = program.opportunity || emptyOpportunity;
      const searchable = [
        program.name, program.company, program.description, program.location, program.duration, program.category,
        ...program.skills, opportunityKinds[opportunity.kind], opportunity.work_mode,
        opportunity.compensation, opportunity.compensation_details, opportunity.response_by || "", opportunity.eligibility,
        ...opportunity.eligible_courses, ...opportunity.eligible_years.map(String),
      ];
      return searchable.some(value => value.toLowerCase().includes(query));
    });

    return matches.sort((first, second) => {
      if (sort === "az") return first.name.localeCompare(second.name);
      if (sort === "newest") {
        if (view === "saved") {
          return (savedById.get(second.id)?.updated_at || "").localeCompare(savedById.get(first.id)?.updated_at || "");
        }
        return source.indexOf(first) - source.indexOf(second);
      }
      const firstDeadline = first.deadline ? new Date(first.deadline).getTime() : Number.POSITIVE_INFINITY;
      const secondDeadline = second.deadline ? new Date(second.deadline).getTime() : Number.POSITIVE_INFINITY;
      return firstDeadline - secondDeadline || first.name.localeCompare(second.name);
    });
  }, [category, profile, query, remoteOnly, savedById, sort, source, verifiedOnly, view]);

  const listedProgram = programs.find(program => program.id === selectedId);
  const savedProgram = savedById.get(selectedId || "")?.program;
  const detail = useRequest<Program>(
    selectedId && !loading && !listedProgram && !savedProgram ? `/api/programs/${encodeURIComponent(selectedId)}` : "",
  );
  const selected = listedProgram || savedProgram || detail?.data;
  const selectedDetails = selected?.opportunity || emptyOpportunity;
  const selectedMatchReasons = selected && profile ? matchReasons(selected, profile) : [];
  const applying = params.get("apply") === "1" && selected && isOpen(selected) && !isWorkStudyProgram(selected) ? selected : null;

  useEffect(() => {
    if (!selectedId) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !applyingRef.current) closeDetails();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    closeButton.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [selectedId]);

  async function save(program: Program, changes: { saved?: boolean; remind?: boolean; draft?: null } = {
    saved: !savedById.get(program.id)?.saved,
  }) {
    setSaving(true);
    setSaveError("");
    try {
      await updateOpportunityState(program.id, changes);
      setSavedRevision(old => old + 1);
    } catch (failure) {
      setSaveError(failureMessage(failure));
    } finally {
      setSaving(false);
    }
  }

  function filter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("apply");
    setParams(next, { replace: true, preventScrollReset: true });
  }

  function selectView(nextView: string) {
    const next = new URLSearchParams(params);
    if (nextView === "all") next.delete("view");
    else next.set("view", nextView);
    next.delete("category");
    next.delete("apply");
    setParams(next, { replace: true, preventScrollReset: true });
  }

  function selectCategory(nextCategory: string) {
    const next = new URLSearchParams(params);
    next.delete("view");
    next.delete("apply");
    if (nextCategory) next.set("category", nextCategory);
    else next.delete("category");
    setParams(next, { replace: true, preventScrollReset: true });
  }

  function openDetails(id: string) {
    navigate({ pathname: programPath(id), search: params.toString() }, { preventScrollReset: true, state: { keepScroll: true } });
  }

  function closeDetails() {
    const next = new URLSearchParams(paramsRef.current);
    next.delete("apply");
    navigate({ pathname: "/app/programs", search: next.toString() }, { preventScrollReset: true, state: { keepScroll: true } });
  }

  function filterApply(open: boolean) {
    const next = new URLSearchParams(params);
    if (open) next.set("apply", "1");
    else next.delete("apply");
    setParams(next, { replace: true, preventScrollReset: true });
  }

  const listingTabs = [
    { value: "", label: "All programs", count: programs.length },
    ...categories.map(value => ({
      value,
      label: value,
      count: programs.filter(program => program.category === value).length,
    })),
  ];

  return <StudentPage
    title="Open Program Pads"
    description="Browse current opportunities, check closing dates, and save programs for later."
    action={<Link className={studentLink} to="/app/apply?portal=work-study">Work and Study registration <ArrowRight className="size-4" aria-hidden="true" /></Link>}
  >
    <section className="program-board" aria-label="Open program pads">
      <nav className="program-tabs" aria-label="Filter programs">
        <button type="button" aria-pressed={view === "all" && !category}
          className="program-tab" onClick={() => selectCategory("")}>
          All programs <span>{programs.length}</span>
        </button>
        {listingTabs.slice(1).map(tab => <button key={tab.value} type="button"
          aria-pressed={view === "all" && category === tab.value} className="program-tab"
          onClick={() => selectCategory(tab.value)}>
          {tab.label} <span>{tab.count}</span>
        </button>)}
        <button type="button" aria-pressed={view === "saved"} className="program-tab"
          onClick={() => selectView(view === "saved" ? "all" : "saved")}>
          Saved and drafts <span>{savedPrograms.length}</span>
        </button>
        <button type="button" aria-pressed={view === "matches"} className="program-tab"
          onClick={() => selectView(view === "matches" ? "all" : "matches")}>
          Matches for you
        </button>
      </nav>

      <div className="program-toolbar">
        <label className="program-search">
          <Search className="size-4" aria-hidden="true" />
          <span className="sr-only">Search programs</span>
          <input type="search" aria-label="Search programs" placeholder="Search role, company, location or skill…"
            className={studentField} value={search} maxLength={120} onChange={event => filter("q", event.target.value)} />
        </label>
        <label className="program-sort">Sort by
          <select aria-label="Sort programs" className={studentField} value={sort} onChange={event => filter("sort", event.target.value)}>
            <option value="closing">Closing soon</option>
            <option value="newest">Newest first</option>
            <option value="az">A to Z</option>
          </select>
        </label>
        <FilterMenu label="Opportunity filters" active={remoteOnly || verifiedOnly}>
          <label className="flex min-h-10 items-center gap-2 text-sm">
            <input type="checkbox" checked={remoteOnly} onChange={event => filter("remote", event.target.checked ? "1" : "")} />
            Remote or hybrid
          </label>
          <label className="flex min-h-10 items-center gap-2 text-sm">
            <input type="checkbox" checked={verifiedOnly} onChange={event => filter("verified", event.target.checked ? "1" : "")} />
            Verified employers only
          </label>
        </FilterMenu>
        <p className="program-count" aria-live="polite">
          Showing <strong>{results.length}</strong> of <strong>{source.length}</strong> {view === "saved" ? "saved programs and drafts" : "open programs"}
        </p>
      </div>

      {saveError && <p className="program-error" role="alert">{saveError}</p>}
      {savedResult?.error && view !== "saved" && <p className="program-error" role="alert">
        Saved programs are unavailable. <button type="button" className="font-semibold underline" onClick={() => setSavedRevision(old => old + 1)}>Try again</button>
      </p>}
      {loading || (view === "saved" && !savedResult) ? <AsyncState kind="loading" message="Loading programs…" /> :
        error ? <AsyncState kind="error" message={error} onRetry={() => setRevision(value => value + 1)} /> :
          view === "saved" && savedResult?.error ? <AsyncState kind="error" message="Saved programs are unavailable."
            onRetry={() => setSavedRevision(value => value + 1)} /> :
          view === "matches" && profileLoading ? <AsyncState kind="loading" message="Loading your career matches…" /> :
            view === "matches" && profileError ? <div className="program-empty" role="alert">
              <h2>Career matches are unavailable</h2>
              <p>{profileError}</p>
              <button type="button" className={button} onClick={() => setProfileRevision(value => value + 1)}>Try again</button>
              <Link className="program-application-link" to="/app/account">Update career profile</Link>
            </div> :
          results.length ? <div className="program-grid" aria-label="Program results">
            {results.map(program => {
              const details = program.opportunity || emptyOpportunity;
              const saved = savedById.get(program.id);
              const open = isOpen(program);
              return <article className="program-card" key={program.id}>
                <div className="program-card-top">
                  <div>
                    <p className="program-category">{program.category || opportunityLabel(program)}</p>
                    <p className={`program-status${open ? " is-open" : " is-closed"}`}>{displayStatus(program)}</p>
                    <p className="program-verified">{details.employer_verified
                      ? <><ShieldCheck className="size-3.5" aria-hidden="true" /> Verified employer</> : "Unverified employer"}</p>
                  </div>
                  {(open || saved?.saved) && <button type="button" className={`program-save${saved?.saved ? " is-saved" : ""}`}
                    aria-label={saved?.saved ? `Remove ${program.name} from saved programs` : `Save ${program.name}`}
                    aria-pressed={Boolean(saved?.saved)} disabled={!savedResult?.data || saving}
                    onClick={() => void save(program)}>
                    <Bookmark className="size-4" aria-hidden="true" />
                  </button>}
                </div>
                <h2>{program.name}</h2>
                <p className="program-company">{program.company}</p>
                <div className="program-facts">
                  <span><MapPin className="size-4" aria-hidden="true" />{program.location || "Location not specified"}</span>
                  <span><Clock3 className="size-4" aria-hidden="true" />{program.duration || "Duration not specified"}</span>
                  <span><CalendarDays className="size-4" aria-hidden="true" />{closingLabel(program)}</span>
                </div>
                {program.skills.length > 0 && <ul className="program-skills" aria-label="Skills">
                  {program.skills.slice(0, 4).map(skill => <li key={skill}>{skill}</li>)}
                  {program.skills.length > 4 && <li>+{program.skills.length - 4}</li>}
                </ul>}
                <div className="program-card-actions">
                  <button type="button" className={studentLink} onClick={() => openDetails(program.id)}>
                    View details <ArrowRight className="size-4" aria-hidden="true" />
                  </button>
                  {saved?.has_draft && <span className="program-draft-label">Draft saved</span>}
                </div>
              </article>;
            })}
          </div> : <div className="program-empty">
            <h2>{view === "saved" ? "No saved programs yet" : "No programs match these filters"}</h2>
            <p>{view === "saved" ? "Save an open program to keep it here for later." :
              view === "matches" ? "Update your career profile to improve your matches." : "Try another search or clear the selected filters."}</p>
            {view === "matches" ? <Link className="program-application-link" to="/app/account">Update career profile</Link> :
              (search || category || remoteOnly || verifiedOnly || view === "saved") && <button type="button" className={button} onClick={() => {
              const next = new URLSearchParams();
              if (sort !== "closing") next.set("sort", sort);
              setParams(next, { replace: true, preventScrollReset: true });
            }}>Clear filters</button>}
          </div>}
    </section>

    {selectedId && <div className="program-drawer-layer">
      <button type="button" className="program-scrim" aria-label="Close program details" onClick={closeDetails} />
      <aside className="program-drawer" role="dialog" aria-modal="true" aria-labelledby="program-detail-title">
        <header className="program-drawer-header">
          <div className="program-drawer-heading">
            {selected ? <>
              <p className="program-category">{selected.category || opportunityLabel(selected)}</p>
              <h2 id="program-detail-title">{selected.name}</h2>
              <p>{selected.company}</p>
            </> : <h2 id="program-detail-title">Program details</h2>}
          </div>
          <button ref={closeButton} type="button" className="program-drawer-close" aria-label="Close program details" onClick={closeDetails}>
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>
        <div className="program-drawer-body">
          {selected ? <>
            <p className={`program-detail-status${isOpen(selected) ? " is-open" : " is-closed"}`}>{displayStatus(selected)}</p>
            {selectedDetails.employer_verified
              ? <p className="program-verified"><ShieldCheck className="size-4" aria-hidden="true" /> Verified employer</p>
              : <p className="program-verified">Unverified employer</p>}
            {selectedMatchReasons.length > 0 && <p className="program-match-reasons">
              {selectedMatchReasons.join(" · ")}. Check the full eligibility details before applying.
            </p>}
            <dl className="program-detail-facts">
              <div><dt>Opportunity</dt><dd>{opportunityLabel(selected)}</dd></div>
              <div><dt>Category</dt><dd>{selected.category || opportunityLabel(selected)}</dd></div>
              <div><dt>Location</dt><dd>{selected.location || "Not specified"}</dd></div>
              <div><dt>Work mode</dt><dd>{selectedDetails.work_mode ? workModes[selectedDetails.work_mode] : "Not specified"}</dd></div>
              <div><dt>Duration</dt><dd>{selected.duration || "Not specified"}</dd></div>
              <div><dt>Closing date</dt><dd>{selected.deadline ? formatDate(selected.deadline) : "No closing date listed"}</dd></div>
              <div><dt>Application fee</dt><dd>{applicationCheckoutEnabled
                ? selected.application_fee_minor == null ? "Shown before submission" : money(selected.application_fee_minor)
                : "Not currently collected"}</dd></div>
              <div><dt>Compensation</dt><dd>{selectedDetails.compensation === "unspecified"
                ? "Not specified" : selectedDetails.compensation === "paid" ? "Paid" : "Unpaid"}
                {selectedDetails.compensation_details ? ` · ${selectedDetails.compensation_details}` : ""}</dd></div>
              <div><dt>Expected response</dt><dd>{selectedDetails.response_by || "Not specified"}</dd></div>
              <div><dt>Institution letter</dt><dd>{selectedDetails.requires_institution_letter === null
                ? "Not specified" : selectedDetails.requires_institution_letter ? "Required" : "Not required"}</dd></div>
              {isRemote(selected) && <div><dt>Remote applicants based in Ghana</dt><dd>{selectedDetails.accepts_ghana_remote === null
                ? "Not specified" : selectedDetails.accepts_ghana_remote ? "Accepted" : "Not accepted"}</dd></div>}
            </dl>
            {selected.description && <section className="program-detail-section">
              <h3>About this opportunity</h3><p>{selected.description}</p>
            </section>}
            {(selectedDetails.eligibility || selectedDetails.eligible_courses.length || selectedDetails.eligible_years.length) &&
              <section className="program-detail-section">
                <h3>Eligibility</h3>
                {selectedDetails.eligible_courses.length > 0 && <p>Eligible courses: {selectedDetails.eligible_courses.join(", ")}</p>}
                {selectedDetails.eligible_years.length > 0 && <p>Eligible years: {selectedDetails.eligible_years.join(", ")}</p>}
                {selectedDetails.eligibility && <p>{selectedDetails.eligibility}</p>}
              </section>}
            {selected.skills.length > 0 && <section className="program-detail-section">
              <h3>Skills</h3><ul className="program-skills">{selected.skills.map(skill => <li key={skill}>{skill}</li>)}</ul>
            </section>}
          </> : detail?.error ? <p className="program-error" role="alert">This program is unavailable. Return to the listings and try another opportunity.</p> :
            <AsyncState kind="loading" message="Loading program details…" />}
        </div>
        {selected && <footer className="program-drawer-footer">
          {isOpen(selected) && isWorkStudyProgram(selected) && <Link className={studentLink} to="/app/apply?portal=work-study">
            Open Work and Study registration <ArrowRight className="size-4" aria-hidden="true" />
          </Link>}
          {isOpen(selected) && !isWorkStudyProgram(selected) && <button type="button" className={studentLink} onClick={() => filterApply(true)}>
            {savedById.get(selected.id)?.has_draft ? "Resume draft" : "Apply for this program"}
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>}
          {(isOpen(selected) || savedById.get(selected.id)?.saved) && <button type="button" className={button}
            disabled={!savedResult?.data || saving} onClick={() => void save(selected)}>
            <Bookmark className="size-4" aria-hidden="true" />
            {savedById.get(selected.id)?.saved ? "Remove saved" : "Save program"}
          </button>}
          {isOpen(selected) && savedById.get(selected.id)?.saved && selected.deadline && <button type="button" className={button}
            disabled={saving} aria-pressed={savedById.get(selected.id)?.remind}
            onClick={() => void save(selected, { remind: !savedById.get(selected.id)?.remind })}>
            <Bell className="size-4" aria-hidden="true" />
            {savedById.get(selected.id)?.remind ? "Reminder on" : "Remind me"}
          </button>}
          {savedById.get(selected.id)?.has_draft && <button type="button" className={button} disabled={saving}
            onClick={() => { if (window.confirm("Discard this application draft?")) void save(selected, { draft: null }); }}>
            Discard draft
          </button>}
          {isOpen(selected) && savedById.get(selected.id)?.remind && <p className="program-reminder-note">
            This deadline will appear on your dashboard up to three days beforehand.
          </p>}
          {savedById.get(selected.id)?.has_draft && <Link className="program-application-link" to="/app/applications">View applications</Link>}
          <Link className="program-application-link" to={"/app/support?" + new URLSearchParams({ report: selected.id })}>Report listing</Link>
        </footer>}
      </aside>
    </div>}

    {selected && params.get("apply") === "1" && !isOpen(selected) && <p role="status" className="program-error">Applications for this program are closed.</p>}
    {applying && <ApplyFormModal prefilledCompany={applying.company} prefilledRole={applying.name} programId={applying.id}
      ownerEmail={user.email} ownerName={user.name} onClose={() => { filterApply(false); setSavedRevision(old => old + 1); }}
      onViewApplications={() => navigate("/app/applications")} onBackDashboard={() => navigate("/app/programs")} />}
  </StudentPage>;
}
