import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useApi } from "./api";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

export default function Settings() {
  const [resumeText, setResumeText] = useState("");
  const [status, setStatus] = useState(null); // "saved" | "error" | null
  const [errorMsg, setErrorMsg] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  const api = useApi();
  const { getToken } = useAuth();

  useEffect(() => {
    api.get("/settings/resume")
      .then((data) => { if (data.resume_text) setResumeText(data.resume_text); })
      .catch(() => {});
  }, []);

  function showStatus(type, msg = "") {
    setStatus(type);
    setErrorMsg(msg);
    if (type === "saved") setTimeout(() => setStatus(null), 3000);
  }

  async function handlePdfUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setStatus(null);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${BASE_URL}/settings/resume`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setResumeText(data.resume_text);
      showStatus("saved");
    } catch (err) {
      showStatus("error", err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSave() {
    setSaving(true);
    setStatus(null);
    try {
      await api.post("/settings/resume", { resume_text: resumeText });
      showStatus("saved");
    } catch (err) {
      showStatus("error", err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Settings</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-medium text-gray-900 mb-1">Resume</h2>
        <p className="text-sm text-gray-500 mb-4">
          Upload a PDF or paste your resume as plain text. Used for AI match scoring.
        </p>

        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer mb-4 transition-colors">
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
          className="w-full h-72 rounded-lg border border-gray-200 p-3 text-sm font-mono text-gray-700 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Or paste your resume as plain text…"
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
        />

        {status === "error" && (
          <p className="text-sm text-red-600 mt-2">{errorMsg}</p>
        )}

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleSave}
            disabled={saving || !resumeText.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save Resume"}
          </button>
          {status === "saved" && (
            <span className="text-sm text-green-600 font-medium">Saved!</span>
          )}
        </div>
      </div>
    </div>
  );
}
