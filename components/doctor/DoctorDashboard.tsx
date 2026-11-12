"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/Logo";
import { StatusDonut, TrendChart, WeekdayBars, type DonutSegment, type TrendPoint } from "./Charts";
import { ToothChart3D } from "./ToothChart3D";
import { TreatmentPanel } from "./TreatmentPanel";
import {
  ADDRESS_PRESETS,
  PRICE_PRESETS,
  PROCEDURE_MAP,
  procedureLabel,
} from "./treatments";
import type { DoctorBookingDTO, DoctorProfileDTO, TreatmentDTO } from "./types";

type Tab = "requests" | "treatments" | "schedule" | "profile";

type Props = {
  me: { name: string; email: string };
  initialProfile: DoctorProfileDTO | null;
};

const TABS: { key: Tab; label: string }[] = [
  { key: "requests", label: "So'rovlar" },
  { key: "treatments", label: "Davolash" },
  { key: "schedule", label: "Jadval" },
  { key: "profile", label: "Profil" },
];

const WEEKDAYS = [
  "yakshanba",
  "dushanba",
  "seshanba",
  "chorshanba",
  "payshanba",
  "juma",
  "shanba",
];

const MONTHS = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
];

const WEEKDAY_SHORT = ["Du", "Se", "Cho", "Pa", "Ju", "Sha", "Ya"];

const PRICE_MAX = 100_000_000;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function ymdLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function todayStr(): string {
  return ymdLocal(new Date());
}

function tomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return ymdLocal(d);
}

function fmtDate(date: string): string {
  const parts = String(date || "").split("-");
  if (parts.length !== 3) return date || "—";
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function dayLabel(date: string): string {
  if (!date) return "—";
  if (date === todayStr()) return `Bugun · ${fmtDate(date)}`;
  if (date === tomorrowStr()) return `Ertaga · ${fmtDate(date)}`;
  const parsed = new Date(`${date}T00:00:00`);
  const weekday = Number.isNaN(parsed.getTime()) ? "" : WEEKDAYS[parsed.getDay()];
  return weekday ? `${fmtDate(date)} · ${weekday}` : fmtDate(date);
}

function fmtRange(time: string, duration: number): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(time || "").trim());
  if (!match) return time || "—";
  const minutes = Number(match[1]) * 60 + Number(match[2]) + (duration > 0 ? duration : 30);
  const end = minutes % (24 * 60);
  return `${pad2(Number(match[1]))}:${match[2]}–${pad2(Math.floor(end / 60))}:${pad2(end % 60)}`;
}

function timeAgo(iso: string, nowMs: number): string {
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "";
  const diff = Math.max(0, nowMs - ms);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "hozir";
  if (minutes < 60) return `${minutes} daqiqa oldin`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} soat oldin`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} kun oldin`;
  return fmtDate(iso.slice(0, 10));
}

function telHref(phone: string): string {
  return `tel:${String(phone || "").replace(/[^\d+]/g, "")}`;
}

function priceLabel(value: number): string {
  if (!value) return "Kelishilgan";
  return `${value.toLocaleString("ru-RU")} so'm`;
}

function humanToday(): string {
  const d = new Date();
  return `${d.getDate()}-${MONTHS[d.getMonth()]}, ${WEEKDAYS[d.getDay()]}`;
}

