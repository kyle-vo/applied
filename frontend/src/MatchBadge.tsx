interface MatchBadgeProps {
  score?: number | null;
}

export default function MatchBadge({ score }: MatchBadgeProps) {
  if (score == null) return null;

  const color =
    score >= 80
      ? "bg-green-100 text-green-700"
      : score >= 60
      ? "bg-yellow-100 text-yellow-700"
      : "bg-red-100 text-red-700";

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
      {score}%
    </span>
  );
}
