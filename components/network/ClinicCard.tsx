import Link from "next/link";
import type { ClinicCard } from "@/lib/network";
import { Avatar } from "./Avatar";
import { MapIcon, PhoneIcon, PinIcon, StarIcon, UsersIcon } from "./icons";
import { telHref } from "./format";

export function ClinicCardView({ clinic }: { clinic: ClinicCard }) {
  const detailHref = `/klinikalar/${encodeURIComponent(clinic.slug)}`;
  const doctorsHref = `/shifokorlar?clinic=${encodeURIComponent(clinic.slug)}`;

  return (
    <article className="dd-card flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-accent/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="dd-display truncate text-lg font-bold leading-tight text-ink">
            <Link href={detailHref} className="transition hover:text-accent">
              {clinic.name}
            </Link>
          </h3>
          <p className="mt-1.5 flex items-start gap-1.5 text-sm text-muted">
            <PinIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0">{clinic.address || "Manzil ko'rsatilmagan"}</span>
          </p>
        </div>
        {clinic.rating > 0 ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent">
            <StarIcon className="h-3.5 w-3.5 text-gold" />
            {clinic.rating.toFixed(1)}
          </span>
        ) : (
          <span className="shrink-0 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">
            Yangi
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted">
        <span className="inline-flex items-center gap-1.5">
          <UsersIcon className="h-4 w-4" />
          {clinic.doctorsCount} shifokor
        </span>
        {clinic.phone ? (
          <a
            href={telHref(clinic.phone)}
            className="inline-flex items-center gap-1.5 transition hover:text-accent"
          >
            <PhoneIcon className="h-4 w-4" />
            {clinic.phone}
          </a>
        ) : null}
        {clinic.mapUrl ? (
          <a
            href={clinic.mapUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 transition hover:text-accent"
          >
            <MapIcon className="h-4 w-4" />
            Xaritada
          </a>
        ) : null}
      </div>

      <div className="mt-4 flex items-center gap-2.5">
        <div className="flex -space-x-2">
          {clinic.doctors.slice(0, 4).map((doctor) => (
            <Avatar
              key={doctor.id}
              name={doctor.name}
              photoUrl={doctor.photoUrl}
              size="sm"
              className="ring-2 ring-surface"
            />
          ))}
        </div>
        {clinic.doctorsCount > 4 ? (
          <span className="text-xs font-semibold text-muted">+{clinic.doctorsCount - 4}</span>
        ) : null}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-4">
        <Link href={doctorsHref} className="dd-btn dd-btn-ghost !px-3 !py-2 text-sm">
          Shifokorlari
        </Link>
        <Link href={detailHref} className="dd-btn dd-btn-primary !px-3 !py-2 text-sm">
          Klinika sahifasi
        </Link>
      </div>
    </article>
  );
}
