import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useApplications } from "./useApplications";
import type { Application } from "./types";

const mockApi = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("./api", () => ({
  useApi: () => mockApi,
}));

function makeApp(overrides: Partial<Application> = {}): Application {
  return {
    id: 1,
    company: "Acme Corp",
    role: "Software Engineer",
    status: "applied",
    applied_at: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

const emptySummary = {
  total: 0,
  response_rate: 0,
  avg_match_score: null,
  counts: { applied: 0, screening: 0, interview: 0, offer: 0, rejected: 0, withdrawn: 0 },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockApi.get.mockResolvedValue({ applications: [], summary: emptySummary });
});

describe("useApplications", () => {
  it("fetches applications on mount", async () => {
    const existing = makeApp();
    mockApi.get.mockResolvedValue({ applications: [existing], summary: emptySummary });

    const { result } = renderHook(() => useApplications());
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockApi.get).toHaveBeenCalledWith("/applications");
    expect(result.current.applications).toEqual([existing]);
    expect(result.current.error).toBeNull();
  });

  it("exposes an error message when the fetch fails", async () => {
    mockApi.get.mockRejectedValue(new Error("Network down"));

    const { result } = renderHook(() => useApplications());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Network down");
  });

  it("prepends newly created applications", async () => {
    mockApi.get.mockResolvedValue({ applications: [makeApp({ id: 1 })], summary: emptySummary });
    const created = makeApp({ id: 2, company: "Globex" });
    mockApi.post.mockResolvedValue(created);

    const { result } = renderHook(() => useApplications());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.createApplication({ company: "Globex", role: "SWE" }));
    expect(result.current.applications.map((a) => a.id)).toEqual([2, 1]);
  });

  it("passes force=true through to the create endpoint", async () => {
    mockApi.post.mockResolvedValue(makeApp());

    const { result } = renderHook(() => useApplications());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() =>
      result.current.createApplication({ company: "Acme Corp", role: "SWE" }, { force: true })
    );
    expect(mockApi.post).toHaveBeenCalledWith("/applications?force=true", expect.anything());
  });

  it("replaces the matching application after a status update", async () => {
    mockApi.get.mockResolvedValue({
      applications: [makeApp({ id: 1 }), makeApp({ id: 2, company: "Globex" })],
      summary: emptySummary,
    });
    mockApi.patch.mockResolvedValue(makeApp({ id: 2, company: "Globex", status: "interview" }));

    const { result } = renderHook(() => useApplications());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.updateStatus(2, "interview"));
    expect(mockApi.patch).toHaveBeenCalledWith("/applications/2", { status: "interview" });
    expect(result.current.applications.find((a) => a.id === 2)?.status).toBe("interview");
    expect(result.current.applications.find((a) => a.id === 1)?.status).toBe("applied");
  });

  it("removes deleted applications from state", async () => {
    mockApi.get.mockResolvedValue({
      applications: [makeApp({ id: 1 }), makeApp({ id: 2 })],
      summary: emptySummary,
    });
    mockApi.delete.mockResolvedValue({});

    const { result } = renderHook(() => useApplications());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.deleteApplication(1));
    expect(result.current.applications.map((a) => a.id)).toEqual([2]);
  });

  it("stores the analysis result returned by the analyze endpoint", async () => {
    mockApi.get.mockResolvedValue({ applications: [makeApp({ id: 1 })], summary: emptySummary });
    mockApi.post.mockResolvedValue(makeApp({ id: 1, ai_match_score: 72 }));

    const { result } = renderHook(() => useApplications());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.analyzeApplication(1, { force: true }));
    expect(mockApi.post).toHaveBeenCalledWith("/applications/1/analyze?force=true", {});
    expect(result.current.applications[0].ai_match_score).toBe(72);
  });
});
