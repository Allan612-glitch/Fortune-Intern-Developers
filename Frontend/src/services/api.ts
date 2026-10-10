const apiBase =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? "https://fortune-intern-developers-backend.vercel.app"
    : "");
const tokenStorageKey = "fortune-intern-access-token";

function apiUrl(path: string) {
  return `${apiBase}/${path.replace(/^\/+/, "")}`;
}

export function getAccessToken() {
  return localStorage.getItem(tokenStorageKey);
}

export function setAccessToken(token: string | null) {
  if (token) localStorage.setItem(tokenStorageKey, token);
  else localStorage.removeItem(tokenStorageKey);
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(apiUrl(path), { ...init, headers });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    let code: string | undefined;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") message = body.detail;
      else if (body.detail && typeof body.detail === "object") {
        if (typeof body.detail.message === "string") message = body.detail.message;
        if (typeof body.detail.code === "string") code = body.detail.code;
      }
      else if (typeof body.message === "string") message = body.message;
    } catch {
      // Keep the HTTP status when the response has no JSON error body.
    }
    throw new ApiError(message, response.status, code);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function apiBlob(path: string) {
  const headers = new Headers();
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(apiUrl(path), { headers });
  if (!response.ok) {
    let message = `Download failed (${response.status})`;
    let code: string | undefined;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") message = body.detail;
      else if (body.detail && typeof body.detail === "object") {
        if (typeof body.detail.message === "string") message = body.detail.message;
        if (typeof body.detail.code === "string") code = body.detail.code;
      }
      else if (typeof body.message === "string") message = body.message;
    } catch {
      // Keep the HTTP status when the response has no JSON error body.
    }
    throw new ApiError(message, response.status, code);
  }
  return response.blob();
}
