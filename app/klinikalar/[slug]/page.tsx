import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { listClinics, listDoctors } from "@/lib/network";
import { NetworkFooter, NetworkHeader } from "@/components/network/NetworkChrome";
import { DoctorCardView } from "@/components/network/DoctorCard";
import {
  ArrowLeftIcon,
  MapIcon,
  PhoneIcon,
  PinIcon,
  StarIcon,
  UsersIcon,
} from "@/components/network/icons";
import { telHref } from "@/components/network/format";

export const dynamic = "force-dynamic";

const loadClinics = cache(listClinics);

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const clinic = (await loadClinics()).find((item) => item.slug === slug);
  if (!clinic) {
    return { title: "Klinika topilmadi — Dental Desk", robots: { index: false, follow: false } };
  }
  return {
    title: `${clinic.name} — Klinika | Dental Desk`,
    description: `${clinic.name}${
      clinic.address ? `, ${clinic.address}` : ""
    }. ${clinic.doctorsCount} shifokor, telefon, xarita va onlayn qabul.`,
    robots: { index: true, follow: true },
  };
}

export default async function ClinicPage({ params }: Props) {
  const { slug } = await params;
  const clinic = (await loadClinics()).find((item) => item.slug === slug);
  if (!clinic) notFound();

  const doctors = await listDoctors({ clinicSlug: clinic.slug });

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <NetworkHeader active="clinics" />

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 pb-2 pt-6 sm:px-6 lg:pt-8">
          <Link
            href="/klinikalar"
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-accent"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Barcha klinikalar
          </Link>
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 lg:pb-12">
          <section className="dd-card overflow-hidden">
            <div className="border-b border-line bg-surface-2/60 p-5 sm:p-7">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                Klinika
              </span>
              <h1 className="dd-display mt-3 text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
                {clinic.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                {clinic.rating > 0 ? (
                  <span className="inline-flex items-center gap-1.5">
                    <StarIcon className="h-4 w-4 text-gold" />
                    <span className="font-semibold text-ink">{clinic.rating.toFixed(1)}</span>
                  </span>
                ) : (
                  <span className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-semibold text-muted">
                    Yangi klinika
                  </span>
                )}
                <span className="h-1 w-1 rounded-full bg-line-strong" aria-hidden="true" />
                <span className="inline-flex items-center gap-1.5 text-muted">
                  <UsersIcon className="h-4 w-4" />
                  {clinic.doctorsCount} shifokor
                </span>
              </div>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Manzil
                </p>
                <p className="mt-1 flex items-start gap-2 text-sm text-ink-soft">
                  <PinIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                  <span>{clinic.address || "Manzil ko'rsatilmagan"}</span>
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Aloqa
                </p>
                {clinic.phone ? (
                  <a
                    href={telHref(clinic.phone)}
                    className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-ink transition hover:text-accent"
                  >
                    <PhoneIcon className="h-4 w-4 text-muted" />
                    {clinic.phone}
                  </a>
                ) : (
                  <p className="mt-1 text-sm text-muted">Telefon ko&apos;rsatilmagan</p>
                )}
              </div>
              {clinic.mapUrl ? (
                <div className="sm:col-span-3">
                  <a
                    href={clinic.mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="dd-btn dd-btn-ghost !px-3.5 !py-2 text-sm"
                  >
                    <MapIcon className="h-4 w-4" />
                    Xaritada ko&apos;rish
                  </a>
                </div>
              ) : null}
            </div>
          </section>

          <div className="mt-7 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="dd-display text-2xl font-extrabold text-ink">Shifokorlar</h2>
            {doctors.length ? (
              <Link
                href={`/shifokorlar?clinic=${encodeURIComponent(clinic.slug)}`}
                className="text-sm font-semibold text-accent hover:underline"
              >
                Filtrlangan ro&apos;yxatda ko&apos;rish
              </Link>
            ) : null}
          </div>

          {doctors.length ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {doctors.map((doctor) => (
                <DoctorCardView key={doctor.id} doctor={doctor} clinicId={clinic.id} />
              ))}
            </div>
          ) : (
            <div className="dd-card mt-4 px-6 py-10 text-center">
              <p className="text-sm leading-relaxed text-muted">
                Bu klinikada hozircha ochiq shifokor profillari yo&apos;q. Klinika bilan telefon
                orqali bog&apos;lanib, qabul vaqtini aniqlashtiring.
              </p>
              <Link href="/shifokorlar" className="dd-btn dd-btn-ghost mt-4">
                Boshqa shifokorlarni ko&apos;rish
              </Link>
            </div>
          )}
        </div>
      </main>

      <NetworkFooter />
    </div>
  );
}
