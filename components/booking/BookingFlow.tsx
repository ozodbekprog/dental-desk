"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { DoctorDetail } from "@/lib/network";
import { Logo } from "@/components/Logo";
import {
  DAY_SHORT,
  MONTH_SHORT,
  digits,
  formatClock,
  formatDay,
  isClosedDay,
  money,
  parseYmd,
} from "./format";

type Sent = {
  kind: "clinic" | "doctor";
  statusUrl: string;
  code?: string;
  requestId?: string;
  doctorName: string;
  date: string;
  time: string;
  clinicName?: string;
};

function errorText(code: string, httpStatus: number): string {
  if (httpStatus === 429) return "Juda ko'p urinish. Bir soatdan keyin qayta urinib ko'ring.";
  switch (code) {
    case "slot_taken":
      return "Bu vaqt hozirgina band bo'ldi. Boshqa vaqtni tanlang.";
    case "duplicate":
      return "Bu telefon bilan shu vaqtga so'rov allaqachon yuborilgan.";
    case "too_many_open":
      return "Bu raqamda bir nechta ochiq so'rov bor. Iltimos, shifokor bilan bog'laning.";
    case "audio_too_large":
      return "Ovozli xabar juda katta. Qisqaroq yozib ko'ring.";
    case "audio_required":
      return "Ovozli xabar yozing yoki matn orqali yozing.";
    case "enter_name":
      return "Ismingizni kiriting (kamida 2 harf).";
    case "enter_phone":
      return "Telefon raqamini to'liq kiriting.";
    case "bad_date":
      return "Kun noto'g'ri. Ro'yxatdan boshqa kun tanlang.";
    case "bad_time":
      return "Vaqt noto'g'ri. Ro'yxatdan vaqt tanlang.";
    case "doctor_not_found":
      return "Shifokor topilmadi. Katalogga qaytib qayta urinib ko'ring.";
    default:
      return "So'rov yuborilmadi. Internetni tekshirib, qayta urinib ko'ring.";
  }
}

