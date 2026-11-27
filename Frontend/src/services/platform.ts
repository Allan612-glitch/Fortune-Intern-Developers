import type { OpportunityDetails, StudentUpdate } from "./opportunities";
import { apiBlob, apiRequest } from "./api";

export interface Program {
  id: string;
  name: string;
  description: string;
  company: string;
  category: string;
  status: string;
  location: string;
  duration: string;
  skills: string[];
  deadline: string | null;
  cycle_closed_at?: string | null;
  opportunity?: OpportunityDetails;
  application_fee_minor?: number;
}

export interface BackendApplication {
  id: string;
  user_id: string;
  program_id: string | null;
  program_name: string;
  status: string;
  resume_filename: string | null;
  documents_sent: boolean;
  placement_files_available?: boolean;
  supervisor_assessment_filename: string | null;
  certificate_approved: boolean;
  internship_start_date: string | null;
  internship_end_date: string | null;
  applicant_name: string | null;
  gender: string | null;
  student_index_number: string | null;
  year_of_study: string | null;
  suggested_company: string | null;
  requires_minor_review: boolean;
  applicant_institution: string | null;
  applicant_course: string | null;
  applicant_contact: string | null;
  host_company_name: string | null;
  host_company_address: string | null;
  created_at: string;
  student_update?: StudentUpdate | null;
  document_request?: string | null;
  response_by?: string | null;
  updated_at?: string | null;
}

export interface ApplicationReview {
  reviewer_id: string | null;
  reviewer_name: string | null;
  review_due_date: string | null;
  document_request: string | null;
  student_update?: StudentUpdate | null;
}

export type AdminApplication = BackendApplication & ApplicationReview;

export interface DashboardSummary {
  profile_completion: number;
  total_applications: number;
  active_applications: number;
  interviews: number;
  accepted_applications: number;
  rejected_applications: number;
  open_programs: number;
  next_deadline: string | null;
  recent_applications: Array<{
    id: string;
    program_name: string;
    status: string;
    created_at: string;
  }>;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  target_university: string | null;
  category?: string;
  audience_label?: string | null;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
  is_suspended: boolean;
}

export interface NotificationItem {
  id: string;
  message: string;
  target_type: string | null;
  target_id: string | null;
  read: boolean;
  created_at: string;
}

export interface NotificationPreferences {
  email_notifications: boolean;
  sms_notifications: boolean;
  opportunity_alerts: boolean;
}

export function listPrograms(search = "", category = "All", status = "open", page?: { limit: number; offset: number }) {
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  if (category !== "All") params.set("category", category);
  if (status !== "open") params.set("status", status);
  if (page) {
    params.set("limit", String(page.limit));
    params.set("offset", String(page.offset));
  }
  const query = params.size ? `?${params}` : "";
  return apiRequest<Program[]>(`/api/programs${query}`);
}

export function createAdminProgram(payload: Omit<Program, "id">) {
  return apiRequest<Program>("/api/admin/programs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAdminProgram(id: string, payload: Omit<Program, "id">) {
  return apiRequest<Program>(`/api/admin/programs/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function removeAdminProgram(id: string) {
  return apiRequest<Program>(`/api/admin/programs/${id}`, {
    method: "DELETE",
  });
}

export function submitApplication(form: FormData) {
  return apiRequest<BackendApplication>("/api/applications", {
    method: "POST",
    body: form,
  });
}

export function listApplications() {
  return apiRequest<BackendApplication[]>("/api/applications");
}

export function listApplicationHistory(id: string, admin: boolean) {
  const base = admin ? "/api/admin/applications" : "/api/applications";
  return apiRequest<Array<{ previous_status: string | null; new_status: string; reason?: string | null; created_at: string }>>(
    `${base}/${encodeURIComponent(id)}/history`,
  );
}

export function getDashboard() {
  return apiRequest<DashboardSummary>("/api/dashboard");
}

export function listAnnouncements() {
  return apiRequest<Announcement[]>("/api/announcements");
}

export function listAdminAnnouncements(filters: { q?: string; limit?: number; offset?: number; category?: string } = {}) {
  return apiRequest<Announcement[]>(adminListPath("announcements", filters));
}

export interface AdminOverview {
  awaiting_review: number;
  open_programs: number;
  users: number;
  students: number;
  announcements: number;
}

export function getAdminOverview() {
  return apiRequest<AdminOverview>("/api/admin/overview");
}

type AdminDirectoryFilters = {
  q?: string;
  status?: string;
  limit?: number;
  offset?: number;
};

function adminListPath(section: string, filters: AdminDirectoryFilters & { user?: string; program?: string; role?: "all" | "student" | "admin"; review?: string }) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return `/api/admin/${section}?${params}`;
}

export function listAdminUsers(filters: AdminDirectoryFilters & { role?: "all" | "student" | "admin" } = {}) {
  return apiRequest<AdminUser[]>(adminListPath("users", filters));
}

export function setUserSuspension(id: string, suspended: boolean) {
  const params = new URLSearchParams({ suspended: String(suspended) });
  return apiRequest<AdminUser>(`/api/admin/users/${id}/suspension?${params}`, {
    method: "PUT",
  });
}

export function setUsersSuspension(ids: string[], suspended: boolean) {
  return apiRequest<AdminUser[]>("/api/admin/users/bulk-suspension", {
    method: "PUT",
    body: JSON.stringify({ user_ids: ids, suspended }),
  });
}

export function listAdminApplications(filters: AdminDirectoryFilters & { user?: string; program?: string; review?: string } = {}) {
  return apiRequest<AdminApplication[]>(adminListPath("applications", filters));
}

export function getApplicationReviewCounts() {
  return apiRequest<Record<"mine" | "unassigned" | "overdue" | "awaiting_documents" | "failed_followups", number>>("/api/admin/applications/review-counts");
}

export function listApplicationReviewers() {
  return apiRequest<{ id: string; name: string }[]>("/api/admin/applications/reviewers");
}

export function updateApplicationReview(id: string, review: Partial<Omit<ApplicationReview, "reviewer_name">>) {
  return apiRequest<ApplicationReview>(`/api/admin/applications/${id}/review`, {
    method: "PATCH", body: JSON.stringify(review),
  });
}

export function exportAdminApplications(applicationIds: string[]) {
  return apiBlob("/api/admin/applications/export", {
    method: "POST",
    body: JSON.stringify({ application_ids: applicationIds }),
  });
}

export function setApplicationStatus(id: string, status: string, reason?: string) {
  return apiRequest<BackendApplication>(`/api/admin/applications/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status, reason }),
  });
}

