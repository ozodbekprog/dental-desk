import Link from "next/link";
import { Logo } from "@/components/Logo";

export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 text-accent">
            <Logo className="h-8 w-8" />
            <span className="dd-display text-base font-extrabold text-ink">Dental Desk</span>
          </Link>
          <Link href="/" className="text-sm text-muted hover:text-accent">
            ← Bosh sahifa
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="dd-display text-3xl font-extrabold text-ink">{title}</h1>
        <p className="mt-2 text-xs text-muted">Oxirgi yangilangan: {updated}</p>
        <div className="dd-card mt-6 space-y-5 p-6 text-sm leading-relaxed text-ink-soft sm:p-8">
          {children}
        </div>
        <p className="mt-8 text-center text-xs text-muted">
          Savollar:{" "}
          <a href="https://t.me/oz4vka" className="text-accent underline">
            Telegram @oz4vka
          </a>
        </p>
      </main>
    </div>
  );
}