function fmtMoneyShort(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} mln`;
  }
  if (value >= 1_000) return `${Math.round(value / 1_000)} ming`;
  return String(value);
}

export function DoctorDashboard({ me, initialProfile }: Props) {
  const [tab, setTab] = useState<Tab>("requests");
  const [profile, setProfile] = useState<DoctorProfileDTO | null>(initialProfile);
  const [bookings, setBookings] = useState<DoctorBookingDTO[]>([]);
  const [treatments, setTreatments] = useState<TreatmentDTO[]>([]);
  const [treatmentsLoading, setTreatmentsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [flash, setFlash] = useState("");
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const [busyId, setBusyId] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [confirmFor, setConfirmFor] = useState<DoctorBookingDTO | null>(null);
  const [confirmNote, setConfirmNote] = useState("");
  const [declineFor, setDeclineFor] = useState<DoctorBookingDTO | null>(null);
  const [declineNote, setDeclineNote] = useState("");

  const [copied, setCopied] = useState("");
  const [form, setForm] = useState({
    address: initialProfile?.address ?? "",
    mapUrl: initialProfile?.mapUrl ?? "",
    phone: initialProfile?.phone ?? "",
    priceFrom: String(initialProfile?.priceFrom ?? 0),
    bio: initialProfile?.bio ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [profileError, setProfileError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/doktor/bookings", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoadError(data?.message || data?.error || "Ma'lumotlarni yuklab bo'lmadi.");
      } else {
        setLoadError("");
        setBookings(Array.isArray(data.bookings) ? data.bookings : []);
      }
    } catch {
      setLoadError("Tarmoq xatosi. Sahifani yangilang.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTreatments = useCallback(async () => {
    try {
      const res = await fetch("/api/doktor/treatments", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.treatments)) {
        setTreatments(data.treatments);
      }
    } catch {
      /* the tooth card just stays on its last known state */
    } finally {
      setTreatmentsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialProfile) {
      setLoading(false);
      setTreatmentsLoading(false);
      return;
    }
    void load();
    void loadTreatments();
  }, [initialProfile, load, loadTreatments]);

  useEffect(() => {
    if (!initialProfile) return;
    const refresh = window.setInterval(() => void load(), 60_000);
    const tick = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => {
      window.clearInterval(refresh);
      window.clearInterval(tick);
    };
  }, [initialProfile, load]);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(""), 4000);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const pending = useMemo(
    () => bookings.filter((booking) => booking.status === "requested"),
    [bookings]
  );

  const groups = useMemo(() => {
    const today = todayStr();
    const upcoming = bookings
      .filter((booking) => booking.status === "confirmed" && booking.date >= today)
      .slice()
      .sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)));
    const map = new Map<string, DoctorBookingDTO[]>();
    for (const booking of upcoming) {
      const list = map.get(booking.date);
      if (list) list.push(booking);
      else map.set(booking.date, [booking]);
    }
    return Array.from(map.entries());
  }, [bookings]);

  const todayKey = todayStr();
  const todayConfirmed = useMemo(
    () =>
      bookings
        .filter((booking) => booking.status === "confirmed" && booking.date === todayKey)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [bookings, todayKey]
  );

  const monthBookings = useMemo(() => {
    const monthKey = todayKey.slice(0, 7);
    return bookings.filter(
      (booking) =>
        (booking.status === "confirmed" || booking.status === "completed") &&
        booking.date.startsWith(monthKey)
    );
  }, [bookings, todayKey]);

  const estimatedRevenue = monthBookings.length * (profile?.priceFrom ?? 0);

  const trend = useMemo<TrendPoint[]>(() => {
    const days: TrendPoint[] = [];
    const index = new Map<string, number>();
    const base = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i);
      index.set(ymdLocal(d), days.length);
      days.push({ label: `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`, count: 0 });
    }
    for (const booking of bookings) {
      const created = new Date(booking.createdAt);
      if (Number.isNaN(created.getTime())) continue;
      const pos = index.get(ymdLocal(created));
      if (pos !== undefined) days[pos].count += 1;
    }
    return days;
  }, [bookings]);

  const segments = useMemo<DonutSegment[]>(() => {
    const count = (status: string) => bookings.filter((b) => b.status === status).length;
    return [
      { key: "requested", label: "Yangi", value: count("requested"), color: "#a85408" },
      { key: "confirmed", label: "Tasdiqlangan", value: count("confirmed"), color: "#0c6a72" },
      { key: "completed", label: "Yakunlangan", value: count("completed"), color: "#1c7549" },
      { key: "declined", label: "Rad etilgan", value: count("declined"), color: "#c3302a" },
      { key: "cancelled", label: "Bekor qilingan", value: count("cancelled"), color: "#b7cacd" },
    ];
  }, [bookings]);

  const weekday = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    for (const booking of bookings) {
      if (booking.status !== "confirmed" && booking.status !== "completed") continue;
      const parsed = new Date(`${booking.date}T00:00:00`);
      if (Number.isNaN(parsed.getTime())) continue;
      counts[(parsed.getDay() + 6) % 7] += 1;
    }
    return WEEKDAY_SHORT.map((label, i) => ({ label, count: counts[i] }));
  }, [bookings]);

  const upcoming = useMemo(() => groups.flatMap(([, items]) => items).slice(0, 4), [groups]);

  const toothMarks = useMemo(() => {
    const map: Record<number, string[]> = {};
    for (const item of treatments) {
      if (!item.tooth) continue;
      (map[item.tooth] ||= []).push(item.procedure);
    }
    return map;
  }, [treatments]);

  const toothStats = useMemo(() => {
    const teeth = new Set<number>();
    const patients = new Set<string>();
    for (const item of treatments) {
      if (item.tooth) teeth.add(item.tooth);
      if (item.patientPhone) patients.add(item.patientPhone);
    }
    return {
      teeth: teeth.size,
      patients: patients.size,
      procedures: treatments.length,
      today: treatments.filter((item) => item.date === todayKey).length,
    };
  }, [treatments, todayKey]);

  const presentProcedures = useMemo(() => {
    const keys = new Set<string>();
    for (const item of treatments) {
      if (item.tooth) keys.add(item.procedure);
    }
    return Array.from(keys);
  }, [treatments]);

  const recentTreatments = treatments.slice(0, 7);

  async function quickAction(booking: DoctorBookingDTO, action: "complete" | "cancel") {
    if (action === "cancel") {
      const ok = window.confirm(
        `${booking.name || "Bemor"} qabulini bekor qilishni tasdiqlaysizmi?`
      );
      if (!ok) return;
    }
    setBusyId(booking.id);
    setActionError("");
    try {
      const res = await fetch(`/api/doktor/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data?.message || data?.error || "Amal bajarilmadi.");
        return;
      }
      await load();
      setFlash(
        action === "complete"
          ? `${booking.name || "Bemor"} qabuli yakunlandi.`
          : `${booking.name || "Bemor"} qabuli bekor qilindi.`
      );
    } catch {
      setActionError("Tarmoq xatosi. Qayta urinib ko'ring.");
    } finally {
      setBusyId("");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    window.location.href = "/login";
  }

  function openConfirm(booking: DoctorBookingDTO) {
    setDialogError("");
    setConfirmNote("");
    setConfirmFor(booking);
  }

  function openDecline(booking: DoctorBookingDTO) {
    setDialogError("");
    setDeclineNote("");
    setDeclineFor(booking);
  }

  async function submitAction(
    booking: DoctorBookingDTO,
    action: "confirm" | "decline",
    note: string
  ): Promise<boolean> {
    setBusyId(booking.id);
    setDialogError("");
    try {
      const res = await fetch(`/api/doktor/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDialogError(data?.message || data?.error || "Amal bajarilmadi. Qayta urinib ko'ring.");
        return false;
      }
      await load();
      setFlash(
        action === "confirm"
          ? `${booking.name} uchun qabul tasdiqlandi. Bemor jadvalga qo'shildi.`
          : `${booking.name} so'rovi rad etildi.`
      );
      return true;
    } catch {
      setDialogError("Tarmoq xatosi. Qayta urinib ko'ring.");
      return false;
    } finally {
      setBusyId("");
    }
  }

  async function confirmBooking() {
    if (!confirmFor) return;
    const done = await submitAction(confirmFor, "confirm", confirmNote.trim());
    if (done) {
      setConfirmFor(null);
      setConfirmNote("");
    }
  }

  async function declineBooking() {
    if (!declineFor) return;
    const done = await submitAction(declineFor, "decline", declineNote.trim());
    if (done) {
      setDeclineFor(null);
      setDeclineNote("");
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setProfileError("");
    setProfileMsg("");

    const address = form.address.trim();
    if (address.length < 5) {
      setProfileError("Qabul manzilini kiriting — kamida 5 belgi.");
      return;
    }
    if (address.length > 200) {
      setProfileError("Manzil 200 belgidan oshmasin.");
      return;
    }
    const mapUrl = form.mapUrl.trim();
    if (mapUrl && !/^https?:\/\//i.test(mapUrl)) {
      setProfileError("Xarita havolasi http:// yoki https:// bilan boshlanishi kerak.");
      return;
    }
    const price = Number(form.priceFrom);
    if (!Number.isInteger(price) || price < 0 || price > PRICE_MAX) {
      setProfileError("Narx 0 dan 100 000 000 so'mgacha butun son bo'lsin.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/doktor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          mapUrl,
          phone: form.phone.trim(),
          priceFrom: price,
          bio: form.bio.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProfileError(data?.message || data?.error || "Profil saqlanmadi.");
        return;
      }
      const next = data.profile as DoctorProfileDTO;
      setProfile(next);
      setForm({
        address: next.address,
        mapUrl: next.mapUrl,
        phone: next.phone,
        priceFrom: String(next.priceFrom),
        bio: next.bio,
      });
      setProfileMsg("Profil saqlandi. Bemorlar yangilangan ma'lumotni ko'radi.");
    } catch {
      setProfileError("Tarmoq xatosi. Qayta urinib ko'ring.");
    } finally {
      setSaving(false);
    }
  }

  function copyLink(path: string) {
    const url = `${window.location.origin}${path}`;
    const done = () => {
      setCopied(path);
      window.setTimeout(() => setCopied(""), 2000);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(done).catch(done);
    } else {
      done();
    }
  }

  const publicProfilePath = profile ? `/shifokorlar/${profile.id}` : "";
  const bookingPath = profile ? `/bron/${profile.id}` : "";

  return (
    <div className="min-h-screen bg-bg pb-16">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5 text-accent">
            <Logo className="h-8 w-8" />
            <div className="leading-tight">
              <p className="dd-display text-base font-extrabold text-ink">Dental Desk</p>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Shifokor kabineti
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            <div className="max-w-[10rem] text-right sm:max-w-none">
              <p className="truncate text-sm font-semibold text-ink">{profile?.name || me.name}</p>
              <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                Tarmoq shifokori
              </span>
            </div>
            <button type="button" onClick={logout} className="dd-btn dd-btn-ghost !px-3.5 !py-2 text-sm">
              Chiqish
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {!profile ? (
          <section className="dd-card dd-noise mx-auto mt-4 max-w-xl p-6 text-center sm:p-8">
            <span className="inline-flex items-center rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-accent">
              Platforma shartnomasi
            </span>
            <h1 className="dd-display mt-3 text-2xl font-extrabold text-ink">
              Shifokor profili hali bog&apos;lanmagan
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Hisobingiz faol, lekin tarmoq shifokori profili (platforma shartnomasi) hali
              yaratilmagan. Profil tasdiqlangach, so&apos;rovlar, jadval va ommaviy havolalar shu
              yerda paydo bo&apos;ladi.
            </p>
            <p className="mt-1 text-sm text-muted">
              Savol uchun:{" "}
              <a href="https://t.me/oz4vka" className="font-semibold text-accent hover:underline">
                @oz4vka
              </a>
            </p>
            <p className="dd-mono mt-4 truncate text-xs text-muted">{me.email}</p>
            <button type="button" onClick={logout} className="dd-btn dd-btn-ghost mt-5">
              Chiqish
            </button>
          </section>
        ) : (
          <>
            <section className="dd-rise flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
                  {humanToday()}
                </p>
                <h1 className="dd-display mt-1.5 text-2xl font-extrabold text-ink sm:text-3xl">
                  Xayrli kun, {profile.name}
                </h1>
                <p className="mt-1 text-sm text-muted">
                  So&apos;rovlar, jadval va tashriflar tahlili — bir sahifada.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {pending.length > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-warn/25 bg-warn/5 px-3 py-1.5 text-xs font-bold text-warn">
                    <span className="h-1.5 w-1.5 rounded-full bg-warn" aria-hidden="true" />
                    {pending.length} yangi so&apos;rov
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-ok/25 bg-ok/5 px-3 py-1.5 text-xs font-bold text-ok">
                  <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden="true" />
                  Bugun {todayConfirmed.length} qabul
                </span>
              </div>
            </section>

            <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KpiCard
                icon="inbox"
                label="Yangi so'rovlar"
                value={String(pending.length)}
                hint="Javob kutmoqda"
                tone="warn"
                delay={1}
              />
              <KpiCard
                icon="calendar"
                label="Bugungi qabullar"
                value={String(todayConfirmed.length)}
                hint={
                  todayConfirmed.length > 0
                    ? `Birinchi: ${todayConfirmed[0].time}`
                    : "Bugun qabul yo'q"
                }
                tone="accent"
                delay={2}
              />
              <KpiCard
                icon="activity"
                label="Shu oy qabullari"
                value={String(monthBookings.length)}
                hint="Tasdiqlangan + yakunlangan"
                tone="ok"
                delay={3}
              />
              <KpiCard
                icon="wallet"
                label="Taxminiy tushum"
                value={fmtMoneyShort(estimatedRevenue)}
                hint="so'm · oy bo'yicha taxmin"
                tone="gold"
                delay={4}
              />
            </section>

            <section className="mt-4 grid gap-3 lg:grid-cols-3">
              <ChartCard
                className="lg:col-span-2"
                title="So'rovlar oqimi"
                subtitle="Oxirgi 30 kun · barcha holatlar"
              >
                {loading ? <ChartSkeleton className="h-52" /> : <TrendChart data={trend} />}
              </ChartCard>
              <ChartCard title="Holat taqsimoti" subtitle={`${bookings.length} ta yozuv`}>
                {loading ? (
                  <ChartSkeleton className="h-40" />
                ) : (
                  <StatusDonut segments={segments} total={bookings.length} />
                )}
              </ChartCard>
              <ChartCard
                className="lg:col-span-2"
                title="Hafta kunlari yuklamasi"
                subtitle="Tasdiqlangan va yakunlangan qabullar"
              >
                {loading ? <ChartSkeleton className="h-44" /> : <WeekdayBars data={weekday} />}
              </ChartCard>
              <ChartCard title="Kelgusi qabullar" subtitle="Tasdiqlangan jadval">
                <UpcomingList items={upcoming} loading={loading} />
              </ChartCard>
            </section>

            <section className="dd-card mt-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-ink">Tish xaritasi · 3D</h2>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">
                    Davolangan tishlar va muolajalar avtomatik saqlanadi. Har bir tish ustiga
                    kursorni olib borsangiz, tarix ko&apos;rinadi.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <StatChip label="Tish" value={toothStats.teeth} tone="accent" />
                  <StatChip label="Muolaja" value={toothStats.procedures} tone="ok" />
                  <StatChip label="Bemor" value={toothStats.patients} tone="gold" />
                  <StatChip label="Bugun" value={toothStats.today} tone="warn" />
                </div>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-[1.45fr_1fr]">
                <ToothChart3D marks={toothMarks} height={350} />

                <div className="flex min-w-0 flex-col rounded-2xl border border-line bg-surface-2 p-3.5">
                  {presentProcedures.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {presentProcedures.map((key) => (
                        <span
                          key={key}
                          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink-soft"
                        >
                          <i
                            className="h-2 w-2 rounded-full"
                            style={{ background: PROCEDURE_MAP[key]?.color || "#587076" }}
                          />
                          {procedureLabel(key)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl bg-surface px-3 py-2.5 text-xs leading-relaxed text-muted">
                      Hali davolash belgilanmagan. &ldquo;Davolash&rdquo; bo&apos;limida tishni
                      tanlab, muolajani saqlang — belgilar shu yerda qoladi.
                    </p>
                  )}

                  <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-muted">
                    Oxirgi davolashlar
                  </p>
                  {treatmentsLoading ? (
                    <div className="mt-2 h-16 animate-pulse rounded-xl bg-surface" />
                  ) : recentTreatments.length ? (
                    <ul className="mt-1.5 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
                      {recentTreatments.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center gap-2 rounded-lg bg-surface px-2.5 py-1.5"
                        >
                          <span
                            className="flex h-6 w-8 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white"
                            style={{
                              background: PROCEDURE_MAP[item.procedure]?.color || "#587076",
                            }}
                          >
                            {item.tooth ? item.tooth : "★"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-ink">
                              {procedureLabel(item.procedure)}
                              <span className="ml-1.5 font-normal text-muted">
                                · {item.patientName || "Bemor"}
                              </span>
                            </p>
                          </div>
                          <span className="dd-mono shrink-0 text-[10px] text-muted">
                            {fmtDate(item.date)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 rounded-xl bg-surface px-3 py-4 text-center text-xs text-muted">
                      Yozuvlar yo&apos;q
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="dd-card mt-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink">Ommaviy havolalar</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">
                  Bemorlar profilni ko&apos;rib, shu havola orqali yoziladi. Havolani
                  Telegram yoki ijtimoiy tarmoqqa qo&apos;ying.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row">
                <LinkChip
                  label="Profil"
                  path={publicProfilePath}
                  copied={copied === publicProfilePath}
                  onCopy={() => copyLink(publicProfilePath)}
                />
                <LinkChip
                  label="Yozilish"
                  path={bookingPath}
                  copied={copied === bookingPath}
                  onCopy={() => copyLink(bookingPath)}
                />
              </div>
            </section>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div role="tablist" aria-label="Kabinet bo'limlari" className="flex max-w-full gap-1 rounded-2xl border border-line bg-surface p-1">
                {TABS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={tab === item.key}
                    onClick={() => setTab(item.key)}
                    className={`dd-btn !px-2.5 !py-2 text-sm sm:!px-3.5 ${
                      tab === item.key
                        ? "!border-transparent !bg-accent !text-white"
                        : "!border-transparent !bg-transparent !text-ink-soft hover:!bg-surface-2"
                    }`}
                  >
                    {item.label}
                    {item.key === "requests" && pending.length > 0 ? (
                      <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[11px] font-bold">
                        {pending.length}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
              <p className="dd-mono text-xs text-muted">
                {loading ? "Yuklanmoqda…" : `${bookings.length} yozuv`}
              </p>
            </div>

            {flash ? (
              <p className="mt-4 rounded-xl border border-ok/25 bg-ok/5 px-4 py-2.5 text-sm text-ok">
                {flash}
              </p>
            ) : null}
            {loadError ? (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-danger/25 bg-danger/5 px-4 py-2.5 text-sm text-danger">
                <span>{loadError}</span>
                <button type="button" onClick={() => void load()} className="dd-btn dd-btn-ghost !px-2.5 !py-1 text-xs">
                  Qayta urinish
                </button>
              </div>
            ) : null}
            {actionError ? (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-danger/25 bg-danger/5 px-4 py-2.5 text-sm text-danger">
                <span>{actionError}</span>
                <button
                  type="button"
                  onClick={() => setActionError("")}
                  className="dd-btn dd-btn-ghost !px-2.5 !py-1 text-xs"
                >
                  Yopish
                </button>
              </div>
            ) : null}

            {tab === "requests" ? (
              <section className="mt-5 space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h2 className="dd-display text-xl font-bold text-ink">Yangi so&apos;rovlar</h2>
                    <p className="mt-0.5 text-sm text-muted">
                      Tasdiqlashdan oldin vaqtni tekshiring — faqat tasdiqlangan bemorlar
                      qabulga keladi.
                    </p>
                  </div>
                  <span className="dd-mono text-xs text-muted">{pending.length} so&apos;rov</span>
                </div>

                {loading ? (
                  <LoadingCard />
                ) : pending.length === 0 ? (
                  <EmptyState
                    title="Hozircha yangi so'rovlar yo'q"
                    text="Havolani bemorlarga ulashing. Yangi so'rov kelganda shu ro'yxatda ko'rinadi va qabulni bir bosishda tasdiqlaysiz."
                  />
                ) : (
                  pending.map((booking) => (
                    <RequestCard
                      key={booking.id}
                      booking={booking}
                      nowMs={nowMs}
                      busy={busyId === booking.id}
                      onConfirm={openConfirm}
                      onDecline={openDecline}
                    />
                  ))
                )}
              </section>
            ) : null}

            {tab === "treatments" ? (
              <TreatmentPanel
                profile={profile}
                bookings={bookings}
                treatments={treatments}
                treatmentsLoading={treatmentsLoading}
                onSaved={(message) => {
                  setFlash(message);
                  void load();
                  void loadTreatments();
                }}
                onGoRequests={() => setTab("requests")}
              />
            ) : null}

            {tab === "schedule" ? (
              <section className="mt-5 space-y-4">
                <div>
                  <h2 className="dd-display text-xl font-bold text-ink">Jadval</h2>
                  <p className="mt-0.5 text-sm text-muted">
                    Tasdiqlangan qabullar. Bemorlar shu vaqtda, shu manzilga keladi.
                  </p>
                </div>

                {loading ? (
                  <LoadingCard />
                ) : groups.length === 0 ? (
                  <EmptyState
                    title="Tasdiqlangan qabullar yo'q"
                    text="So'rovlar bo'limida so'rovni tasdiqlang — u avtomatik shu jadvalga tushadi."
                  />
                ) : (
                  groups.map(([date, items]) => (
                    <div key={date} className="dd-card overflow-hidden">
                      <div className="flex items-center justify-between border-b border-line bg-surface-2 px-4 py-2.5 sm:px-5">
                        <p className="text-sm font-bold text-ink">{dayLabel(date)}</p>
                        <span className="dd-mono text-xs text-muted">{items.length} qabul</span>
                      </div>
                      <ul className="divide-y divide-line/70">
                        {items.map((booking) => (
                          <li key={booking.id} className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:px-5">
                            <p className="dd-mono w-28 shrink-0 text-sm font-bold text-accent">
                              {fmtRange(booking.time, booking.duration)}
                            </p>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-ink">{booking.name || "Bemor"}</p>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                                {booking.phone ? (
                                  <a
                                    href={telHref(booking.phone)}
                                    className="dd-mono font-semibold text-accent hover:underline"
                                  >
                                    {booking.phone}
                                  </a>
                                ) : null}
                                <span className="truncate">
                                  {booking.address || profile.address || "Manzil kiritilmagan"}
                                </span>
                              </div>
                              {booking.reason ? (
                                <p className="mt-1 text-sm text-ink-soft">Sabab: {booking.reason}</p>
                              ) : null}
                              {booking.doctorNote ? (
                                <p className="mt-1 text-xs text-muted">Izoh: {booking.doctorNote}</p>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap items-start gap-1.5 self-start">
                              <span className="rounded-full bg-ok/10 px-2.5 py-1 text-[11px] font-bold text-ok">
                                Tasdiqlangan
                              </span>
                              {booking.date <= todayKey ? (
                                <button
                                  type="button"
                                  onClick={() => void quickAction(booking, "complete")}
                                  disabled={busyId === booking.id}
                                  className="dd-btn dd-btn-ghost !border-ok/30 !px-2.5 !py-1 text-[11px] !text-ok hover:!bg-ok/5"
                                >
                                  Yakunlash
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => void quickAction(booking, "cancel")}
                                disabled={busyId === booking.id}
                                className="dd-btn dd-btn-ghost !border-danger/25 !px-2.5 !py-1 text-[11px] !text-danger hover:!bg-danger/5"
                              >
                                Bekor
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </section>
            ) : null}

            {tab === "profile" ? (
              <section className="mt-5 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
                <form onSubmit={saveProfile} className="dd-card p-5 sm:p-6">
                  <h2 className="dd-display text-xl font-bold text-ink">Profil</h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    Bu ma&apos;lumot ommaviy profilda ko&apos;rinadi. Manzil tasdiqlangan
                    qabulning qabul joyi sifatida bemorga yuboriladi.
                  </p>

                  {profileMsg ? (
                    <p className="mt-4 rounded-xl border border-ok/25 bg-ok/5 px-4 py-2.5 text-sm text-ok">
                      {profileMsg}
                    </p>
                  ) : null}
                  {profileError ? (
                    <p className="mt-4 rounded-xl border border-danger/25 bg-danger/5 px-4 py-2.5 text-sm text-danger">
                      {profileError}
                    </p>
                  ) : null}

                  <div className="mt-4 grid gap-4">
                    <div>
                      <label className="dd-label" htmlFor="address">
                        Qabul manzili <span className="text-danger">*</span>
                      </label>
                      <input
                        id="address"
                        className="dd-input"
                        required
                        minLength={5}
                        maxLength={200}
                        placeholder="Toshkent, Yunusobod, Amir Temur 108, 3-qavat"
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                      />
                      <select
                        className="dd-input mt-2 !py-2 text-sm"
                        aria-label="Tuman yoki shaharni tanlash"
                        value={ADDRESS_PRESETS.includes(form.address) ? form.address : ""}
                        onChange={(e) => {
                          if (e.target.value) setForm({ ...form, address: e.target.value });
                        }}
                      >
                        <option value="">Tuman yoki shaharni tanlang…</option>
                        {ADDRESS_PRESETS.map((preset) => (
                          <option key={preset} value={preset}>
                            {preset}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-muted">
                        Tasdiqlangan qabul manzili sifatida bemorga ko&apos;rsatiladi.
                      </p>
                    </div>

                    <div>
                      <label className="dd-label" htmlFor="mapUrl">
                        Xarita havolasi
                      </label>
                      <input
                        id="mapUrl"
                        className="dd-input"
                        placeholder="https://yandex.uz/maps/..."
                        value={form.mapUrl}
                        onChange={(e) => setForm({ ...form, mapUrl: e.target.value })}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="dd-label" htmlFor="phone">
                          Telefon
                        </label>
                        <input
                          id="phone"
                          className="dd-input"
                          inputMode="tel"
                          maxLength={40}
                          placeholder="+998 90 123 45 67"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="dd-label" htmlFor="priceFrom">
                          Qabul narxi (dan)
                        </label>
                        <div className="relative">
                          <input
                            id="priceFrom"
                            type="number"
                            min={0}
                            max={PRICE_MAX}
                            step={1000}
                            className="dd-input pr-14"
                            value={form.priceFrom}
                            onChange={(e) => setForm({ ...form, priceFrom: e.target.value })}
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">
                            so&apos;m
                          </span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {PRICE_PRESETS.map((preset) => {
                            const active = Number(form.priceFrom) === preset;
                            return (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setForm({ ...form, priceFrom: String(preset) })}
                                className={`rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
                                  active
                                    ? "border-accent bg-accent text-white"
                                    : "border-line bg-surface text-ink-soft hover:border-accent/50"
                                }`}
                              >
                                {preset ? `${preset / 1000} ming` : "Kelishilgan"}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="dd-label" htmlFor="bio">
                        O&apos;zingiz haqingizda
                      </label>
                      <textarea
                        id="bio"
                        className="dd-input min-h-24 resize-y"
                        rows={4}
                        maxLength={1000}
                        placeholder="Tajriba, yo'nalish, davolash usullari..."
                        value={form.bio}
                        onChange={(e) => setForm({ ...form, bio: e.target.value })}
                      />
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              bio: `${profile?.experience || 0} yillik tajriba. ${
                                profile?.specialtyLabel || "Stomatolog"
                              } yo'nalishida qabul qilaman. Tishlarni davolash, og'riqsiz muolajalar va profilaktika.`,
                            })
                          }
                          className="text-xs font-semibold text-accent hover:underline"
                        >
                          Tayyor matn
                        </button>
                        <p className="text-xs text-muted">{form.bio.length}/1000</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
                    <button type="submit" className="dd-btn dd-btn-primary" disabled={saving}>
                      {saving ? "Saqlanmoqda…" : "Saqlash"}
                    </button>
                    <p className="text-xs text-muted">
                      Manzilni o&apos;zgartirsangiz, keyingi tasdiqlar yangi manzil bilan
                      yuboriladi.
                    </p>
                  </div>
                </form>

                <aside className="space-y-4">
                  <div className="dd-card p-5">
                    <p className="text-sm font-bold text-ink">Ommaviy sahifa</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      Profil va yozilish havolalari. Havolani nusxalab, bemorlarga yuboring.
                    </p>
                    <div className="mt-3 space-y-2">
                      <LinkChip
                        label="Profil"
                        path={publicProfilePath}
                        copied={copied === publicProfilePath}
                        onCopy={() => copyLink(publicProfilePath)}
                        wide
                      />
                      <LinkChip
                        label="Yozilish"
                        path={bookingPath}
                        copied={copied === bookingPath}
                        onCopy={() => copyLink(bookingPath)}
                        wide
                      />
                    </div>
                  </div>

                  <div className="dd-card p-5 text-sm">
                    <p className="text-sm font-bold text-ink">Ma&apos;lumot</p>
                    <dl className="mt-3 space-y-2">
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted">Mutaxassislik</dt>
                        <dd className="text-right font-semibold text-ink">{profile.specialtyLabel}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted">Tajriba</dt>
                        <dd className="text-right font-semibold text-ink">{profile.experience} yil</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted">Reyting</dt>
                        <dd className="text-right font-semibold text-ink">
                          {profile.ratingCount > 0 ? `${profile.rating} · ${profile.ratingCount} izoh` : "Hali yo'q"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted">Narx</dt>
                        <dd className="text-right font-semibold text-ink">{priceLabel(profile.priceFrom)}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted">Shartnoma</dt>
                        <dd className="text-right font-semibold text-ink">
                          {profile.contract === "platform" ? "Platforma" : "Klinika"}
                        </dd>
                      </div>
                    </dl>
                    <p className="dd-mono mt-3 truncate border-t border-line pt-3 text-xs text-muted">
                      {me.email}
                    </p>
                  </div>
                </aside>
              </section>
            ) : null}
          </>
        )}
      </main>

      {confirmFor ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Qabulni tasdiqlash"
            className="dd-card max-h-[90vh] w-full max-w-md overflow-y-auto p-6"
          >
            <h2 className="dd-display text-lg font-bold text-ink">Qabulni tasdiqlash</h2>
            <p className="mt-1 text-sm text-muted">
              Bemor bu vaqtda keladi deb tasdiqlanadi va jadvalga qo&apos;shiladi.
            </p>
            <dl className="mt-4 space-y-2 rounded-xl border border-line bg-surface-2 p-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Bemor</dt>
                <dd className="text-right font-semibold text-ink">{confirmFor.name || "Bemor"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Telefon</dt>
                <dd className="dd-mono text-right font-semibold text-ink">{confirmFor.phone || "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Sana</dt>
                <dd className="text-right font-semibold text-ink">{dayLabel(confirmFor.date)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Vaqt</dt>
                <dd className="dd-mono text-right font-semibold text-ink">
                  {fmtRange(confirmFor.time, confirmFor.duration)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Manzil</dt>
                <dd className="max-w-[60%] text-right text-ink">{profile?.address || "—"}</dd>
              </div>
            </dl>
            <p className="mt-3 rounded-xl border border-warn/25 bg-warn/5 px-3.5 py-2.5 text-xs leading-relaxed text-warn">
              Vaqt shu daqiqadan band bo&apos;ladi. Faqat tasdiqlangan bemorlar qabulga keladi —
              tasdiqlanmagan so&apos;rov jadvalga tushmaydi.
            </p>
            <label className="dd-label mt-4" htmlFor="confirmNote">
              Bemorga izoh (ixtiyoriy)
            </label>
            <textarea
              id="confirmNote"
              rows={2}
              maxLength={500}
              className="dd-input resize-y"
              placeholder="Masalan: 10 daqiqa oldin keling, hujjatlarni olib keling."
              value={confirmNote}
              onChange={(e) => setConfirmNote(e.target.value)}
            />
            {dialogError ? <p className="mt-3 text-sm text-danger">{dialogError}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="dd-btn dd-btn-ghost"
                onClick={() => setConfirmFor(null)}
                disabled={busyId === confirmFor.id}
              >
                Bekor qilish
              </button>
              <button
                type="button"
                className="dd-btn dd-btn-primary"
                onClick={() => void confirmBooking()}
                disabled={busyId === confirmFor.id}
              >
                {busyId === confirmFor.id ? "Tasdiqlanmoqda…" : "Ha, tasdiqlash"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {declineFor ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="So'rovni rad etish"
            className="dd-card max-h-[90vh] w-full max-w-md overflow-y-auto p-6"
          >
            <h2 className="dd-display text-lg font-bold text-ink">So&apos;rovni rad etish</h2>
            <p className="mt-1 text-sm text-muted">
              Bemor bu vaqtda qabul qilinmaydi. Sababni yozsangiz, u qayta murojaat qilganda
              hisobga olinadi.
            </p>
            <dl className="mt-4 space-y-2 rounded-xl border border-line bg-surface-2 p-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Bemor</dt>
                <dd className="text-right font-semibold text-ink">{declineFor.name || "Bemor"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Sana va vaqt</dt>
                <dd className="text-right font-semibold text-ink">
                  {dayLabel(declineFor.date)}, {fmtRange(declineFor.time, declineFor.duration)}
                </dd>
              </div>
            </dl>
            <label className="dd-label mt-4" htmlFor="declineNote">
              Sabab (ixtiyoriy)
            </label>
            <textarea
              id="declineNote"
              rows={3}
              maxLength={500}
              className="dd-input resize-y"
              placeholder="Masalan: bu vaqt band, boshqa vaqtni taklif qildim."
              value={declineNote}
              onChange={(e) => setDeclineNote(e.target.value)}
            />
            {dialogError ? <p className="mt-3 text-sm text-danger">{dialogError}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="dd-btn dd-btn-ghost"
                onClick={() => setDeclineFor(null)}
                disabled={busyId === declineFor.id}
              >
                Bekor qilish
              </button>
              <button
                type="button"
                className="dd-btn !border-danger/40 !bg-danger/10 !text-danger hover:!bg-danger/15"
                onClick={() => void declineBooking()}
                disabled={busyId === declineFor.id}
              >
                {busyId === declineFor.id ? "Rad etilmoqda…" : "Rad etish"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LinkChip({
  label,
  path,
  copied,
  onCopy,
  wide = false,
}: {
  label: string;
  path: string;
  copied: boolean;
  onCopy: () => void;
  wide?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 ${
        wide ? "w-full" : "min-w-0"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</p>
        <a
          href={path}
          target="_blank"
          rel="noreferrer"
          className="dd-mono block truncate text-xs font-semibold text-accent hover:underline"
        >
          {path}
        </a>
      </div>
      <button type="button" onClick={onCopy} className="dd-btn dd-btn-ghost shrink-0 !px-2.5 !py-1.5 text-xs">
        {copied ? "Nusxalandi" : "Nusxalash"}
      </button>
    </div>
  );
}

function RequestCard({
  booking,
  nowMs,
  busy,
  onConfirm,
  onDecline,
}: {
  booking: DoctorBookingDTO;
  nowMs: number;
  busy: boolean;
  onConfirm: (booking: DoctorBookingDTO) => void;
  onDecline: (booking: DoctorBookingDTO) => void;
}) {
  const isAudio = booking.reasonKind === "audio" && !!booking.audioData;
  return (
    <article className="dd-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="dd-display truncate text-lg font-bold text-ink">{booking.name || "Bemor"}</h3>
          {booking.phone ? (
            <a
              href={telHref(booking.phone)}
              className="dd-mono text-sm font-semibold text-accent hover:underline"
            >
              {booking.phone}
            </a>
          ) : (
            <p className="text-sm text-muted">Telefon ko&apos;rsatilmagan</p>
          )}
        </div>
        <span className="rounded-full bg-warn/10 px-2.5 py-1 text-xs font-bold text-warn">
          Tasdiqlanmagan
        </span>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">Sana</dt>
          <dd className="mt-0.5 font-semibold text-ink">{dayLabel(booking.date)}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">Vaqt</dt>
          <dd className="dd-mono mt-0.5 font-semibold text-ink">
            {fmtRange(booking.time, booking.duration)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">Manba</dt>
          <dd className="mt-0.5 text-ink-soft">
            {booking.clinicName ? booking.clinicName : "Tarmoq (mustaqil)"}
          </dd>
        </div>
      </dl>

      <div className="mt-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Sabab</p>
        {isAudio ? (
          <audio controls preload="none" src={booking.audioData} className="mt-1.5 w-full" />
        ) : booking.reason ? (
          <p className="mt-1.5 rounded-xl bg-surface-2 px-4 py-3 text-sm leading-relaxed text-ink-soft">
            “{booking.reason}”
          </p>
        ) : (
          <p className="mt-1.5 text-sm text-muted">Bemor sabab yozmagan.</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <span className="text-xs text-muted">
          {timeAgo(booking.createdAt, nowMs)}
          {booking.code ? <span className="dd-mono"> · {booking.code}</span> : null}
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onDecline(booking)}
            disabled={busy}
            className="dd-btn dd-btn-ghost !border-danger/30 !px-3.5 !py-2 text-sm !text-danger hover:!bg-danger/5"
          >
            Rad etish
          </button>
          <button
            type="button"
            onClick={() => onConfirm(booking)}
            disabled={busy}
            className="dd-btn dd-btn-primary !px-3.5 !py-2 text-sm"
          >
            {busy ? "Yuborilmoqda…" : "Tasdiqlash"}
          </button>
        </div>
      </div>
    </article>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="dd-card dd-noise px-6 py-12 text-center">
      <p className="dd-display text-lg font-bold text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">{text}</p>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="dd-card animate-pulse space-y-3 p-5">
      <div className="h-4 w-1/3 rounded bg-line" />
      <div className="h-3 w-2/3 rounded bg-line/70" />
      <div className="h-3 w-1/2 rounded bg-line/70" />
    </div>
  );
}

type KpiTone = "warn" | "accent" | "ok" | "gold";

const KPI_TONES: Record<KpiTone, { value: string; chip: string }> = {
  warn: { value: "text-warn", chip: "bg-warn/10 text-warn" },
  accent: { value: "text-accent", chip: "bg-accent-soft text-accent" },
  ok: { value: "text-ok", chip: "bg-ok/10 text-ok" },
  gold: { value: "text-gold", chip: "bg-gold/15 text-gold" },
};

function KpiCard({
  icon,
  label,
  value,
  hint,
  tone,
  delay,
}: {
  icon: "inbox" | "calendar" | "activity" | "wallet";
  label: string;
  value: string;
  hint: string;
  tone: KpiTone;
  delay: 1 | 2 | 3 | 4;
}) {
  const palette = KPI_TONES[tone];
  return (
    <div className={`dd-card dd-rise dd-rise-${delay} p-4`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted sm:text-[11px]">
          {label}
        </p>
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${palette.chip}`}>
          <KpiIcon kind={icon} />
        </span>
      </div>
      <p className={`dd-display mt-2 text-2xl font-extrabold sm:text-3xl ${palette.value}`}>
        {value}
      </p>
      <p className="mt-0.5 truncate text-xs text-muted">{hint}</p>
    </div>
  );
}

function KpiIcon({ kind }: { kind: "inbox" | "calendar" | "activity" | "wallet" }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === "inbox" ? (
        <>
          <path d="M4 13h4l2 3h4l2-3h4" />
          <path d="M5 5h14l1 8v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4l1-8Z" />
        </>
      ) : null}
      {kind === "calendar" ? (
        <>
          <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
          <path d="M8 3.5v3M16 3.5v3M3.5 9.5h17" />
          <path d="m9 14.5 2 2 4-4" />
        </>
      ) : null}
      {kind === "activity" ? <path d="M3 12h4l2-6 4 12 2-6h6" /> : null}
      {kind === "wallet" ? (
        <>
          <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 16.5v-9Z" />
          <path d="M4 7.5h14" />
          <circle cx="16.5" cy="13" r="1.2" />
        </>
      ) : null}
    </svg>
  );
}

type StatTone = "accent" | "ok" | "gold" | "warn";

const STAT_TONES: Record<StatTone, string> = {
  accent: "bg-accent-soft text-accent",
  ok: "bg-ok/10 text-ok",
  gold: "bg-gold/15 text-gold",
  warn: "bg-warn/10 text-warn",
};

function StatChip({ label, value, tone }: { label: string; value: number; tone: StatTone }) {
  return (
    <span
      className={`inline-flex items-baseline gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${STAT_TONES[tone]}`}
    >
      <b className="dd-display text-sm">{value}</b>
      {label}
    </span>
  );
}

function ChartCard({
  title,
  subtitle,
  className = "",
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`dd-card p-4 sm:p-5 ${className}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-ink">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
        </div>
        <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
          Tahlil
        </span>
      </div>
      {children}
    </section>
  );
}

function ChartSkeleton({ className = "h-40" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-surface-2 ${className}`} />;
}

function UpcomingList({ items, loading }: { items: DoctorBookingDTO[]; loading: boolean }) {
  if (loading) return <ChartSkeleton className="h-40" />;
  if (items.length === 0) {
    return (
      <div className="rounded-xl bg-surface-2 px-4 py-8 text-center">
        <p className="text-sm font-semibold text-ink">Tasdiqlangan qabullar yo&apos;q</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          So&apos;rovni tasdiqlang — keyingi qabullar shu yerda ko&apos;rinadi.
        </p>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-line/70">
      {items.map((booking) => {
        const [, month, day] = booking.date.split("-");
        return (
          <li key={booking.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-accent-soft text-accent">
              <span className="dd-display text-sm font-extrabold leading-none">{day}</span>
              <span className="mt-0.5 text-[9px] font-bold uppercase">
                {MONTHS[Number(month) - 1]?.slice(0, 3)}
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{booking.name || "Bemor"}</p>
              <p className="dd-mono text-xs text-muted">{fmtRange(booking.time, booking.duration)}</p>
            </div>
            <span className="shrink-0 rounded-full bg-ok/10 px-2 py-0.5 text-[10px] font-bold text-ok">
              OK
            </span>
          </li>
        );
      })}
    </ul>
  );
}
