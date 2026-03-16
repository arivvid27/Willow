// components/LoadingSpinner.tsx

interface LoadingSpinnerProps {
  size?: number;
  label?: string;
}

export default function LoadingSpinner({
  size = 20,
  label = "Loading…",
}: LoadingSpinnerProps) {
  return (
    <span role="status" aria-label={label} className="inline-flex items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={{ animation: "spin 0.75s linear infinite" }}
      >
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <circle
          cx="12" cy="12" r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeOpacity="0.2"
        />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
