import Link from "next/link";
import { Logo } from "./Logo";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[0.92fr_1.08fr]">
      <aside className="relative hidden overflow-hidden bg-accent p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-24 bottom-10 h-80 w-80 rounded-full bg-white/10" />
        <div className="absolute -right-28 top-24 h-72 w-72 rounded-full bg-white/5" />
        <Link href="/" className="relative flex items-center gap-2.5">
          <Logo className="h-9 w-9" />
          <span className="dd-display text-lg font-extrabold">Dental Desk</span>
        </Link>
        <div className="relative">
          <h2 className="dd-display max-w-sm text-3xl font-extrabold leading-tight">
            Klinika tartibi — har kuni, har qurilmada.
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/75">
            Qabul jadvali, bemor kartasi va 3D tish xaritasi bitta himoyalangan tizimda.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/85">
            {[
              "14 kun bepul, karta talab qilinmaydi",
              "O'zbek, rus va ingliz tillari",
              "Rollar bilan cheklangan kirish",
              "O'rnatish va server sozlash shart emas",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="m5 12 5 5L20 7" />
                  </svg>
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/55">
          © {new Date().getFullYear()} Xoshimov Group · Dental Desk
        </p>
      </aside>

      <main className="flex items-center justify-center bg-bg px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-2 text-accent lg:hidden">
            <Logo className="h-8 w-8" />
            <span className="dd-display text-base font-extrabold text-ink">Dental Desk</span>
          </div>
          <h1 className="dd-display text-3xl font-extrabold text-ink">{title}</h1>
          <p className="mt-2 text-sm text-muted">{subtitle}</p>
          <div className="mt-7">{children}</div>
          {footer ? <div className="mt-6 text-sm text-muted">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}
