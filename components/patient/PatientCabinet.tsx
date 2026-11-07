"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Stars } from "@/components/network/Stars";
import { StarIcon } from "@/components/network/icons";
import { ToothChart3D, type ToothComplaint } from "./ToothChart3D";
import {
  ALERT_LABELS,
  formatDate,
  formatPhone,
  formatShortDate,
  money,
  procLabel,
  statusMeta,
  surfaceLabels,
  todayYmd,
} from "./toothData";
import type {
  PatientBooking,
  PatientHistory,
  PatientVisit,
  ToothEntry,
} from "./types";

type Tab = "overview" | "chart" | "history" | "bookings";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Umumiy" },
  { id: "chart", label: "Tish xaritasi" },
  { id: "history", label: "Tarix" },
  { id: "bookings", label: "Bronlar" },
];

const TONES: Record<string, string> = {
  ok: "border-ok/25 bg-ok/10 text-ok",
  warn: "border-warn/25 bg-warn/10 text-warn",
  accent: "border-accent/25 bg-accent-soft text-accent",
  danger: "border-danger/25 bg-danger/10 text-danger",
  muted: "border-line bg-surface-2 text-muted",
};

function visitPassed(date: string, time: string): boolean {
  const at = new Date(`${date}T${time || "00:00"}:00+05:00`).getTime();
  return Number.isFinite(at) && at <= Date.now();
}

function reviewErrorText(code: string, status: number): string {
  if (status === 401) return "Sessiya tugagan. Qaytadan kiring.";
  switch (code) {
    case "already_reviewed":
      return "Bu qabul allaqachon baholangan.";
    case "not_visited":
      return "Sharhni qabul vaqti o'tgandan keyin qoldirish mumkin.";
    case "bad_rating":
      return "1 dan 5 gacha yulduz tanlang.";
    case "forbidden":
      return "Bu bron sizga tegishli emas.";
    default:
      return "Sharh yuborilmadi. Qayta urinib ko'ring.";
  }
}

function Badge({ status }: { status: string }) {
  const meta = statusMeta(status);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
        TONES[meta.tone] || TONES.muted
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {meta.label}
    </span>
  );
}

function MapLink({ url }: { url: string }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
    >
      Xaritada ochish
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 17 17 7M9 7h8v8" />
      </svg>
    </a>
  );
}

type VisitRow = PatientVisit & { clinicName: string };

type NextRow = {
  date: string;
  time: string;
  doctorName: string;
  clinicName: string;
  status: string;
  address?: string;
  mapUrl?: string;
  code?: string;
  kind: "doctor" | "clinic" | "appointment";
};

