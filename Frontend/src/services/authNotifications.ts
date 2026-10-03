import { apiRequest } from "./api";

export async function requestForgotPassword(email: string) {
  await apiRequest<{ message: string }>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(email: string, token: string, password: string) {
  await apiRequest<{ message: string }>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, token, new_password: password }),
  });
}
