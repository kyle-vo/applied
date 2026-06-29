import { useState, useEffect, useCallback } from "react";
import { useApi } from "./api";
import type { Application, ApplicationSummary } from "./types";

interface ApplicationsResponse {
  applications: Application[];
  summary: ApplicationSummary;
}

export function useApplications() {
  const api = useApi();
  const [applications, setApplications] = useState<Application[]>([]);
  const [summary, setSummary] = useState<ApplicationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<ApplicationsResponse>("/applications");
      setApplications(data.applications);
      setSummary(data.summary);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  async function createApplication(body: Partial<Application>, { force = false } = {}) {
    const created = await api.post<Application>(`/applications${force ? "?force=true" : ""}`, body);
    setApplications((prev) => [created, ...prev]);
    return created;
  }

  async function updateApplication(id: number, body: Partial<Application>) {
    const updated = await api.patch<Application>(`/applications/${id}`, body);
    setApplications((prev) => prev.map((a) => (a.id === id ? updated : a)));
    return updated;
  }

  async function deleteApplication(id: number) {
    await api.delete(`/applications/${id}`);
    setApplications((prev) => prev.filter((a) => a.id !== id));
  }

  async function updateStatus(id: number, status: string) {
    return updateApplication(id, { status: status as Application["status"] });
  }

  async function analyzeApplication(id: number, { force = false } = {}) {
    const url = `/applications/${id}/analyze${force ? "?force=true" : ""}`;
    const updated = await api.post<Application>(url, {});
    setApplications((prev) => prev.map((a) => (a.id === id ? updated : a)));
    return updated;
  }

  async function tailorApplication(id: number, { force = false } = {}) {
    const url = `/applications/${id}/tailor${force ? "?force=true" : ""}`;
    const updated = await api.post<Application>(url, {});
    setApplications((prev) => prev.map((a) => (a.id === id ? updated : a)));
    return updated;
  }

  return {
    applications,
    summary,
    loading,
    error,
    refetch: fetchApplications,
    createApplication,
    updateApplication,
    deleteApplication,
    updateStatus,
    analyzeApplication,
    tailorApplication,
  };
}
