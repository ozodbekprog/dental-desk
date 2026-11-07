import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getDoctor } from "@/lib/network";
import { Avatar } from "@/components/network/Avatar";
import { NetworkFooter, NetworkHeader } from "@/components/network/NetworkChrome";
import { Stars } from "@/components/network/Stars";
import {
  ArrowLeftIcon,
  BuildingIcon,
  MapIcon,
  PhoneIcon,
  PinIcon,
  StarIcon,
} from "@/components/network/icons";
import {
  experienceText,
  formatPrice,
  formatReviewDate,
  reviewCountText,
  telHref,
} from "@/components/network/format";

export const dynamic = "force-dynamic";

const loadDoctor = cache(getDoctor);

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const doctor = await loadDoctor(id);
  if (!doctor) {
    return { title: "Shifokor topilmadi — Dental Desk", robots: { index: false, follow: false } };
  }
  const place = doctor.place ? `${doctor.place}, ` : "";
  return {
    title: `${doctor.name} — ${doctor.specialtyLabel} | Dental Desk`,
    description: `${doctor.name} — ${doctor.specialtyLabel}. ${experienceText(
      doctor.experience
    )}. ${place}qabul joylari va onlayn yozilish.`,
    robots: { index: true, follow: true },
  };
}

export default async function DoctorPage({ params }: Props) {
  const { id } = await params;
  const doctor = await loadDoctor(id);
  if (!doctor) notFound();

  const contractBadge =
    doctor.contract === "platform"
      ? "Tarmoq shifokori"
      : doctor.clinics[0]?.name || "Mustaqil shifokor";
  const bookingHref = `/bron/${encodeURIComponent(doctor.id)}`;

  const places = doctor.clinics.length
    ? doctor.clinics.map((clinic) => ({
        id: clinic.id,
        name: clinic.name,
        address: clinic.address,
        phone: clinic.phone,
        mapUrl: clinic.mapUrl,
        slug: clinic.slug,
      }))
    : [
        {
          id: doctor.id,
          name: "Mustaqil qabul",
          address: doctor.address,
          phone: doctor.phone,
          mapUrl: doctor.mapUrl,
          slug: "",
        },
      ];

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <NetworkHeader active="doctors" />

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 pb-2 pt-6 sm:px-6 lg:pt-8">
          <Link
            href="/shifokorlar"
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-accent"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Barcha shifokorlar
          </Link>
        </div>

        <div className="mx-auto grid max-w-6xl gap-4 px-4 pb-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_336px] lg:items-start lg:pb-12">
          <div className="min-w-0">
            <section className="dd-card overflow-hidden">
              <div className="border-b border-line bg-surface-2/60 p-5 sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  <Avatar name={doctor.name} photoUrl={doctor.photoUrl} size="xl" />
                  <div className="min-w-0 flex-1">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                        doctor.contract === "platform"
                          ? "bg-accent-soft text-accent"
                          : "border border-line bg-surface text-ink-soft"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                      {contractBadge}
                    </span>
                    <h1 className="dd-display mt-3 text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
                      {doctor.name}
                    </h1>
                    <p className="mt-1.5 text-base font-semibold text-accent">
                      {doctor.specialtyLabel}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                      <span className="text-muted">{experienceText(doctor.experience)}</span>
                      <span className="h-1 w-1 rounded-full bg-line-strong" aria-hidden="true" />
                      {doctor.rating > 0 ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Stars value={doctor.rating} />
                          <span className="font-semibold text-ink">
                            {doctor.rating.toFixed(1)}
                          </span>
                          <span className="text-muted">· {reviewCountText(doctor.ratingCount)}</span>
                        </span>
                      ) : (
                        <span className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-semibold text-muted">
                          Yangi shifokor
                        </span>
                      )}
                      <span className="h-1 w-1 rounded-full bg-line-strong" aria-hidden="true" />
                      <span className="font-semibold text-ink">
                        {formatPrice(doctor.priceFrom)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 p-5 sm:grid-cols-3 sm:p-6">
                <div className="rounded-xl border border-line bg-surface-2/60 p-3">
                  <p className="text-xs font-semibold text-muted">Qabul joylari</p>
                  <p className="dd-display mt-1 text-lg font-extrabold text-ink">
                    {doctor.clinics.length || 1}
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-surface-2/60 p-3">
                  <p className="text-xs font-semibold text-muted">Tajriba</p>
                  <p className="dd-display mt-1 text-lg font-extrabold text-ink">
                    {doctor.experience > 0 ? `${doctor.experience} yil` : "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-surface-2/60 p-3">
                  <p className="text-xs font-semibold text-muted">Sharhlar</p>
                  <p className="dd-display mt-1 text-lg font-extrabold text-ink">
                    {doctor.ratingCount}
                  </p>
                </div>
              </div>
            </section>

            <section className="dd-card mt-4 p-5 sm:p-6">
              <h2 className="dd-display text-xl font-extrabold text-ink">Qabul joylari</h2>
              <p className="mt-1 text-sm text-muted">
                {doctor.clinics.length
                  ? "Shifokor quyidagi klinikalarda qabul qiladi."
                  : "Shifokor mustaqil tarzda, o'z manzilida qabul qiladi."}
              </p>
              <div className="mt-4 grid gap-3">
                {places.map((place) => (
                  <div
                    key={place.id}
                    className="rounded-2xl border border-line bg-surface-2/50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="dd-display flex items-start gap-2 font-bold text-ink">
                          <BuildingIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                          <span>{place.name}</span>
                        </p>
                        <p className="mt-2 flex items-start gap-2 text-sm text-muted">
                          <PinIcon className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{place.address || "Manzil ko'rsatilmagan"}</span>
                        </p>
                        {place.phone ? (
                          <a
                            href={telHref(place.phone)}
                            className="mt-1.5 inline-flex items-center gap-2 text-sm font-medium text-ink-soft transition hover:text-accent"
                          >
                            <PhoneIcon className="h-4 w-4 text-muted" />
                            {place.phone}
                          </a>
                        ) : null}
                      </div>
                      {place.mapUrl ? (
                        <a
                          href={place.mapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="dd-btn dd-btn-ghost !px-3 !py-2 text-sm"
                        >
                          <MapIcon className="h-4 w-4" />
                          Xaritada
                        </a>
                      ) : null}
                    </div>
                    {place.slug ? (
                      <Link
                        href={`/klinikalar/${encodeURIComponent(place.slug)}`}
                        className="mt-3 inline-block text-sm font-semibold text-accent hover:underline"
                      >
                        Klinika sahifasi
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>

            <section className="dd-card mt-4 p-5 sm:p-6">
              <h2 className="dd-display text-xl font-extrabold text-ink">Tajriba</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                {doctor.bio || "Shifokor o'zi haqida ma'lumot kiritmagan."}
              </p>
              <p className="mt-4 rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">
                Mutaxassislik:{" "}
                <span className="font-semibold text-ink">{doctor.specialtyLabel}</span>
                {doctor.experience > 0 ? (
                  <>
                    {" · "}
                    Amaliy tajriba:{" "}
                    <span className="font-semibold text-ink">{doctor.experience} yil</span>
                  </>
                ) : null}
              </p>
            </section>

            <section className="dd-card mt-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="dd-display text-xl font-extrabold text-ink">Sharhlar</h2>
                {doctor.rating > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-sm">
                    <StarIcon className="h-4 w-4 text-gold" />
                    <span className="font-semibold text-ink">{doctor.rating.toFixed(1)}</span>
                    <span className="text-muted">· {reviewCountText(doctor.ratingCount)}</span>
                  </span>
                ) : null}
              </div>
              {doctor.reviews.length ? (
                <div className="mt-4 grid gap-3">
                  {doctor.reviews.map((review) => (
                    <article
                      key={review.id}
                      className="rounded-2xl border border-line bg-surface-2/50 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Stars value={review.rating} />
                        <time dateTime={review.createdAt} className="text-xs text-muted">
                          {formatReviewDate(review.createdAt)}
                        </time>
                      </div>
                      {review.comment ? (
                        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                          {review.comment}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm italic text-muted">Izoh qoldirilmagan.</p>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">
                  Hozircha sharhlar yo&apos;q. Sharh qabuldan so&apos;ng qoldiriladi.
                </p>
              )}
            </section>
          </div>

          <aside className="lg:sticky lg:top-20 lg:self-start">
            <div className="dd-card p-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                Qabul narxi
              </p>
              <p className="dd-display mt-1 text-2xl font-extrabold text-ink">
                {formatPrice(doctor.priceFrom)}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Yakuniy narx ko&apos;rik va reja asosida belgilanadi.
              </p>
              <Link href={bookingHref} className="dd-btn dd-btn-primary mt-4 w-full">
                Qabulga yozilish
              </Link>
              {doctor.phone ? (
                <a href={telHref(doctor.phone)} className="dd-btn dd-btn-ghost mt-2 w-full">
                  <PhoneIcon className="h-4 w-4" />
                  {doctor.phone}
                </a>
              ) : null}
              <Link
                href="/shifokorlar"
                className="mt-4 flex items-center justify-center gap-1.5 text-sm font-semibold text-muted transition hover:text-accent"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                Orqaga
              </Link>
            </div>
            <div className="dd-card mt-3 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                {doctor.contract === "platform" ? "Tarmoq shifokori" : "Qabul joyi"}
              </p>
              <p className="mt-2 text-sm font-semibold text-ink">
                {doctor.clinics.length
                  ? doctor.clinics.map((clinic) => clinic.name).join(", ")
                  : "Mustaqil qabul"}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {doctor.address || "Manzil ko'rsatilmagan"}
              </p>
              {doctor.mapUrl ? (
                <a
                  href={doctor.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
                >
                  <MapIcon className="h-4 w-4" />
                  Xaritada ko&apos;rish
                </a>
              ) : null}
            </div>
          </aside>
        </div>
      </main>

      <NetworkFooter />
    </div>
  );
}
