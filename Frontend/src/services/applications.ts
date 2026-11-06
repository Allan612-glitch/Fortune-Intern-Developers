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
}

export function fromBackendApplication(
  application: BackendApplication,
): ApplicationRecord {
  const status: Record<string, ApplicationStatus> = {
    submitted: "Submitted",
    review: "Under Review",
    interview: "Shortlisted",
    accepted: "Accepted",
    rejected: "Rejected",
    withdrawn: "Withdrawn",
  };
  return {
    reference: application.id,
    opportunity: application.program_name,
    company: application.host_company_name || "",
    gender: application.gender || "",
    applicantName: application.applicant_name || "",
    studentIndexNumber: application.student_index_number || "",
    yearOfStudy: application.year_of_study || "",
    applicationDate: application.created_at,
    lastUpdated: application.created_at,
    status: status[application.status.toLowerCase()] || "Submitted",
    paymentStatus: "Payment Pending",
    paymentReference: "",
    resumeName: application.resume_filename || "",
    resumeType: "",
    resumeUploadedAt: application.created_at,
  };
}
