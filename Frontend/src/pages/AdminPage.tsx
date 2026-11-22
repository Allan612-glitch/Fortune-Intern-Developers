import OpportunityFields from "../components/OpportunityFields";
import { emptyOpportunity } from "../services/opportunities";
import { PanelDialog } from "./AdminWorkflowUI";
import FilterMenu from "../components/FilterMenu";
import ApplicationFollowUps from "../components/ApplicationFollowUps";
import { ApplicationReviewWork, ReviewQueueFilter, ReviewQueueSummary } from "../components/ApplicationReviewWork";
import type { AdminApplication, ApplicationReview } from "../services/platform";
import AccountManagementDialog from "./AccountManagementDialog";
import { FinanceOverview, RecentActivity } from "./FinancePage";
import AnnouncementComposer, { announcementCategories } from "../components/AnnouncementComposer";
import RowActions, { type RowAction } from "../components/RowActions";
import ProgramOverview from "./ProgramOverview";
import AdminReportActions, { previewPdf } from "../components/AdminReportActions";
import ProfileAvatar from "../components/layout/ProfileAvatar";
import SearchableField from "../components/SearchableField";
import StaffAccessSection from "./StaffAccessSection";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Briefcase, ClipboardList, LayoutDashboard, Megaphone, Plus, Search, ShieldCheck, Users, X } from "lucide-react";
import { AdminTable, TableSelection } from "../components/AdminTable";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import ApplicationHistory from "../components/ApplicationHistory";
import { ApiError } from "../services/api";
import { applicationStatusLabel } from "../services/applications";
import AsyncState from "../components/AsyncState";
import {
  createAdminProgram,
  approveApplicationCertificate,
  deleteAdminAnnouncement,
  bulkUnpublishPrograms,
  getAdminPhoto,
  getResumeFile,
  getAdminOverview,
  listAdminApplications,
  listAdminUsers,
  listAdminAnnouncements,
  listAdminPrograms,
  removeAdminProgram,
  saveResumeDownload,
  saveSupervisorAssessmentDownload,
  setApplicationStatus,
  setUsersSuspension,
  updateAdminProgram,
  type AdminOverview,
  type AdminUser,
  type Announcement,
  type BackendApplication,
  type Program,
} from "../services/platform";
import "./AdminWorkspace.css";

const statusBadge: Record<string, string> = {
  submitted: "status-applied",
  applied: "status-applied",
  review: "status-review",
  interview: "status-interview",
  shortlisted: "status-interview",
  accepted: "status-offered",
  offered: "status-offered",
  rejected: "status-rejected",
};

const directoryPageSize = 25;
const bulkUserLimit = 50;
const tableButton = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-xs font-semibold hover:bg-[var(--surface)] disabled:opacity-50";

