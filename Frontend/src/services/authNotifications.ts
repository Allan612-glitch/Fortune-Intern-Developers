import type { AppUser } from "../App";

const apiBase = import.meta.env.VITE_API_URL || "";

async function postNotification(path: string, payload: Record<string, string>) {
  try {
    await fetch(`${apiBase}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Authentication state must still be cleared when the notification service is unavailable.
  }
}

export function sendLogoutNotification(user: AppUser) {
  return postNotification("/api/auth/logout-notification", {
    name: user.name,
    email: user.email,
    role: user.role,
    subject: "You have logged out of Fortune Intern",
  });
}

export function requestPasswordReset(email: string, role: AppUser["role"]) {
  return postNotification("/api/auth/password-reset", { email, role });
}

export async function requestForgotPassword(email: string) {
  const apiBase = import.meta.env.VITE_API_URL || "";
  const response = await fetch(`${apiBase}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) throw new Error("Unable to request password reset");
}

export async function resetPassword(token: string, password: string) {
  const apiBase = import.meta.env.VITE_API_URL || "";
  const response = await fetch(`${apiBase}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  if (!response.ok) throw new Error("Invalid or expired reset token");
}
