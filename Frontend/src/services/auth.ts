import { apiBlob, apiRequest, setAccessToken } from "./api";

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  user: ApiUser;
}

export interface ProfileData {
  bio: string | null;
  profile_picture: string | null;
  major: string | null;
  graduation_year: number | null;
  university: string | null;
  course: string | null;
  year_of_study: number | null;
  skills: string | null;
  experience: ProfileExperience[];
  cgpa: number | null;
  cgpa_scale: number | null;
  phone_number: string | null;
  location: string | null;
  email_notifications: boolean;
  sms_notifications: boolean;
  opportunity_alerts: boolean;
}

export interface ProfileExperience {
  role: string;
  organization: string;
  period: string;
  description: string;
}

export interface ProfileDocument {
  id: string;
  filename: string;
  content_type: string | null;
  file_size: number;
  created_at: string;
}

export async function login(email: string, password: string) {
  const result = await apiRequest<TokenResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setAccessToken(result.access_token);
  return result.user;
}

export async function loginWithGoogle(credential: string) {
  const result = await apiRequest<TokenResponse>("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
  setAccessToken(result.access_token);
  return result.user;
}

export function register(name: string, email: string, password: string) {
  return apiRequest<{ message: string; email: string }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export function resendVerification(email: string) {
  return apiRequest<{ message: string }>("/api/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function verifyEmail(email: string, code: string) {
  const result = await apiRequest<TokenResponse>("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ email, code }),
  });
  setAccessToken(result.access_token);
  return result.user;
}

export function getCurrentUser() {
  return apiRequest<ApiUser>("/api/auth/me");
}

export function getProfile() {
  return apiRequest<ProfileData>("/api/profile");
}

export function updateProfile(profile: Partial<ProfileData>) {
  return apiRequest<ProfileData>("/api/profile", {
    method: "PUT",
    body: JSON.stringify(profile),
  });
}

export function listProfileDocuments() {
  return apiRequest<ProfileDocument[]>("/api/profile/documents");
}

export function uploadProfileDocument(file: File) {
  const body = new FormData();
  body.append("file", file);
  return apiRequest<ProfileDocument>("/api/profile/documents", {
    method: "POST",
    body,
  });
}

export function downloadProfileDocument(id: string) {
  return apiBlob(`/api/profile/documents/${id}/download`);
}

export function deleteProfileDocument(id: string) {
  return apiRequest<void>(`/api/profile/documents/${id}`, { method: "DELETE" });
}
