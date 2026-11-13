export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

export type ApiRole = "learner" | "educator" | "admin";

function roleHeaders(role: ApiRole) {
  return {
    "X-Role": role,
    "X-Learner-ID": "learner-01",
  };
}

async function responseError(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => ({}))) as { detail?: unknown; message?: unknown };
  if (typeof payload.detail === "string") return payload.detail;
  if (typeof payload.message === "string") return payload.message;
  return `Request failed (${response.status})`;
}

export async function apiGet<T>(path: string, _fallback: T, role: ApiRole = "learner"): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Accept: "application/json", ...roleHeaders(role) },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(await responseError(response));
  return (await response.json()) as T;
}

export async function apiPost<T>(path: string, body: unknown, role: ApiRole = "learner"): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...roleHeaders(role) },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await responseError(response));
  return (await response.json()) as T;
}

export function displayValue(value: unknown, fallback = "—"): string {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "string" || typeof value === "number") return String(value);
  return fallback;
}

export function objectFrom(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
