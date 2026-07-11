const STORAGE_KEY = "applied_demo_key";
const BASE_URL = import.meta.env.VITE_API_URL || "/api";

export function getDemoKey(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function isDemoMode(): boolean {
  return getDemoKey() !== null;
}

export async function startDemo(): Promise<void> {
  const res = await fetch(`${BASE_URL}/demo/start`, { method: "POST" });
  if (!res.ok) throw new Error("Could not start the demo — please try again.");
  const { key } = (await res.json()) as { key: string };
  localStorage.setItem(STORAGE_KEY, key);
}

export function exitDemo(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// Render's free tier spins the backend down after 15 idle minutes and takes
// up to a minute to wake. Fire-and-forget a /health ping as soon as the app
// loads so the server is already waking while the visitor reads the page.
export function warmBackend(): void {
  const healthUrl = BASE_URL.replace(/\/api$/, "") + "/health";
  fetch(healthUrl).catch(() => {});
}
