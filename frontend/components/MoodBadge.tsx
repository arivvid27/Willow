"use client";
// components/MoodBadge.tsx — theme-aware mood badge

interface MoodBadgeProps {
  mood: number;
  size?: "sm" | "md" | "lg";
}

function getMoodConfig(mood: number) {
  // Uses rgba so it adapts to any background
  if (mood >= 8) return { label: "Great",  emoji: "😊", bg: "rgba(34,197,94,0.15)",  color: "#22c55e", ring: "rgba(34,197,94,0.4)"  };
  if (mood >= 6) return { label: "Good",   emoji: "🙂", bg: "rgba(234,179,8,0.15)",  color: "#eab308", ring: "rgba(234,179,8,0.4)"  };
  if (mood >= 4) return { label: "Fair",   emoji: "😐", bg: "rgba(249,115,22,0.15)", color: "#f97316", ring: "rgba(249,115,22,0.4)" };
  if (mood >= 2) return { label: "Low",    emoji: "😟", bg: "rgba(239,68,68,0.15)",  color: "#ef4444", ring: "rgba(239,68,68,0.4)"  };
  return               { label: "Hard",   emoji: "😢", bg: "rgba(168,85,247,0.15)", color: "#a855f7", ring: "rgba(168,85,247,0.4)" };
}

export default function MoodBadge({ mood, size = "md" }: MoodBadgeProps) {
  const { label, emoji, bg, color, ring } = getMoodConfig(mood);

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-sm px-2.5 py-1 gap-1.5",
    lg: "text-base px-3 py-1.5 gap-2",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]}`}
      style={{ background: bg, color, border: `1px solid ${ring}` }}
      aria-label={`Mood: ${mood} out of 10 — ${label}`}
    >
      <span aria-hidden="true">{emoji}</span>
      <span>{mood}/10</span>
      <span className="opacity-60">·</span>
      <span>{label}</span>
    </span>
  );
}
