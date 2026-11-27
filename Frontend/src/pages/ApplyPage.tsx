import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { AppUser } from "../App";
import ApplyFormModal from "../components/ApplyFormModal";
import AsyncState from "../components/AsyncState";
import WorkStudyRegistration from "../components/WorkStudyRegistration";
import { StudentPage, studentField, studentLink } from "../components/StudentPortalUI";
import { listPrograms, type Program } from "../services/platform";
import { applicationCheckoutEnabled } from "../services/applicationCheckout";
import { money } from "./AdminWorkflowUI";
import "./ApplyPage.css";

const programPageSize = 25;

export default function ApplyPage({ user }: { user: AppUser }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const portal = searchParams.get("portal");
  const [internshipOpen, setInternshipOpen] = useState(portal === "internship");
  const [workStudyOpen, setWorkStudyOpen] = useState(portal === "work-study");
  const [workStudyStarted, setWorkStudyStarted] = useState(portal === "work-study");
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programQuery, setProgramQuery] = useState("");
  const [programSearch, setProgramSearch] = useState("");
  const [programPage, setProgramPage] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [activeProgram, setActiveProgram] = useState<Program | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (portal === "internship") setInternshipOpen(true);
    if (portal === "work-study") {
      setWorkStudyOpen(true);
      setWorkStudyStarted(true);
      const frame = requestAnimationFrame(() => document.getElementById("work-study-portal-section")?.scrollIntoView({ block: "start" }));
      return () => cancelAnimationFrame(frame);
    }
  }, [portal]);

  useEffect(() => {
    if (!internshipOpen) return;
    let active = true;
    setLoading(true);
    setError("");
    listPrograms(programSearch, "All", "open", { limit: programPageSize + 1, offset: programPage * programPageSize })
      .then(items => { if (active) setPrograms(items); })
      .catch(failure => { if (active) setError(failure instanceof Error ? failure.message : "Unable to load programs."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [internshipOpen, programSearch, programPage, revision]);

  const selectedProgram = programs.slice(0, programPageSize).find(program => program.id === selectedId);

  return <StudentPage title="Application portals" description="Choose a portal to explore your next step with FIN."
    action={<Link className={studentLink} to="/app/applications">My applications</Link>}>
    <div className="apply-portal-grid">
      <section className="student-panel overflow-hidden" aria-labelledby="internship-title">
        <div className="apply-portal-intro apply-portal-internship">
          <div className="apply-portal-header">
            <p className="apply-portal-label">Portal A</p>
            <p className="apply-portal-price"><strong>GHS 5</strong><span>One time fee</span><small>Display only</small></p>
          </div>
          <h2 id="internship-title">Internship Application Portal</h2>
          <p className="apply-portal-description">Explore internships and attachments with organisations across a range of industries.</p>
          <details className="apply-portal-details">
          <summary>How it works and features</summary>
          <ol className="apply-portal-steps">
            <li>Choose an open program and provide your personal, academic and placement details.</li>
            <li>{applicationCheckoutEnabled ? "Optionally attach a PDF CV, then pay securely through Paystack and submit." : "Optionally attach a PDF CV and submit. No application fee is currently collected."}</li>
            <li>Keep your application reference and track progress in My applications.</li>
            <li>Access your placement documents and submit your supervisor assessment when available.</li>
          </ol>
          <ul className="apply-portal-tags" aria-label="Internship features">
            <li>Internships and attachments</li><li>Application tracking</li><li>Assessment form</li>
            <li>Certificate on completion</li>
          </ul>
          </details>
        </div>
        <div className="p-3">
          <button type="button" aria-expanded={internshipOpen} aria-controls="internship-portal"
            onClick={() => { setSelectedId(""); setInternshipOpen(open => !open); }}
            className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-border px-3 text-left text-sm font-semibold text-primary hover:bg-secondary">
            {internshipOpen ? "Close internship application" : "Open internship application"}
            <ChevronDown className={`size-4 shrink-0 ${internshipOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          <div id="internship-portal" hidden={!internshipOpen} className="mt-4">
            {!activeProgram && (loading ? <AsyncState kind="loading" message="Loading open programs…" /> : error ?
              <AsyncState kind="error" message={error} onRetry={() => setRevision(value => value + 1)} /> :
              <div className="space-y-3">
                <form className="flex flex-wrap gap-2" onSubmit={event => {
                  event.preventDefault();
                  setSelectedId("");
                  setProgramPage(0);
                  setProgramSearch(programQuery.trim());
                }}>
                  <input type="search" aria-label="Search open programs" placeholder="Search programs or organisations" maxLength={100}
                    className={`${studentField} min-w-0 flex-1`} value={programQuery} onChange={event => setProgramQuery(event.target.value)} />
                  <button type="submit" className={studentLink}>Search</button>
                </form>
                {programs.length ? <>
                <label className="grid gap-1.5 text-sm font-semibold">Choose an open program
                  <select className={studentField} value={selectedId} onChange={event => setSelectedId(event.target.value)}>
                    <option value="">Select a program</option>
                    {programs.slice(0, programPageSize).map(program => <option key={program.id} value={program.id}>{program.name}{program.company ? ` · ${program.company}` : ""}</option>)}
                  </select>
                </label>
                <button type="button" className={`${studentLink} disabled:opacity-50`} disabled={!selectedProgram}
                  onClick={() => { if (selectedProgram) setActiveProgram(selectedProgram); }}>Continue to form</button>
                </> : <p className="text-sm text-muted-foreground">No open programs found{programSearch ? " for this search" : ""}.</p>}
                {(programPage > 0 || programs.length > programPageSize) && <div className="flex items-center gap-3 text-sm">
                  <button type="button" className="min-h-10 font-semibold text-primary underline disabled:opacity-50" disabled={programPage === 0}
                    onClick={() => { setSelectedId(""); setProgramPage(value => value - 1); }}>Previous</button>
                  <span>Page {programPage + 1}</span>
                  <button type="button" className="min-h-10 font-semibold text-primary underline disabled:opacity-50" disabled={programs.length <= programPageSize}
                    onClick={() => { setSelectedId(""); setProgramPage(value => value + 1); }}>Next</button>
                </div>}
              </div>)}
            {activeProgram && <>
              <div className="rounded-lg bg-secondary p-3 text-sm">
                <p className="font-semibold">{activeProgram.name}{activeProgram.company ? ` · ${activeProgram.company}` : ""}</p>
                <p className="mt-1 text-muted-foreground">Application fee: {applicationCheckoutEnabled ? activeProgram.application_fee_minor == null ? "confirmed at checkout" : money(activeProgram.application_fee_minor) : "not currently collected"}.</p>
                <button type="button" disabled={formBusy} className="mt-2 font-semibold text-primary underline disabled:opacity-50"
                  onClick={() => { if (window.confirm("Choose another program? Unsaved form details will be lost.")) setActiveProgram(null); }}>Choose another program</button>
              </div>
              <ApplyFormModal key={activeProgram.id} inline programId={activeProgram.id} prefilledCompany={activeProgram.company}
                prefilledRole={activeProgram.name} ownerEmail={user.email} ownerName={user.name}
                onBusyChange={setFormBusy}
                onClose={() => setInternshipOpen(false)} onViewApplications={() => navigate("/app/applications")}
                onBackDashboard={() => navigate("/app/dashboard")} />
            </>}
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold">
              <Link className="text-primary underline" to="/app/programs">Browse programs</Link>
              <Link className="text-primary underline" to="/terms#refunds">Refund policy</Link>
            </div>
          </div>
        </div>
      </section>

      <section id="work-study-portal-section" className="student-panel overflow-hidden" aria-labelledby="work-study-title">
        <div className="apply-portal-intro apply-portal-work-study">
          <div className="apply-portal-header">
            <p className="apply-portal-label">Portal B</p>
            <p className="apply-portal-price"><strong>GHS 10</strong><span>One time fee</span><small>Display only</small></p>
          </div>
          <h2 id="work-study-title">Work and Study Registration Portal</h2>
          <p className="apply-portal-description">Explore flexible earning roles on and near campus that can fit around your studies.</p>
          <details className="apply-portal-details">
          <summary>How it works and roles</summary>
          <ol className="apply-portal-steps">
            <li>Open the form and register your availability and preferred role type.</li>
            <li>No payment is collected with this registration. Contact the FIN desk for current fee information.</li>
            <li>Share your institution and chapter details to help the team understand where you are based.</li>
            <li>Keep your registration reference for follow-up with the FIN desk.</li>
          </ol>
          <ul className="apply-portal-tags" aria-label="Possible work and study roles">
            <li>Tutoring</li><li>Event logistics</li><li>Departmental support</li>
            <li>Insurance sales</li><li>Retail and admin</li>
          </ul>
          </details>
        </div>
        <div className="p-3">
          <button type="button" aria-expanded={workStudyOpen} aria-controls="work-study-portal"
            onClick={() => { setWorkStudyOpen(open => !open); setWorkStudyStarted(true); }}
            className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-border px-3 text-left text-sm font-semibold text-primary hover:bg-secondary">
            {workStudyOpen ? "Close registration form" : "Open registration form"}
            <ChevronDown className={`size-4 shrink-0 ${workStudyOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          <div id="work-study-portal" hidden={!workStudyOpen} className="mt-4 space-y-3 text-sm">
            {workStudyStarted && <WorkStudyRegistration user={user} />}
            <div className="flex flex-wrap gap-x-4 gap-y-2 font-semibold">
              <a className="text-primary underline" href="https://wa.me/233257038948" target="_blank" rel="noopener noreferrer">WhatsApp the desk</a>
              <a className="text-primary underline" href="mailto:fortuneintern.gh@gmail.com">Email the desk</a>
              <a className="text-primary underline" href="tel:+233200313672">020 031 3672</a>
              <Link className="text-primary underline" to="/privacy-policy">Privacy policy</Link>
              <Link className="text-primary underline" to="/terms#refunds">Refund policy</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
    <div className="flex flex-wrap gap-x-4 gap-y-2 px-1 text-sm font-semibold">
      <Link className="text-primary underline" to="/app/home">Portal home</Link>
      <Link className="text-primary underline" to="/app/programs">Programs board</Link>
      <Link className="text-primary underline" to="/app/dashboard">Dashboard</Link>
    </div>
  </StudentPage>;
}
