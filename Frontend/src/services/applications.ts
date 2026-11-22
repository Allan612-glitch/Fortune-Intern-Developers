import type { StudentUpdate } from "./opportunities";
import type { BackendApplication } from "./platform";

export type ApplicationStatus =
  | "Submitted"
  | "Under Review"
  | "Shortlisted"
  | "Accepted"
  | "Rejected"
  | "Withdrawn";
export type PaymentStatus =
  | "Payment Pending"
  | "Payment Successful"
  | "Payment Failed";

export interface ApplicationRecord {
  reference: string;
  opportunity: string;
  company: string;
  gender?: string;
  applicantName: string;
  studentIndexNumber: string;
  yearOfStudy?: string;
  applicationDate: string;
  lastUpdated: string;
  status: ApplicationStatus;
  paymentStatus: PaymentStatus;
  paymentReference: string;
  resumeName: string;
  resumeType: string;
  resumeUploadedAt: string;
  documentsSent: boolean;
  placementFilesAvailable?: boolean;
  supervisorAssessmentName: string;
  certificateApproved: boolean;
  studentUpdate?: StudentUpdate | null;
  documentRequest?: string | null;
  responseBy?: string | null;
}

const statusLabels: Record<string, ApplicationStatus> = {
  submitted: "Submitted",
  applied: "Submitted",
  review: "Under Review",
  under_review: "Under Review",
  shortlisted: "Shortlisted",
  interview: "Shortlisted",
  accepted: "Accepted",
  offered: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export function applicationStatusLabel(status: string): ApplicationStatus {
  return statusLabels[status.toLowerCase()] ?? "Submitted";
}

export const applicationNextSteps: Record<ApplicationStatus, string> = {
  Submitted: "Your application is in the queue. Check here for updates.",
  "Under Review": "The team is reviewing your application and will update your status here.",
  Shortlisted: "Watch for instructions from the team about the next stage.",
  Accepted: "Check your email for placement details and follow the supervisor assessment instructions below.",
  Rejected: "This application is closed. You can browse other internship programs.",
  Withdrawn: "This application is closed.",
};

export function fromBackendApplication(
  application: BackendApplication,
): ApplicationRecord {
  return {
    reference: application.id,
    opportunity: application.program_name,
    company: application.host_company_name || "",
    gender: application.gender || "",
    applicantName: application.applicant_name || "",
    studentIndexNumber: application.student_index_number || "",
    yearOfStudy: application.year_of_study || "",
    applicationDate: application.created_at,
    lastUpdated: application.updated_at || application.created_at,
    status: applicationStatusLabel(application.status),
    paymentStatus: "Payment Pending",
    paymentReference: "",
    resumeName: application.resume_filename || "",
    resumeType: "",
    resumeUploadedAt: application.created_at,
    documentsSent: application.documents_sent,
    placementFilesAvailable: application.placement_files_available,
    supervisorAssessmentName: application.supervisor_assessment_filename || "",
    certificateApproved: application.certificate_approved,
    studentUpdate: application.student_update,
    documentRequest: application.document_request,
    responseBy: application.response_by,
  };
}
