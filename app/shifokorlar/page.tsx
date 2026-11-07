import type { Metadata } from "next";
import Link from "next/link";
import { SPECIALTIES, SPECIALTY_LABELS, listClinics, listDoctors } from "@/lib/network";
import { NetworkFooter, NetworkHeader } from "@/components/network/NetworkChrome";
import { DoctorCardView } from "@/components/network/DoctorCard";
import { DoctorSearchForm } from "@/components/network/SearchForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shifokorlar — Dental Desk",
  description:
    "Stomatologlar katalogi: mutaxassislik, tajriba, narx va qabul joylari. Shifokorni tanlang va onlayn qabulga yoziling.",
  robots: { index: true, follow: true },
};

type SearchParams = {
  q?: string | string[];
  specialty?: string | string[];
  clinic?: string | string[];
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export default async function DoctorsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = first(params.q).trim().slice(0, 60);
  const rawSpecialty = first(params.specialty);
  const specialty = (SPECIALTIES as readonly string[]).includes(rawSpecialty)
    ? rawSpecialty
    : "";
  const clinic = first(params.clinic).trim().slice(0, 64);

  const doctors = await listDoctors({ q, specialty, clinicSlug: clinic });
  const clinicName = clinic
    ? (await listClinics()).find((item) => item.slug === clinic)?.name || ""
    : "";
  const hasFilters = Boolean(q || specialty || clinic);

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <NetworkHeader active="doctors" />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-line bg-surface">
          <div className="dd-noise absolute inset-0 opacity-50" />
          <div className="relative mx-auto max-w-6xl px-4 pb-6 pt-9 sm:px-6 lg:pb-8 lg:pt-12">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
              Dental Desk tarmog&apos;i
            </p>
            <h1 className="dd-display mt-3 text-4xl font-extrabold text-ink sm:text-5xl">
              Shifokorlar
            </h1>
            <p className="mt-3 max-w-2xl text-muted">
              Stomatologni mutaxassisligi, tajribasi va qabul joylari bo&apos;yicha tanlang.
              Profil bilan tanishing yoki to&apos;g&apos;ridan-to&apos;g&apos;ri onlayn qabulga
              yoziling.
            </p>
            <DoctorSearchForm
              q={q}
              specialty={specialty}
              clinic={clinic}
              clinicName={clinicName}
            />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:py-9">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
            <p className="text-sm text-muted">
              <span className="font-semibold text-ink">{doctors.length}</span> shifokor topildi
              {specialty ? (
                <>
                  {" · "}
                  <span className="font-medium text-ink">{SPECIALTY_LABELS[specialty]}</span>
                </>
              ) : null}
            </p>
            {hasFilters ? (
              <Link
                href="/shifokorlar"
                className="text-sm font-semibold text-accent hover:underline"
              >
                Filtrlarni tozalash
              </Link>
            ) : null}
          </div>

          {doctors.length ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {doctors.map((doctor) => (
                <DoctorCardView key={doctor.id} doctor={doctor} />
              ))}
            </div>
          ) : (
            <div className="dd-card mt-5 px-6 py-12 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="m16 16 4.5 4.5" />
                </svg>
              </span>
              <h2 className="dd-display mt-4 text-xl font-extrabold text-ink">
                Shifokor topilmadi
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
                {hasFilters
                  ? "Qidiruv so'zini yoki mutaxassislikni o'zgartirib qayta urinib ko'ring."
                  : "Hozircha tarmoqda ochiq shifokor profillari yo'q. Keyinroq qayta tekshiring."}
              </p>
              {hasFilters ? (
                <Link href="/shifokorlar" className="dd-btn dd-btn-ghost mt-5">
                  Filtrlarni tozalash
                </Link>
              ) : null}
            </div>
          )}
        </section>
      </main>

      <NetworkFooter />
    </div>
  );
}
