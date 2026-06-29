import { useAuth } from "@clerk/clerk-react";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

export function useApi() {
  const { getToken } = useAuth();

  async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await getToken();
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers as Record<string, string>),
      },
    });

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
