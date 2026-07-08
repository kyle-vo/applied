import { afterEach, describe, expect, it, vi } from "vitest";
import { exitDemo, getDemoKey, isDemoMode, startDemo } from "./demo";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("demo mode", () => {
  it("is off by default", () => {
    expect(isDemoMode()).toBe(false);
    expect(getDemoKey()).toBeNull();
  });

  it("stores the key returned by the demo endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ key: "apk_demo123" }),
      })
    );

    await startDemo();
    expect(fetch).toHaveBeenCalledWith("/api/demo/start", { method: "POST" });
    expect(isDemoMode()).toBe(true);
    expect(getDemoKey()).toBe("apk_demo123");
  });

  it("throws and stays signed out when the endpoint fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(startDemo()).rejects.toThrow();
    expect(isDemoMode()).toBe(false);
  });

  it("exitDemo clears the stored key", async () => {
    localStorage.setItem("applied_demo_key", "apk_demo123");
    expect(isDemoMode()).toBe(true);

    exitDemo();
    expect(isDemoMode()).toBe(false);
  });
});