export function approveApplicationCertificate(
  id: string,
  internshipStartDate: string,
  internshipEndDate: string,
) {
  return apiRequest<BackendApplication>(
    `/api/admin/applications/${id}/certificate-approval`,
    {
      method: "POST",
      body: JSON.stringify({
        internship_start_date: internshipStartDate,
        internship_end_date: internshipEndDate,
      }),
    },
  );
}

export async function uploadSupervisorAssessment(id: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiRequest<BackendApplication>(
    `/api/applications/${id}/assessment`,
    { method: "POST", body: form },
  );
}

export async function saveSupervisorAssessmentDownload(id: string) {
  const file = await apiBlob(`/api/admin/applications/${id}/assessment`);
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = "supervisor-assessment";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function printCompletionCertificate(id: string) {
  const certificate = await apiBlob(`/api/applications/${id}/certificate`);
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.title = "Certificate print preview";
  frame.style.position = "fixed";
  frame.style.left = "-10000px";
  frame.style.top = "0";
  frame.style.width = "297mm";
  frame.style.height = "210mm";
  frame.style.border = "0";

  const frameLoaded = new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error("Timed out while loading the certificate."));
    }, 15_000);
    frame.addEventListener("load", () => {
      window.clearTimeout(timeout);
      resolve();
    }, { once: true });
    frame.addEventListener("error", () => {
      window.clearTimeout(timeout);
      reject(new Error("Unable to load the certificate for printing."));
    }, { once: true });
  });
  frame.srcdoc = await certificate.text();
  document.body.appendChild(frame);

  let cleanupTimer: number | undefined;
  const cleanupFrame = () => {
    if (cleanupTimer !== undefined) window.clearTimeout(cleanupTimer);
    frame.remove();
  };

  try {
    await frameLoaded;
    const certificateDocument = frame.contentDocument;
    const printWindow = frame.contentWindow;
    if (!certificateDocument || !printWindow || !certificateDocument.getElementById("sheet")) {
      throw new Error("Unable to prepare the certificate for printing.");
    }

    const name = certificateDocument.querySelector<HTMLInputElement>(
      '.tgrid input[data-field="name"]',
    )?.value.trim() || "Intern";
    const certificateNumber = certificateDocument.querySelector<HTMLInputElement>(
      '.tgrid input[data-field="certno"]',
    )?.value.trim() || id;
    const fontRequirements: Array<[string, string]> = [
      ['700 28pt "Playfair Display"', "CERTIFICATE"],
      ['600 12.5pt "Playfair Display"', "OF COMPLETION"],
      ['600 12pt "Cormorant Garamond"', "This certificate is proudly presented to"],
      ['400 30pt "Great Vibes"', name],
      ['600 10.4pt "Cormorant Garamond"', "has successfully completed the internship"],
      ['italic 500 9.2pt "Cormorant Garamond"', "with commendable performance"],
      ['700 11pt "Cormorant Garamond"', "Emmanuel Amoasi"],
    ];
    await Promise.all(
      fontRequirements.map(async ([font, text]) => {
        const loadedFonts = await certificateDocument.fonts.load(font, text);
        if (!loadedFonts.length || !certificateDocument.fonts.check(font, text)) {
          throw new Error("Certificate fonts could not be loaded. Check your internet connection and try again.");
        }
      }),
    );
    await certificateDocument.fonts.ready;

    const safeFilePart = (value: string) =>
      value.trim().replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 60);
    certificateDocument.title =
      `FIN_Certificate_${safeFilePart(name) || "Intern"}_${safeFilePart(certificateNumber) || "FIN"}`;
    printWindow.addEventListener("afterprint", cleanupFrame, { once: true });
    cleanupTimer = window.setTimeout(cleanupFrame, 60_000);
    printWindow.focus();
    printWindow.print();
  } catch (error) {
    cleanupFrame();
    throw error;
  }
}

