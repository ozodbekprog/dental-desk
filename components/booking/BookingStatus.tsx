"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { formatDay } from "./format";

export type BookingStatusData = {
  kind: "clinic" | "doctor";
  code?: string;
  requestId?: string;
  status: string;
  name: string;
  phone: string;
  doctorName: string;
  doctorSpecialty: string;
  date: string;
  time: string;
  duration: number;
  reason: string;
  reasonKind: string;
  clinicName: string;
  clinicSlug?: string;
  clinicPhone: string;
  address: string;
  mapUrl: string;
  confirmedAt: string | null;
};

const STATUS_META: Record<
  string,
  { label: string; badge: string; dot: string; hint: string }
> = {
  requested: {
    label: "Kutilmoqda",
    badge: "border-warn/30 bg-warn/10 text-warn",
    dot: "bg-warn",
    hint: "So'rov qabul qilindi. Shifokor yoki qabulxona tasdiqlashini kuting.",
  },
  contacted: {
    label: "Ko'rib chiqilmoqda",
    badge: "border-accent/30 bg-accent-soft text-accent",
    dot: "bg-accent",
    hint: "Qabulxona so'rovingizni ko'rib chiqmoqda. Tez orada siz bilan bog'lanadi.",
  },
  confirmed: {
    label: "Tasdiqlangan",
    badge: "border-ok/30 bg-ok/10 text-ok",
    dot: "bg-ok",
    hint: "Qabul tasdiqlandi. Ko'rsatilgan manzilga belgilangan vaqtda keling.",
  },
  declined: {
    label: "Rad etilgan",
    badge: "border-danger/30 bg-danger/10 text-danger",
    dot: "bg-danger",
    hint: "Afsuski bu so'rov rad etildi. Boshqa vaqt yoki boshqa shifokorni tanlashingiz mumkin.",
  },
  cancelled: {
    label: "Bekor qilingan",
    badge: "border-line-strong bg-surface-2 text-muted",
    dot: "bg-muted",
    hint: "Bu so'rov bekor qilingan. Yangi vaqtga qayta yozilishingiz mumkin.",
  },
};

const FALLBACK_META = {
  label: "Kutilmoqda",
  badge: "border-warn/30 bg-warn/10 text-warn",
  dot: "bg-warn",
  hint: "So'rov holati yangilanmoqda.",
};

type Props = { code: string; clinic: string; requestId: string };

