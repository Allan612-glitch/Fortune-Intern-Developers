import type { Program } from "./platform";
import { apiRequest } from "./api";

export const opportunityKinds = {
  internship: "Internship", industrial_attachment: "Industrial attachment", national_service: "National service",
  graduate_role: "Graduate role", other: "Other",
} as const;
export const workModes = { onsite: "On-site", hybrid: "Hybrid", remote: "Remote" } as const;

export interface OpportunityDetails {
  kind: keyof typeof opportunityKinds;
  work_mode: keyof typeof workModes | "";
  compensation: "unspecified" | "paid" | "unpaid";
  compensation_details: string;
  eligible_courses: string[];
  eligible_years: number[];
  eligibility: string;
  response_by: string | null;
  employer_verified: boolean;
  accepts_ghana_remote: boolean | null;
  requires_institution_letter: boolean | null;
}

export const emptyOpportunity: OpportunityDetails = {
  kind: "internship", work_mode: "", compensation: "unspecified", compensation_details: "", eligible_courses: [],
  eligible_years: [], eligibility: "", response_by: null, employer_verified: false, accepts_ghana_remote: null,
  requires_institution_letter: null,
};

export interface CareerPreferences {
  location: string;
  work_mode: OpportunityDetails["work_mode"];
  available_from: string | null;
  portfolio_url: string;
}

export interface StudentUpdate { message: string; kind: "update" | "action" | "interview"; due: string | null }
export type OpportunityDraft = Partial<Record<"firstName" | "lastName" | "gender" | "phone" | "institution" | "otherInstitution" |
  "program" | "year" | "indexNumber" | "companyName" | "companyAddress" | "suggestedCompany", string>>;
export type SavedOpportunity = { program: Program; saved: boolean; remind: boolean; has_draft: boolean; updated_at: string };
type OpportunityState = { saved: boolean; remind: boolean; draft: OpportunityDraft | null };
export type StudentAction = { id: string; title: string; due: string | null; path: string };
export type StudentPlacement = { id: string; application_id: string; title: string; employer: string; status: string;
  start_date: string | null; end_date: string | null; supervisor: string; certificate_approved: boolean; placement_files_available: boolean };

export const studentOpportunitiesPath = "/api/student/opportunities";
export function getOpportunityState(id: string) {
  return apiRequest<OpportunityState>(studentOpportunitiesPath + "/" + encodeURIComponent(id));
}
export function updateOpportunityState(id: string, changes: Partial<OpportunityState>) {
  return apiRequest<OpportunityState>(studentOpportunitiesPath + "/" + encodeURIComponent(id), { method: "PATCH", body: JSON.stringify(changes) });
}

export function matchReasons(program: Program, profile: { major: string | null; course: string | null; year_of_study: number | null; skills: string | null; career?: CareerPreferences }) {
  const details = program.opportunity;
  const normalize = (value: string) => value.trim().toLowerCase();
  const course = normalize(profile.major || profile.course || "");
  const year = profile.year_of_study;
  if (course && details?.eligible_courses.length && !details.eligible_courses.some(name => normalize(name) === course)) return [];
  if (year && details?.eligible_years.length && !details.eligible_years.includes(year)) return [];
  const reasons: string[] = [];
  if (course && details?.eligible_courses.some(name => normalize(name) === course)) reasons.push("Matches your course");
  if (year && details?.eligible_years.includes(year)) reasons.push("Open to your year group");
  if (profile.career?.work_mode && profile.career.work_mode === details?.work_mode) reasons.push("Matches your work preference");
  const location = normalize(profile.career?.location || "");
  if (location && normalize(program.location).includes(location)) reasons.push("Matches your location preference");
  const skills = new Set((profile.skills || "").split(",").map(normalize).filter(Boolean));
  if (program.skills.some(skill => skills.has(normalize(skill)))) reasons.push("Matches a skill on your profile");
  return reasons;
}