export function BookingFlow({ doctor }: { doctor: DoctorDetail }) {
  const [clinicId, setClinicId] = useState(doctor.clinics[0]?.id || "");
  const [date, setDate] = useState(
    () => doctor.days.find((d) => !isClosedDay(d)) || doctor.days[0] || doctor.today
  );
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsClosed, setSlotsClosed] = useState(false);
  const [slotsFailed, setSlotsFailed] = useState(false);
  const [slotTick, setSlotTick] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [reasonTab, setReasonTab] = useState<"text" | "audio">("text");
  const [reasonText, setReasonText] = useState("");
  const [audioData, setAudioData] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioSeconds, setAudioSeconds] = useState(0);
  const [recordingError, setRecordingError] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<Sent | null>(null);
  const [copied, setCopied] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const aliveRef = useRef(true);

  const place = doctor.clinics.find((c) => c.id === clinicId) || doctor.clinics[0] || null;
  const placeName = place ? place.name : doctor.place;
  const placeAddress = place ? place.address : doctor.address;

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          /* ignore */
        }
      }
      recorderRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    setSlotsLoading(true);
    setSlotsFailed(false);
    setSlots([]);
    const params = new URLSearchParams({ date });
    if (clinicId) params.set("clinicId", clinicId);
    fetch(`/api/network/doctors/${encodeURIComponent(doctor.id)}/slots?${params.toString()}`, {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((json: { slots?: string[]; closed?: boolean }) => {
        if (cancelled) return;
        setSlots(Array.isArray(json.slots) ? json.slots : []);
        setSlotsClosed(Boolean(json.closed));
      })
      .catch(() => {
        if (cancelled) return;
        setSlots([]);
        setSlotsFailed(true);
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [doctor.id, date, clinicId, slotTick]);

  function pickDate(value: string) {
    setDate(value);
    setTime("");
    setError("");
  }

  function pickClinic(id: string) {
    setClinicId(id);
    setTime("");
    setError("");
  }

  function pickMime(): string {
    if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
      return "";
    }
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
  }

  async function startRecording() {
    setError("");
    setRecordingError("");
    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function" ||
      typeof MediaRecorder === "undefined"
    ) {
      setRecordingError("Brauzeringiz ovoz yozishni qo'llab-quvvatlamaydi. Matn orqali yozing.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => finishRecording();
      recorderRef.current = recorder;
      recorder.start();
      setAudioData("");
      setAudioSeconds(0);
      setRecording(true);
      const startedAt = Date.now();
      timerRef.current = window.setInterval(() => {
        const seconds = Math.floor((Date.now() - startedAt) / 1000);
        setAudioSeconds(seconds);
        if (seconds >= 60) stopRecording();
      }, 250);
    } catch {
      setRecordingError("Mikrofonga ruxsat berilmadi. Brauzer sozlamalaridan ruxsat bering.");
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  function finishRecording() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const recorder = recorderRef.current;
    recorderRef.current = null;
    setRecording(false);
    const type = recorder?.mimeType || "audio/webm";
    const blob = new Blob(chunksRef.current, { type });
    chunksRef.current = [];
    if (!blob.size || !aliveRef.current) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (!aliveRef.current) return;
      const value = String(reader.result || "");
      if (!value.startsWith("data:audio/")) {
        setRecordingError("Ovoz yozib bo'lmadi. Qayta urinib ko'ring.");
        return;
      }
      if (value.length > 2_000_000) {
        setAudioData("");
        setRecordingError("Ovozli xabar juda katta. Qisqaroq yozib ko'ring.");
        return;
      }
      setRecordingError("");
      setAudioData(value);
    };
    reader.onerror = () => {
      if (aliveRef.current) setRecordingError("Ovoz faylini o'qib bo'lmadi.");
    };
    reader.readAsDataURL(blob);
  }

  function removeAudio() {
    setAudioData("");
    setAudioSeconds(0);
    setRecordingError("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!date || !time) {
      setError("Kun va vaqtni tanlang.");
      return;
    }
    if (name.trim().length < 2) {
      setError("Ismingizni kiriting (kamida 2 harf).");
      return;
    }
    if (digits(phone).length < 7) {
      setError("Telefon raqamini to'liq kiriting.");
      return;
    }
    if (reasonTab === "audio" && !audioData) {
      setError("Ovozli xabar yozing yoki matn orqali yozing.");
      return;
    }
    if (reasonTab === "audio" && recording) {
      setError("Avval yozishni to'xtating.");
      return;
    }

    const kind = reasonTab === "audio" ? "audio" : reasonText.trim() ? "text" : "";
    setSending(true);
    try {
      const res = await fetch("/api/network/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: doctor.id,
          clinicId: clinicId || undefined,
          name: name.trim(),
          phone,
          date,
          time,
          reasonKind: kind,
          reasonText: kind === "text" ? reasonText.trim() : "",
          audioData: kind === "audio" ? audioData : "",
          lang: "uz",
        }),
      });
      const json = (await res.json().catch(() => ({}))) as Partial<Sent> & { error?: string };
      if (!res.ok || !json.statusUrl) {
        if (json.error === "slot_taken" || json.error === "bad_time") {
          setTime("");
          setSlotTick((n) => n + 1);
        }
        setError(errorText(json.error || "", res.status));
        return;
      }
      setSent({
        kind: json.kind === "clinic" ? "clinic" : "doctor",
        statusUrl: json.statusUrl,
        code: json.code,
        requestId: json.requestId,
        doctorName: json.doctorName || doctor.name,
        date: json.date || date,
        time: json.time || time,
        clinicName: json.clinicName || (place ? place.name : undefined),
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("So'rov yuborilmadi. Internetni tekshirib, qayta urinib ko'ring.");
    } finally {
      setSending(false);
    }
  }

  async function copyLink() {
    if (!sent) return;
    const url = `${window.location.origin}${sent.statusUrl}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Havolani nusxalab bo'lmadi. Qo'lda nusxalang.");
    }
  }

  function reset() {
    setSent(null);
    setTime("");
    setReasonText("");
    setReasonTab("text");
    removeAudio();
    setError("");
    setCopied(false);
    setSlotTick((n) => n + 1);
  }

  const header = (
    <header className="border-b border-line bg-surface/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-5 py-4">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-white shadow-sm">
          <Logo className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="dd-display truncate text-lg font-extrabold leading-tight text-ink">
            Dental Desk
          </p>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Shifokor qabuli
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-ok/25 bg-ok/10 px-3 py-1 text-xs font-semibold text-ok sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-ok" />
            Akkaunt shart emas
          </span>
          <Link href="/bron" className="dd-btn dd-btn-ghost text-sm">
            Katalog
          </Link>
        </div>
      </div>
    </header>
  );

  const footer = (
    <footer className="mt-12 border-t border-line py-6 text-center text-xs text-muted">
      Dental Desk · Xoshimov Group
    </footer>
  );

  if (sent) {
    const reference = sent.code || sent.requestId || "";
    return (
      <div className="min-h-screen bg-bg text-ink">
        {header}
        <main className="mx-auto max-w-xl px-5 py-10 sm:py-12">
          <div className="dd-card overflow-hidden p-6 text-center sm:p-9">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-warn/10 text-warn">
              <svg
                viewBox="0 0 24 24"
                className="h-8 w-8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 8v5" />
                <path d="M12 17h.01" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>
            <h1 className="dd-display mt-5 text-2xl font-extrabold">{"So'rov yuborildi"}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {"Shifokor yoki qabulxona so'rovni tasdiqlashi kerak. Tasdiqlangandan keyin kelishingiz mumkin — tasdiqlashsiz kelmang."}
            </p>

            <dl className="mt-6 grid gap-2 rounded-2xl border border-line bg-surface-2 p-4 text-left text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Shifokor</dt>
                <dd className="text-right font-semibold text-ink">{sent.doctorName}</dd>
              </div>
              {sent.clinicName ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Joy</dt>
                  <dd className="text-right font-semibold text-ink">{sent.clinicName}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Kun</dt>
                <dd className="font-semibold text-ink">{formatDay(sent.date)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Vaqt</dt>
                <dd className="dd-mono font-semibold text-ink">{sent.time}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-line pt-2">
                <dt className="text-muted">{sent.code ? "So'rov kodi" : "So'rov raqami"}</dt>
                <dd className="dd-mono text-xs font-semibold text-accent">{reference}</dd>
              </div>
            </dl>

            <div className="mt-6 grid gap-2">
              <Link href={sent.statusUrl} className="dd-btn dd-btn-primary w-full">
                Holatni ko'rish
              </Link>
              <button type="button" onClick={copyLink} className="dd-btn dd-btn-ghost w-full">
                {copied ? "Havola nusxalandi" : "Havolani nusxalash"}
              </button>
              <button type="button" onClick={reset} className="dd-btn dd-btn-ghost w-full">
                Yana yozilish
              </button>
            </div>

            {error ? (
              <p role="alert" className="mt-3 text-sm font-medium text-danger">
                {error}
              </p>
            ) : null}
            <p className="mt-4 text-xs text-muted">
              {"Holat sahifasida so'rov tasdiqlanganini va manzilni ko'rish mumkin."}
            </p>
          </div>
        </main>
        {footer}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      {header}
      <main className="mx-auto max-w-6xl px-5 py-7">
        <nav className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
          <Link href="/bron" className="hover:text-accent">
            Katalog
          </Link>
          <span aria-hidden="true">/</span>
          <span className="truncate text-ink">{doctor.name}</span>
        </nav>

        <section className="dd-card mt-4 overflow-hidden">
          <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-[auto_minmax(0,1fr)]">
            {doctor.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={doctor.photoUrl}
                alt={doctor.name}
                className="h-20 w-20 rounded-2xl border border-line object-cover sm:h-24 sm:w-24"
              />
            ) : (
              <span className="dd-display grid h-20 w-20 place-items-center rounded-2xl bg-accent-soft text-2xl font-extrabold text-accent sm:h-24 sm:w-24">
                {doctor.name
                  .replace(/^dr\.?\s*/i, "")
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part.charAt(0).toUpperCase())
                  .join("")}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
                {doctor.specialtyLabel}
              </p>
              <h1 className="dd-display mt-1 truncate text-2xl font-extrabold leading-tight sm:text-3xl">
                {doctor.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                <span className="inline-flex items-center gap-1 font-semibold text-ink">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 text-gold"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9L12 2.5z" />
                  </svg>
                  {doctor.ratingCount ? doctor.rating.toFixed(1) : "Yangi"}
                  {doctor.ratingCount ? (
                    <span className="font-normal text-muted">({doctor.ratingCount})</span>
                  ) : null}
                </span>
                {doctor.experience ? <span>{doctor.experience} yil tajriba</span> : null}
                <span className="inline-flex items-center gap-1">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 text-muted"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                  {placeName || "Manzil keyinroq"}
                </span>
                {doctor.priceFrom ? (
                  <span className="font-semibold text-accent">
                    {money(doctor.priceFrom)} {"so'mdan"}
                  </span>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-ok/25 bg-ok/10 px-3 py-1 text-xs font-semibold text-ok">
                  <span className="h-1.5 w-1.5 rounded-full bg-ok" />
                  Akkaunt shart emas
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface-2 px-3 py-1 text-xs font-semibold text-muted">
                  Tasdiqlashdan keyin qabul
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="grid min-w-0 gap-4">
            <section className="dd-card min-w-0 p-5 sm:p-6">
              <Step n={1} label="Qabul joyi" />
              {doctor.clinics.length > 1 ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {doctor.clinics.map((clinic) => (
                    <button
                      key={clinic.id}
                      type="button"
                      onClick={() => pickClinic(clinic.id)}
                      aria-pressed={clinicId === clinic.id}
                      className={`rounded-xl border p-3 text-left transition ${
                        clinicId === clinic.id
                          ? "border-accent bg-accent-soft shadow-[inset_0_0_0_1px_var(--color-accent)]"
                          : "border-line-strong bg-surface hover:border-accent"
                      }`}
                    >
                      <span className="dd-display block truncate font-bold text-ink">
                        {clinic.name}
                      </span>
                      <span className="mt-0.5 block text-xs leading-snug text-muted">
                        {clinic.address || "Manzil tasdiqlangach ko'rinadi"}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3 text-sm">
                  <p className="font-semibold text-ink">{placeName || "Shifokor qabuli"}</p>
                  <p className="mt-0.5 text-xs leading-snug text-muted">
                    {placeAddress || "Aniq manzil tasdiqlangach yuboriladi"}
                  </p>
                  {place?.phone ? (
                    <a
                      href={`tel:${place.phone.replace(/\s+/g, "")}`}
                      className="mt-1 inline-block text-xs font-semibold text-accent"
                    >
                      {place.phone}
                    </a>
                  ) : null}
                </div>
              )}
            </section>

            <section className="dd-card min-w-0 p-5 sm:p-6">
              <Step n={2} label="Kun" />
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {doctor.days.map((day) => {
                  const off = isClosedDay(day);
                  const active = date === day;
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={off}
                      onClick={() => pickDate(day)}
                      aria-pressed={active}
                      title={off ? "Yakshanba — dam olish kuni" : formatDay(day)}
                      className={`min-w-[74px] shrink-0 rounded-xl border px-3 py-2 text-center transition ${
                        off
                          ? "cursor-not-allowed border-line bg-surface-2 text-muted/50 line-through"
                          : active
                            ? "border-accent bg-accent text-white"
                            : "border-line-strong bg-surface text-ink hover:border-accent"
                      }`}
                    >
                      <span className="block text-[11px] font-semibold uppercase tracking-wide opacity-80">
                        {DAY_SHORT[parseYmd(day).getDay()]}
                      </span>
                      <span className="dd-display block text-lg font-extrabold leading-tight">
                        {parseYmd(day).getDate()}
                      </span>
                      <span className="block text-[11px] opacity-80">
                        {day === doctor.today ? "Bugun" : MONTH_SHORT[parseYmd(day).getMonth()]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="dd-card min-w-0 p-5 sm:p-6">
              <Step n={3} label="Bo'sh vaqt" />
              {slotsLoading ? (
                <p className="mt-3 text-sm text-muted">{"Bo'sh vaqtlar yuklanmoqda…"}</p>
              ) : slotsFailed ? (
                <div className="mt-3 rounded-lg bg-warn/10 px-3 py-2 text-sm text-warn">
                  <p>{"Vaqtlarni yuklab bo'lmadi."}</p>
                  <button
                    type="button"
                    onClick={() => setSlotTick((n) => n + 1)}
                    className="mt-1 font-semibold underline"
                  >
                    Qayta urinish
                  </button>
                </div>
              ) : slots.length ? (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {slots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => {
                        setTime(slot);
                        setError("");
                      }}
                      aria-pressed={time === slot}
                      className={`dd-mono rounded-lg border py-2 text-sm font-semibold transition ${
                        time === slot
                          ? "border-accent bg-accent text-white"
                          : "border-line-strong bg-surface text-ink hover:border-accent hover:text-accent"
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-lg bg-warn/10 px-3 py-2 text-sm text-warn">
                  {slotsClosed
                    ? "Yakshanba — dam olish kuni."
                    : "Bu kunda bo'sh vaqt yo'q. Boshqa kun tanlang."}
                </p>
              )}
              <p className="mt-3 text-xs text-muted">
                {"Tanlangan vaqt so'rov yuborilgandan keyin 2 soat davomida ushlab turiladi. Qabulxona tasdiqlashi shart."}
              </p>
            </section>
          </div>

          <aside className="lg:sticky lg:top-6">
            <form onSubmit={submit} className="dd-card p-5 sm:p-6">
              <Step n={4} label="Ma'lumotlaringiz" />

              <div className="mt-4 rounded-xl border border-line bg-surface-2 p-3 text-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                  Tanlovingiz
                </p>
                <div className="mt-1.5 grid gap-1">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted">Joy</span>
                    <span className="truncate font-semibold text-ink">
                      {placeName || "Tanlanmagan"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted">Kun</span>
                    <span className="font-semibold text-ink">
                      {date ? formatDay(date) : "Tanlanmagan"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted">Vaqt</span>
                    <span className="dd-mono font-semibold text-accent">
                      {time || "Tanlanmagan"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <label className="grid gap-1.5 text-sm">
                  <span className="font-semibold text-ink">Ismingiz</span>
                  <input
                    className="dd-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    maxLength={80}
                    required
                  />
                </label>
                <label className="grid gap-1.5 text-sm">
                  <span className="font-semibold text-ink">Telefon raqamingiz</span>
                  <input
                    className="dd-input"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                    placeholder="+998 90 123 45 67"
                    maxLength={32}
                    required
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-1.5 text-sm">
                <span className="font-semibold text-ink">
                  Murojaat sababi{" "}
                  <span className="font-normal text-muted">(ixtiyoriy)</span>
                </span>
                <div
                  role="tablist"
                  aria-label="Murojaat sababi turi"
                  className="flex items-center rounded-lg border border-line-strong bg-surface p-0.5"
                >
                  {(["text", "audio"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={reasonTab === tab}
                      onClick={() => setReasonTab(tab)}
                      className={`flex-1 rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                        reasonTab === tab ? "bg-accent text-white" : "text-muted hover:text-ink"
                      }`}
                    >
                      {tab === "text" ? "Matn" : "Ovozli xabar"}
                    </button>
                  ))}
                </div>

                {reasonTab === "text" ? (
                  <div className="grid gap-1">
                    <textarea
                      className="dd-input min-h-[92px] resize-y"
                      value={reasonText}
                      onChange={(e) => setReasonText(e.target.value.slice(0, 500))}
                      maxLength={500}
                      placeholder="Masalan: pastki jag'da og'riq bor, kechqurun kuchayadi."
                    />
                    <span className="text-right text-[11px] text-muted">
                      {reasonText.length}/500
                    </span>
                  </div>
                ) : (
                  <div className="rounded-xl border border-line bg-surface-2 p-3">
                    {audioData ? (
                      <div className="grid gap-2">
                        <audio controls src={audioData} className="w-full">
                          {"Brauzeringiz audio pleyerni qo'llab-quvvatlamaydi."}
                        </audio>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-ok">
                            Ovozli xabar tayyor
                          </span>
                          <button
                            type="button"
                            onClick={removeAudio}
                            className="text-xs font-bold text-danger hover:underline"
                          >
                            O'chirish
                          </button>
                        </div>
                      </div>
                    ) : recording ? (
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2 text-sm font-semibold text-danger">
                          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-danger" />
                          Yozilmoqda
                          <span className="dd-mono text-ink">{formatClock(audioSeconds)}</span>
                        </span>
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="dd-btn dd-btn-ghost px-3 py-1.5 text-xs"
                        >
                          To'xtatish
                        </button>
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        <button
                          type="button"
                          onClick={startRecording}
                          className="dd-btn dd-btn-ghost w-full"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.9"
                            strokeLinecap="round"
                            aria-hidden="true"
                          >
                            <rect x="9" y="3" width="6" height="11" rx="3" />
                            <path d="M5 11a7 7 0 0 0 14 0" />
                            <path d="M12 18v3" />
                          </svg>
                          Yozishni boshlash
                        </button>
                        <p className="text-center text-[11px] text-muted">
                          Mikrofon orqali, maksimal 60 soniya. Yozuvni eshitib tekshirishingiz mumkin.
                        </p>
                      </div>
                    )}
                    {recordingError ? (
                      <p role="alert" className="mt-2 text-xs font-medium text-danger">
                        {recordingError}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>

              {error ? (
                <p
                  role="alert"
                  className="mt-3 rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-sm font-medium text-danger"
                >
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={sending || recording}
                className="dd-btn dd-btn-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? "Yuborilmoqda…" : "So'rov yuborish"}
              </button>
              <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">
                {"Akkaunt shart emas. So'rov yuborilgach shifokor yoki qabulxona tasdiqlaydi — shundan keyin kelishingiz mumkin."}
              </p>
            </form>
          </aside>
        </div>
      </main>
      {footer}
    </div>
  );
}

function Step({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="dd-mono grid h-6 w-6 place-items-center rounded-full bg-accent text-xs font-bold text-white">
        {n}
      </span>
      <h2 className="dd-display text-base font-bold text-ink">{label}</h2>
    </div>
  );
}
