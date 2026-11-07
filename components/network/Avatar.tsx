import { initials } from "./format";

type Size = "sm" | "md" | "lg" | "xl";

const SIZES: Record<Size, string> = {
  sm: "h-9 w-9 text-[11px]",
  md: "h-14 w-14 text-base",
  lg: "h-20 w-20 text-xl",
  xl: "h-24 w-24 text-2xl",
};

export function Avatar({
  name,
  photoUrl,
  size = "md",
  className = "",
}: {
  name: string;
  photoUrl?: string;
  size?: Size;
  className?: string;
}) {
  if (photoUrl) {
    return (
      <span
        className={`inline-flex shrink-0 overflow-hidden rounded-full border border-line bg-surface-2 ${SIZES[size]} ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoUrl} alt={name} className="h-full w-full object-cover" loading="lazy" />
      </span>
    );
  }
  return (
    <span
      role="img"
      aria-label={name}
      className={`dd-display inline-flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-bold text-accent ${SIZES[size]} ${className}`}
    >
      {initials(name)}
    </span>
  );
}
