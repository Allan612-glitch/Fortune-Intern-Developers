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
}

export interface BackendApplication {
  id: string;
  user_id: string;
  program_id: string;
  program_name: string;
  status: string;
  resume_filename: string | null;
  documents_sent: boolean;
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

export function exportAdminApplications(applicationIds: string[]) {
  return apiBlob("/api/admin/applications/export", {
    method: "POST",
    body: JSON.stringify({ application_ids: applicationIds }),
  });
}

export function setApplicationStatus(id: string, status: string) {
  return apiRequest<BackendApplication>(`/api/admin/applications/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
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

export async function downloadCompletionCertificate(id: string) {
  const certificate = await apiBlob(`/api/applications/${id}/certificate`);
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
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
      reject(new Error("Unable to load the certificate for download."));
    }, { once: true });
  });
  frame.srcdoc = await certificate.text();
  document.body.appendChild(frame);

  try {
    await frameLoaded;
    const certificateDocument = frame.contentDocument;
    const sheet = certificateDocument?.getElementById("sheet");
    if (!certificateDocument || !sheet) {
      throw new Error("Unable to render the certificate.");
    }

    const name = certificateDocument.querySelector<HTMLInputElement>(
      '.tgrid input[data-field="name"]',
    )?.value || "Intern";
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

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    const image = await html2canvas(sheet, {
      scale: 3,
      backgroundColor: "#F8FAFC",
      useCORS: true,
      logging: false,
      onclone: async (clonedDocument) => {
        const signature = clonedDocument.querySelector<SVGSVGElement>(".sigsvg");
        if (signature) {
          // html2canvas shifts this SVG's ink despite centering its element box.
          signature.style.transform = "translateX(-3mm)";
        }
        await Promise.all(
          fontRequirements.map(async ([font, text]) => {
            const loadedFonts = await clonedDocument.fonts.load(font, text);
            if (!loadedFonts.length || !clonedDocument.fonts.check(font, text)) {
              throw new Error("Certificate fonts could not be loaded in the PDF renderer.");
            }
          }),
        );
        await clonedDocument.fonts.ready;
      },
    });

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
      compress: true,
    });
    pdf.addImage(image.toDataURL("image/png"), "PNG", 0, 0, 297, 210);

    const certificateNumber = certificateDocument.querySelector<HTMLInputElement>(
      '.tgrid input[data-field="certno"]',
    )?.value || id;
    const safeFilePart = (value: string) =>
      value.trim().replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 60);
    const filename = `FIN_Certificate_${safeFilePart(name) || "Intern"}_${safeFilePart(certificateNumber) || "FIN"}.pdf`;
    const url = URL.createObjectURL(pdf.output("blob"));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } finally {
    frame.remove();
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

export function publishAnnouncement(title: string, content: string) {
  return apiRequest<Announcement>("/api/admin/announcements", {
    method: "POST",
    body: JSON.stringify({ title, content }),
  });
}

export function deleteAdminAnnouncement(id: string) {
  return apiRequest<void>(`/api/admin/announcements/${id}`, {
    method: "DELETE",
  });
}
