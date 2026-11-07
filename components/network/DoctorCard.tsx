import Link from "next/link";
import type { DoctorCard } from "@/lib/network";
import { Avatar } from "./Avatar";
import { BuildingIcon, PinIcon, StarIcon } from "./icons";
import { experienceText, formatPrice, reviewCountText } from "./format";

export function DoctorCardView({
  doctor,
  clinicId,
}: {
  doctor: DoctorCard;
  clinicId?: string;
}) {
  const profileHref = `/shifokorlar/${encodeURIComponent(doctor.id)}`;
  const bookingHref = `/bron/${encodeURIComponent(doctor.id)}${
    clinicId ? `?clinic=${encodeURIComponent(clinicId)}` : ""
  }`;

  return (
    <article className="dd-card flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-accent/40">
      <div className="flex items-start gap-3.5">
        <Avatar name={doctor.name} photoUrl={doctor.photoUrl} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="dd-display truncate text-lg font-bold leading-tight text-ink">
            <Link href={profileHref} className="transition hover:text-accent">
              {doctor.name}
            </Link>
          </h3>
          <p className="mt-1 text-sm font-semibold text-accent">{doctor.specialtyLabel}</p>
          <p className="mt-0.5 text-xs text-muted">{experienceText(doctor.experience)}</p>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 border-t border-line pt-3.5 text-sm">
        {doctor.rating > 0 ? (
          <span className="inline-flex items-center gap-1.5">
            <StarIcon className="h-4 w-4 text-gold" />
            <span className="font-semibold text-ink">{doctor.rating.toFixed(1)}</span>
            <span className="text-muted">· {reviewCountText(doctor.ratingCount)}</span>
          </span>
        ) : (
          <span className="rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-muted">
            Yangi
          </span>
        )}
        <span className="h-1 w-1 rounded-full bg-line-strong" aria-hidden="true" />
        <span className="font-semibold text-ink">{formatPrice(doctor.priceFrom)}</span>
      </div>

      <div className="mt-3 grid gap-2">
        <div className="flex items-start gap-2">
          <PinIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">
              {doctor.place || "Qabul manzili ko'rsatilmagan"}
            </p>
            {doctor.address && doctor.address !== doctor.place ? (
              <p className="mt-0.5 truncate text-xs text-muted">{doctor.address}</p>
            ) : null}
          </div>
        </div>
        {doctor.clinics.length ? (
          <div className="flex items-start gap-2">
            <BuildingIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
            <p className="min-w-0 text-xs leading-relaxed text-muted">
              {doctor.clinics.map((clinic, index) => (
                <span key={clinic.id}>
                  {index > 0 ? ", " : ""}
                  <Link
                    href={`/klinikalar/${encodeURIComponent(clinic.slug)}`}
                    className="hover:text-accent"
                  >
                    {clinic.name}
                  </Link>
                </span>
              ))}
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <BuildingIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
            <p className="text-xs text-muted">Mustaqil qabul · tarmoq shifokori</p>
          </div>
        )}
      </div>

      <div className="mt-auto flex items-center justify-end gap-2 border-t border-line pt-4">
        <Link href={profileHref} className="dd-btn dd-btn-ghost !px-3 !py-2 text-sm">
          Profil
        </Link>
        <Link href={bookingHref} className="dd-btn dd-btn-primary !px-3 !py-2 text-sm">
          Qabulga yozilish
        </Link>
      </div>
    </article>
  );
}
