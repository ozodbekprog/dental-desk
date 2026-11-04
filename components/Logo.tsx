export function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3.5c-2.1 0-3.1-1-4.9-1-2.6 0-4.1 2-4.1 4.7 0 2.2.8 3.6 1.3 5.4.4 1.6.5 3.3.9 5 .3 1.3.8 2.6 1.8 2.6 1.3 0 1.4-2.4 1.9-4.2.4-1.5.9-2.8 3.1-2.8s2.7 1.3 3.1 2.8c.5 1.8.6 4.2 1.9 4.2 1 0 1.5-1.3 1.8-2.6.4-1.7.5-3.4.9-5 .5-1.8 1.3-3.2 1.3-5.4C20.1 4.5 18.6 2.5 16 2.5c-1.8 0-2.8 1-4 1Z" />
    </svg>
  );
}
