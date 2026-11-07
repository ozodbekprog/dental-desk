"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/Logo";
import type { DoctorBookingDTO, DoctorProfileDTO } from "./types";

type Tab = "requests" | "schedule" | "profile";

type Props = {
  me: { name: string; email: string };
  initialProfile: DoctorProfileDTO | null;
};

const TABS: { key: Tab; label: string }[] = [
  { key: "requests", label: "So'rovlar" },
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

export function DoctorDashboard({ me, initialProfile }: Props) {
  const [tab, setTab] = useState<Tab>("requests");
  const [profile, setProfile] = useState<DoctorProfileDTO | null>(initialProfile);
  const [bookings, setBookings] = useState<DoctorBookingDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
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

  useEffect(() => {
    if (!initialProfile) {
      setLoading(false);
      return;
    }
    void load();
  }, [initialProfile, load]);

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

  const confirmedCount = useMemo(
    () => bookings.filter((booking) => booking.status === "confirmed").length,
    [bookings]
  );
  const declinedCount = useMemo(
    () => bookings.filter((booking) => booking.status === "declined").length,
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
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
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

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
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
            <section className="grid grid-cols-3 gap-3">
              {[
                { label: "Yangi so'rovlar", value: pending.length, tone: "text-warn" },
                { label: "Tasdiqlangan", value: confirmedCount, tone: "text-ok" },
                { label: "Rad etilgan", value: declinedCount, tone: "text-muted" },
              ].map((item) => (
                <div key={item.label} className="dd-card px-4 py-3.5">
                  <p className={`dd-display text-2xl font-extrabold ${item.tone}`}>{item.value}</p>
                  <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted sm:text-xs">
                    {item.label}
                  </p>
                </div>
              ))}
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
              <div role="tablist" aria-label="Kabinet bo'limlari" className="flex gap-1 rounded-2xl border border-line bg-surface p-1">
                {TABS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={tab === item.key}
                    onClick={() => setTab(item.key)}
                    className={`dd-btn !px-3.5 !py-2 text-sm ${
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
                            <span className="self-start rounded-full bg-ok/10 px-2.5 py-1 text-[11px] font-bold text-ok">
                              Tasdiqlangan
                            </span>
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
                        <p className="mt-1 text-xs text-muted">0 — narx kelishiladi.</p>
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
                      <p className="mt-1 text-right text-xs text-muted">{form.bio.length}/1000</p>
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
