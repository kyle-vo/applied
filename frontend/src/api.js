import { useAuth } from "@clerk/clerk-react";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

// Hook that returns an authenticated fetch wrapper
export function useApi() {
  const { getToken } = useAuth();

  async function apiFetch(path, options = {}) {
    const token = await getToken();
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      const err = new Error(body.error || `Request failed: ${res.status}`);
      if (body.duplicate) err.duplicate = body.existing;
      throw err;
    }

    return res.json();
  }

  return {
    get: (path) => apiFetch(path),
    post: (path, body) => apiFetch(path, { method: "POST", body: JSON.stringify(body) }),
    patch: (path, body) => apiFetch(path, { method: "PATCH", body: JSON.stringify(body) }),
    delete: (path) => apiFetch(path, { method: "DELETE" }),
  };
}