export function downloadResume(id: string, admin = false) {
  return apiRequest<{ url: string }>(
    admin
      ? `/api/admin/applications/${id}/resume-url`
      : `/api/applications/${id}/resume-url`,
  ).then((result) => result.url);
}

export async function saveResumeDownload(id: string, admin = false) {
  const url = await downloadResume(id, admin);
  window.location.assign(url);
}

export function listNotifications() {
  return apiRequest<NotificationItem[]>("/api/notifications");
}

export function getUnreadNotificationCount() {
  return apiRequest<{ count: number }>("/api/notifications/unread-count");
}

export function markNotificationRead(id: string) {
  return apiRequest<NotificationItem>(`/api/notifications/${id}/read`, {
    method: "PUT",
  });
}

export function markAllNotificationsRead() {
  return apiRequest<{ updated: number }>("/api/notifications/read-all", {
    method: "PUT",
  });
}

export function getNotificationPreferences() {
  return apiRequest<NotificationPreferences>("/api/notifications/preferences");
}

export function updateNotificationPreferences(preferences: NotificationPreferences) {
  return apiRequest<NotificationPreferences>("/api/notifications/preferences", {
    method: "PUT",
    body: JSON.stringify(preferences),
  });
}

export type AnnouncementInput = {
  title: string;
  content: string;
  category: string;
  audience: string;
  target_university?: string;
  target?: string;
  student_ids?: string[];
};

export function publishAnnouncement(payload: AnnouncementInput) {
  return apiRequest<Announcement>("/api/admin/announcements", {
    method: "POST", body: JSON.stringify(payload),
  });
}

export function searchAnnouncementRecipients(q: string) {
  return apiRequest<{ id: string; name: string; email: string }[]>(
    `/api/admin/announcements/recipients?${new URLSearchParams({ q })}`,
  );
}

export function deleteAdminAnnouncement(id: string) {
  return apiRequest<void>(`/api/admin/announcements/${id}`, {
    method: "DELETE",
  });
}

export type ReportTable = "applications" | "users" | "staff" | "invitations" | "roles" | "programs" | "announcements";

export function exportTable(table: ReportTable, ids: string[], format: "pdf" | "xlsx") {
  if (table === "applications" && format === "xlsx") return exportAdminApplications(ids);
  return apiBlob(`/api/admin/reports/${table}`, { method: "POST", body: JSON.stringify({ ids, format }) });
}

export function bulkUnpublishPrograms(ids: string[]) {
  return apiRequest<Program[]>("/api/admin/programs/bulk-unpublish", {
    method: "POST", body: JSON.stringify({ ids }),
  });
}

export function getAdminPhoto(table: "users" | "applications", id: string) {
  return apiRequest<{ photo: string | null }>(`/api/admin/${table}/${id}/photo`);
}

export interface StaffAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  protected: boolean;
}

export interface StaffInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
}

export interface StaffDirectory {
  accounts: StaffAccount[];
  invitations: StaffInvitation[];
  roles: { id: string; name: string; permissions: string[] }[];
}

export function getStaffDirectory() {
  return apiRequest<StaffDirectory>("/api/admin/staff");
}

export function inviteStaff(email: string, role: string) {
  return apiRequest<{ token: string; expires_at: string }>("/api/admin/staff/invitations", {
    method: "POST", body: JSON.stringify({ email, role }),
  });
}

export function acceptStaffInvite(token: string) {
  return apiRequest<{ role: string }>("/api/staff/invitations/accept", {
    method: "POST", body: JSON.stringify({ token }),
  });
}

export function changeStaffAccess(ids: string[], action: "suspend" | "restore" | "revoke", kind: "accounts" | "invitations" = "accounts") {
  return apiRequest<{ updated: number }>("/api/admin/staff/bulk", {
    method: "POST", body: JSON.stringify({ ids, action, kind }),
  });
}

export function updateStaffRole(id: string, role: string) {
  return apiRequest<StaffAccount>(`/api/admin/staff/${id}/role`, {
    method: "PUT", body: JSON.stringify({ role }),
  });
}

export function getResumeFile(id: string, admin = false) {
  return apiBlob(`/api/${admin ? "admin/" : ""}applications/${id}/resume`);
}

export function listAdminPrograms(filters: { q?: string; limit?: number; offset?: number }) {
  return apiRequest<Program[]>(adminListPath("programs", filters));
}

export function getProgramDetail(id: string) {
  return apiRequest<Program>(`/api/programs/${encodeURIComponent(id)}`);
}

export function getProgramApplicationSummary(id: string) {
  return apiRequest<{ total: number; applicant_accounts: number; statuses: Record<string, number> }>(
    `/api/admin/programs/${encodeURIComponent(id)}/application-summary`,
  );
}
