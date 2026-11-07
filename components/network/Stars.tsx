export function Stars({ value, className = "" }: { value: number; className?: string }) {
  const filled = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
  return (
    <span
      className={`inline-flex items-center gap-0.5 ${className}`}
      aria-label={`${filled} dan 5 yulduz`}
    >
      {[1, 2, 3, 4, 5].map((index) => (
        <svg
          key={index}
          viewBox="0 0 24 24"
          fill={index <= filled ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          className={`h-3.5 w-3.5 ${index <= filled ? "text-gold" : "text-line-strong"}`}
          aria-hidden="true"
        >
          <path d="m12 3.4 2.7 5.52 6.05.9-4.4 4.27 1.04 6.03L12 17.28l-5.39 2.84 1.04-6.03-4.4-4.27 6.05-.9Z" />
        </svg>
      ))}
    </span>
  );
}
