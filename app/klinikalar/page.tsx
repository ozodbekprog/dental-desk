import type { Metadata } from "next";
import Link from "next/link";
import { listClinics } from "@/lib/network";
import { NetworkFooter, NetworkHeader } from "@/components/network/NetworkChrome";
import { ClinicCardView } from "@/components/network/ClinicCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Klinikalar — Dental Desk",
  description:
    "Stomatologiya klinikalari katalogi: manzil, telefon, shifokorlar ro'yxati va onlayn qabul. O'zingizga yaqin klinikani tanlang.",
  robots: { index: true, follow: true },
};

export default async function ClinicsPage() {
  const clinics = await listClinics();
  const doctorsTotal = clinics.reduce((sum, clinic) => sum + clinic.doctorsCount, 0);

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <NetworkHeader active="clinics" />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-line bg-surface">
          <div className="dd-noise absolute inset-0 opacity-50" />
          <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-9 sm:px-6 lg:pb-10 lg:pt-12">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
              Dental Desk tarmog&apos;i
            </p>
            <h1 className="dd-display mt-3 text-4xl font-extrabold text-ink sm:text-5xl">
              Klinikalar
            </h1>
            <p className="mt-3 max-w-2xl text-muted">
              Tarmoqdagi stomatologiya klinikalari: manzil, aloqa va shifokorlar ro&apos;yxati.
              Klinikani tanlab, uning shifokorlariga onlayn qabulga yoziling.
            </p>
            <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Klinikalar
                </dt>
                <dd className="dd-display mt-0.5 text-2xl font-extrabold text-ink">
                  {clinics.length}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Shifokorlar
                </dt>
                <dd className="dd-display mt-0.5 text-2xl font-extrabold text-ink">
                  {doctorsTotal}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:py-9">
          {clinics.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clinics.map((clinic) => (
                <ClinicCardView key={clinic.id} clinic={clinic} />
              ))}
            </div>
          ) : (
            <div className="dd-card px-6 py-12 text-center">
              <h2 className="dd-display text-xl font-extrabold text-ink">
                Hozircha klinikalar yo&apos;q
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
                Tarmoqda ochiq klinika profillari hali qo&apos;shilmagan. Shifokorlar
                katalogini ko&apos;rib ko&apos;ring.
              </p>
              <Link href="/shifokorlar" className="dd-btn dd-btn-primary mt-5">
                Shifokorlar katalogi
              </Link>
            </div>
          )}
        </section>
      </main>

      <NetworkFooter />
    </div>
  );
}
