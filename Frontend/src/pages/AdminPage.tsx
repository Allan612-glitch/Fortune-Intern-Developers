import { useEffect, useState } from "react";
import AsyncState from "../components/AsyncState";
import {
  createAdminProgram,
  approveApplicationCertificate,
  deleteAdminAnnouncement,
  exportAdminApplications,
  listAdminApplications,
  listAdminUsers,
  listAnnouncements,
  listPrograms,
  publishAnnouncement,
  removeAdminProgram,
  saveResumeDownload,
  saveSupervisorAssessmentDownload,
  setApplicationStatus,
  setUserSuspension,
  updateAdminProgram,
  type AdminUser,
  type Announcement,
  type BackendApplication,
  type Program,
} from "../services/platform";

const statusBadge: Record<string, string> = {
  applied: "status-applied",
  review: "status-review",
  interview: "status-interview",
  offered: "status-offered",
  rejected: "status-rejected",
};

const emptyProgramForm = {
  name: "",
  description: "",
  company: "Fortune Intern Network",
  category: "Internship",
  location: "Remote",
  duration: "3 months",
  skills: "",
  deadline: "",
};

function formatLocalDeadline(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [applications, setApplications] = useState<BackendApplication[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [tab, setTab] = useState<"users" | "announcements" | "applications" | "programs">("users");
  const [programForm, setProgramForm] = useState(emptyProgramForm);
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [programSubmitting, setProgramSubmitting] = useState(false);
  const [programNotice, setProgramNotice] = useState("");
  const [programToRemove, setProgramToRemove] = useState<Program | null>(null);
  const [programRemoving, setProgramRemoving] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [announcementToRemove, setAnnouncementToRemove] = useState<Announcement | null>(null);
  const [announcementRemoving, setAnnouncementRemoving] = useState(false);
  const [published, setPublished] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [selectedApplicationIds, setSelectedApplicationIds] = useState<string[]>([]);
  const [exportLimit, setExportLimit] = useState<10 | 25 | 50>(50);
  const [exporting, setExporting] = useState(false);
  const [previewApplication, setPreviewApplication] = useState<BackendApplication | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    Promise.all([listAdminUsers(), listAdminApplications(), listAnnouncements(), listPrograms("", "All", "all")])
      .then(([loadedUsers, loadedApplications, loadedAnnouncements, loadedPrograms]) => {
        if (!active) return;
        setUsers(loadedUsers);
        setApplications(loadedApplications);
        setAnnouncements(loadedAnnouncements);
        setPrograms(loadedPrograms);
      })
      .catch((requestError) => {
        if (active) setLoadError(requestError instanceof Error ? requestError.message : "Unable to load admin data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retryCount]);

  const toggleSuspend = async (account: AdminUser) => {
    setBusyKey(`user-${account.id}`);
    try {
      const updated = await setUserSuspension(account.id, !account.is_suspended);
      setUsers((current) => current.map((user) => user.id === updated.id ? updated : user));
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update user status.");
    } finally {
      setBusyKey(null);
    }
  };

  const updateStatus = async (application: BackendApplication, status: string) => {
    setBusyKey(`app-${application.id}`);
    try {
      const updated = await setApplicationStatus(application.id, status);
      setApplications((current) => current.map((row) => row.id === updated.id ? updated : row));
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update application status.");
    } finally {
      setBusyKey(null);
    }
  };

  const approveCertificate = async (application: BackendApplication) => {
    setBusyKey(`certificate-${application.id}`);
    try {
      const updated = await approveApplicationCertificate(application.id);
      setApplications((current) => current.map((row) => row.id === updated.id ? updated : row));
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to approve certificate.");
    } finally {
      setBusyKey(null);
    }
  };

  const toggleApplicationSelection = (id: string) => {
    setSelectedApplicationIds((current) => {
      if (current.includes(id)) return current.filter((selectedId) => selectedId !== id);
      if (current.length >= exportLimit) return current;
      return [...current, id];
    });
  };

  const exportSelectedApplications = async () => {
    setExporting(true);
    setError("");
    try {
      const file = await exportAdminApplications(selectedApplicationIds);
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = "applications.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to export applications.");
    } finally {
      setExporting(false);
    }
  };

  const submitAnnouncement = async () => {
    setPublishing(true);
    try {
      await publishAnnouncement(annTitle, annContent);
      setAnnouncements(await listAnnouncements());
      setPublished(true);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to publish announcement.");
    } finally {
      setPublishing(false);
    }
  };

  const removeAnnouncement = async () => {
    if (!announcementToRemove) return;
    setAnnouncementRemoving(true);
    try {
      await deleteAdminAnnouncement(announcementToRemove.id);
      setAnnouncements((current) => current.filter((item) => item.id !== announcementToRemove.id));
      setAnnouncementToRemove(null);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to remove announcement.");
    } finally {
      setAnnouncementRemoving(false);
    }
  };

  const submitProgram = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProgramSubmitting(true);
    setProgramNotice("");
    const isEditing = editingProgramId !== null;
    try {
      const payload = {
        name: programForm.name.trim(),
        description: programForm.description.trim(),
        company: programForm.company.trim(),
        category: programForm.category.trim(),
        status: "open",
        location: programForm.location.trim(),
        duration: programForm.duration.trim(),
        skills: programForm.skills.split(",").map((skill) => skill.trim()).filter(Boolean),
        deadline: programForm.deadline ? new Date(programForm.deadline).toISOString() : null,
      };
      const saved = editingProgramId
        ? await updateAdminProgram(editingProgramId, payload)
        : await createAdminProgram(payload);
      setPrograms((current) => isEditing
        ? current.map((program) => program.id === saved.id ? saved : program)
        : [saved, ...current]);
      setProgramForm(emptyProgramForm);
      setEditingProgramId(null);
      setProgramNotice(isEditing ? "Program updated successfully." : "Program posted successfully.");
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save program.");
    } finally {
      setProgramSubmitting(false);
    }
  };

  const editProgram = (program: Program) => {
    setEditingProgramId(program.id);
    setProgramForm({
      name: program.name,
      description: program.description,
      company: program.company,
      category: program.category,
      location: program.location,
      duration: program.duration,
      skills: program.skills.join(", "),
      deadline: formatLocalDeadline(program.deadline),
    });
    setProgramNotice("");
    setError("");
  };

  const cancelProgramEdit = () => {
    setEditingProgramId(null);
    setProgramForm(emptyProgramForm);
    setProgramNotice("");
  };

  const removeProgram = async () => {
    if (!programToRemove) return;
    setProgramRemoving(true);
    try {
      const removed = await removeAdminProgram(programToRemove.id);
      setPrograms((current) => current.map((program) => program.id === removed.id ? removed : program));
      setProgramNotice("Program removed from student listings.");
      setProgramToRemove(null);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to remove program.");
    } finally {
      setProgramRemoving(false);
    }
  };

  useEffect(() => {
    if (!editingProgramId) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !programSubmitting) cancelProgramEdit();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingProgramId, programSubmitting]);

  const programFormElement = (
    <form onSubmit={(event) => void submitProgram(event)} className="grid grid-cols-1 sm:grid-cols-2 gap-4 [&_input]:min-w-0 [&_label]:min-w-0">
      <label className="block text-xs font-semibold text-muted-foreground">
        Program title
        <input
          required
          value={programForm.name}
          onChange={(event) => setProgramForm((current) => ({ ...current, name: event.target.value }))}
          placeholder="e.g. Software Engineering Internship"
          className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-2 bg-white"
        />
      </label>
      <label className="block text-xs font-semibold text-muted-foreground">
        Company
        <input
          required
          value={programForm.company}
          onChange={(event) => setProgramForm((current) => ({ ...current, company: event.target.value }))}
          className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-2 bg-white"
        />
      </label>
      <label className="block text-xs font-semibold text-muted-foreground sm:col-span-2">
        Description
        <textarea
          value={programForm.description}
          onChange={(event) => setProgramForm((current) => ({ ...current, description: event.target.value }))}
          rows={4}
          placeholder="Describe the internship and responsibilities"
          className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-2 bg-white resize-y"
        />
      </label>
      <label className="block text-xs font-semibold text-muted-foreground">
        Category
        <input
          required
          value={programForm.category}
          onChange={(event) => setProgramForm((current) => ({ ...current, category: event.target.value }))}
          placeholder="e.g. Technology"
          className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-2 bg-white"
        />
      </label>
      <label className="block text-xs font-semibold text-muted-foreground">
        Location
        <input
          required
          value={programForm.location}
          onChange={(event) => setProgramForm((current) => ({ ...current, location: event.target.value }))}
          className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-2 bg-white"
        />
      </label>
      <label className="block text-xs font-semibold text-muted-foreground">
        Duration
        <input
          required
          value={programForm.duration}
          onChange={(event) => setProgramForm((current) => ({ ...current, duration: event.target.value }))}
          placeholder="e.g. 3 months"
          className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-2 bg-white"
        />
      </label>
      <label className="block text-xs font-semibold text-muted-foreground">
        Skills
        <input
          value={programForm.skills}
          onChange={(event) => setProgramForm((current) => ({ ...current, skills: event.target.value }))}
          placeholder="Comma-separated, e.g. Python, SQL"
          className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-2 bg-white"
        />
      </label>
      <label className="block text-xs font-semibold text-muted-foreground">
        Application deadline
        <input
          type="datetime-local"
          value={programForm.deadline}
          onChange={(event) => setProgramForm((current) => ({ ...current, deadline: event.target.value }))}
          className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-2 bg-white"
        />
      </label>
      <div className="sm:col-span-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
        {editingProgramId && (
          <button
            type="button"
            onClick={cancelProgramEdit}
            disabled={programSubmitting}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-border text-sm font-semibold disabled:opacity-60"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={programSubmitting}
          className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #2D3561, #3d4a8a)" }}
        >
          {programSubmitting ? "Saving..." : editingProgramId ? "Save Changes" : "Post Program"}
        </button>
      </div>
    </form>
  );

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-5 lg:p-6">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-white"
          style={{ background: "linear-gradient(135deg, #dc2626, #b91c1c)" }}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </div>
        <div className="min-w-0">
          <h1
            className="text-xl sm:text-2xl font-bold"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            Admin Dashboard
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage users, programs, announcements and applications
          </p>
        </div>
        <div
          className="ml-auto shrink-0 px-3 py-1 rounded-full text-xs font-bold text-white"
          style={{ background: "linear-gradient(135deg, #dc2626, #b91c1c)" }}
        >
          ADMIN
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600" role="alert">{error}</p>}

      {loading ? (
        <AsyncState kind="loading" message="Loading admin data..." />
      ) : loadError ? (
        <AsyncState
          kind="error"
          message={loadError}
          onRetry={() => setRetryCount((count) => count + 1)}
        />
      ) : (
      <>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Users", value: users.length, icon: "👥" },
          { label: "Programs", value: programs.length, icon: "💼" },
          { label: "Announcements", value: announcements.length, icon: "📢" },
          { label: "Applications", value: applications.length, icon: "📋" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white border border-border rounded-xl p-4 shadow-sm"
          >
            <div className="text-2xl mb-1">{s.icon}</div>
            <div
              className="text-xl font-bold"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              {s.value}
            </div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 mb-5 overflow-x-auto sm:grid sm:grid-cols-4 sm:overflow-visible">
        {(["users", "applications", "programs", "announcements"] as const).map((t) => (
          <button
            key={t}
            onClick={(event) => {
              setTab(t);
              event.currentTarget.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
            }}
            className={`flex-shrink-0 px-4 py-2.5 sm:px-2 rounded-lg text-sm font-semibold capitalize text-center transition-all ${tab === t ? "text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            style={
              tab === t
                ? { background: "linear-gradient(135deg, #2D3561, #3d4a8a)" }
                : {}
            }
          >
            {t}
          </button>
        ))}
      </div>

      {/* Users */}
      {tab === "users" && (
        <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-border bg-muted/30">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Users ({users.length})
            </p>
          </div>
          <div className="divide-y divide-border">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex flex-col gap-3 px-4 sm:px-5 py-4 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/20 transition-colors"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{
                      background: "linear-gradient(135deg, #2D3561, #3d4a8a)",
                    }}
                  >
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm break-words">{user.name}</p>
                    <p className="text-xs text-muted-foreground break-all">
                      {user.email} · {user.is_admin ? "Admin" : "Student"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pl-12 sm:pl-0 sm:shrink-0">
                  {user.is_suspended && (
                    <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-medium">
                      Suspended
                    </span>
                  )}
                  {!user.is_admin && (
                    <button
                      onClick={() => void toggleSuspend(user)}
                      disabled={busyKey === `user-${user.id}`}
                      className={`px-3 py-2 lg:py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${user.is_suspended ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-red-100 text-red-700 hover:bg-red-200"}`}
                    >
                      {busyKey === `user-${user.id}` ? "Updating..." : user.is_suspended ? "Unsuspend" : "Suspend"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Applications */}
      {tab === "applications" && (
        <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-border bg-muted/30 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Applications ({applications.length})
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Select up to {exportLimit} records per Excel export (maximum 20 MB).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedApplicationIds(applications.slice(0, exportLimit).map((app) => app.id))}
                disabled={applications.length === 0}
                className="px-3 py-2 rounded-lg border border-border text-xs font-semibold disabled:opacity-50"
              >
                Select first {Math.min(applications.length, exportLimit)}
              </button>
              <button
                onClick={() => setSelectedApplicationIds([])}
                disabled={selectedApplicationIds.length === 0}
                className="px-3 py-2 rounded-lg border border-border text-xs font-semibold disabled:opacity-50"
              >
                Clear
              </button>
              <label className="text-xs text-muted-foreground">
                Limit
                <select
                  value={exportLimit}
                  onChange={(event) => {
                    const nextLimit = Number(event.target.value) as 10 | 25 | 50;
                    setExportLimit(nextLimit);
                    setSelectedApplicationIds((current) => current.slice(0, nextLimit));
                  }}
                  className="ml-2 px-2 py-2 rounded-lg border border-border bg-white text-foreground"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </label>
              <button
                onClick={() => void exportSelectedApplications()}
                disabled={selectedApplicationIds.length === 0 || exporting}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #2D3561, #3d4a8a)" }}
              >
                {exporting ? "Exporting..." : `Export ${selectedApplicationIds.length} to Excel`}
              </button>
            </div>
          </div>
          <div className="divide-y divide-border">
            {applications.map((app) => (
              <div
                key={app.id}
                className="flex flex-col gap-3 px-4 sm:px-5 py-4 md:flex-row md:items-center md:justify-between hover:bg-muted/20 transition-colors"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedApplicationIds.includes(app.id)}
                    disabled={!selectedApplicationIds.includes(app.id) && selectedApplicationIds.length >= exportLimit}
                    onChange={() => toggleApplicationSelection(app.id)}
                    aria-label={`Select application from ${app.applicant_name || `applicant ${app.user_id.slice(0, 8)}`}`}
                    className="mt-1 h-4 w-4 shrink-0 accent-[#2D3561]"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm break-words">{app.applicant_name || `Applicant ${app.user_id.slice(0, 8)}`}</p>
                    <p className="text-xs text-muted-foreground break-words">
                      {app.program_name} · {new Date(app.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 break-words">
                      {[app.student_index_number, app.gender, app.year_of_study].filter(Boolean).join(" · ") || "No academic details"}
                    </p>
                    {app.requires_minor_review && (
                      <p className="text-xs font-semibold text-amber-700 mt-1">
                        Under 18: verify guardian or institution approval
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pl-7 md:pl-0 md:justify-end md:shrink-0">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusBadge[app.status] || "status-applied"}`}
                  >
                    {app.status}
                  </span>
                  <button
                    onClick={() => setPreviewApplication(app)}
                    className="text-xs px-3 py-2 lg:py-1.5 rounded-lg border border-border font-semibold hover:bg-muted/50 transition-colors"
                    aria-label={`Preview application from ${app.applicant_name || `applicant ${app.user_id.slice(0, 8)}`}`}
                  >
                    Preview
                  </button>
                  {app.resume_filename && <button onClick={() => void saveResumeDownload(app.id, true).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to download resume."))} className="text-xs font-semibold text-primary underline px-1 py-2 lg:py-0">Resume</button>}
                  {app.supervisor_assessment_filename && (
                    <button
                      onClick={() => void saveSupervisorAssessmentDownload(app.id).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to download supervisor assessment."))}
                      className="text-xs font-semibold text-primary underline px-1 py-2 lg:py-0"
                    >
                      Review assessment
                    </button>
                  )}
                  {app.certificate_approved ? (
                    <span className="text-xs font-semibold text-emerald-700 px-1 py-2 lg:py-0">Certificate approved</span>
                  ) : app.supervisor_assessment_filename && app.status.toLowerCase() === "accepted" ? (
                    <button
                      onClick={() => void approveCertificate(app)}
                      disabled={busyKey === `certificate-${app.id}`}
                      className="text-xs px-3 py-2 lg:py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors font-semibold disabled:cursor-wait disabled:opacity-60"
                    >
                      {busyKey === `certificate-${app.id}` ? "Approving..." : "Approve certificate"}
                    </button>
                  ) : null}
                  {app.status.toLowerCase() === "accepted" && !app.documents_sent && (
                    <button
                      onClick={() => void updateStatus(app, "accepted")}
                      disabled={busyKey === `app-${app.id}`}
                      className="text-xs px-3 py-2 lg:py-1.5 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors font-semibold disabled:cursor-wait disabled:opacity-60"
                    >
                      {busyKey === `app-${app.id}` ? "Sending..." : "Send assessment form"}
                    </button>
                  )}
                  {!(["accepted", "rejected"] as string[]).includes(app.status.toLowerCase()) && (
                    <>
                      <button onClick={() => void updateStatus(app, "accepted")} disabled={busyKey === `app-${app.id}`} className="text-xs px-3 py-2 lg:py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors font-semibold disabled:cursor-wait disabled:opacity-60">
                        {busyKey === `app-${app.id}` ? "Updating..." : "Accept"}
                      </button>
                      <button onClick={() => void updateStatus(app, "rejected")} disabled={busyKey === `app-${app.id}`} className="text-xs px-3 py-2 lg:py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors font-semibold disabled:cursor-wait disabled:opacity-60">
                        {busyKey === `app-${app.id}` ? "Updating..." : "Reject"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Programs */}
      {tab === "programs" && (
        <div className="space-y-5">
          {!editingProgramId && (
            <section className="bg-white border border-border rounded-xl p-5 shadow-sm">
              <div className="mb-5">
                <h3 className="font-semibold">Post a Program</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  New open programs will appear in the student Programs section.
                </p>
              </div>
              {programNotice && (
                <p className="mb-4 text-sm text-emerald-700" role="status">
                  {programNotice}
                </p>
              )}
              {programFormElement}
            </section>
          )}

          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Programs ({programs.length})</h3>
            </div>
            {programs.length ? (
              <div className="bg-white border border-border rounded-xl divide-y divide-border shadow-sm">
                {programs.map((program) => (
                  <article key={program.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm break-words">{program.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {program.company} · {program.category} · {program.location} · {program.duration}
                      </p>
                      {program.description && <p className="text-sm text-muted-foreground mt-2 break-words">{program.description}</p>}
                      <p className="text-xs text-muted-foreground mt-2">
                        {program.skills.length ? `Skills: ${program.skills.join(", ")}` : "No skills listed"}
                        {program.deadline && ` · Deadline: ${new Date(program.deadline).toLocaleString()}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-start">
                      <button
                        type="button"
                        onClick={() => editProgram(program)}
                        disabled={programSubmitting}
                        className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted disabled:opacity-60"
                      >
                        Edit
                      </button>
                      {program.status === "open" && (
                        <button
                          type="button"
                          onClick={() => {
                            setProgramToRemove(program);
                            setError("");
                          }}
                          disabled={programRemoving}
                          className="px-3 py-1.5 rounded-lg border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                          aria-label={`Remove ${program.name} from student listings`}
                        >
                          Remove
                        </button>
                      )}
                      <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${program.status === "open" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                        {program.status}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground bg-white border border-border rounded-xl p-5">
                No programs have been posted yet.
              </p>
            )}
          </section>
        </div>
      )}

      {/* Announcements */}
      {tab === "announcements" && (
        <div className="space-y-5">
          <section className="bg-white border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold mb-5">Publish Announcement</h3>
            {published ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">📢</div>
                <p className="font-semibold text-emerald-700">
                  Announcement published!
                </p>
                <button
                  onClick={() => {
                    setPublished(false);
                    setAnnTitle("");
                    setAnnContent("");
                  }}
                  className="mt-4 text-sm text-muted-foreground hover:underline"
                >
                  Publish another
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider text-muted-foreground">
                    Title
                  </label>
                  <input
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    placeholder="Announcement title..."
                    className="w-full px-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 bg-muted/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider text-muted-foreground">
                    Content
                  </label>
                  <textarea
                    value={annContent}
                    onChange={(e) => setAnnContent(e.target.value)}
                    placeholder="Announcement content..."
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 bg-muted/30 resize-none"
                  />
                </div>
                <button
                  onClick={() => void submitAnnouncement()}
                  disabled={publishing}
                  className="w-full py-3 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity disabled:cursor-wait disabled:opacity-60"
                  style={{
                    background: "linear-gradient(135deg, #2D3561, #3d4a8a)",
                  }}
                >
                  {publishing ? "Publishing..." : "Publish Announcement"}
                </button>
              </div>
            )}
          </section>

          <section className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
              <h3 className="font-semibold">Published Announcements</h3>
              <span className="text-xs text-muted-foreground">{announcements.length}</span>
            </div>
            {announcements.length ? (
              <div className="divide-y divide-border">
                {announcements.map((item) => (
                  <article key={item.id} className="p-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm break-words">{item.title}</h4>
                      <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap break-words">{item.content}</p>
                      <p className="text-xs text-muted-foreground mt-3">{new Date(item.created_at).toLocaleString()}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAnnouncementToRemove(item);
                        setError("");
                      }}
                      disabled={announcementRemoving}
                      className="self-start shrink-0 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                      aria-label={`Remove announcement: ${item.title}`}
                    >
                      Remove
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <p className="p-5 text-sm text-muted-foreground">No announcements have been published yet.</p>
            )}
          </section>
        </div>
      )}
      </>
      )}
      {editingProgramId && tab === "programs" && (
        <div
          className="fixed inset-0 z-[100] bg-black/55 backdrop-blur-sm p-4 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-program-title"
        >
          <section className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-border p-5 sm:px-7 flex items-center justify-between gap-4 z-10">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                  Edit program listing
                </p>
                <h2 id="edit-program-title" className="font-bold text-lg mt-1 truncate">
                  {programForm.name || "Program details"}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Update the information students see on this listing.
                </p>
              </div>
              <button
                type="button"
                onClick={cancelProgramEdit}
                disabled={programSubmitting}
                className="w-9 h-9 shrink-0 rounded-xl hover:bg-secondary disabled:opacity-50"
                aria-label="Close program editor"
              >
                ×
              </button>
            </div>
            <div className="p-5 sm:p-7">
              {error && <p className="mb-4 text-sm text-red-600" role="alert">{error}</p>}
              {programFormElement}
            </div>
          </section>
        </div>
      )}
      {programToRemove && (
        <div
          className="fixed inset-0 z-[110] bg-black/55 backdrop-blur-sm p-4 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-program-title"
          aria-describedby="remove-program-description"
        >
          <section className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-7">
            <div className="w-11 h-11 rounded-xl bg-red-50 text-red-700 flex items-center justify-center mb-5" aria-hidden="true">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v4m0 4h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0Z" />
              </svg>
            </div>
            <h2 id="remove-program-title" className="font-bold text-lg">
              Remove program listing?
            </h2>
            <p id="remove-program-description" className="text-sm text-muted-foreground leading-relaxed mt-2">
              <span className="font-semibold text-foreground">{programToRemove.name}</span> will no longer appear in student listings. Existing applications and records will be kept.
            </p>
            {error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setProgramToRemove(null)}
                disabled={programRemoving}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-border text-sm font-semibold disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void removeProgram()}
                disabled={programRemoving}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
              >
                {programRemoving ? "Removing..." : "Remove listing"}
              </button>
            </div>
          </section>
        </div>
      )}
      {announcementToRemove && (
        <div
          className="fixed inset-0 z-[110] bg-black/55 backdrop-blur-sm p-4 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-announcement-title"
          aria-describedby="remove-announcement-description"
        >
          <section className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-7">
            <h2 id="remove-announcement-title" className="font-bold text-lg">
              Remove announcement?
            </h2>
            <p id="remove-announcement-description" className="text-sm text-muted-foreground leading-relaxed mt-2">
              <span className="font-semibold text-foreground">{announcementToRemove.title}</span> will be removed from the announcements page. Notifications already sent to users will remain in their history.
            </p>
            {error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setAnnouncementToRemove(null)}
                disabled={announcementRemoving}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-border text-sm font-semibold disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void removeAnnouncement()}
                disabled={announcementRemoving}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
              >
                {announcementRemoving ? "Removing..." : "Remove announcement"}
              </button>
            </div>
          </section>
        </div>
      )}
      {previewApplication && (
        <ApplicationPreviewModal
          application={previewApplication}
          onClose={() => setPreviewApplication(null)}
          onDownloadResume={() => void saveResumeDownload(previewApplication.id, true).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to download resume."))}
        />
      )}
    </div>
  );
}

function ApplicationPreviewModal({
  application,
  onClose,
  onDownloadResume,
}: {
  application: BackendApplication;
  onClose: () => void;
  onDownloadResume: () => void;
}) {
  const formatValue = (value: string | null) => value || "Not provided";

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/55 backdrop-blur-sm p-4 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="application-preview-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-border p-5 flex items-center justify-between z-10">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
              Application preview
            </p>
            <h2 id="application-preview-title" className="font-bold text-lg mt-1 truncate">
              {application.applicant_name || `Applicant ${application.user_id.slice(0, 8)}`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 shrink-0 rounded-xl hover:bg-secondary"
            aria-label="Close application preview"
          >
            ×
          </button>
        </div>
        <div className="p-5 sm:p-7 space-y-6">
          {application.requires_minor_review && (
            <p className="text-sm font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
              Under 18: verify guardian or institution approval.
            </p>
          )}
          <section>
            <h3 className="font-semibold text-sm mb-2">Application</h3>
            <ApplicationPreviewField label="Program" value={application.program_name} />
            <ApplicationPreviewField label="Status" value={application.status} />
            <ApplicationPreviewField label="Date submitted" value={new Date(application.created_at).toLocaleString()} />
            <ApplicationPreviewField label="Applicant account ID" value={application.user_id} />
          </section>
          <section>
            <h3 className="font-semibold text-sm mb-2">Applicant details</h3>
            <ApplicationPreviewField label="Name" value={formatValue(application.applicant_name)} />
            <ApplicationPreviewField label="Contact" value={formatValue(application.applicant_contact)} />
            <ApplicationPreviewField label="Gender" value={formatValue(application.gender)} />
            <ApplicationPreviewField label="Institution" value={formatValue(application.applicant_institution)} />
            <ApplicationPreviewField label="Course" value={formatValue(application.applicant_course)} />
            <ApplicationPreviewField label="Student index number" value={formatValue(application.student_index_number)} />
            <ApplicationPreviewField label="Year of study" value={formatValue(application.year_of_study)} />
          </section>
          <section>
            <h3 className="font-semibold text-sm mb-2">Placement details</h3>
            <ApplicationPreviewField label="Suggested company" value={formatValue(application.suggested_company)} />
            <ApplicationPreviewField label="Host company" value={formatValue(application.host_company_name)} />
            <ApplicationPreviewField label="Host company address" value={formatValue(application.host_company_address)} />
          </section>
          <section className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <div className="min-w-0">
              <h3 className="font-semibold text-sm">Resume</h3>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {application.resume_filename || "No resume attached"}
              </p>
            </div>
            {application.resume_filename && (
              <button
                onClick={onDownloadResume}
                className="shrink-0 px-3 py-2 rounded-lg text-xs font-semibold text-white"
                style={{ background: "linear-gradient(135deg, #2D3561, #3d4a8a)" }}
              >
                Download resume
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function ApplicationPreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 py-2 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium sm:text-right break-all">{value}</span>
    </div>
  );
}
