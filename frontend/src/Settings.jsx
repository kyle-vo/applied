import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useApi } from "./api";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

export default function Settings() {
  const [resumes, setResumes] = useState([]);
  const [newName, setNewName] = useState("");
  const [newText, setNewText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [savedId, setSavedId] = useState(null);
  const fileInputRef = useRef(null);
  const api = useApi();
  const { getToken } = useAuth();

  useEffect(() => {
    api.get("/resumes").then((data) => setResumes(data.resumes)).catch(() => {});
  }, []);

  function flashSaved(id) {
    setSavedId(id);
    setTimeout(() => setSavedId(null), 3000);
  }

  async function handlePdfUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", newName || file.name.replace(".pdf", ""));
      const res = await fetch(`${BASE_URL}/resumes`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setResumes((prev) => [data, ...prev]);
      setNewName("");
      setNewText("");
      flashSaved(data.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSaveText() {
    if (!newText.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const data = await api.post("/resumes", {
        name: newName || "My Resume",
        resume_text: newText,
      });
      setResumes((prev) => [data, ...prev]);
      setNewName("");
      setNewText("");
      flashSaved(data.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/resumes/${id}`);
      setResumes((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRename(id, name) {
    try {
      const data = await api.patch(`/resumes/${id}`, { name });
      setResumes((prev) => prev.map((r) => (r.id === id ? data : r)));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>

      {/* Saved resumes */}
      {resumes.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-medium text-gray-900 mb-4">Your Resumes</h2>
          <div className="space-y-3">
            {resumes.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                <input
                  className="flex-1 bg-transparent text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
                  defaultValue={r.name}
                  onBlur={(e) => {
                    if (e.target.value !== r.name) handleRename(r.id, e.target.value);
                  }}
                />
                <div className="flex items-center gap-2 shrink-0">
                  {savedId === r.id && (
                    <span className="text-xs text-green-600 font-medium">Saved!</span>
                  )}
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add new resume */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-medium text-gray-900 mb-1">Add Resume</h2>
        <p className="text-sm text-gray-500 mb-4">
          Upload a PDF or paste plain text. Give it a name to tell them apart.
        </p>

        <input
          className="w-full mb-3 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Resume name (e.g. SWE Resume)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />

        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer mb-3 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handlePdfUpload}
            disabled={uploading}
          />
          {uploading ? "Extracting text…" : "Upload PDF"}
        </label>

        <textarea
          className="w-full h-48 rounded-lg border border-gray-200 p-3 text-sm font-mono text-gray-700 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Or paste your resume as plain text…"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
        />

        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleSaveText}
            disabled={saving || !newText.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save Resume"}
          </button>
        </div>
      </div>
    </div>
  );
}
