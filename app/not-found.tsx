import Link from "next/link";
import { NetworkFooter, NetworkHeader } from "@/components/network/NetworkChrome";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <NetworkHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
        <p className="dd-mono text-sm font-semibold tracking-[0.3em] text-accent">404</p>
        <h1 className="dd-display mt-3 text-3xl font-extrabold text-ink sm:text-4xl">
          Bu sahifa topilmadi
        </h1>
        <p className="mt-3 max-w-md text-sm text-muted">
          Havola o&apos;zgargan yoki sahifa olib tashlangan bo&apos;lishi mumkin. Quyidagi
          bo&apos;limlardan davom eting.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          <Link href="/" className="dd-btn dd-btn-primary">
            Bosh sahifa
          </Link>
          <Link href="/shifokorlar" className="dd-btn dd-btn-ghost">
            Shifokorlar
          </Link>
          <Link href="/klinikalar" className="dd-btn dd-btn-ghost">
            Klinikalar
          </Link>
        </div>
      </main>
      <NetworkFooter />
    </div>
  );
}
