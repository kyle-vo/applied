import { useState } from "react";
import { useApplications } from "./useApplications";
import KanbanBoard from "./KanbanBoard";
import JobModal from "./JobModal";
import { useToast } from "./Toast";
import type { Application, ApplicationForm } from "./types";

interface StatCardProps {
  label: string;
  value: string | number | null | undefined;
  sub?: string;
}

function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="card p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-semibold text-gray-900">{value ?? "—"}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { applications, summary, loading, error, createApplication, updateApplication, updateStatus } =
    useApplications();
  const { addToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Application | null>(null);

  async function handleSave(body: ApplicationForm, opts: { force: boolean }) {
    if (editing) {
      await updateApplication(editing.id, body);
      addToast("Application updated");
    } else {
      await createApplication(body, opts);
      addToast("Application added");
    }
  }

  if (loading)
    return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading…</div>;
  if (error)
    return <div className="text-red-500 text-sm p-4">{error}</div>;

  const pipelineApps = applications.filter((a) => !["rejected", "withdrawn"].includes(a.status));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <button
          className="btn btn-primary"
          onClick={() => { setEditing(null); setModalOpen(true); }}
        >
          + Add application
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Total applied"
          value={summary?.total ?? 0}
          sub={`${summary?.counts?.applied ?? 0} awaiting response`}
        />
        <StatCard
          label="Response rate"
          value={summary?.response_rate != null ? `${summary.response_rate}%` : null}
          sub="screening + interviews + offers"
        />
        <StatCard
          label="Avg AI match"
          value={summary?.avg_match_score != null ? `${summary.avg_match_score}%` : null}
          sub="across scored applications"
        />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Pipeline</h2>
        {pipelineApps.length === 0 ? (
          <div className="card p-12 text-center text-gray-400 text-sm">
            No active applications yet.{" "}
            <button className="text-brand-600 underline" onClick={() => setModalOpen(true)}>
              Add your first one.
            </button>
          </div>
        ) : (
          <KanbanBoard
            applications={pipelineApps}
            onStatusChange={updateStatus}
            onCardClick={(app) => { setEditing(app); setModalOpen(true); }}
          />
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
