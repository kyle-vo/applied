import { useState } from "react";
import { useApplications } from "./useApplications";

function ScoreRing({ score }) {
  const color =
    score >= 80 ? "text-green-600" : score >= 60 ? "text-yellow-500" : "text-red-500";
  return (
    <span className={`text-2xl font-bold tabular-nums ${color}`}>{score}%</span>
  );
}

function ScoreBadge({ score }) {
  const cls =
    score >= 80
      ? "bg-green-100 text-green-700"
      : score >= 60
      ? "bg-yellow-100 text-yellow-700"
      : "bg-red-100 text-red-600";
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {score}%
    </span>
  );
}

function ScoredCard({ app, analyzing, error, onAnalyze, tailoring, tailorResult, tailorError, onTailor }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card overflow-hidden">
      {/* Header row — always visible */}
      <button
        className="w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <svg
            className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{app.company}</p>
            <p className="text-sm text-gray-500 truncate">{app.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
          <ScoreBadge score={app.ai_match_score} />
          <button
            onClick={() => onTailor(app.id)}
            disabled={tailoring}
            className="text-xs text-indigo-400 hover:text-indigo-600 underline disabled:opacity-50"
          >
            {tailoring ? "Tailoring…" : tailorResult ? "Re-tailor" : "Tailor resume"}
          </button>
          <button
            onClick={() => onAnalyze(app.id, true)}
            disabled={analyzing}
            className="text-xs text-gray-400 hover:text-gray-600 underline disabled:opacity-50"
          >
            {analyzing ? "Re-analyzing…" : "Re-analyze"}
          </button>
        </div>
      </button>

      {/* Expandable detail */}
      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-100">
          {error && <p className="text-xs text-red-500 pt-3">{error}</p>}

          {app.ai_analysis && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
              {app.ai_analysis.strengths?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-700 mb-1.5">Strengths</p>
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
                  <p className="text-xs font-semibold text-yellow-700 mb-1.5">Gaps</p>
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
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Key Skills / Keywords</p>
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

          {/* Tailoring results */}
          {tailorError && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-red-500">{tailorError}</p>
            </div>
          )}

          {tailorResult && (
            <div className="border-t border-gray-100 pt-4 space-y-4">
              <p className="text-xs font-semibold text-indigo-700">Tailoring Suggestions</p>

              {tailorResult.tailored_summary && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1.5">Tailored summary</p>
                  <blockquote className="text-xs text-gray-700 bg-indigo-50 border-l-2 border-indigo-300 pl-3 py-2 rounded-r-md italic">
                    {tailorResult.tailored_summary}
                  </blockquote>
                </div>
              )}

              {tailorResult.rewrites?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">Suggested rewrites</p>
                  <div className="space-y-3">
                    {tailorResult.rewrites.map((r, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-3 space-y-1">
                        <p className="text-xs text-gray-400 font-medium">{r.context}</p>
                        <p className="text-xs text-gray-800">{r.suggested}</p>
                        <p className="text-xs text-gray-400 italic">{r.why}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tailorResult.keywords_to_add?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1.5">Keywords to add</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tailorResult.keywords_to_add.map((kw, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                        + {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Analysis() {
  const { applications, loading, analyzeApplication, tailorApplication } = useApplications();
  const [analyzing, setAnalyzing] = useState(new Set());
  const [errors, setErrors] = useState({});
  const [tailoring, setTailoring] = useState(new Set());
  const [tailorResults, setTailorResults] = useState({});
  const [tailorErrors, setTailorErrors] = useState({});

  const scored = applications.filter((a) => a.ai_match_score != null);
  const unscored = applications.filter(
    (a) => a.ai_match_score == null && a.job_description
  );
  const noJd = applications.filter((a) => !a.job_description);

  async function handleAnalyze(id, force = false) {
    setErrors((prev) => { const e = { ...prev }; delete e[id]; return e; });
    setAnalyzing((prev) => new Set([...prev, id]));
    try {
      await analyzeApplication(id, { force });
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

  async function handleTailor(id) {
    setTailorErrors((prev) => { const e = { ...prev }; delete e[id]; return e; });
    setTailoring((prev) => new Set([...prev, id]));
    try {
      const result = await tailorApplication(id);
      setTailorResults((prev) => ({ ...prev, [id]: result }));
    } catch (err) {
      setTailorErrors((prev) => ({ ...prev, [id]: err.message }));
    } finally {
      setTailoring((prev) => {
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
            <div key={app.id} className="card p-4 flex items-center justify-between gap-4">
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
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Results</p>
          {scored
            .sort((a, b) => b.ai_match_score - a.ai_match_score)
            .map((app) => (
              <ScoredCard
                key={app.id}
                app={app}
                analyzing={analyzing.has(app.id)}
                error={errors[app.id]}
                onAnalyze={handleAnalyze}
                tailoring={tailoring.has(app.id)}
                tailorResult={tailorResults[app.id]}
                tailorError={tailorErrors[app.id]}
                onTailor={handleTailor}
              />
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
