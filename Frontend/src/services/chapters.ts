import { apiRequest } from "./api"

// Shapes mirror what the old public/chapters.js sent to and received from the
// backend (Backend/api/routes/chapters.py, founders.py, chapter_applications.py).

export type Chapter = {
  id: string
  name: string
  inst: string
  city: string
  region: string
  type: string
}

export type Executive = {
  id: string
  name: string
  role: string
  chapter: string
  status: string
  email: string
  phone: string
  bio: string
  resp: string[]
  photo: string | null
}

export type Founder = {
  id: string
  name: string
  title: string
  bio: string
  email: string
  phone: string
  photo: string | null
}

export type ChapterDirectory = {
  chapters: Chapter[]
  executives: Executive[]
  updated_at?: string
}

export type ApplicationStatus =
  | "pending"
  | "under_review"
  | "accepted"
  | "rejected"

export type PositionApplication = {
  id: string
  chapter_id: string
  chapter_name: string
  position_title: string
  motivation: string
  status: ApplicationStatus
  created_at: string
  updated_at: string
  applicant_name?: string | null
  applicant_email?: string | null
}

export function getChapterDirectory() {
  return apiRequest<ChapterDirectory | null>("/api/chapters")
}

export function saveChapterDirectory(directory: {
  chapters: Chapter[]
  executives: Executive[]
}) {
  return apiRequest<ChapterDirectory>("/api/chapters", {
    method: "PUT",
    body: JSON.stringify(directory),
  })
}

export function listFounders() {
  return apiRequest<Founder[]>("/api/founders")
}

export function saveFounderRecord(founder: Founder) {
  return apiRequest<Founder>(`/api/founders/${encodeURIComponent(founder.id)}`, {
    method: "PUT",
    body: JSON.stringify(founder),
  })
}

export function deleteFounderRecord(id: string) {
  return apiRequest<void>(`/api/founders/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
}

export function createPositionApplication(payload: {
  chapter_id: string
  chapter_name: string
  position_title: string
  motivation: string
}) {
  return apiRequest<PositionApplication>("/api/chapter-applications", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function listMyPositionApplications() {
  return apiRequest<PositionApplication[]>("/api/chapter-applications/mine")
}

export function listAllPositionApplications() {
  return apiRequest<PositionApplication[]>("/api/chapter-applications")
}

export function updatePositionApplicationStatus(
  id: string,
  status: ApplicationStatus,
) {
  return apiRequest<PositionApplication>(
    `/api/chapter-applications/${encodeURIComponent(id)}/status`,
    { method: "PATCH", body: JSON.stringify({ status }) },
  )
}