function pageSelection(ids: string[], selected: string[], limit: number) {
  const onPage = ids.filter((id) => selected.includes(id));
  const remaining = ids.filter((id) => !selected.includes(id));
  const available = limit - selected.length;
  const checked = ids.length > 0 && remaining.length === 0;
  const clearPage = checked || available === 0;
  return {
    checked,
    mixed: onPage.length > 0 && !checked,
    disabled: ids.length === 0 || (onPage.length === 0 && available === 0),
    next: clearPage
      ? selected.filter((id) => !ids.includes(id))
      : [...selected, ...remaining.slice(0, available)],
  };
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function accountInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function AccountStatus({ suspended }: { suspended: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium ${suspended ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {suspended ? "Suspended" : "Active"}
    </span>
  );
}

function isAwaitingReview(status: string) {
  return ["submitted", "applied", "review", "under_review"].includes(status.toLowerCase());
}

function programStatus(program: Program) {
  if (program.status !== "open") return program.status;
  if (program.cycle_closed_at) return "closed";
  if (program.deadline && new Date(program.deadline).getTime() <= Date.now()) return "expired";
  return "open";
}

const emptyProgramForm = {
  name: "",
  description: "",
  company: "Fortune Intern Network",
  category: "Internship",
  location: "Remote",
  duration: "3 months",
  skills: "",
  deadline: "",
  opportunity: emptyOpportunity,
  eligibleCourses: "",
};

function formatLocalDeadline(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export type AdminSection = "overview" | "users" | "applications" | "programs" | "announcements" | "staff";

const sections = {
  overview: { label: "Admin Overview", description: "Track applications, manage programs, and oversee student accounts.", icon: LayoutDashboard },
  users: { label: "Users", description: "Find student accounts, view application history, and manage account status.", icon: Users },
  applications: { label: "Applications", description: "Review submissions, update decisions, and export selected applications.", icon: ClipboardList },
  programs: { label: "Programs", description: "Manage internship listings, deadlines, and availability.", icon: Briefcase },
  announcements: { label: "Announcements", description: "Publish updates for all students or a selected university.", icon: Megaphone },
  staff: { label: "Staff & Access", description: "View administrator accounts and their current status.", icon: ShieldCheck },
} satisfies Record<AdminSection, { label: string; description: string; icon: typeof LayoutDashboard }>;

export default function AdminPage({ tab, onNavigate, allowedSections, programDetailId, canInvestigate, canFinance, caseTools }: {
  tab: AdminSection;
  onNavigate: (section: AdminSection, search?: string) => void;
  allowedSections: AdminSection[];
  programDetailId?: string;
  canInvestigate: boolean;
  canFinance: boolean;
  caseTools: readonly string[];
}) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const accountDialog = useRef<HTMLDialogElement>(null);
  const [accountEditor, setAccountEditor] = useState<{ key: number; account: { id: string; name: string } | null }>({ key: 0, account: null });
  useEffect(() => { if (accountEditor.key) accountDialog.current?.showModal(); }, [accountEditor]);
  const openAccountEditor = (account: { id: string; name: string } | null) => setAccountEditor(current => ({ key: current.key + 1, account }));
  const showsUsers = tab === "users";
  const canReviewApplications = allowedSections.includes("applications");
  const showsApplications = programDetailId ? canReviewApplications : tab === "applications";
  const isDirectory = showsApplications || (!programDetailId && (showsUsers || tab === "programs" || tab === "announcements"));
  const query = isDirectory ? searchParams.get("q") ?? "" : "";
  const statusFilter = isDirectory ? searchParams.get("status") ?? "all" : "all";
  const reviewFilter = showsApplications ? searchParams.get("review") ?? "all" : "all";
  const userFilter = showsApplications ? searchParams.get("user") : null;
  const requestedPage = Number(isDirectory ? searchParams.get("page") : 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage >= 1 &&
    requestedPage <= Math.floor(Number.MAX_SAFE_INTEGER / directoryPageSize) ? requestedPage : 1;
  const [hasNextPage, setHasNextPage] = useState(false);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [overviewError, setOverviewError] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const visibleUsers = users.filter((user) =>
    !user.is_admin &&
    (statusFilter === "all" || (statusFilter === "suspended" ? user.is_suspended : !user.is_suspended)),
  );
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkConfirmation, setBulkConfirmation] = useState<{ suspended: boolean; ids: string[] } | null>(null);
  const [userNotice, setUserNotice] = useState("");
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [accountPhoto, setAccountPhoto] = useState<string | null>(null);
  const [accountPhotoOpen, setAccountPhotoOpen] = useState(false);
  const [profileApps, setProfileApps] = useState<BackendApplication[] | null>(null);
  const [profileError, setProfileError] = useState(false);
  const profileDialog = useRef<HTMLDialogElement>(null);
  const bulkDialog = useRef<HTMLDialogElement>(null);
  const profileUser = users.find((user) => user.id === profileUserId);
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([]);
  const [selectedAnnouncementIds, setSelectedAnnouncementIds] = useState<string[]>([]);
  const programSelection = pageSelection(programs.map(program => program.id), selectedProgramIds, 50);
  const announcementSelection = pageSelection(announcements.map(item => item.id), selectedAnnouncementIds, 50);
  const [analyticsRefresh, setAnalyticsRefresh] = useState(0);
  const addProgramDialog = useRef<HTMLDialogElement>(null);
  const [programForm, setProgramForm] = useState(emptyProgramForm);
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [programSubmitting, setProgramSubmitting] = useState(false);
  const [programNotice, setProgramNotice] = useState("");
  const [programToRemove, setProgramToRemove] = useState<Program | null>(null);
  const [programRemoving, setProgramRemoving] = useState(false);
  const announcementDetails = useRef<HTMLDialogElement>(null);
  const [viewedAnnouncement, setViewedAnnouncement] = useState<Announcement | null>(null);
  const openAnnouncement = (item: Announcement) => {
    setViewedAnnouncement(item);
    announcementDetails.current?.showModal();
  };
  const [announcementToRemove, setAnnouncementToRemove] = useState<Announcement | null>(null);
  const [announcementRemoving, setAnnouncementRemoving] = useState(false);
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [announcementNotice, setAnnouncementNotice] = useState("");
  const categoryFilter = tab === "announcements" ? searchParams.get("category") || "all" : "all";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [selectedApplicationIds, setSelectedApplicationIds] = useState<string[]>([]);
  const [exportLimit, setExportLimit] = useState(50);
  const [previewApplicationId, setPreviewApplicationId] = useState<string | null>(null);
  const previewApplication = applications.find((app) => app.id === previewApplicationId);
  const visibleApplications = applications.filter((app) =>
    statusFilter === "all" ||
    (statusFilter === "queue" ? isAwaitingReview(app.status) : applicationStatusLabel(app.status) === statusFilter),
  );
  const [certificateApplication, setCertificateApplication] = useState<BackendApplication | null>(null);
  const [internshipStartDate, setInternshipStartDate] = useState("");
  const [internshipEndDate, setInternshipEndDate] = useState("");

  useEffect(() => {
    setSelectedApplicationIds([]);
    setSelectedUserIds([]);
    setSelectedProgramIds([]);
    setSelectedAnnouncementIds([]);
    setProfileUserId(null);
    setPreviewApplicationId(null);
  }, [categoryFilter, query, statusFilter, tab, userFilter, reviewFilter]);

  useEffect(() => {
    if (programDetailId && !showsApplications) return;
    let active = true;
    setLoading(true);
    setLoadError("");
    const timer = window.setTimeout(async () => {
      const filters = {
        q: query.trim(),
        status: statusFilter,
        offset: (page - 1) * directoryPageSize,
        limit: directoryPageSize + 1,
      };
      try {
        switch (programDetailId ? "applications" : tab) {
          case "users": {
            const rows = await listAdminUsers({ ...filters, role: "student" });
            if (active) {
              setUsers(rows.slice(0, directoryPageSize));
              setHasNextPage(rows.length > directoryPageSize);
            }
            break;
          }
          case "applications": {
            const rows = await listAdminApplications({ ...filters, user: userFilter ?? undefined, program: programDetailId, review: reviewFilter });
            if (active) {
              setApplications(rows.slice(0, directoryPageSize));
              setHasNextPage(rows.length > directoryPageSize);
            }
            break;
          }
          case "announcements": {
            const rows = await listAdminAnnouncements({ ...filters, category: categoryFilter });
            if (active) {
              setAnnouncements(rows.slice(0, directoryPageSize));
              setHasNextPage(rows.length > directoryPageSize);
            }
            break;
          }
          case "programs": {
            const rows = await listAdminPrograms(filters);
            if (active) {
              setPrograms(rows.slice(0, directoryPageSize));
              setHasNextPage(rows.length > directoryPageSize);
            }
            break;
          }
        }
      } catch (requestError) {
        if (active) setLoadError(requestError instanceof Error ? requestError.message : "Unable to load admin data.");
      } finally {
        if (active) setLoading(false);
      }
    }, isDirectory ? 300 : 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [categoryFilter, isDirectory, page, programDetailId, query, retryCount, showsApplications, statusFilter, tab, userFilter, reviewFilter]);

  useEffect(() => {
    if (tab !== "overview" || !canInvestigate) return;
    let active = true;
    setOverviewError(false);
    getAdminOverview()
      .then((summary) => { if (active) setOverview(summary); })
      .catch(() => { if (active) setOverviewError(true); });
    return () => { active = false; };
  }, [tab, retryCount, canInvestigate]);

  useEffect(() => {
    if (profileUserId === null) return;
    let active = true;
    profileDialog.current?.showModal();
    setProfileError(false);
    setProfileApps(null);
    setAccountPhoto(null);
    setAccountPhotoOpen(false);
    void getAdminPhoto("users", profileUserId).then(result => { if (active) setAccountPhoto(result.photo); }).catch(() => {});
    if (canReviewApplications) listAdminApplications({ user: profileUserId, limit: 3 })
      .then((rows) => { if (active) setProfileApps(rows); })
      .catch(() => { if (active) setProfileError(true); });
    return () => { active = false; };
  }, [profileUserId, canReviewApplications]);

  useEffect(() => {
    if (bulkConfirmation) bulkDialog.current?.showModal();
  }, [bulkConfirmation]);

  const changeFilter = (name: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(name, value);
    else next.delete(name);
    next.delete("page");
    setSearchParams(next, { replace: name === "q" });
  };

  const changePage = (nextPage: number) => {
    const next = new URLSearchParams(searchParams);
    if (nextPage === 1) next.delete("page");
    else next.set("page", String(nextPage));
    setPreviewApplicationId(null);
    setProfileUserId(null);
    setSearchParams(next);
  };

  const userPageSelection = pageSelection(
    visibleUsers.filter((user) => !user.is_admin).map((user) => user.id), selectedUserIds, bulkUserLimit,
  );
  const applicationPageSelection = pageSelection(visibleApplications.map((app) => app.id), selectedApplicationIds, exportLimit);

  const loadState = loading
    ? <AsyncState kind="loading" message="Loading admin data..." />
    : loadError
      ? <AsyncState kind="error" message={loadError} onRetry={() => setRetryCount((count) => count + 1)} />
      : null;

  const pagination = (page > 1 || hasNextPage) && (
    <nav aria-label="Results pages" className="flex items-center justify-between gap-2 border-t border-border px-4 py-3 sm:justify-end">
      <button type="button" disabled={page === 1} onClick={() => changePage(page - 1)}
        className="min-h-11 rounded-lg border border-border px-3 text-sm font-semibold disabled:opacity-50">
        Previous
      </button>
      <span aria-live="polite" className="px-2 text-sm text-muted-foreground">Page {page}</span>
      <button type="button" disabled={!hasNextPage} onClick={() => changePage(page + 1)}
        className="min-h-11 rounded-lg border border-border px-3 text-sm font-semibold disabled:opacity-50">
        Next
      </button>
    </nav>
  );

  const confirmBulkSuspension = async () => {
    if (!bulkConfirmation) return;
    setBusyKey("bulk-users");
    setError("");
    try {
      const updated = await setUsersSuspension(bulkConfirmation.ids, bulkConfirmation.suspended);
      const byId = new Map(updated.map((user) => [user.id, user]));
      setUsers((current) => current.map((user) => byId.get(user.id) ?? user));
      setSelectedUserIds((current) => current.filter((id) => !byId.has(id)));
      setUserNotice(`${updated.length} ${updated.length === 1 ? "account" : "accounts"} ${bulkConfirmation.suspended ? "suspended" : "reactivated"}.`);
      bulkDialog.current?.close();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update the selected accounts.");
      bulkDialog.current?.close();
    } finally {
      setBusyKey(null);
    }
  };

  const updateStatus = async (application: BackendApplication, status: string, reason?: string) => {
    setBusyKey(`app-${application.id}`);
    setError("");
    try {
      const updated = await setApplicationStatus(application.id, status, reason);
      setAnalyticsRefresh(value => value + 1);
      setApplications((current) => current.map((row) => row.id === updated.id ? { ...row, ...updated } : row));
      setSelectedApplicationIds((current) => current.filter((id) => id !== updated.id));
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update application status.");
      if (status === "accepted" && requestError instanceof ApiError && requestError.status === 503) {
        setAnalyticsRefresh(value => value + 1);
        // The backend records the decision before attempting document delivery.
        try {
          const [updated] = await listAdminApplications({ q: application.id, limit: 1 });
          if (updated?.id !== application.id) throw new Error("Application could not be refreshed.");
          if (updated.status === "accepted") {
            setError("The acceptance was saved. The documents could not be sent. You can retry delivery.");
          }
          setApplications((current) => current.map((row) => row.id === updated.id ? { ...row, ...updated } : row));
          setSelectedApplicationIds((current) => current.filter((id) => id !== updated.id));
        } catch {
          setError("Unable to confirm the latest status. Refresh the queue before trying again.");
        }
      }
    } finally {
      setBusyKey(null);
    }
  };

  const approveCertificate = async (
    application: BackendApplication,
    startDate: string,
    endDate: string,
  ) => {
    setBusyKey(`certificate-${application.id}`);
    try {
      const updated = await approveApplicationCertificate(application.id, startDate, endDate);
      setApplications((current) => current.map((row) => row.id === updated.id ? { ...row, ...updated } : row));
      setCertificateApplication(null);
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

  const removeAnnouncement = async () => {
    if (!announcementToRemove) return;
    setAnnouncementRemoving(true);
    try {
      await deleteAdminAnnouncement(announcementToRemove.id);
      setAnnouncements((current) => current.filter((item) => item.id !== announcementToRemove.id));
      setSelectedAnnouncementIds(current => current.filter(id => id !== announcementToRemove.id));
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
        opportunity: { ...programForm.opportunity, eligible_courses: programForm.eligibleCourses.split(",").map(value => value.trim()).filter(Boolean) },
        deadline: programForm.deadline ? new Date(programForm.deadline).toISOString() : null,
      };
      const saved = editingProgramId
        ? await updateAdminProgram(editingProgramId, payload)
        : await createAdminProgram(payload);
      setPrograms((current) => isEditing
        ? current.map((program) => program.id === saved.id ? saved : program)
        : [saved, ...current]);
      setProgramForm(emptyProgramForm);
      if (!isEditing) {
        addProgramDialog.current?.close();
        changeFilter("q", "");
        setRetryCount(value => value + 1);
      }
      setEditingProgramId(null);
      setProgramNotice(isEditing ? "Program updated successfully." : "Program posted successfully.");
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save program.");
    } finally {
      setProgramSubmitting(false);
    }
  };

  const unpublishSelectedPrograms = async () => {
    if (!window.confirm(`Unpublish ${selectedProgramIds.length} selected program(s)? Existing applications will be retained.`)) return;
    setProgramRemoving(true);
    setError("");
    try {
      const updated = await bulkUnpublishPrograms(selectedProgramIds);
      const byId = new Map(updated.map(program => [program.id, program]));
      setPrograms(current => current.map(program => byId.get(program.id) ?? program));
      setSelectedProgramIds([]);
      setProgramNotice(`Unpublished ${updated.length} selected program(s).`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to unpublish the selected programs.");
    } finally {
      setProgramRemoving(false);
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
      opportunity: program.opportunity || emptyOpportunity,
      eligibleCourses: program.opportunity?.eligible_courses.join(", ") || "",
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

  const auditHistory = (type: string, id: string) =>
    `/app/admin/audit?${new URLSearchParams({ entity_type: type, entity: id })}`;

  const applicationActions = (app: BackendApplication) => {
    const actions: RowAction[] = [{ label: "Review application", run: () => setPreviewApplicationId(app.id) }];
    if (canInvestigate) actions.push({ label: "View audit history", run: () => {
      navigate(auditHistory("application", app.id));
    } });
    if (app.resume_filename) actions.push({
      label: "Download resume",
      run: () => void saveResumeDownload(app.id, true).catch(failure =>
        setError(failure instanceof Error ? failure.message : "Unable to download resume.")),
    });
    if (app.supervisor_assessment_filename) actions.push({
      label: "Download supervisor assessment",
      run: () => void saveSupervisorAssessmentDownload(app.id).catch(failure =>
        setError(failure instanceof Error ? failure.message : "Unable to download assessment.")),
    });
    if (!app.certificate_approved && app.supervisor_assessment_filename && app.status.toLowerCase() === "accepted") {
      actions.push({ label: "Review dates and approve", disabled: busyKey === `certificate-${app.id}`, run: () => {
        setCertificateApplication(app);
        setInternshipStartDate("");
        setInternshipEndDate("");
        setError("");
      } });
    }
    if (app.status.toLowerCase() === "accepted" && !app.documents_sent) {
      actions.push({ label: "Send assessment form", disabled: busyKey === `app-${app.id}`, run: () => void updateStatus(app, "accepted") });
    }
    return actions;
  };

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
      <SearchableField label="Company" required value={programForm.company}
        choices={[...["Fortune Intern Network"], ...programs.map(program => program.company)]}
        onChange={value => setProgramForm(current => ({ ...current, company: value, opportunity: { ...current.opportunity, employer_verified: false } }))} />
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
      <SearchableField label="Category" required value={programForm.category}
        choices={[...["Internship", "Technology", "Data", "Marketing", "Finance", "Operations", "Engineering", "Research"], ...programs.map(program => program.category)]}
        onChange={value => setProgramForm(current => ({ ...current, category: value }))} />
      <SearchableField label="Location" required value={programForm.location}
        choices={[...["Remote", "Hybrid", "On-site", "Accra, Ghana", "Kumasi, Ghana", "Tema, Ghana", "Takoradi, Ghana"], ...programs.map(program => program.location)]}
        onChange={value => setProgramForm(current => ({ ...current, location: value }))} />
      <SearchableField label="Duration" required value={programForm.duration}
        choices={[...["2 weeks", "1 month", "6 weeks", "2 months", "3 months", "4 months", "6 months", "9 months", "12 months", "Flexible"], ...programs.map(program => program.duration)]}
        onChange={value => setProgramForm(current => ({ ...current, duration: value }))} />
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
      <OpportunityFields value={programForm.opportunity} onChange={opportunity => setProgramForm(current => ({ ...current, opportunity }))}
        courses={programForm.eligibleCourses} onCoursesChange={eligibleCourses => setProgramForm(current => ({ ...current, eligibleCourses }))} />
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

  const section = sections[tab];
  const SectionIcon = section.icon;

  return (
    <div className="admin-page mx-auto w-full max-w-[86rem] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      {!programDetailId && <header className={`admin-section-header relative mb-5 flex flex-wrap items-center justify-between gap-4 p-5 sm:p-7 ${tab === "overview" ? "admin-overview-header sm:min-h-44" : ""}`}>
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl sm:size-12 ${tab === "overview" ? "bg-white/10 text-accent" : "bg-secondary text-primary"}`}>
            <SectionIcon aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{section.label}</h1>
            <p className={`mt-1.5 max-w-xl text-sm leading-relaxed ${tab === "overview" ? "text-white/85" : "text-muted-foreground"}`}>{section.description}</p>
          </div>
        </div>
        {tab === "overview" && canReviewApplications && (
          <Link to="/app/admin/applications?status=queue" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground hover:brightness-105 focus-visible:outline-white!">
            Review applications <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        )}
        {tab === "programs" && !loadState && !editingProgramId && (
          <button type="button" onClick={() => { setError(""); addProgramDialog.current?.showModal(); }}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover">
            <Plus aria-hidden="true" className="size-4" /> New program
          </button>
        )}
        {tab === "announcements" && (
          <button type="button" onClick={() => setAnnouncementOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover">
            <Plus aria-hidden="true" className="size-4" /> New announcement
          </button>
        )}
      </header>}
      {programDetailId && <ProgramOverview id={programDetailId} canReview={canReviewApplications} refresh={analyticsRefresh} canManagePrograms={allowedSections.includes("programs")} canInvestigate={canInvestigate} />}

      <nav aria-label="Admin sections" className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-border bg-white p-1 min-[380px]:grid-cols-3 sm:flex sm:flex-wrap lg:hidden">
        {allowedSections.map((key) => (
          <Link key={key} to={key === "overview" ? "/app/admin" : `/app/admin/${key}`}
            aria-current={tab === key ? "page" : undefined}
            className={`inline-flex min-h-10 items-center justify-center rounded-lg px-2 text-center text-xs font-semibold sm:px-3 sm:text-sm ${tab === key ? "bg-primary text-white" : "text-primary hover:bg-secondary"}`}>
            {key === "overview" ? "Overview" : sections[key].label}
          </Link>
        ))}
      </nav>

      {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}

      {!isDirectory && !programDetailId && loadState ? loadState : (
      <>
      {tab === "overview" && overviewError && (
        <AsyncState kind="error" message="Unable to load overview totals." onRetry={() => setRetryCount((count) => count + 1)} />
      )}
      {tab === "overview" && overview && !overviewError && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {([
            { section: "users", label: "Student accounts", value: overview.students, Icon: Users, color: "bg-secondary text-primary" },
            { section: "programs", label: "Open programs", value: overview.open_programs, Icon: Briefcase, color: "bg-[var(--gold-light)] text-[var(--gold-text)]" },
            { section: "announcements", label: "Announcements", value: overview.announcements, Icon: Megaphone, color: "bg-secondary text-primary" },
            { section: "applications", label: "Awaiting review", value: overview.awaiting_review, Icon: ClipboardList, color: "bg-[var(--gold-light)] text-[var(--gold-text)]" },
          ] as const).map(({ section, label, value, Icon, color }) => (
            <button
              key={section}
              type="button"
              onClick={() => onNavigate(section, section === "applications" ? "?status=queue" : "")}
              className="admin-stat group p-4 text-left sm:p-5"
            >
              <span className="mb-3 flex items-center justify-between gap-2">
                <span className={`inline-flex size-9 items-center justify-center rounded-lg ${color}`}><Icon aria-hidden="true" className="size-4" /></span>
                <ArrowUpRight aria-hidden="true" className="size-4 text-muted-foreground group-hover:text-primary" />
              </span>
              <span className="block text-2xl font-bold tabular-nums sm:text-3xl">{value.toLocaleString()}</span>
              <span className="mt-1 block text-xs font-medium text-muted-foreground sm:text-sm">{label}</span>
            </button>
          ))}
        </div>
      )}

      {tab === "overview" && canFinance && <FinanceOverview />}
      {tab === "overview" && canInvestigate && <RecentActivity />}
      {tab === "staff" && <StaffAccessSection />}

      {/* Student directory */}
      {showsUsers && (
        <section className="admin-panel overflow-hidden" aria-labelledby="admin-users-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="admin-users-heading" className="font-semibold text-foreground">Student accounts</h2>
              {canInvestigate && <button type="button" className={tableButton} onClick={() => openAccountEditor(null)}>Create user</button>}
              {!loadState && <span className="text-xs text-muted-foreground">{visibleUsers.length} shown</span>}
              {showsUsers && <span aria-live="polite" className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-primary">{selectedUserIds.length} selected</span>}
            </div>
            <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-2 sm:w-auto sm:grid-cols-[minmax(14rem,1fr)_auto]">
              <label className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-[var(--surface)] px-3">
                <Search aria-hidden="true" className="size-4 shrink-0 text-slate-500" />
                <input type="search" aria-label="Search users" placeholder="Search name or email" value={query} maxLength={150}
                  onChange={(event) => changeFilter("q", event.target.value)} className="min-h-11 min-w-0 w-full bg-transparent text-sm" />
              </label>
              <FilterMenu label="User filters" active={statusFilter !== "all"}>
                <select aria-label="User account status" value={statusFilter} onChange={(event) => changeFilter("status", event.target.value === "all" ? "" : event.target.value)}
                  className="min-h-11 w-full bg-white text-sm">
                  <option value="all">All accounts</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </FilterMenu>
            </div>
          </div>
          {showsUsers && userNotice && <p role="status" className="px-4 pb-3 text-sm text-emerald-800 sm:px-5">{userNotice}</p>}
          {loadState || (
            <>
                  <div className="flex flex-wrap items-center gap-2 border-t border-border bg-secondary px-4 py-2 sm:px-5">
                    <div className="flex items-center lg:hidden">
                      <TableSelection label="Select users on this page" {...userPageSelection} onChange={() => setSelectedUserIds(userPageSelection.next)} />
                      <span className="text-xs font-medium">This page</span>
                    </div>
                    <AdminReportActions table="users" label="users" ids={selectedUserIds.length ? selectedUserIds : visibleUsers.map(user => user.id)} onError={setError} />
                    {selectedUserIds.length > 0 && (
                      <>
                        <select aria-label="Bulk user actions" className={tableButton} value="" onChange={event => {
                          if (event.target.value) setBulkConfirmation({ suspended: event.target.value === "suspend", ids: selectedUserIds });
                        }}>
                          <option value="">Bulk actions…</option>
                          <option value="suspend">Suspend selected</option>
                          <option value="restore">Reactivate selected</option>
                        </select>
                        <button type="button" className={tableButton} onClick={() => setSelectedUserIds([])}>Clear selection</button>
                      </>
                    )}
                  </div>
                  {visibleUsers.length === 0 ? <p className="border-t border-border p-5 text-sm text-muted-foreground">No student accounts match these filters.</p> : (
                    <AdminTable name="Users" columns={[
                      <TableSelection key="select" label="Select users on this page" {...userPageSelection} onChange={() => setSelectedUserIds(userPageSelection.next)} />,
                      "User", "Email", "Role", "Status", "Actions",
                    ]}>
                      {visibleUsers.map((user) => (
                        <tr role="row" key={user.id} data-selected={selectedUserIds.includes(user.id)}>
                          <td role="cell" className="admin-table-check">
                            <TableSelection label={user.is_admin ? `${user.name} (admin account protected)` : `Select ${user.name}`}
                              checked={selectedUserIds.includes(user.id)}
                              disabled={user.is_admin || (!selectedUserIds.includes(user.id) && selectedUserIds.length >= bulkUserLimit)}
                              onChange={() => setSelectedUserIds((current) => current.includes(user.id)
                                ? current.filter((id) => id !== user.id) : [...current, user.id])} />
                          </td>
                          <td role="cell" data-label="User">
                            <div className="flex items-center gap-2">
                              <span className="hidden size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground min-[360px]:flex" aria-hidden="true">{accountInitials(user.name)}</span>
                              <button type="button" className="text-left font-semibold text-primary hover:underline lg:min-h-10" onClick={() => setProfileUserId(user.id)}>{user.name}</button>
                            </div>
                          </td>
                          <td role="cell" data-label="Email" className="admin-table-wide text-muted-foreground">{user.email}</td>
                          <td role="cell" data-label="Role"><span className={`inline-flex whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium ${user.is_admin ? "bg-primary text-white" : "bg-secondary text-primary"}`}>{user.is_admin ? "Admin" : "Student intern"}</span></td>
                          <td role="cell" data-label="Status"><AccountStatus suspended={user.is_suspended} /></td>
                          <td role="cell" className="admin-table-actions">
                            <RowActions label={`Actions for ${user.name}`} actions={[
                              { label: "View profile", run: () => setProfileUserId(user.id) },
                              ...(canInvestigate ? [{ label: "View audit history", run: () => navigate(auditHistory("user", user.id)) }] : []),
                            ]} />
                          </td>
                        </tr>
                      ))}
                    </AdminTable>
                  )}
              {pagination}
            </>
          )}
        </section>
      )}

      {/* Applications */}
      {tab === "overview" && canReviewApplications && <ReviewQueueSummary operations={canInvestigate} />}
      {showsApplications && (
        <div className="admin-panel overflow-hidden">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-b border-border p-3 sm:px-5">
            <label className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-[var(--surface)] px-3">
              <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              <input type="search" aria-label="Search applications" placeholder="Search applicant, program or reference"
                className="min-h-11 min-w-0 w-full bg-transparent text-sm"
                value={query} maxLength={150} onChange={(event) => changeFilter("q", event.target.value)} />
            </label>
            <FilterMenu label="Application filters" active={statusFilter !== "all" || reviewFilter !== "all" || Boolean(userFilter)}>
              <select aria-label="Application status" value={statusFilter} className="min-h-11 w-full bg-white text-sm"
                onChange={(event) => changeFilter("status", event.target.value === "all" ? "" : event.target.value)}>
                <option value="all">All statuses</option>
                <option value="queue">Awaiting review</option>
                {["Submitted", "Under Review", "Shortlisted", "Accepted", "Rejected", "Withdrawn"].map((status) =>
                  <option key={status}>{status}</option>,
                )}
              </select>
            <ReviewQueueFilter value={reviewFilter} onChange={value => changeFilter("review", value === "all" ? "" : value)} />
            {userFilter && (
              <button type="button" className="justify-self-start text-sm font-medium text-primary underline"
                onClick={() => changeFilter("user", "")}>
                Show applications for all users
              </button>
            )}
            </FilterMenu>
          </div>
          {loadState || (
          <>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-foreground">Applications</h2>
              <span className="text-xs text-muted-foreground">{visibleApplications.length} shown</span>
              <span aria-live="polite" className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-primary">{selectedApplicationIds.length} selected</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center lg:hidden">
                <TableSelection label="Select applications on this page" {...applicationPageSelection} onChange={() => setSelectedApplicationIds(applicationPageSelection.next)} />
                <span className="text-xs font-medium">This page</span>
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                Export limit
                <select className={tableButton} value={exportLimit} onChange={(event) => {
                  const limit = Number(event.target.value);
                  setExportLimit(limit);
                  setSelectedApplicationIds((current) => current.slice(0, limit));
                }}>
                  <option>10</option><option>25</option><option>50</option>
                </select>
              </label>
              <button type="button" onClick={() => setSelectedApplicationIds([])}
                disabled={selectedApplicationIds.length === 0} className={tableButton}>Clear selection</button>
              <AdminReportActions table="applications" label="applications" ids={selectedApplicationIds.length ? selectedApplicationIds : visibleApplications.slice(0, exportLimit).map(app => app.id)} onError={setError} />
            </div>
            <p className="basis-full text-xs text-muted-foreground">Select up to {exportLimit} across pages per export (20 MB maximum).</p>
          </div>
          {visibleApplications.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">No applications match these filters.</p>
          ) : (
          <AdminTable name="Applications" columns={[
            <TableSelection key="select" label="Select applications on this page" {...applicationPageSelection} onChange={() => setSelectedApplicationIds(applicationPageSelection.next)} />,
            "Applicant", ...(programDetailId ? [] : ["Program"]), "Submitted", "Status", "Actions",
          ]}>
            {visibleApplications.map((app) => (
              <tr role="row" key={app.id} data-selected={selectedApplicationIds.includes(app.id)}>
                <td role="cell" className="admin-table-check">
                  <TableSelection checked={selectedApplicationIds.includes(app.id)}
                    disabled={!selectedApplicationIds.includes(app.id) && selectedApplicationIds.length >= exportLimit}
                    onChange={() => toggleApplicationSelection(app.id)}
                    label={`Select application from ${app.applicant_name || `applicant ${app.user_id.slice(0, 8)}`}`} />
                </td>
                <td role="cell" data-label="Applicant">
                  <button type="button" onClick={() => setPreviewApplicationId(app.id)}
                    className="text-left font-semibold text-primary hover:underline">{app.applicant_name || `Applicant ${app.user_id.slice(0, 8)}`}</button>
                  <p className="compact-secondary mt-1 text-xs text-muted-foreground">
                    {[app.student_index_number, app.gender, app.year_of_study].filter(Boolean).join(" · ") || "No academic details"}
                  </p>
                  {app.requires_minor_review && <p className="mt-1 text-xs font-semibold text-amber-800">Under 18 · verify guardian or institution approval</p>}
                </td>
                {!programDetailId && <td role="cell" data-label="Program" className="admin-table-wide">
                  <Link to={`/app/admin/programs/${app.program_id}`} className="font-medium text-primary hover:underline">{app.program_name}</Link>
                </td>}
                <td role="cell" data-label="Submitted" className="text-muted-foreground">{dateLabel(app.created_at)}</td>
                <td role="cell" data-label="Status">
                  <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${statusBadge[app.status] || "status-applied"}`}>{applicationStatusLabel(app.status)}</span>
                  <p className="compact-secondary mt-1 text-xs text-muted-foreground">{app.reviewer_name || "Unassigned"}{app.review_due_date && ` · Due ${app.review_due_date}`}</p>
                  {app.document_request && isAwaitingReview(app.status) && <p className="compact-secondary text-xs text-muted-foreground">Awaiting documents</p>}
                  {app.certificate_approved && <p className="compact-secondary mt-1 text-xs text-emerald-800">Certificate approved</p>}
                </td>
                <td role="cell" className="admin-table-actions">
                  <RowActions label={`Actions for ${app.applicant_name || "application"}`} actions={applicationActions(app)} />
                </td>
              </tr>
            ))}
          </AdminTable>
          )}
          {pagination}
          </>
          )}
        </div>
      )}

      {/* Programs */}
      {tab === "programs" && !programDetailId && (
        <div className="space-y-4">
          <section className="admin-panel overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:px-5">
              <h3 className="font-semibold">Programs</h3>
              <span className="text-xs text-muted-foreground">{programs.length} shown</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-border p-3">
              <input aria-label="Search programs" type="search" placeholder="Search title, company, category…" maxLength={150} value={query}
                onChange={event => changeFilter("q", event.target.value)} className="min-h-10 min-w-0 flex-1 rounded-lg border border-border px-3 text-sm" />
              {!loadState && <AdminReportActions table="programs" label="programs" ids={selectedProgramIds.length ? selectedProgramIds : programs.map(program => program.id)} onError={setError} />}
            </div>
            {!loadState && (
              <div className="flex flex-wrap items-center gap-2 border-t border-border bg-secondary px-3 py-2">
                <div className="flex items-center lg:hidden">
                  <TableSelection label="Select programs on this page" {...programSelection} onChange={() => setSelectedProgramIds(programSelection.next)} />
                  <span className="text-xs">This page</span>
                </div>
                <span className="text-xs font-semibold" aria-live="polite">{selectedProgramIds.length} selected</span>
                {selectedProgramIds.length > 0 && <>
                  <select aria-label="Bulk program actions" className={tableButton} value="" disabled={programRemoving}
                    onChange={event => { if (event.target.value === "unpublish") void unpublishSelectedPrograms(); }}>
                    <option value="">Bulk actions…</option><option value="unpublish">Unpublish selected</option>
                  </select>
                  <button type="button" className={tableButton} onClick={() => setSelectedProgramIds([])}>Clear selection</button>
                </>}
              </div>
            )}
            {loadState || (programs.length ? (
              <AdminTable name="Programs" columns={[
                <TableSelection key="selection" label="Select programs on this page" {...programSelection} onChange={() => setSelectedProgramIds(programSelection.next)} />,
                "Program", "Location", "Deadline", "Status", "Actions",
              ]}>
                {programs.map((program) => {
                  const status = programStatus(program);
                  return (
                    <tr role="row" key={program.id} data-selected={selectedProgramIds.includes(program.id)}>
                      <td role="cell" className="admin-table-check">
                        <TableSelection label={`Select ${program.name}`} checked={selectedProgramIds.includes(program.id)}
                          disabled={!selectedProgramIds.includes(program.id) && selectedProgramIds.length >= 50}
                          onChange={() => setSelectedProgramIds(current => current.includes(program.id) ? current.filter(id => id !== program.id) : [...current, program.id])} />
                      </td>
                      <td role="cell" data-label="Program">
                        <Link to={`/app/admin/programs/${program.id}`} className="font-semibold text-primary hover:underline">{program.name}</Link>
                        <p className="compact-secondary mt-1 text-xs text-muted-foreground">{program.company} · {program.category}</p>
                      </td>
                      <td role="cell" data-label="Location"><p>{program.location}</p><p className="text-xs text-muted-foreground">{program.duration}</p></td>
                      <td role="cell" data-label="Deadline">{program.deadline ? dateLabel(program.deadline) : "No deadline"}</td>
                      <td role="cell" data-label="Status">
                        <span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium capitalize ${status === "open" ? "bg-emerald-50 text-emerald-800" : "bg-secondary text-primary"}`}>
                          {status}
                        </span>
                      </td>
                      <td role="cell" className="admin-table-actions">
                        <RowActions label={`Actions for ${program.name}`} actions={[
                          { label: "Edit listing", disabled: programSubmitting, run: () => editProgram(program) },
                          ...(program.status === "open" ? [{ label: "Unpublish", danger: true, disabled: programRemoving,
                            run: () => { setProgramToRemove(program); setError(""); } }] : []),
                        ]} />
                      </td>
                    </tr>
                  );
                })}
              </AdminTable>
            ) : <p className="border-t border-border p-5 text-sm text-muted-foreground">No programs match your search.</p>)}
            {!loadState && pagination}
          </section>
          {programNotice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{programNotice}</p>}
          <dialog ref={addProgramDialog} aria-labelledby="new-program-title"
            onCancel={event => { if (programSubmitting) event.preventDefault(); }}
            className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl backdrop:bg-black/50 sm:p-7">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="new-program-title" className="text-xl font-bold">New program</h2>
              <button type="button" aria-label="Close new program" disabled={programSubmitting} onClick={() => addProgramDialog.current?.close()}>
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>
            {error && <p role="alert" className="mb-3 text-sm text-red-800">{error}</p>}
            {programFormElement}
          </dialog>
        </div>
      )}

      {/* Announcements */}
      {tab === "announcements" && (
        <div className="space-y-5">
          <section className="admin-panel overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between gap-3">
              <h3 className="font-semibold">Published Announcements</h3>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">{selectedAnnouncementIds.length} selected</span>
                {!loadState && <AdminReportActions table="announcements" label="announcements" ids={selectedAnnouncementIds.length ? selectedAnnouncementIds : announcements.map(item => item.id)} onError={setError} />}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-border p-3">
              <input aria-label="Search announcements" type="search" placeholder="Search title or audience" maxLength={150} value={query}
                onChange={event => changeFilter("q", event.target.value)} className="min-h-10 min-w-0 flex-1 rounded-lg border border-border px-3 text-sm" />
              <FilterMenu label="Announcement filters" active={categoryFilter !== "all"}>
              <select aria-label="Announcement category" value={categoryFilter} onChange={e => changeFilter("category", e.target.value === "all" ? "" : e.target.value)} className={tableButton}>
                <option value="all">All categories</option>
                {announcementCategories.map(category => <option key={category} value={category}>{category[0].toUpperCase() + category.slice(1)}</option>)}
              </select>
              </FilterMenu>
              <div className="flex items-center lg:hidden">
                <TableSelection label="Select announcements on this page" {...announcementSelection} onChange={() => setSelectedAnnouncementIds(announcementSelection.next)} />
              </div>
            </div>
            {loadState || (announcements.length ? (
              <AdminTable name="Published announcements" columns={[
                <TableSelection key="selection" label="Select announcements" {...announcementSelection} onChange={() => setSelectedAnnouncementIds(announcementSelection.next)} />,
                "Announcement", "Category", "Audience", "Published", "Actions",
              ]}>
                {announcements.map((item) => (
                  <tr role="row" key={item.id} data-selected={selectedAnnouncementIds.includes(item.id)}>
                    <td role="cell" className="admin-table-check">
                      <TableSelection label={`Select ${item.title}`} checked={selectedAnnouncementIds.includes(item.id)}
                        disabled={!selectedAnnouncementIds.includes(item.id) && selectedAnnouncementIds.length >= 50}
                        onChange={() => setSelectedAnnouncementIds(current => current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id])} />
                    </td>
                    <td role="cell" data-label="Announcement">
                      <button type="button" className="text-left font-semibold text-primary hover:underline" onClick={() => openAnnouncement(item)}>{item.title}</button>
                    </td>
                    <td role="cell" data-label="Category"><span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium capitalize text-primary">{item.category || "general"}</span></td>
                    <td role="cell" data-label="Audience">{item.audience_label || item.target_university || "All students"}</td>
                    <td role="cell" data-label="Published" className="text-muted-foreground">{dateLabel(item.created_at)}</td>
                    <td role="cell" className="admin-table-actions">
                      <RowActions label={`Actions for ${item.title}`} actions={[
                        { label: "Read announcement", run: () => openAnnouncement(item) },
                        { label: "Remove announcement", danger: true, disabled: announcementRemoving,
                          run: () => { setAnnouncementToRemove(item); setError(""); } },
                      ]} />
                    </td>
                  </tr>
                ))}
              </AdminTable>
            ) : (
              <p className="p-5 text-sm text-muted-foreground">No announcements match your search.</p>
            ))}
            {!loadState && pagination}
          </section>
          {announcementNotice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{announcementNotice}</p>}
          <PanelDialog dialog={announcementDetails} title={viewedAnnouncement?.title || "Announcement"}>
            {viewedAnnouncement && <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{viewedAnnouncement.category || "General"} · {dateLabel(viewedAnnouncement.created_at)} · {viewedAnnouncement.audience_label || viewedAnnouncement.target_university || "All students"}</p>
              <p className="whitespace-pre-wrap break-words text-sm">{viewedAnnouncement.content}</p>
            </div>}
          </PanelDialog>
          {announcementOpen && <AnnouncementComposer onClose={() => setAnnouncementOpen(false)} onPublished={() => {
            setAnnouncementNotice("Announcement published.");
            setSearchParams(new URLSearchParams());
            setRetryCount(count => count + 1);
          }} />}

        </div>
      )}
      </>
      )}
      {showsUsers && profileUser && (
        <dialog ref={profileDialog} onClose={() => setProfileUserId(null)} aria-labelledby="user-profile-title"
          className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-full max-w-md bg-white p-0 text-foreground shadow-2xl backdrop:bg-primary/25 backdrop:backdrop-blur-sm">
          <div className="flex min-h-full flex-col">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-[var(--surface)] px-5 py-3">
              <h2 id="user-profile-title" className="font-semibold">User Profile</h2>
              <button type="button" aria-label="Close user profile" onClick={() => profileDialog.current?.close()} className={tableButton}><X className="size-4" aria-hidden="true" /></button>
            </header>
            <div className="p-5">
              <div className="flex flex-col items-center gap-2 border-b border-border pb-6 text-center">
                <button type="button" aria-label="View account photo" disabled={!accountPhoto} onClick={() => setAccountPhotoOpen(value => !value)}>
                  <ProfileAvatar photoUrl={accountPhoto} initials={accountInitials(profileUser.name)} className="size-20 bg-primary text-2xl font-semibold text-white" />
                </button>
                {accountPhotoOpen && accountPhoto && <img src={accountPhoto} alt="Account photo" className="max-h-52 rounded-xl object-contain" />}
                <h3 className="mt-2 text-xl font-semibold">{profileUser.name}</h3>
                <p className="max-w-full break-all text-sm text-muted-foreground">{profileUser.email}</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-primary">{profileUser.is_admin ? "Admin" : "Student intern"}</span>
                  <AccountStatus suspended={profileUser.is_suspended} />
                </div>
              </div>
              {canReviewApplications && <div className="mt-6">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">Recent applications</h3>
                  <Link to={`/app/admin/applications?user=${encodeURIComponent(profileUser.id)}`} className="text-sm font-medium text-primary underline">Application history</Link>
                </div>
                {profileError ? <p className="text-sm text-muted-foreground">Recent applications could not be loaded.</p>
                  : profileApps === null ? <p role="status" className="text-sm text-muted-foreground">Loading applications…</p>
                    : profileApps.length === 0 ? <p className="text-sm text-muted-foreground">No applications yet.</p>
                      : <ul className="space-y-2">
                        {profileApps.map((app) => (
                          <li key={app.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border bg-[var(--surface)] p-3">
                            <div className="min-w-0">
                              <Link className="break-words text-sm font-semibold text-primary hover:underline" to={`/app/admin/applications?user=${encodeURIComponent(profileUser.id)}&q=${encodeURIComponent(app.id)}`}>{app.program_name}</Link>
                              <p className="text-xs text-muted-foreground">{dateLabel(app.created_at)}</p>
                            </div>
                            <span className={`rounded-md px-2 py-1 text-xs font-medium ${statusBadge[app.status] || "status-applied"}`}>{applicationStatusLabel(app.status)}</span>
                          </li>
                        ))}
                      </ul>}
              </div>}
            </div>
            {!profileUser.is_admin && (
              <footer className="mt-auto grid gap-2 border-t border-border bg-[var(--surface)] p-5">
                {canInvestigate && <button type="button" className={tableButton} onClick={() => { profileDialog.current?.close(); openAccountEditor(profileUser); }}>Edit user</button>}
                {canInvestigate && <Link className={`${tableButton} inline-flex items-center justify-center`} to="/app/admin/staff" state={{ inviteEmail: profileUser.email }}>Invite to staff</Link>}
                <button type="button" className={`${tableButton} w-full ${profileUser.is_suspended ? "text-emerald-800" : "text-red-800"}`}
                  onClick={() => {
                    profileDialog.current?.close();
                    setBulkConfirmation({ ids: [profileUser.id], suspended: !profileUser.is_suspended });
                  }}>
                  {profileUser.is_suspended ? "Reactivate account" : "Suspend account"}
                </button>
              </footer>
            )}
          </div>
        </dialog>
      )}

      {showsUsers && canInvestigate && <AccountManagementDialog key={accountEditor.key} dialog={accountDialog} account={accountEditor.account} onSaved={message => { setUserNotice(message); setRetryCount(value => value + 1); }} />}
      {showsUsers && bulkConfirmation && (
        <dialog ref={bulkDialog} aria-labelledby="bulk-users-title"
          onClose={() => setBulkConfirmation(null)}
          onCancel={(event) => { if (busyKey === "bulk-users") event.preventDefault(); }}
          className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-border bg-white p-5 text-foreground shadow-xl backdrop:bg-primary/40">
          <h2 id="bulk-users-title" className="text-lg font-semibold">
            {bulkConfirmation.suspended ? "Suspend" : "Reactivate"} {bulkConfirmation.ids.length} {bulkConfirmation.ids.length === 1 ? "account" : "accounts"}?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {bulkConfirmation.suspended ? "Selected users will lose account access until reactivated." : "Selected users will regain account access."}
          </p>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button type="button" autoFocus disabled={busyKey === "bulk-users"} className={tableButton} onClick={() => bulkDialog.current?.close()}>Cancel</button>
            <button type="button" disabled={busyKey === "bulk-users"} onClick={() => void confirmBulkSuspension()}
              className={`inline-flex min-h-10 items-center rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-50 ${bulkConfirmation.suspended ? "bg-red-700" : "bg-primary"}`}>
              {busyKey === "bulk-users" ? "Updating…" : bulkConfirmation.suspended ? "Confirm suspension" : "Confirm reactivation"}
            </button>
          </div>
        </dialog>
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
      {certificateApplication && (
        <div
          className="fixed inset-0 z-[110] bg-black/55 backdrop-blur-sm p-4 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="certificate-approval-title"
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void approveCertificate(certificateApplication, internshipStartDate, internshipEndDate);
            }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-7"
          >
            <h2 id="certificate-approval-title" className="font-bold text-lg">
              Confirm internship dates
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Enter the start and end dates shown on the supervisor assessment you reviewed. These dates will appear on the certificate.
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mt-5">
              <label className="text-xs font-semibold">
                Start date
                <input
                  type="date"
                  required
                  value={internshipStartDate}
                  onChange={(event) => setInternshipStartDate(event.target.value)}
                  max={internshipEndDate || undefined}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-semibold">
                End date
                <input
                  type="date"
                  required
                  value={internshipEndDate}
                  onChange={(event) => setInternshipEndDate(event.target.value)}
                  min={internshipStartDate || undefined}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm font-normal"
                />
              </label>
            </div>
            {error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setCertificateApplication(null)}
                disabled={busyKey === `certificate-${certificateApplication.id}`}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-border text-sm font-semibold disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busyKey === `certificate-${certificateApplication.id}`}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 disabled:opacity-60"
              >
                {busyKey === `certificate-${certificateApplication.id}` ? "Approving..." : "Approve and notify applicant"}
              </button>
            </div>
          </form>
        </div>
      )}
      {certificateApplication && (
        <div
          className="fixed inset-0 z-[110] bg-black/55 backdrop-blur-sm p-4 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="certificate-approval-title"
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void approveCertificate(certificateApplication, internshipStartDate, internshipEndDate);
            }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-7"
          >
            <h2 id="certificate-approval-title" className="font-bold text-lg">
              Confirm internship dates
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Enter the start and end dates shown on the supervisor assessment you reviewed. These dates will appear on the certificate.
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mt-5">
              <label className="text-xs font-semibold">
                Start date
                <input
                  type="date"
                  required
                  value={internshipStartDate}
                  onChange={(event) => setInternshipStartDate(event.target.value)}
                  max={internshipEndDate || undefined}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-semibold">
                End date
                <input
                  type="date"
                  required
                  value={internshipEndDate}
                  onChange={(event) => setInternshipEndDate(event.target.value)}
                  min={internshipStartDate || undefined}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm font-normal"
                />
              </label>
            </div>
            {error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setCertificateApplication(null)}
                disabled={busyKey === `certificate-${certificateApplication.id}`}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-border text-sm font-semibold disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busyKey === `certificate-${certificateApplication.id}`}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 disabled:opacity-60"
              >
                {busyKey === `certificate-${certificateApplication.id}` ? "Approving..." : "Approve and notify applicant"}
              </button>
            </div>
          </form>
        </div>
      )}
      {showsApplications && previewApplication && (
        <ApplicationPreviewModal
          key={previewApplication.id}
          application={previewApplication}
          caseTools={caseTools}
          onReviewSaved={review => setApplications(rows => rows.map(row => row.id === previewApplication.id ? { ...row, ...review } : row))}
          auditUrl={canInvestigate ? auditHistory("application", previewApplication.id) : undefined}
          busy={busyKey === `app-${previewApplication.id}`}
          error={error}
          onStatus={(status, reason) => void updateStatus(previewApplication, status, reason)}
          onClose={() => { setPreviewApplicationId(null); setError(""); setRetryCount(count => count + 1); }}
          onPreviewResume={() => void previewPdf(() => getResumeFile(previewApplication.id, true)).catch((failure) => setError(failure instanceof Error ? failure.message : "Unable to open resume."))}
          onDownloadResume={() => void saveResumeDownload(previewApplication.id, true).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to download resume."))}
        />
      )}
    </div>
  );
}

function ApplicationPreviewModal({
  application,
  onClose,
  auditUrl,
  onDownloadResume,
  onPreviewResume,
  onStatus,
  onReviewSaved,
  caseTools,
  busy,
  error,
}: {
  application: AdminApplication;
  onReviewSaved: (review: ApplicationReview) => void;
  caseTools: readonly string[];
  onClose: () => void;
  auditUrl?: string;
  onDownloadResume: () => void;
  onPreviewResume: () => void;
  onStatus: (status: string, reason?: string) => void;
  busy: boolean;
  error: string;
}) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  useEffect(() => {
    let active = true;
    getAdminPhoto("applications", application.id).then(result => { if (active) setPhoto(result.photo); }).catch(() => {});
    return () => { active = false; };
  }, [application.id]);
  const [decisionReason, setDecisionReason] = useState("");
  const [decision, setDecision] = useState<"accepted" | "rejected" | null>(null);
  const status = application.status.toLowerCase();
  const final = ["accepted", "rejected", "withdrawn"].includes(status);
  const formatValue = (value: string | null) => value || "Not provided";

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/55 backdrop-blur-sm p-4 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="application-preview-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92dvh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-border p-5 flex items-center justify-between z-10">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
              Application review
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
        <div className="space-y-5 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary p-4">
            <div><p className="text-xs text-muted-foreground">Program</p><p className="font-semibold">{application.program_name}</p></div>
            <span className={`rounded-lg px-3 py-1 text-sm font-semibold ${statusBadge[status] || "status-applied"}`}>{applicationStatusLabel(status)}</span>
          </div>
          {photo && (
            <div className="space-y-2">
              <button type="button" className="flex items-center gap-3 text-sm font-semibold text-primary" onClick={() => setPhotoOpen(value => !value)}>
                <ProfileAvatar photoUrl={photo} initials="" className="size-12" /> {photoOpen ? "Hide photo" : "View applicant photo"}
              </button>
              {photoOpen && <img src={photo} alt="Applicant profile photo" className="max-h-64 rounded-xl object-contain" />}
            </div>
          )}
          {application.requires_minor_review && (
            <p className="text-sm font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
              Under 18: verify guardian or institution approval.
            </p>
          )}
          <section className="grid gap-2 rounded-xl border border-border p-4 sm:grid-cols-2" aria-label="Submission">

            <ApplicationPreviewField label="Date submitted" value={new Date(application.created_at).toLocaleString()} />
            <ApplicationPreviewField label="Applicant account ID" value={application.user_id} />
          </section>
          <section className="grid gap-2 rounded-xl border border-border p-4 sm:grid-cols-2">
            <h3 className="mb-1 text-sm font-semibold sm:col-span-2">Applicant details</h3>
            <ApplicationPreviewField label="Name" value={formatValue(application.applicant_name)} />
            <ApplicationPreviewField label="Contact" value={formatValue(application.applicant_contact)} />
            <ApplicationPreviewField label="Gender" value={formatValue(application.gender)} />
            <ApplicationPreviewField label="Institution" value={formatValue(application.applicant_institution)} />
            <ApplicationPreviewField label="Course" value={formatValue(application.applicant_course)} />
            <ApplicationPreviewField label="Student index number" value={formatValue(application.student_index_number)} />
            <ApplicationPreviewField label="Year of study" value={formatValue(application.year_of_study)} />
          </section>
          <section className="grid gap-2 rounded-xl border border-border p-4 sm:grid-cols-2">
            <h3 className="mb-1 text-sm font-semibold sm:col-span-2">Placement details</h3>
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
            {application.resume_filename?.toLowerCase().endsWith(".pdf") && (
              <button type="button" onClick={onPreviewResume} className={tableButton}>Preview resume</button>
            )}
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
          {caseTools.length > 0 && <nav aria-label="Related student records" className="flex flex-wrap gap-3 rounded-lg border border-border p-3 text-sm font-medium text-primary">
            {caseTools.includes("placements") && <Link to={`/app/admin/placements?application=${application.id}`} className="underline">Placements</Link>}
            {caseTools.includes("finance") && <Link to={`/app/admin/finance?view=payment&account_id=${application.user_id}`} className="underline">Payments</Link>}
            {caseTools.includes("support") && <Link to={`/app/admin/support?account_id=${application.user_id}`} className="underline">Support tickets</Link>}
          </nav>}
          <ApplicationReviewWork application={application} onSaved={onReviewSaved} />
          <ApplicationFollowUps applicationId={application.id} needsDocuments={!final && Boolean(application.document_request)} />
          <ApplicationHistory id={application.id} status={application.status} admin />
          {auditUrl && <Link to={auditUrl} className="inline-flex min-h-10 items-center text-sm font-semibold text-primary underline">View audit history</Link>}
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {status === "accepted" && !application.documents_sent && (
            <section className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">The application is accepted. Delivery of the documents is pending.</p>
              <button type="button" disabled={busy} onClick={() => onStatus("accepted")} className={tableButton}>
                {busy ? "Sending…" : "Retry document delivery"}
              </button>
            </section>
          )}
          {!final && (
            <section className="space-y-3 border-t border-border pt-4">
              <h3 className="text-sm font-semibold">Review decision</h3>
              {decision ? (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="w-full text-sm">Confirm you want to {decision === "accepted" ? "accept" : "reject"} this application.</p>
                  <label className="grid w-full gap-1 text-xs font-semibold">
                    Reason (optional)
                    <select value={decisionReason} onChange={event => setDecisionReason(event.target.value)}
                      className="min-h-10 rounded-lg border border-border bg-white px-3 text-sm">
                      <option value="">Choose a reason</option>
                      {decision === "accepted" ? (
                        <><option value="eligibility_confirmed">Eligibility confirmed</option><option value="placement_confirmed">Placement confirmed</option></>
                      ) : (
                        <><option value="incomplete_information">Incomplete information</option><option value="eligibility_requirements">Eligibility requirements</option><option value="capacity">Program capacity</option></>
                      )}
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <button type="button" disabled={busy} onClick={() => {
                    onStatus(decision, decisionReason || undefined);
                    setDecisionReason("");
                    setDecision(null);
                  }} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-60">Confirm decision</button>
                  <button type="button" disabled={busy} onClick={() => { setDecision(null); setDecisionReason(""); }}
                    className="min-h-11 rounded-lg border border-border px-4 text-sm">Cancel</button>
                </div>
              ) : (
                <select aria-label="Review action" disabled={busy} value=""
                  className="min-h-11 rounded-lg border border-border bg-white px-4 text-sm"
                  onChange={event => {
                    const choice = event.target.value;
                    if (choice === "accepted" || choice === "rejected") setDecision(choice);
                    else if (choice) onStatus(choice);
                  }}>
                  <option value="">Choose an action</option>
                  {status === "submitted" && <option value="review">Start review</option>}
                  {["submitted", "review"].includes(status) && <option value="shortlisted">Shortlist</option>}
                  <option value="accepted" disabled={Boolean(application.document_request)}>Accept</option>
                  <option value="rejected">Reject</option>
                </select>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function ApplicationPreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-[var(--surface)] p-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="block break-words text-sm font-medium [overflow-wrap:anywhere]">{value}</span>
    </div>
  );
}
