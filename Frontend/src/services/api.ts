const apiBase = import.meta.env.VITE_API_URL || "";
const tokenStorageKey = "fortune-intern-access-token";

export function getAccessToken() {
  return localStorage.getItem(tokenStorageKey);
}

export function setAccessToken(token: string | null) {
  if (token) localStorage.setItem(tokenStorageKey, token);
  else localStorage.removeItem(tokenStorageKey);
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiBase}${path}`, { ...init, headers });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") message = body.detail;
      else if (typeof body.message === "string") message = body.message;
    } catch {
      // Keep the HTTP status when the response has no JSON error body.
    }
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function apiBlob(path: string) {
  const headers = new Headers();
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${apiBase}${path}`, { headers });
  if (!response.ok) throw new Error(`Download failed (${response.status})`);
  return response.blob();
}
