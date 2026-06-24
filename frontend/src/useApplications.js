import { useState, useEffect, useCallback } from "react";
import { useApi } from "./api";

export function useApplications() {
  const api = useApi();
  const [applications, setApplications] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get("/applications");
      setApplications(data.applications);
      setSummary(data.summary);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  async function createApplication(body, { force = false } = {}) {
    const created = await api.post(`/applications${force ? "?force=true" : ""}`, body);
    setApplications((prev) => [created, ...prev]);
    return created;
  }

  async function updateApplication(id, body) {
    const updated = await api.patch(`/applications/${id}`, body);
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? updated : a))
    );
    return updated;
  }

  async function deleteApplication(id) {
    await api.delete(`/applications/${id}`);
    setApplications((prev) => prev.filter((a) => a.id !== id));
  }

  async function updateStatus(id, status) {
    return updateApplication(id, { status });
  }

  async function analyzeApplication(id, { force = false } = {}) {
    const url = `/applications/${id}/analyze${force ? "?force=true" : ""}`;
    const updated = await api.post(url, {});
    setApplications((prev) => prev.map((a) => (a.id === id ? updated : a)));
    return updated;
  }

  async function tailorApplication(id, { force = false } = {}) {
    const url = `/applications/${id}/tailor${force ? "?force=true" : ""}`;
    return api.post(url, {});
  }

  return {
    applications,
    summary,
    loading,
    error,
    refetch: fetch,
    createApplication,
    updateApplication,
    deleteApplication,
    updateStatus,
    analyzeApplication,
    tailorApplication,
  };
}
