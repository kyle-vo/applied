import { useAuth } from "@clerk/clerk-react";
import { exitDemo, getDemoKey } from "./demo";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

export function useApi() {
  const { getToken } = useAuth();

  async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
    // Demo sessions authenticate with an API key instead of a Clerk JWT
    const demoKey = getDemoKey();
    const authHeader: Record<string, string> = demoKey
      ? { "X-API-Key": demoKey }
      : { Authorization: `Bearer ${await getToken()}` };
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
        ...(options.headers as Record<string, string>),
      },
    });

    if (res.status === 401 && demoKey) {
      // Demo account expired (24h TTL) — clear it and send the visitor back
      exitDemo();
      window.location.href = "/sign-in";
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      const err = new Error(body.error || `Request failed: ${res.status}`) as import("./types").ApiError;
      if (body.duplicate) err.duplicate = body.existing;
      throw err;
    }

    return res.json() as Promise<T>;
  }

  return {
    get: <T = unknown>(path: string) => apiFetch<T>(path),
    post: <T = unknown>(path: string, body: unknown) =>
      apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) }),
    patch: <T = unknown>(path: string, body: unknown) =>
      apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
    delete: <T = unknown>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
  };
}
