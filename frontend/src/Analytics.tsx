import { useMemo } from "react";
import { useApplications } from "./useApplications";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { format, startOfWeek, eachWeekOfInterval, subWeeks } from "date-fns";
import type { ApplicationStatus } from "./types";

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  applied:   "#6366f1",
  screening: "#f59e0b",
  interview: "#3b82f6",
  offer:     "#10b981",
  rejected:  "#ef4444",
  withdrawn: "#9ca3af",
};

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied:   "Applied",
  screening: "Screening",
  interview: "Interview",
  offer:     "Offer",
  rejected:  "Rejected",
  withdrawn: "Withdrawn",
};

const SCORE_BUCKETS = [
  { label: "Poor",        sublabel: "0–39",    range: [0, 39],    color: "#ef4444" },
  { label: "Weak",        sublabel: "40–59",   range: [40, 59],   color: "#f59e0b" },
  { label: "Moderate",    sublabel: "60–74",   range: [60, 74],   color: "#6366f1" },
  { label: "Strong",      sublabel: "75–89",   range: [75, 89],   color: "#3b82f6" },
  { label: "Exceptional", sublabel: "90–100",  range: [90, 100],  color: "#10b981" },
] as const;

interface StatCardProps {
  label: string;
  value: string | number | null | undefined;
  sub?: string;
  accentClass?: string;
}

function StatCard({ label, value, sub, accentClass }: StatCardProps) {
  return (
    <div className="card p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-semibold ${accentClass || "text-gray-900"}`}>{value ?? "—"}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

interface ScoreTooltipPayload {
  label: string;
  sublabel: string;
  count: number;
}

function ScoreTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ScoreTooltipPayload }> }) {
  if (!active || !payload?.length) return null;
  const { label, sublabel, count } = payload[0]?.payload ?? { label: "", sublabel: "", count: 0 };
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-gray-800">{label} ({sublabel})</p>
      <p className="text-gray-500">{count} application{count !== 1 ? "s" : ""}</p>
    </div>
  );
}

export default function Analytics() {
  const { applications, summary, loading, error } = useApplications();

  const weeklyData = useMemo(() => {
    const now = new Date();
    const start = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), 11);
    const weeks = eachWeekOfInterval({ start, end: now }, { weekStartsOn: 1 });

    const counts: Record<string, number> = {};
    weeks.forEach((w) => { counts[format(w, "MMM d")] = 0; });

    applications.forEach((app) => {
      if (!app.applied_at) return;
      const appDate = new Date(app.applied_at);
      if (appDate < start) return;
      const key = format(startOfWeek(appDate, { weekStartsOn: 1 }), "MMM d");
      if (key in counts) counts[key]++;
    });

    return Object.entries(counts).map(([week, count]) => ({ week, count }));
  }, [applications]);

  const statusData = useMemo(() => {
    if (!summary?.counts) return [];
    return (Object.entries(summary.counts) as [ApplicationStatus, number][])
      .filter(([, count]) => count > 0)
      .map(([status, value]) => ({ name: STATUS_LABELS[status] || status, value, status }));
  }, [summary]);

  const funnelData = useMemo(() => {
    if (!summary?.counts) return [];
    const { counts, total = 1 } = summary;
    return (["applied", "screening", "interview", "offer"] as ApplicationStatus[]).map((key) => ({
      label: STATUS_LABELS[key],
      count: counts[key] || 0,
      pct: Math.round(((counts[key] || 0) / (total || 1)) * 100),
      color: STATUS_COLORS[key],
    }));
  }, [summary]);

  const scoreData = useMemo(() =>
    SCORE_BUCKETS.map((bucket) => ({
      ...bucket,
      count: applications.filter(
        (a) =>
          a.ai_match_score != null &&
          a.ai_match_score >= bucket.range[0] &&
          a.ai_match_score <= bucket.range[1]
      ).length,
    })),
  [applications]);

  const offerRate = useMemo(() => {
    if (!summary?.total) return null;
    return Math.round(((summary.counts?.offer || 0) / summary.total) * 100);
  }, [summary]);

  const scoredCount = applications.filter((a) => a.ai_match_score != null).length;

  if (loading)
    return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading…</div>;
  if (error)
    return <div className="text-red-500 text-sm p-4">{error}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Analytics</h1>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total applied" value={summary?.total ?? 0} sub="all time" />
        <StatCard
          label="Response rate"
          value={summary?.response_rate != null ? `${summary.response_rate}%` : null}
          sub="screening + interviews + offers"
          accentClass={summary?.response_rate != null && summary.response_rate >= 20 ? "text-emerald-600" : undefined}
        />
        <StatCard
          label="Avg AI match"
          value={summary?.avg_match_score != null ? `${summary.avg_match_score}%` : null}
          sub={scoredCount > 0 ? `across ${scoredCount} scored` : "no scored applications"}
        />
        <StatCard
          label="Offer rate"
          value={offerRate != null ? `${offerRate}%` : null}
          sub={`${summary?.counts?.offer ?? 0} offer${(summary?.counts?.offer ?? 0) !== 1 ? "s" : ""}`}
          accentClass={(summary?.counts?.offer ?? 0) > 0 ? "text-emerald-600" : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Applications over time</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} interval={1} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: "#f3f4f6" }} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} formatter={(v) => [v, "Applications"]} />
              <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 mt-2">Last 12 weeks</p>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Status breakdown</h2>
          {statusData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No applications yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} cx="40%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="value" strokeWidth={0}>
                  {statusData.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status as ApplicationStatus] || "#9ca3af"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} formatter={(v, name) => [v, name]} />
                <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingLeft: 16 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Pipeline funnel</h2>
          <div className="space-y-4">
            {funnelData.map(({ label, count, pct, color }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-600">{label}</span>
                  <span className="text-gray-900 font-medium">
                    {count} <span className="text-gray-400 font-normal text-xs">({pct}%)</span>
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            ))}
          </div>
          {(summary?.counts?.rejected > 0 || summary?.counts?.withdrawn > 0) && (
            <p className="text-xs text-gray-400 mt-5 border-t border-gray-100 pt-3">
              {summary?.counts?.rejected || 0} rejected · {summary?.counts?.withdrawn || 0} withdrawn
            </p>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">AI match score distribution</h2>
          {scoredCount === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No scored applications yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={scoreData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                <Tooltip content={<ScoreTooltip />} cursor={{ fill: "#f3f4f6" }} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {scoreData.map((entry) => (
                    <Cell key={entry.label} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
