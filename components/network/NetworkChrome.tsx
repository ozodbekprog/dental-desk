import Link from "next/link";
import { Logo } from "@/components/Logo";

type Active = "doctors" | "clinics";

const LINKS: { key: Active; href: string; label: string }[] = [
  { key: "doctors", href: "/shifokorlar", label: "Shifokorlar" },
  { key: "clinics", href: "/klinikalar", label: "Klinikalar" },
];

export function NetworkHeader({ active }: { active?: Active }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-accent">
          <Logo className="h-8 w-8 sm:h-9 sm:w-9" />
          <span className="dd-display hidden text-lg font-extrabold text-ink sm:inline">
            Dental Desk
          </span>
        </Link>
        <nav aria-label="Katalog" className="flex items-center gap-0.5 text-sm sm:gap-1">
          {LINKS.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              aria-current={active === link.key ? "page" : undefined}
              className={
                active === link.key
                  ? "rounded-full bg-accent-soft px-2.5 py-1.5 font-semibold text-accent sm:px-3"
                  : "rounded-full px-2.5 py-1.5 text-muted transition hover:text-accent sm:px-3"
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="dd-btn dd-btn-ghost hidden !px-3.5 !py-2 text-sm sm:inline-flex"
          >
            Kirish
          </Link>
          <Link href="/signup" className="dd-btn dd-btn-primary !px-3 !py-2 text-sm sm:!px-3.5">
            Klinika uchun
          </Link>
        </div>
      </div>
    </header>
  );
}

export function NetworkFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-surface py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 sm:px-6 md:flex-row md:items-center md:justify-between">
        <Link href="/" className="flex items-center gap-2 text-accent">
          <Logo className="h-7 w-7" />
          <span className="dd-display text-base font-extrabold text-ink">Dental Desk</span>
        </Link>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
          <Link href="/shifokorlar" className="hover:text-accent">
            Shifokorlar
          </Link>
          <Link href="/klinikalar" className="hover:text-accent">
            Klinikalar
          </Link>
          <Link href="/legal/privacy" className="hover:text-accent">
            Maxfiylik siyosati
          </Link>
          <Link href="/" className="hover:text-accent">
            Bosh sahifa
          </Link>
        </nav>
        <p className="text-xs text-muted">
          © {new Date().getFullYear()} Xoshimov Group · Dental Desk
        </p>
      </div>
    </footer>
  );
}