export function BookingStatus({ code, clinic, requestId }: Props) {
  const [data, setData] = useState<BookingStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<"" | "missing" | "not_found" | "failed">("");
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  const query = code
    ? `code=${encodeURIComponent(code)}`
    : clinic && requestId
      ? `clinic=${encodeURIComponent(clinic)}&request=${encodeURIComponent(requestId)}`
      : "";

  const load = useCallback(async () => {
    if (!query) {
      setError("missing");
      setLoading(false);
      return;
    }
    setRefreshing(true);
    try {
      const res = await fetch(`/api/network/booking/status?${query}`, { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as {
        booking?: BookingStatusData;
        error?: string;
      };
      if (!res.ok || !json.booking) {
        setData(null);
        setError(json.error === "not_found" ? "not_found" : "failed");
      } else {
        setData(json.booking);
        setError("");
        setUpdatedAt(Date.now());
      }
    } catch {
      setError("failed");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 20_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const meta = data ? STATUS_META[data.status] || FALLBACK_META : FALLBACK_META;
  const confirmed = data ? data.status === "confirmed" : false;
  const reference = data ? data.code || data.requestId || "" : "";

  const header = (
    <header className="border-b border-line bg-surface/85 backdrop-blur">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3 px-5 py-4">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-white shadow-sm">
          <Logo className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="dd-display truncate text-lg font-extrabold leading-tight text-ink">
            Dental Desk
          </p>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            So&apos;rov holati
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/bron" className="dd-btn dd-btn-ghost text-sm">
            Katalog
          </Link>
        </div>
      </div>
    </header>
  );

  return (
    <div className="min-h-screen bg-bg text-ink">
      {header}
      <main className="mx-auto max-w-4xl px-5 py-8 sm:py-10">
        <div className="mx-auto max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Dental Desk</p>
          <h1 className="dd-display mt-1 text-3xl font-extrabold leading-tight">So&apos;rov holati</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Bu sahifada so&apos;rovingiz tasdiqlanganini va qabul manzilini ko&apos;rishingiz mumkin.
            Sahifa har 20 soniyada avtomatik yangilanadi.
          </p>
        </div>

        <div className="mx-auto mt-6 max-w-2xl">
          {loading && !data ? (
            <div className="dd-card p-6 text-sm text-muted">Yuklanmoqda…</div>
          ) : error === "missing" ? (
            <div className="dd-card p-6">
              <h2 className="dd-display text-xl font-bold">Havola to&apos;liq emas</h2>
              <p className="mt-2 text-sm text-muted">
                Holatni ko&apos;rish uchun so&apos;rov kodi yoki havola kerak. So&apos;rov yuborilgandan
                keyin berilgan havoladan foydalaning.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Link href="/bron" className="dd-btn dd-btn-primary">
                  Shifokorlar katalogi
                </Link>
                <Link href="/" className="dd-btn dd-btn-ghost">
                  Bosh sahifa
                </Link>
              </div>
            </div>
          ) : error === "not_found" ? (
            <div className="dd-card p-6">
              <h2 className="dd-display text-xl font-bold">So&apos;rov topilmadi</h2>
              <p className="mt-2 text-sm text-muted">
                Kod noto&apos;g&apos;ri yoki so&apos;rov o&apos;chirilgan bo&apos;lishi mumkin. Kodni
                tekshirib qayta urinib ko&apos;ring.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Link href="/bron" className="dd-btn dd-btn-primary">
                  Shifokorlar katalogi
                </Link>
                <Link href="/" className="dd-btn dd-btn-ghost">
                  Bosh sahifa
                </Link>
              </div>
            </div>
          ) : error === "failed" || (!data && !loading) ? (
            <div className="dd-card p-6">
              <h2 className="dd-display text-xl font-bold">Holatni yuklab bo&apos;lmadi</h2>
              <p className="mt-2 text-sm text-muted">
                Internet aloqasini tekshirib, qayta urinib ko&apos;ring.
              </p>
              <button
                type="button"
                onClick={() => void load()}
                className="dd-btn dd-btn-primary mt-4"
              >
                Qayta urinish
              </button>
            </div>
          ) : data ? (
            <div className="dd-card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2/60 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${meta.badge}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </span>
                  {reference ? (
                    <span className="dd-mono rounded-full border border-line-strong bg-surface px-3 py-1 text-[11px] font-semibold text-muted">
                      {reference}
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void load()}
                  disabled={refreshing}
                  className="dd-btn dd-btn-ghost px-3 py-1.5 text-xs disabled:opacity-60"
                >
                  {refreshing ? "Yangilanmoqda…" : "Yangilash"}
                </button>
              </div>

              <div className="p-5 sm:p-7">
                <h2 className="dd-display text-2xl font-extrabold leading-tight">
                  {data.doctorName || "Shifokor"}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {[data.doctorSpecialty, data.clinicName].filter(Boolean).join(" · ") ||
                    "Shifokor qabuli"}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{meta.hint}</p>

                {confirmed ? (
                  <div className="mt-5 rounded-2xl bg-accent p-5 text-white shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-80">
                      Qabul vaqti
                    </p>
                    <p className="dd-mono mt-1 text-6xl font-extrabold leading-none">{data.time}</p>
                    <p className="mt-2 text-sm font-semibold opacity-90">
                      {formatDay(data.date)}
                      {data.duration ? ` · ${data.duration} daqiqa` : ""}
                    </p>
                  </div>
                ) : null}

                <dl className="mt-5 grid gap-2 rounded-2xl border border-line bg-surface-2 p-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Kun</dt>
                    <dd className="font-semibold text-ink">{formatDay(data.date)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Vaqt</dt>
                    <dd className="dd-mono font-semibold text-ink">
                      {data.time}
                      {data.duration ? ` · ${data.duration} daq` : ""}
                    </dd>
                  </div>
                  {data.clinicName ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Joy</dt>
                      <dd className="text-right font-semibold text-ink">{data.clinicName}</dd>
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Bemor</dt>
                    <dd className="text-right font-semibold text-ink">{data.name}</dd>
                  </div>
                  {data.phone ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Telefon</dt>
                      <dd className="dd-mono text-right font-semibold text-ink">{data.phone}</dd>
                    </div>
                  ) : null}
                  {data.reason ? (
                    <div className="flex justify-between gap-4 border-t border-line pt-2">
                      <dt className="shrink-0 text-muted">Sabab</dt>
                      <dd className="text-right text-ink">{data.reason}</dd>
                    </div>
                  ) : data.reasonKind === "audio" ? (
                    <div className="flex justify-between gap-4 border-t border-line pt-2">
                      <dt className="text-muted">Sabab</dt>
                      <dd className="text-right text-ink">Ovozli xabar yuborilgan</dd>
                    </div>
                  ) : null}
                </dl>

                {confirmed ? (
                  <div className="mt-4 rounded-2xl border border-ok/25 bg-ok/5 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ok">
                      Manzil
                    </p>
                    <p className="mt-1 text-sm font-semibold text-ink">
                      {data.address || data.clinicName || "Manzil klinikada aniqlanadi"}
                    </p>
                    {data.mapUrl ? (
                      <a
                        href={data.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="dd-btn dd-btn-ghost mt-3 w-full text-sm"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.9"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" />
                          <circle cx="12" cy="10" r="2.5" />
                        </svg>
                        Xaritada ochish
                      </a>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-4 flex items-start gap-3 rounded-2xl border border-line bg-surface-2 p-4">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-line/60 text-muted">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <rect x="4" y="10" width="16" height="10" rx="2" />
                        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        Manzil tasdiqlangach ko&apos;rinadi
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted">
                        So&apos;rov tasdiqlangandan keyin aniq manzil va xarita havolasi shu yerda
                        paydo bo&apos;ladi. Tasdiqlashsiz kelmang.
                      </p>
                    </div>
                  </div>
                )}

                {data.clinicPhone ? (
                  <a
                    href={`tel:${data.clinicPhone.replace(/\s+/g, "")}`}
                    className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 text-sm transition hover:border-accent"
                  >
                    <span className="text-muted">Qabulxona telefoni</span>
                    <span className="dd-mono font-semibold text-accent">{data.clinicPhone}</span>
                  </a>
                ) : null}

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                  <span>
                    {updatedAt
                      ? `Oxirgi yangilanish: ${new Date(updatedAt).toLocaleTimeString("uz-UZ")}`
                      : "Yangilanmoqda…"}
                  </span>
                  <span>Har 20 soniyada avtomatik yangilanadi</span>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Link href="/bron" className="dd-btn dd-btn-ghost">
              Shifokorlar katalogi
            </Link>
            <Link href="/" className="dd-btn dd-btn-ghost">
              Bosh sahifa
            </Link>
          </div>

          <p className="mt-6 text-center text-xs text-muted">
            Dental Desk · Xoshimov Group
          </p>
        </div>
      </main>
    </div>
  );
}
