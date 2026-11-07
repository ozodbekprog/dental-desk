import Link from "next/link";
import { SPECIALTIES, SPECIALTY_LABELS } from "@/lib/network";

export function DoctorSearchForm({
  q,
  specialty,
  clinic,
  clinicName,
}: {
  q: string;
  specialty: string;
  clinic: string;
  clinicName?: string;
}) {
  return (
    <form
      action="/shifokorlar"
      method="get"
      className="dd-card mt-7 grid gap-3 p-4 sm:p-5 lg:grid-cols-[1.4fr_1fr_auto] lg:items-end"
    >
      <label className="block">
        <span className="dd-label">Shifokor yoki xizmat</span>
        <input
          className="dd-input"
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Masalan: Aliyev yoki kanal davolash"
          maxLength={60}
        />
      </label>
      <label className="block">
        <span className="dd-label">Mutaxassislik</span>
        <select className="dd-input" name="specialty" defaultValue={specialty}>
          <option value="">Barcha mutaxassisliklar</option>
          {SPECIALTIES.map((item) => (
            <option key={item} value={item}>
              {SPECIALTY_LABELS[item]}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-center gap-2">
        <button type="submit" className="dd-btn dd-btn-primary w-full lg:w-auto">
          Qidirish
        </button>
        <Link href="/shifokorlar" className="dd-btn dd-btn-ghost whitespace-nowrap">
          Tozalash
        </Link>
      </div>
      {clinic ? <input type="hidden" name="clinic" value={clinic} /> : null}
      {clinic && clinicName ? (
        <p className="text-xs text-muted lg:col-span-3">
          Klinika bo&apos;yicha filtr:{" "}
          <span className="font-semibold text-ink">{clinicName}</span>. Boshqa
          klinikalarni ko&apos;rish uchun{" "}
          <Link href="/shifokorlar" className="font-semibold text-accent hover:underline">
            filtrni olib tashlang
          </Link>
          .
        </p>
      ) : null}
    </form>
  );
}
