import { useState } from "react";
import { useApplications } from "./useApplications";
import JobModal from "./JobModal";
import MatchBadge from "./MatchBadge";
import { formatDistanceToNow } from "date-fns";

const STATUS_COLORS = {
  applied:   "bg-blue-100 text-blue-700",
  screening: "bg-purple-100 text-purple-700",
  interview: "bg-yellow-100 text-yellow-700",
  offer:     "bg-green-100 text-green-700",
  rejected:  "bg-red-100 text-red-700",
  withdrawn: "bg-gray-100 text-gray-500",
};

export default function Applications() {
  const {
    applications, loading, error,
    createApplication, updateApplication, deleteApplication,
  } = useApplications();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  function openAdd() { setEditing(null); setModalOpen(true); }
  function openEdit(app) { setEditing(app); setModalOpen(true); }

  async function handleSave(body) {
    if (editing) {
      await updateApplication(editing.id, body);
    } else {
      await createApplication(body);
    }
  }

  async function handleDelete(app) {
    if (window.confirm(`Delete ${app.company} — ${app.role}?`)) {
      await deleteApplication(app.id);
    }
  }

  const filtered = applications.filter((a) => {
    const matchesFilter = filter === "all" || a.status === filter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      a.company.toLowerCase().includes(q) ||
      a.role.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading…</div>;
  if (error) return <div className="text-red-500 text-sm p-4">{error}</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Applications</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Add application</button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          className="input max-w-xs"
          placeholder="Search company or role…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex gap-1">
          {["all", "applied", "screening", "interview", "offer", "rejected", "withdrawn"].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`btn text-xs ${filter === s ? "btn-primary" : "btn-secondary"}`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            No applications match your filter.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-4 py-3 font-medium text-gray-500">Company</th>
                <th className="px-4 py-3 font-medium text-gray-500">Role</th>
                <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 font-medium text-gray-500">Match</th>
                <th className="px-4 py-3 font-medium text-gray-500">Applied</th>
                <th className="px-4 py-3 font-medium text-gray-500">Follow-up</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((app) => (
                <tr
                  key={app.id}
                  className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{app.company}</td>
                  <td className="px-4 py-3 text-gray-600">{app.role}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[app.status]}`}>
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <MatchBadge score={app.ai_match_score} />
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {formatDistanceToNow(new Date(app.applied_at), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {app.follow_up_at
                      ? new Date(app.follow_up_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {app.job_url && (
                        <a
                          href={app.job_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-brand-600 hover:underline"
                        >
                          JD ↗
                        </a>
                      )}
                      <button
                        onClick={() => openEdit(app)}
                        className="text-xs text-gray-400 hover:text-gray-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(app)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <JobModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initial={editing}
      />
    </div>
  );
}