export function PatientCabinet({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<PatientHistory | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const [reviewFor, setReviewFor] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewSending, setReviewSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch("/api/patient/history", { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) {
          router.refresh();
          return null;
        }
        const json = (await res.json().catch(() => null)) as PatientHistory | null;
        if (!res.ok || !json) throw new Error("history");
        return json;
      })
      .then((json) => {
        if (cancelled || !json) return;
        setData(json);
      })
      .catch(() => {
        if (!cancelled) setError("Ma'lumotlarni yuklab bo'lmadi.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router, tick]);

  const name = data?.patient.name || initialName || "Bemor";
  const phone = data?.patient.phone || "";

  const initials = useMemo(
    () =>
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("") || "B",
    [name]
  );

  const mergedTeeth = useMemo(() => {
    const out: Record<string, ToothEntry[]> = {};
    for (const block of data?.clinics || []) {
      for (const [fdi, list] of Object.entries(block.teeth)) {
        out[fdi] = [...(out[fdi] || []), ...list].sort((a, b) =>
          b.date.localeCompare(a.date)
        );
      }
    }
    return out;
  }, [data]);

  const complaintMap = useMemo(() => {
    const out: Record<string, ToothComplaint[]> = {};
    for (const block of data?.clinics || []) {
      for (const complaint of block.complaints) {
        if (complaint.tooth === null) continue;
        const fdi = String(complaint.tooth);
        (out[fdi] = out[fdi] || []).push({
          text: complaint.text,
          at: complaint.at,
          authorName: complaint.authorName,
        });
      }
    }
    return out;
  }, [data]);

  const visits = useMemo<VisitRow[]>(() => {
    const rows: VisitRow[] = [];
    for (const block of data?.clinics || []) {
      for (const visit of block.visits) {
        rows.push({ ...visit, clinicName: block.clinic.name });
      }
    }
    return rows.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  }, [data]);

  const complaintsList = useMemo(() => {
    const rows: { id: string; tooth: number | null; text: string; at: string; clinic: string }[] = [];
    for (const block of data?.clinics || []) {
      for (const complaint of block.complaints) {
        rows.push({
          id: complaint.id,
          tooth: complaint.tooth,
          text: complaint.text,
          at: complaint.at,
          clinic: block.clinic.name,
        });
      }
    }
    return rows.sort((a, b) => b.at.localeCompare(a.at));
  }, [data]);

  const alerts = useMemo(() => {
    const out = new Set<string>();
    for (const block of data?.clinics || []) {
      for (const id of block.me.alertIds) out.add(ALERT_LABELS[id] || id);
      for (const text of block.me.alerts.split(/[,;\n]+/)) {
        const trimmed = text.trim();
        if (trimmed && trimmed !== "—" && trimmed !== "-") out.add(trimmed);
      }
    }
    return [...out];
  }, [data]);

  const dob = data?.clinics.find((block) => block.me.dob)?.me.dob || "";

  const bookingsView = useMemo(() => {
    const rows = [...(data?.bookings || [])];
    return rows.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  }, [data]);

  const next = useMemo<NextRow | null>(() => {
    if (!data) return null;
    const today = todayYmd();
    const rows: NextRow[] = [];

    for (const booking of data.bookings) {
      if (!["requested", "contacted", "confirmed"].includes(booking.status)) continue;
      if (!booking.date || booking.date < today) continue;
      rows.push({
        date: booking.date,
        time: booking.time,
        doctorName: booking.doctorName,
        clinicName: booking.clinicName,
        status: booking.status,
        address: booking.address,
        mapUrl: booking.mapUrl,
        code: booking.code,
        kind: booking.kind,
      });
    }

    for (const block of data.clinics) {
      for (const appointment of block.appointments) {
        if (!appointment.date || appointment.date < today) continue;
        if (["cancelled", "no-show", "declined"].includes(appointment.status)) continue;
        rows.push({
          date: appointment.date,
          time: appointment.time,
          doctorName: appointment.doctorName,
          clinicName: block.clinic.name,
          status: appointment.status,
          address: block.clinic.address,
          mapUrl: block.clinic.mapUrl,
          kind: "appointment",
        });
      }
    }

    rows.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    return rows[0] || null;
  }, [data]);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/patient/logout", { method: "POST" });
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  async function submitReview() {
    if (!reviewFor || reviewSending) return;
    setReviewSending(true);
    setReviewError("");
    try {
      const res = await fetch("/api/patient/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: reviewFor,
          rating: reviewRating,
          comment: reviewComment,
        }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setReviewError(reviewErrorText(json?.error || "", res.status));
        return;
      }
      setReviewFor("");
      setReviewComment("");
      setReviewRating(5);
      setTick((value) => value + 1);
    } catch {
      setReviewError("Sharh yuborilmadi. Internetni tekshirib, qayta urinib ko'ring.");
    } finally {
      setReviewSending(false);
    }
  }

  const header = (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-white">
          <Logo className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="dd-display truncate text-base font-extrabold leading-tight text-ink">
            Bemor kabineti
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            Dental Desk
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="text-right">
            <p className="max-w-[150px] truncate text-sm font-semibold text-ink sm:max-w-none">
              {name}
            </p>
            {phone ? <p className="dd-mono text-[11px] text-muted">{formatPhone(phone)}</p> : null}
          </div>
          <span className="dd-display grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-sm font-bold text-accent">
            {initials}
          </span>
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition hover:border-danger hover:text-danger disabled:opacity-50"
            aria-label="Chiqish"
            title="Chiqish"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-bg">
        {header}
        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <div className="grid gap-3">
            <div className="h-28 animate-pulse rounded-2xl bg-surface-2" />
            <div className="h-44 animate-pulse rounded-2xl bg-surface-2" />
            <div className="h-64 animate-pulse rounded-2xl bg-surface-2" />
          </div>
        </main>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-bg">
        {header}
        <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <div className="dd-card p-6 text-center">
            <p className="dd-display text-lg font-bold text-ink">{error}</p>
            <p className="mt-1 text-sm text-muted">Internet aloqasini tekshirib, qayta urinib ko&apos;ring.</p>
            <button
              type="button"
              onClick={() => setTick((value) => value + 1)}
              className="dd-btn dd-btn-primary mt-4"
            >
              Qayta urinish
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-bg text-ink">
      {header}

      <div className="border-b border-line bg-surface">
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-3 py-2 sm:px-6" aria-label="Kabinet bo'limlari">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-current={tab === item.id ? "page" : undefined}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                tab === item.id
                  ? "bg-accent text-white"
                  : "text-muted hover:bg-surface-2 hover:text-ink"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-7">
        {tab === "overview" ? (
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid gap-4">
              <section className="dd-card overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-2 px-4 py-3">
                  <h2 className="dd-display text-base font-bold text-ink">Keyingi qabul</h2>
                  {next ? <Badge status={next.status} /> : null}
                </div>
                {next ? (
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
                      <p className="dd-display text-2xl font-extrabold leading-tight text-ink sm:text-3xl">
                        {formatDate(next.date)}
                      </p>
                      <p className="dd-mono text-2xl font-bold text-accent sm:text-3xl">{next.time}</p>
                    </div>
                    <div className="mt-3 grid gap-1.5 text-sm">
                      {next.doctorName ? (
                        <p className="font-semibold text-ink">{next.doctorName}</p>
                      ) : null}
                      {next.clinicName ? <p className="text-muted">{next.clinicName}</p> : null}
                    </div>

                    {next.status === "confirmed" || next.kind === "appointment" ? (
                      next.address || next.mapUrl ? (
                        <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3 text-sm">
                          {next.address ? <p className="text-ink-soft">{next.address}</p> : null}
                          <div className="mt-1">
                            <MapLink url={next.mapUrl || ""} />
                          </div>
                        </div>
                      ) : null
                    ) : (
                      <p className="mt-3 rounded-xl bg-warn/10 px-3 py-2 text-xs font-medium text-warn">
                        Vaqt hali tasdiqlanmagan. Klinika qabulxonasi bog&apos;lanadi.
                      </p>
                    )}

                    {next.code ? (
                      <p className="mt-3 text-xs text-muted">
                        Bron kodi: <span className="dd-mono font-semibold text-ink">{next.code}</span>
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <p className="text-sm font-semibold text-ink">Rejalashtirilgan qabul yo&apos;q</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      Yangi qabul uchun klinika bilan bog&apos;laning yoki onlayn yozilishdan
                      foydalaning.
                    </p>
                  </div>
                )}
              </section>

              <section className="dd-card">
                <div className="flex items-center justify-between border-b border-line px-4 py-3">
                  <h2 className="dd-display text-base font-bold text-ink">Klinikalar</h2>
                  <span className="text-xs text-muted">{data.clinics.length} ta</span>
                </div>
                <div className="grid gap-3 p-4">
                  {data.clinics.length ? (
                    data.clinics.map((block) => (
                      <div
                        key={block.clinic.id}
                        className="rounded-xl border border-line bg-surface-2 p-3"
                      >
                        <p className="dd-display font-bold text-ink">{block.clinic.name}</p>
                        {block.clinic.address ? (
                          <p className="mt-0.5 text-sm text-muted">{block.clinic.address}</p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                          {block.clinic.phone ? (
                            <a
                              href={`tel:${block.clinic.phone.replace(/[^\d+]/g, "")}`}
                              className="dd-mono text-xs font-semibold text-ink hover:text-accent"
                            >
                              {block.clinic.phone}
                            </a>
                          ) : null}
                          <MapLink url={block.clinic.mapUrl} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted">
                      Telefon raqamingiz hali klinika kartasiga bog&apos;lanmagan.
                    </p>
                  )}
                </div>
              </section>
            </div>

            <div className="grid gap-4">
              <section className="dd-card p-4">
                <h2 className="dd-display text-base font-bold text-ink">Profil</h2>
                <dl className="mt-3 grid gap-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Ism</dt>
                    <dd className="text-right font-semibold text-ink">{name}</dd>
                  </div>
                  {phone ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Telefon</dt>
                      <dd className="dd-mono text-right font-semibold text-ink">{formatPhone(phone)}</dd>
                    </div>
                  ) : null}
                  {dob ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Tug&apos;ilgan kun</dt>
                      <dd className="text-right font-semibold text-ink">{formatShortDate(dob)}</dd>
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Tashriflar</dt>
                    <dd className="text-right font-semibold text-ink">{visits.length}</dd>
                  </div>
                </dl>
              </section>

              <section className="dd-card p-4">
                <h2 className="dd-display text-base font-bold text-ink">Muhim eslatmalar</h2>
                {alerts.length ? (
                  <ul className="mt-3 grid gap-2">
                    {alerts.map((alert) => (
                      <li
                        key={alert}
                        className="flex items-start gap-2 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-sm text-ink-soft"
                      >
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                        {alert}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted">Ogohlantirishlar yo&apos;q.</p>
                )}
              </section>

              {complaintsList.length ? (
                <section className="dd-card p-4">
                  <h2 className="dd-display text-base font-bold text-ink">Shikoyatlar</h2>
                  <div className="mt-3 grid gap-2">
                    {complaintsList.slice(0, 4).map((complaint) => (
                      <div
                        key={complaint.id}
                        className="rounded-xl border border-line bg-surface-2 px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-ink">
                            {complaint.tooth ? `Tish ${complaint.tooth}` : complaint.clinic}
                          </span>
                          <span className="dd-mono text-[11px] text-muted">
                            {formatShortDate(complaint.at)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-ink-soft">{complaint.text}</p>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        ) : null}

        {tab === "chart" ? (
          <section className="dd-card p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="dd-display text-lg font-extrabold text-ink">Tish xaritasi</h2>
                <p className="mt-0.5 text-xs text-muted">
                  32 ta doimiy tish (FDI). Faqat ko&apos;rish — yozuvlarni klinika shifokori
                  kiritadi.
                </p>
              </div>
              <span className="rounded-full border border-line bg-surface-2 px-3 py-1 text-[11px] font-semibold text-muted">
                {Object.keys(mergedTeeth).length} tishda tarix bor
              </span>
            </div>
            <ToothChart3D teeth={mergedTeeth} complaints={complaintMap} />
            {complaintsList.some((complaint) => complaint.tooth === null) ? (
              <div className="mt-4 rounded-xl border border-gold/40 bg-gold/10 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-warn">
                  Umumiy shikoyatlar
                </p>
                {complaintsList
                  .filter((complaint) => complaint.tooth === null)
                  .map((complaint) => (
                    <p key={complaint.id} className="mt-1 text-sm text-ink-soft">
                      {complaint.text}
                    </p>
                  ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {tab === "history" ? (
          <section className="grid gap-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="dd-display text-lg font-extrabold text-ink">Tashriflar tarixi</h2>
                <p className="mt-0.5 text-xs text-muted">
                  Barcha klinikalardagi qabullar va muolajalar.
                </p>
              </div>
              <span className="text-xs font-semibold text-muted">{visits.length} ta yozuv</span>
            </div>

            {visits.length ? (
              visits.map((visit) => (
                <article key={`${visit.clinicName}-${visit.id}`} className="dd-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="dd-display text-base font-bold text-ink">
                        {formatDate(visit.date)}
                        {visit.time ? (
                          <span className="dd-mono ml-2 text-sm font-semibold text-accent">
                            {visit.time}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {[visit.doctorName, visit.clinicName].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    {visit.total ? (
                      <span className="rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-ink">
                        {money(visit.total)}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 grid gap-1.5">
                    {visit.procedures.length ? (
                      visit.procedures.map((procedure, index) => (
                        <div
                          key={`${visit.id}-${index}`}
                          className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm"
                        >
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            {procedure.tooth !== null ? (
                              <span className="dd-mono rounded bg-accent-soft px-1.5 py-0.5 text-[11px] font-bold text-accent">
                                {procedure.tooth}
                              </span>
                            ) : null}
                            <span className="font-semibold text-ink">{procLabel(procedure.type)}</span>
                            {procedure.price ? (
                              <span className="ml-auto text-xs text-muted">{money(procedure.price)}</span>
                            ) : null}
                          </div>
                          {procedure.surfaces.length ? (
                            <p className="mt-0.5 text-xs text-muted">
                              Yuzalar: {surfaceLabels(procedure.surfaces)}
                            </p>
                          ) : null}
                          {procedure.note ? (
                            <p className="mt-0.5 text-xs text-ink-soft">{procedure.note}</p>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted">Muolaja qayd etilmagan.</p>
                    )}
                  </div>

                  {visit.notes ? (
                    <p className="mt-2 rounded-lg bg-surface-2 px-3 py-2 text-xs leading-relaxed text-ink-soft">
                      {visit.notes}
                    </p>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="dd-card p-6 text-center text-sm text-muted">
                Hozircha tashriflar tarixi bo&apos;sh.
              </div>
            )}
          </section>
        ) : null}

        {tab === "bookings" ? (
          <section className="grid gap-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="dd-display text-lg font-extrabold text-ink">Bronlar</h2>
                <p className="mt-0.5 text-xs text-muted">
                  Shifokor va klinika so&apos;rovlari bir joyda.
                </p>
              </div>
              <span className="text-xs font-semibold text-muted">{bookingsView.length} ta</span>
            </div>

            {bookingsView.length ? (
              bookingsView.map((booking: PatientBooking) => {
                const confirmed = booking.status === "confirmed";
                const canReview =
                  booking.kind === "doctor" &&
                  Boolean(booking.doctorId) &&
                  confirmed &&
                  visitPassed(booking.date, booking.time);
                return (
                  <article
                    key={`${booking.kind}-${booking.id}`}
                    className="dd-card flex flex-wrap items-start gap-3 p-4"
                  >
                    <div className="grid min-w-[74px] place-items-center rounded-xl border border-line bg-surface-2 px-3 py-2">
                      <span className="dd-mono text-xs font-semibold text-muted">
                        {formatShortDate(booking.date)}
                      </span>
                      <span className="dd-mono text-lg font-bold text-ink">{booking.time || "—"}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge status={booking.status} />
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                          {booking.kind === "doctor" ? "Shifokor" : "Klinika so'rovi"}
                        </span>
                      </div>
                      <p className="mt-1 font-semibold text-ink">
                        {booking.doctorName || booking.clinicName || "Qabul"}
                      </p>
                      {booking.doctorName && booking.clinicName ? (
                        <p className="text-xs text-muted">{booking.clinicName}</p>
                      ) : null}

                      {confirmed && (booking.address || booking.mapUrl) ? (
                        <div className="mt-2 text-xs text-ink-soft">
                          {booking.address ? <p>{booking.address}</p> : null}
                          <MapLink url={booking.mapUrl || ""} />
                        </div>
                      ) : (
                        <p className="mt-1 text-[11px] text-muted">
                          Manzil tasdiqlangandan keyin ko&apos;rinadi.
                        </p>
                      )}

                      {booking.code ? (
                        <p className="mt-1 text-[11px] text-muted">
                          Kod: <span className="dd-mono font-semibold text-ink">{booking.code}</span>
                        </p>
                      ) : null}

                      {booking.kind === "doctor" && booking.reviewed ? (
                        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted">
                          <Stars value={booking.reviewRating || 0} />
                          Siz baholagansiz
                        </p>
                      ) : canReview ? (
                        <button
                          type="button"
                          onClick={() => {
                            setReviewFor(booking.id);
                            setReviewRating(5);
                            setReviewComment("");
                            setReviewError("");
                          }}
                          className="dd-btn dd-btn-ghost mt-2 !px-2.5 !py-1.5 text-xs"
                        >
                          Qabulni baholash
                        </button>
                      ) : null}
                    </div>

                    {reviewFor === booking.id ? (
                      <div className="mt-1 w-full rounded-xl border border-line bg-surface-2/70 p-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-ink">Qabul qanday o&apos;tdi?</p>
                          <button
                            type="button"
                            onClick={() => setReviewFor("")}
                            className="text-xs font-semibold text-muted transition hover:text-danger"
                          >
                            Bekor qilish
                          </button>
                        </div>
                        <div className="mt-2 flex items-center gap-1" role="group" aria-label="Reyting">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewRating(star)}
                              aria-label={`${star} yulduz`}
                              aria-pressed={reviewRating === star}
                              className="rounded p-0.5 transition hover:scale-110"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill={star <= reviewRating ? "currentColor" : "none"}
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinejoin="round"
                                className={`h-6 w-6 ${
                                  star <= reviewRating ? "text-gold" : "text-line-strong"
                                }`}
                                aria-hidden="true"
                              >
                                <path d="m12 3.4 2.7 5.52 6.05.9-4.4 4.27 1.04 6.03L12 17.28l-5.39 2.84 1.04-6.03-4.4-4.27 6.05-.9Z" />
                              </svg>
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={reviewComment}
                          onChange={(event) => setReviewComment(event.target.value)}
                          rows={3}
                          maxLength={500}
                          placeholder="Izoh (ixtiyoriy): nima yoqdi, nimani yaxshilash kerak?"
                          className="dd-input mt-2 resize-none text-sm"
                        />
                        {reviewError ? (
                          <p className="mt-1.5 text-xs font-medium text-danger">{reviewError}</p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11px] text-muted">
                            Sharh shifokor profilida ko&apos;rinadi.
                          </span>
                          <button
                            type="button"
                            onClick={submitReview}
                            disabled={reviewSending}
                            className="dd-btn dd-btn-primary !px-3 !py-2 text-sm disabled:opacity-60"
                          >
                            {reviewSending ? "Yuborilmoqda..." : "Sharh qoldirish"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })
            ) : (
              <div className="dd-card p-6 text-center text-sm text-muted">
                Hozircha bronlar yo&apos;q.
              </div>
            )}
          </section>
        ) : null}

        <p className="mt-8 text-center text-[11px] text-muted">
          Dental Desk · bemor kabineti · ma&apos;lumotlar himoyalangan
        </p>
      </main>
    </div>
  );
}
