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
        <Link href="/" className="flex shrink-0 items-center gap-2 text-accent">
          <Logo className="h-8 w-8 sm:h-9 sm:w-9" />
          <span className="dd-display hidden text-lg font-extrabold text-ink sm:inline">
            Dental Desk
          </span>
        </Link>
        <nav aria-label="Asosiy" className="hidden items-center gap-0.5 text-sm md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              aria-current={active === link.key ? "page" : undefined}
              className={
                active === link.key
                  ? "rounded-full bg-accent-soft px-3 py-1.5 font-semibold text-accent"
                  : "rounded-full px-3 py-1.5 text-muted transition hover:text-accent"
              }
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/klinika-uchun"
            className="rounded-full px-3 py-1.5 text-muted transition hover:text-accent"
          >
            Klinika uchun
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <span className="hidden lg:block">
            <Link href="/login" className="dd-btn dd-btn-ghost !px-3.5 !py-2 text-sm">
              Xodim kirishi
            </Link>
          </span>
          <Link
            href="/kabinet"
            className="dd-btn dd-btn-primary !px-3 !py-2 text-sm sm:!px-3.5"
          >
            <span className="hidden sm:inline">Bemor kabineti</span>
            <span className="sm:hidden">Kabinet</span>
          </Link>
          <details className="group relative md:hidden">
            <summary
              aria-label="Menyu"
              className="dd-btn dd-btn-ghost !h-10 !w-10 !p-0 list-none [&::-webkit-details-marker]:hidden"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </summary>
            <div className="dd-card absolute right-0 top-12 z-50 w-60 p-2 shadow-xl">
              <nav aria-label="Mobil menyu" className="grid text-sm">
                {LINKS.map((link) => (
                  <Link
                    key={link.key}
                    href={link.href}
                    className="rounded-lg px-3 py-2.5 font-medium text-ink-soft hover:bg-surface-2 hover:text-accent"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/klinika-uchun"
                  className="rounded-lg px-3 py-2.5 font-medium text-ink-soft hover:bg-surface-2 hover:text-accent"
                >
                  Klinika uchun
                </Link>
                <span className="my-1 h-px bg-line" aria-hidden="true" />
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-2.5 font-medium text-ink-soft hover:bg-surface-2 hover:text-accent"
                >
                  Xodim kirishi
                </Link>
                <Link
                  href="/app"
                  className="rounded-lg px-3 py-2.5 font-medium text-ink-soft hover:bg-surface-2 hover:text-accent"
                >
                  Klinika ilovasi
                </Link>
              </nav>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

export function NetworkFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="flex items-center gap-2 text-accent">
            <Logo className="h-7 w-7" />
            <span className="dd-display text-base font-extrabold text-ink">Dental Desk</span>
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            Stomatologlar tarmog&apos;i: shifokor topish, onlayn qabul va 3D tish tarixi bitta
            joyda.
          </p>
          <a
            href="https://t.me/oz4vka"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex text-sm font-semibold text-accent hover:underline"
          >
            Telegram: @oz4vka
          </a>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-ink">Bemorlarga</p>
          <Link href="/shifokorlar" className="block text-muted hover:text-accent">
            Shifokorlar
          </Link>
          <Link href="/klinikalar" className="block text-muted hover:text-accent">
            Klinikalar
          </Link>
          <Link href="/kabinet" className="block text-muted hover:text-accent">
            Bemor kabineti
          </Link>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-ink">Shifokor va klinikalar</p>
          <Link href="/klinika-uchun" className="block text-muted hover:text-accent">
            Klinika uchun
          </Link>
          <Link href="/doktor" className="block text-muted hover:text-accent">
            Shifokor kirishi
          </Link>
          <Link href="/login" className="block text-muted hover:text-accent">
            Xodim kirishi
          </Link>
          <Link href="/signup" className="block text-muted hover:text-accent">
            Ro&apos;yxatdan o&apos;tish
          </Link>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-ink">Huquqiy</p>
          <Link href="/legal/privacy" className="block text-muted hover:text-accent">
            Maxfiylik siyosati
          </Link>
          <Link href="/legal/terms" className="block text-muted hover:text-accent">
            Foydalanish shartlari
          </Link>
          <span className="block text-muted">Toshkent, O&apos;zbekiston</span>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-2 px-4 py-4 text-xs text-muted sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} Xoshimov Group. Barcha huquqlar himoyalangan.</p>
          <p>Dental Desk — Xoshimov Group mahsuloti.</p>
        </div>
      </div>
    </footer>
  );
}
