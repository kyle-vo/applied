import { useState, useEffect } from "react";

const STATUSES = ["applied", "screening", "interview", "offer", "rejected", "withdrawn"];

const EMPTY = {
  company: "",
  role: "",
  location: "",
  job_url: "",
  job_description: "",
  status: "applied",
  notes: "",
  follow_up_at: "",
};

export default function JobModal({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [duplicateOf, setDuplicateOf] = useState(null);

  useEffect(() => {
    if (open) {
      setDuplicateOf(null);
      setForm(initial ? {
        company: initial.company ?? "",
        role: initial.role ?? "",
        location: initial.location ?? "",
        job_url: initial.job_url ?? "",
        job_description: initial.job_description ?? "",
        status: initial.status ?? "applied",
        notes: initial.notes ?? "",
        follow_up_at: initial.follow_up_at
          ? initial.follow_up_at.slice(0, 10)
          : "",
      } : EMPTY);
      setError(null);
    }
  }, [open, initial]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave(force = false) {
    if (!form.company.trim() || !form.role.trim()) {
      setError("Company and role are required.");
      return;
    }
    setSaving(true);
    setError(null);
    setDuplicateOf(null);
    try {
      await onSave({ ...form, follow_up_at: form.follow_up_at || null }, { force });
      onClose();
    } catch (err) {
      if (err.duplicate) {
        setDuplicateOf(err.duplicate);
      } else {
        setError(err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">
            {initial ? "Edit application" : "Add application"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {duplicateOf && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <p className="text-sm font-medium text-amber-800">Possible duplicate</p>
              <p className="text-xs text-amber-700 mt-0.5">
                You already have a <strong>{duplicateOf.role}</strong> application at <strong>{duplicateOf.company}</strong> (status: {duplicateOf.status}).
              </p>
              <div className="flex gap-2 mt-2.5">
                <button
                  className="text-xs px-3 py-1 rounded bg-amber-200 text-amber-900 hover:bg-amber-300 font-medium"
                  onClick={() => handleSave(true)}
                  disabled={saving}
                >
                  Add anyway
                </button>
                <button
                  className="text-xs px-3 py-1 rounded border border-amber-200 text-amber-700 hover:bg-amber-100"
                  onClick={() => setDuplicateOf(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Company *</label>
              <input className="input" value={form.company} onChange={e => set("company", e.target.value)} placeholder="Stripe" />
            </div>
            <div>
              <label className="label">Role *</label>
              <input className="input" value={form.role} onChange={e => set("role", e.target.value)} placeholder="Software Engineer" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Location</label>
              <input className="input" value={form.location} onChange={e => set("location", e.target.value)} placeholder="San Francisco, CA" />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => set("status", e.target.value)}>
                {STATUSES.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Job URL</label>
            <input className="input" value={form.job_url} onChange={e => set("job_url", e.target.value)} placeholder="https://jobs.stripe.com/..." />
          </div>

          <div>
            <label className="label">Job description</label>
            <textarea
              className="input resize-none"
              rows={5}
              value={form.job_description}
              onChange={e => set("job_description", e.target.value)}
              placeholder="Paste the full job description here — used for AI match scoring"
            />
          </div>

          <div>
            <label className="label">Follow-up date</label>
            <input className="input" type="date" value={form.follow_up_at} onChange={e => set("follow_up_at", e.target.value)} />
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={3} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Referral from John, recruiter name, etc." />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : initial ? "Save changes" : "Add application"}
          </button>
        </div>
      </div>
    </div>
  );
}
