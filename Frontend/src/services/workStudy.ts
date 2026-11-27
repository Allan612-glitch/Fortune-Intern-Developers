export interface WorkStudyRegistration {
  id: string;
  applicant_name: string;
  email: string;
  phone: string;
  institution: string;
  chapter: string;
  preferred_role: string;
  availability: string;
  weekly_hours: string;
  created_at: string;
  consented_at: string;
  requires_minor_review: boolean;
}

export const workStudyRoles = [
  ["tutoring", "Campus tutoring"],
  ["event_logistics", "Event logistics"],
  ["departmental_support", "Departmental support"],
  ["insurance", "Insurance sales and agency"],
  ["retail", "Retail and sales"],
  ["administration", "Administrative assistance"],
] as const;

export const workStudyAvailability = [
  ["evenings", "Evenings only"],
  ["weekends", "Weekends only"],
  ["evenings_weekends", "Evenings and weekends"],
  ["weekdays", "Weekday blocks between lectures"],
] as const;

export const workStudyHours = [["4-6", "4 to 6 hours"], ["7-10", "7 to 10 hours"], ["11-15", "11 to 15 hours"]] as const;

export function workStudyLabel(options: readonly (readonly [string, string])[], value: string) {
  return options.find(([key]) => key === value)?.[1] || value;
}

export function useWorkStudyRegistrations(path: string, revision = 0) {
  const [result, setResult] = useState<{ path: string; revision: number; data?: WorkStudyRegistration[]; error?: string } | null>(null);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    apiRequest<WorkStudyRegistration[]>(path, { signal: controller.signal }).then(
      data => { if (!controller.signal.aborted) setResult({ path, revision, data }); },
      error => { if (!controller.signal.aborted) setResult({ path, revision, error: error instanceof Error ? error.message : "Unable to load registrations." }); },
    );
    return () => controller.abort();
  }, [path, revision]);
  return result?.path === path && result.revision === revision ? result : null;
}
import { useEffect, useState } from "react";
import { apiRequest } from "./api";

