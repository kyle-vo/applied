import { useState } from "react";
import { useApplications } from "./useApplications";

function ScoreRing({ score }) {
  const color =
    score >= 80 ? "text-green-600" : score >= 60 ? "text-yellow-500" : "text-red-500";
  return (
    <span className={`text-2xl font-bold tabular-nums ${color}`}>{score}%</span>
  );
}

export default function Analysis() {
  const { applications, loading, analyzeApplication } = useApplications();
  const [analyzing, setAnalyzing] = useState(new Set());
  const [errors, setErrors] = useState({});

  const scored = applications.filter((a) => a.ai_match_score != null);
  const unscored = applications.filter(
    (a) => a.ai_match_score == null && a.job_description
  );
  const noJd = applications.filter((a) => !a.job_description);

  async function handleAnalyze(id) {
    setErrors((prev) => { const e = { ...prev }; delete e[id]; return e; });
    setAnalyzing((prev) => new Set([...prev, id]));
    try {
      await analyzeApplication(id);
    } catch (err) {
      setErrors((prev) => ({ ...prev, [id]: err.message }));
    } finally {
      setAnalyzing((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading…
      </div>
    );

  const hasAnything = scored.length > 0 || unscored.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">AI Analysis</h1>
        {scored.length > 0 && (
          <span className="text-sm text-gray-500">
            {scored.length} scored · avg{" "}
            <span className="font-medium text-gray-700">
              {Math.round(scored.reduce((s, a) => s + a.ai_match_score, 0) / scored.length)}%
            </span>
          </span>
        )}
      </div>

      {!hasAnything && (
        <div className="card p-12 text-center space-y-2">
          <p className="text-gray-500 text-sm">No applications with job descriptions yet.</p>
          <p className="text-gray-400 text-xs">
            Paste a job description when adding an application — then run AI analysis to get a
            match score and gap breakdown.
          </p>
        </div>
      )}

      {unscored.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Ready to analyze</p>
          {unscored.map((app) => (
            <div
              key={app.id}
              className="card p-4 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{app.company}</p>
                <p className="text-sm text-gray-500 truncate">{app.role}</p>
                {errors[app.id] && (
                  <p className="text-xs text-red-500 mt-1">{errors[app.id]}</p>
                )}
              </div>
              <button
                onClick={() => handleAnalyze(app.id)}
                disabled={analyzing.has(app.id)}
                className="shrink-0 btn-primary text-sm px-4 py-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {analyzing.has(app.id) ? "Analyzing…" : "Analyze"}
              </button>
            </div>
          ))}
        </div>
      )}

      {scored.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Results</p>
          {scored
            .sort((a, b) => b.ai_match_score - a.ai_match_score)
            .map((app) => (
              <div key={app.id} className="card p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{app.company}</p>
                    <p className="text-sm text-gray-500">{app.role}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex items-center gap-3">
                      <ScoreRing score={app.ai_match_score} />
                      <button
                        onClick={() => handleAnalyze(app.id)}
                        disabled={analyzing.has(app.id)}
                        className="text-xs text-gray-400 hover:text-gray-600 underline disabled:opacity-50"
                      >
                        {analyzing.has(app.id) ? "Re-analyzing…" : "Re-analyze"}
                      </button>
                    </div>
                    {errors[app.id] && (
                      <p className="text-xs text-red-500">{errors[app.id]}</p>
                    )}
                  </div>
                </div>

                {app.ai_analysis && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {app.ai_analysis.strengths?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-green-700 mb-1.5">
                          Strengths
                        </p>
                        <ul className="space-y-1">
                          {app.ai_analysis.strengths.map((s, i) => (
                            <li key={i} className="text-xs text-gray-600 flex gap-2">
                              <span className="text-green-500 shrink-0">✓</span>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {app.ai_analysis.gaps?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-yellow-700 mb-1.5">
                          Gaps
                        </p>
                        <ul className="space-y-1">
                          {app.ai_analysis.gaps.map((g, i) => (
                            <li key={i} className="text-xs text-gray-600 flex gap-2">
                              <span className="text-yellow-500 shrink-0">⚠</span>
                              {g}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {app.ai_analysis?.keywords?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1.5">
                      Key Skills / Keywords
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {app.ai_analysis.keywords.map((kw, i) => {
                        const kwLower = kw.toLowerCase();
                        const matched = app.ai_analysis.strengths?.some((s) =>
                          s.toLowerCase().includes(kwLower)
                        );
                        const missing = !matched && app.ai_analysis.gaps?.some((g) =>
                          g.toLowerCase().includes(kwLower)
                        );
                        return (
                          <span
                            key={i}
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              matched
                                ? "bg-green-100 text-green-700"
                                : missing
                                ? "bg-red-100 text-red-600"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {kw}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      {noJd.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          {noJd.length} application{noJd.length > 1 ? "s" : ""} without a job description —
          add one to enable analysis.
        </p>
      )}
    </div>
  );
}
