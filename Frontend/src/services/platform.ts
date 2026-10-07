import { apiRequest } from "./api";

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
}

export interface BackendApplication {
  id: string;
  user_id: string;
  program_id: string;
  program_name: string;
  status: string;
  resume_filename: string | null;
  applicant_name: string | null;
  gender: string | null;
  student_index_number: string | null;
  year_of_study: string | null;
  suggested_company: string | null;
  applicant_institution: string | null;
  applicant_course: string | null;
  applicant_contact: string | null;
  host_company_name: string | null;
  host_company_address: string | null;
  created_at: string;
}

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

export function listPrograms(search = "", category = "All", status = "open") {
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  if (category !== "All") params.set("category", category);
  if (status !== "open") params.set("status", status);
  const query = params.size ? `?${params}` : "";
  return apiRequest<Program[]>(`/api/programs${query}`);
}

export function createAdminProgram(payload: Omit<Program, "id">) {
  return apiRequest<Program>("/api/admin/programs", {
    method: "POST",
    body: JSON.stringify(payload),
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

export function getDashboard() {
  return apiRequest<DashboardSummary>("/api/dashboard");
}

export function listAnnouncements() {
  return apiRequest<Announcement[]>("/api/announcements");
}

export function listAdminUsers() {
  return apiRequest<AdminUser[]>("/api/admin/users");
}

export function setUserSuspension(id: string, suspended: boolean) {
  const params = new URLSearchParams({ suspended: String(suspended) });
  return apiRequest<AdminUser>(`/api/admin/users/${id}/suspension?${params}`, {
    method: "PUT",
  });
}

export function listAdminApplications() {
  return apiRequest<BackendApplication[]>("/api/admin/applications");
}

export function setApplicationStatus(id: string, status: string) {
  return apiRequest<BackendApplication>(`/api/admin/applications/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
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

export function publishAnnouncement(title: string, content: string) {
  return apiRequest<Announcement>("/api/admin/announcements", {
    method: "POST",
    body: JSON.stringify({ title, content }),
  });
}
