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

async function toApiError(response: Response, fallback: string) {
  let message = `${fallback} (${response.status})`;
  let code: string | undefined;
  try {
    const body = await response.json();
    if (typeof body.detail === "string") message = body.detail;
    else if (body.detail && typeof body.detail === "object") {
      if (typeof body.detail.message === "string") message = body.detail.message;
      if (typeof body.detail.code === "string") code = body.detail.code;
    } else if (typeof body.message === "string") {
      message = body.message;
    }
  } catch {
    // Keep the HTTP status when the response has no JSON error body.
  }
  return new ApiError(message, response.status, code);
}

let refreshPromise: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(apiUrl("/api/auth/refresh"), {
          method: "POST",
          credentials: "include",
        });
        if (response.status === 401 || response.status === 403) {
          setAccessToken(null);
          window.dispatchEvent(new Event("auth:session-expired"));
          return null;
        }
        if (!response.ok) throw await toApiError(response, "Token refresh failed");
        const result: { access_token: string } = await response.json();
        setAccessToken(result.access_token);
        return result.access_token;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

async function authorizedFetch(path: string, init: RequestInit) {
  const send = () => {
    const headers = new Headers(init.headers);
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return fetch(apiUrl(path), {
      ...init,
      headers,
      credentials: "include",
    });
  };

  const response = await send();
  if (
    response.status === 401 &&
    getAccessToken() &&
    !path.startsWith("/api/auth/")
  ) {
    const token = await refreshAccessToken();
    if (token) return send();
  }
  return response;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await authorizedFetch(path, init);
  if (!response.ok) throw await toApiError(response, "Request failed");

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function apiBlob(path: string, init: RequestInit = {}) {
  const response = await authorizedFetch(path, init);
  if (!response.ok) throw await toApiError(response, "Download failed");
  return response.blob();
}
