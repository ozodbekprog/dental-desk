"use client";

import { useEffect, useMemo, useState } from "react";
import type { PublicClinicInfo } from "@/lib/booking";
import { Logo } from "./Logo";

type Lang = "uz" | "ru" | "en";

type Copy = {
  badge: string;
  title: string;
  subtitle: string;
  step1: string;
  step2: string;
  step3: string;
  step4: string;
  chooseDoctor: string;
  noDoctors: string;
  loadingSlots: string;
  noSlots: string;
  closedDay: string;
  name: string;
  phone: string;
  phonePh: string;
  reason: string;
  reasonChoose: string;
  reasonOther: string;
  submit: string;
  sending: string;
  note: string;
  required: string;
  phoneError: string;
  taken: string;
  duplicate: string;
  tooMany: string;
  genericError: string;
  summary: string;
  notChosen: string;
  sentTitle: string;
  sentSub: string;
  sentCode: string;
  again: string;
  closedTitle: string;
  closedSub: string;
  online: string;
  privacy: string;
  footer: string;
  today: string;
  minute: string;
};

const COPY: Record<Lang, Copy> = {
  uz: {
    badge: "Onlayn qabul",
    title: "Qabulga yoziling",
    subtitle:
      "Shifokorni tanlang, bo'sh vaqtni ko'ring va so'rov qoldiring. Qabulxona yoki call markaz siz bilan bog'lanib vaqtni tasdiqlaydi.",
    step1: "Shifokor",
    step2: "Kun",
    step3: "Bo'sh vaqt",
    step4: "Ma'lumotlaringiz",
    chooseDoctor: "Shifokorni tanlang",
    noDoctors: "Hozircha shifokorlar qo'shilmagan. Klinika bilan telefon orqali bog'laning.",
    loadingSlots: "Bo'sh vaqtlar yuklanmoqda…",
    noSlots: "Bu kunda bo'sh vaqt yo'q. Boshqa kun tanlang.",
    closedDay: "Yakshanba — dam olish kuni.",
    name: "Ismingiz",
    phone: "Telefon raqamingiz",
    phonePh: "+998 90 123 45 67",
    reason: "Murojaat sababi",
    reasonChoose: "Tanlang (ixtiyoriy)",
    reasonOther: "Sababni qisqa yozing",
    submit: "So'rov yuborish",
    sending: "Yuborilmoqda…",
    note: "So'rov yuborilgach, qabulxona sizga qo'ng'iroq qilib vaqtni tasdiqlaydi. Bu hali yakuniy yozilish emas.",
    required: "Shifokor, kun, vaqt, ism va telefonni kiriting.",
    phoneError: "Telefon raqamini to'liq kiriting.",
    taken: "Bu vaqt hozirgina band bo'ldi. Boshqa vaqtni tanlang.",
    duplicate: "Bu telefon bilan shu vaqtga so'rov allaqachon yuborilgan.",
    tooMany: "Bu raqamda bir nechta ochiq so'rov bor. Klinika bilan bog'laning.",
    genericError: "So'rov yuborilmadi. Qayta urinib ko'ring.",
    summary: "Tanlovingiz",
    notChosen: "Tanlanmagan",
    sentTitle: "So'rov qabul qilindi",
    sentSub: "Klinika qabulxonasi tez orada siz bilan bog'lanib vaqtni tasdiqlaydi.",
    sentCode: "So'rov raqami",
    again: "Yana so'rov yuborish",
    closedTitle: "Onlayn yozilish vaqtincha yopiq",
    closedSub: "Klinika bilan telefon orqali bog'lanib qabulga yoziling.",
    online: "Onlayn so'rov",
    privacy: "Ma'lumotlaringiz faqat qabul uchun ishlatiladi.",
    footer: "Dental Desk · Xoshimov Group",
    today: "Bugun",
    minute: "daq",
  },
  ru: {
    badge: "Онлайн-запись",
    title: "Запишитесь на приём",
    subtitle:
      "Выберите врача, свободное время и оставьте заявку. Администратор или call-центр свяжется с вами и подтвердит запись.",
    step1: "Врач",
    step2: "День",
    step3: "Свободное время",
    step4: "Ваши данные",
    chooseDoctor: "Выберите врача",
    noDoctors: "Врачи пока не добавлены. Свяжитесь с клиникой по телефону.",
    loadingSlots: "Загружаем свободное время…",
    noSlots: "На этот день свободного времени нет. Выберите другой день.",
    closedDay: "Воскресенье — выходной.",
    name: "Ваше имя",
    phone: "Ваш телефон",
    phonePh: "+998 90 123 45 67",
    reason: "Причина обращения",
    reasonChoose: "Выберите (необязательно)",
    reasonOther: "Кратко опишите причину",
    submit: "Отправить заявку",
    sending: "Отправляем…",
    note: "После отправки администратор позвонит и подтвердит время. Это ещё не окончательная запись.",
    required: "Укажите врача, день, время, имя и телефон.",
    phoneError: "Введите номер телефона полностью.",
    taken: "Это время только что заняли. Выберите другое.",
    duplicate: "По этому номеру уже есть заявка на это время.",
    tooMany: "По этому номеру уже есть несколько открытых заявок. Свяжитесь с клиникой.",
    genericError: "Заявка не отправлена. Попробуйте ещё раз.",
    summary: "Ваш выбор",
    notChosen: "Не выбрано",
    sentTitle: "Заявка принята",
    sentSub: "Администратор клиники скоро свяжется с вами и подтвердит время.",
    sentCode: "Номер заявки",
    again: "Отправить ещё одну заявку",
    closedTitle: "Онлайн-запись временно закрыта",
    closedSub: "Свяжитесь с клиникой по телефону, чтобы записаться.",
    online: "Онлайн-заявка",
    privacy: "Ваши данные используются только для записи.",
    footer: "Dental Desk · Xoshimov Group",
    today: "Сегодня",
    minute: "мин",
  },
  en: {
    badge: "Online booking",
    title: "Book an appointment",
    subtitle:
      "Choose a doctor, a free time and leave a request. Reception or the call centre will contact you and confirm the appointment.",
    step1: "Doctor",
    step2: "Day",
    step3: "Free time",
    step4: "Your details",
    chooseDoctor: "Choose a doctor",
    noDoctors: "No doctors have been added yet. Please call the clinic.",
    loadingSlots: "Loading free times…",
    noSlots: "No free times on this day. Pick another day.",
    closedDay: "Sunday is a day off.",
    name: "Your name",
    phone: "Your phone",
    phonePh: "+998 90 123 45 67",
    reason: "Reason for the visit",
    reasonChoose: "Choose (optional)",
    reasonOther: "Short reason",
    submit: "Send request",
    sending: "Sending…",
    note: "After you send it, reception will call and confirm the time. This is not a final appointment yet.",
    required: "Choose a doctor, day and time, and enter your name and phone.",
    phoneError: "Enter the full phone number.",
    taken: "Someone just took that time. Choose another.",
    duplicate: "A request with this phone already exists for that time.",
    tooMany: "This phone has several open requests. Please contact the clinic.",
    genericError: "The request was not sent. Please try again.",
    summary: "Your choice",
    notChosen: "Not chosen",
    sentTitle: "Request received",
    sentSub: "Clinic reception will contact you shortly and confirm the time.",
    sentCode: "Request number",
    again: "Send another request",
    closedTitle: "Online booking is temporarily closed",
    closedSub: "Please call the clinic to book an appointment.",
    online: "Online request",
    privacy: "Your details are used only for this appointment.",
    footer: "Dental Desk · Xoshimov Group",
    today: "Today",
    minute: "min",
  },
};

const REASONS: { id: string; uz: string; ru: string; en: string }[] = [
  { id: "checkup", uz: "Profilaktik ko'rik", ru: "Профилактический осмотр", en: "Check-up" },
  { id: "pain", uz: "Tish og'rig'i", ru: "Зубная боль", en: "Tooth pain" },
  { id: "cleaning", uz: "Tishlarni tozalash", ru: "Чистка зубов", en: "Cleaning" },
  { id: "filling", uz: "Plomba", ru: "Пломбирование", en: "Filling" },
  { id: "rootcanal", uz: "Kanal davolash", ru: "Лечение каналов", en: "Root canal" },
  { id: "extraction", uz: "Tishni olish", ru: "Удаление зуба", en: "Extraction" },
  { id: "crown", uz: "Koronka yoki protez", ru: "Коронка или протез", en: "Crown" },
  { id: "consult", uz: "Maslahat", ru: "Консультация", en: "Consultation" },
  { id: "emergency", uz: "Shoshilinch yordam", ru: "Срочная помощь", en: "Emergency" },
];

const DAYS = {
  uz: ["Yak", "Dush", "Sesh", "Chor", "Pay", "Jum", "Shan"],
  ru: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};
const MONTHS = {
  uz: ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"],
  ru: ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};
const SPECS: Record<string, Record<Lang, string>> = {
  dentist: { uz: "Stomatolog", ru: "Стоматолог", en: "Dentist" },
  therapist: { uz: "Terapevt", ru: "Терапевт", en: "Therapist" },
  surgeon: { uz: "Jarroh", ru: "Хирург", en: "Surgeon" },
  orthodontist: { uz: "Ortodont", ru: "Ортодонт", en: "Orthodontist" },
  pediatric: { uz: "Bolalar stomatologi", ru: "Детский стоматолог", en: "Pediatric dentist" },
  prosth: { uz: "Ortoped", ru: "Ортопед", en: "Prosthodontist" },
  hygienist: { uz: "Gigiyenist", ru: "Гигиенист", en: "Hygienist" },
};

function parseYmd(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function isClosed(date: string): boolean {
  return parseYmd(date).getDay() === 0;
}
function formatDay(date: string, lang: Lang): string {
  const d = parseYmd(date);
  return `${DAYS[lang][d.getDay()]}, ${d.getDate()} ${MONTHS[lang][d.getMonth()]}`;
}
function digits(value: string): string {
  return value.replace(/\D+/g, "");
}

export function PublicBooking({ info }: { info: PublicClinicInfo }) {
  const [lang, setLang] = useState<Lang>("uz");
  const [doctorId, setDoctorId] = useState(info.doctors[0]?.id || "");
  const [date, setDate] = useState(
    () => info.days.find((d) => !isClosed(d)) || info.days[0] || ""
  );
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotTick, setSlotTick] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [reasonOther, setReasonOther] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<
    { name: string; doctorName: string; date: string; time: string; id: string } | null
  >(null);

  const c = COPY[lang];
  const doctor = useMemo(
    () => info.doctors.find((d) => d.id === doctorId) || null,
    [doctorId, info.doctors]
  );
  const closed = isClosed(date);

  useEffect(() => {
    const saved = localStorage.getItem("dd_pub_lang");
    if (saved === "uz" || saved === "ru" || saved === "en") setLang(saved);
  }, []);

  useEffect(() => {
    if (!info.open || !doctorId || !date) return;
    let cancelled = false;
    setSlotsLoading(true);
    setSlots([]);
    fetch(
      `/api/public/${encodeURIComponent(info.clinic.slug)}/slots?doctorId=${encodeURIComponent(
        doctorId
      )}&date=${date}`,
      { cache: "no-store" }
    )
      .then((res) => res.json())
      .then((json: { slots?: string[] }) => {
        if (!cancelled) setSlots(Array.isArray(json.slots) ? json.slots : []);
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [info.open, info.clinic.slug, doctorId, date, slotTick]);

  function changeLang(next: Lang) {
    setLang(next);
    try {
      localStorage.setItem("dd_pub_lang", next);
    } catch {
      /* storage can be unavailable */
    }
  }

  function pickDoctor(id: string) {
    setDoctorId(id);
    setTime("");
    setError("");
  }

  function pickDate(value: string) {
    setDate(value);
    setTime("");
    setError("");
  }

  function errorText(code: string): string {
    if (code === "slot_taken") return c.taken;
    if (code === "duplicate") return c.duplicate;
    if (code === "too_many_open") return c.tooMany;
    if (code === "enter_name") return c.required;
    if (code === "enter_phone") return c.phoneError;
    if (code === "booking_closed") return c.closedTitle;
    return c.genericError;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!doctorId || !date || !time) {
      setError(c.required);
      return;
    }
    if (name.trim().length < 2) {
      setError(c.required);
      return;
    }
    if (digits(phone).length < 7) {
      setError(c.phoneError);
      return;
    }

    setSending(true);
    try {
      const res = await fetch(
        `/api/public/${encodeURIComponent(info.clinic.slug)}/request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            phone,
            doctorId,
            date,
            time,
            reason,
            reasonOther,
            lang,
          }),
        }
      );
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        request?: {
          id: string;
          name: string;
          doctorName: string;
          date: string;
          time: string;
        };
      };
      if (!res.ok || !json.request) {
        if (json.error === "slot_taken" || json.error === "duplicate") {
          setTime("");
          setSlotTick((n) => n + 1);
        }
        setError(errorText(json.error || ""));
        return;
      }
      setSent(json.request);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError(c.genericError);
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setSent(null);
    setTime("");
    setReason("");
    setReasonOther("");
    setError("");
    setSlotTick((n) => n + 1);
  }

  const langSwitch = (
    <div className="flex items-center rounded-lg border border-line-strong bg-surface p-0.5">
      {(["uz", "ru", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => changeLang(l)}
          aria-pressed={lang === l}
          className={`rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wide transition ${
            lang === l ? "bg-accent text-white" : "text-muted hover:text-ink"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );

  const header = (
    <header className="border-b border-line bg-surface/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-5 py-4">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-white shadow-sm">
          <Logo className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="dd-display truncate text-lg font-extrabold leading-tight text-ink">
            {info.clinic.name}
          </p>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            {c.badge}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-ok/25 bg-ok/10 px-3 py-1 text-xs font-semibold text-ok sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-ok" />
            {c.online}
          </span>
          {langSwitch}
        </div>
      </div>
    </header>
  );

  const footer = (
    <footer className="mt-12 border-t border-line py-6 text-center text-xs text-muted">
      {c.footer}
    </footer>
  );

  if (sent) {
    return (
      <div className="min-h-screen bg-bg text-ink">
        {header}
        <main className="mx-auto max-w-xl px-5 py-12">
          <div className="dd-card overflow-hidden p-7 text-center sm:p-9">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-ok/10 text-ok">
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h1 className="dd-display mt-5 text-2xl font-extrabold">{c.sentTitle}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">{c.sentSub}</p>

            <dl className="mt-6 grid gap-2 rounded-2xl border border-line bg-surface-2 p-4 text-left text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">{c.step1}</dt>
                <dd className="font-semibold text-ink">{sent.doctorName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">{c.step2}</dt>
                <dd className="font-semibold text-ink">{formatDay(sent.date, lang)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">{c.step3}</dt>
                <dd className="dd-mono font-semibold text-ink">{sent.time}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-line pt-2">
                <dt className="text-muted">{c.sentCode}</dt>
                <dd className="dd-mono text-xs font-semibold text-accent">{sent.id}</dd>
              </div>
            </dl>

            <button type="button" onClick={reset} className="dd-btn dd-btn-primary mt-6 w-full">
              {c.again}
            </button>
            <p className="mt-4 text-xs text-muted">{c.privacy}</p>
          </div>
        </main>
        {footer}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      {header}
      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
            Dental Desk
          </p>
          <h1 className="dd-display mt-1 text-3xl font-extrabold leading-tight sm:text-4xl">
            {c.title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">{c.subtitle}</p>
        </div>

        {!info.open ? (
          <div className="dd-card mt-7 max-w-2xl p-6">
            <h2 className="dd-display text-xl font-bold text-danger">{c.closedTitle}</h2>
            <p className="mt-2 text-sm text-muted">{c.closedSub}</p>
          </div>
        ) : (
          <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="grid min-w-0 gap-4">
              <section className="dd-card min-w-0 p-5 sm:p-6">
                <Step n={1} label={c.step1} />
                {info.doctors.length ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {info.doctors.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => pickDoctor(d.id)}
                        aria-pressed={doctorId === d.id}
                        className={`rounded-xl border p-3 text-left transition ${
                          doctorId === d.id
                            ? "border-accent bg-accent-soft shadow-[inset_0_0_0_1px_var(--color-accent)]"
                            : "border-line-strong bg-surface hover:border-accent"
                        }`}
                      >
                        <span className="dd-display block font-bold text-ink">{d.name}</span>
                        <span className="mt-0.5 block text-xs text-muted">
                          {SPECS[d.spec]?.[lang] || d.spec}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted">{c.noDoctors}</p>
                )}
              </section>

              <section className="dd-card min-w-0 p-5 sm:p-6">
                <Step n={2} label={c.step2} />
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {info.days.map((d) => {
                    const off = isClosed(d);
                    const active = date === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        disabled={off}
                        onClick={() => pickDate(d)}
                        aria-pressed={active}
                        title={off ? c.closedDay : formatDay(d, lang)}
                        className={`min-w-[74px] shrink-0 rounded-xl border px-3 py-2 text-center transition ${
                          off
                            ? "cursor-not-allowed border-line bg-surface-2 text-muted/50 line-through"
                            : active
                              ? "border-accent bg-accent text-white"
                              : "border-line-strong bg-surface text-ink hover:border-accent"
                        }`}
                      >
                        <span className="block text-[11px] font-semibold uppercase tracking-wide opacity-80">
                          {DAYS[lang][parseYmd(d).getDay()]}
                        </span>
                        <span className="dd-display block text-lg font-extrabold leading-tight">
                          {parseYmd(d).getDate()}
                        </span>
                        <span className="block text-[11px] opacity-80">
                          {MONTHS[lang][parseYmd(d).getMonth()]}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {closed ? <p className="mt-2 text-xs font-medium text-warn">{c.closedDay}</p> : null}
              </section>

              <section className="dd-card min-w-0 p-5 sm:p-6">
                <Step n={3} label={c.step3} />
                {slotsLoading ? (
                  <p className="mt-3 text-sm text-muted">{c.loadingSlots}</p>
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
                    {closed ? c.closedDay : c.noSlots}
                  </p>
                )}
                <p className="mt-3 text-xs text-muted">{c.note}</p>
              </section>
            </div>

            <aside className="lg:sticky lg:top-6">
              <form onSubmit={submit} className="dd-card p-5 sm:p-6">
                <Step n={4} label={c.step4} />

                <div className="mt-4 rounded-xl border border-line bg-surface-2 p-3 text-sm">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                    {c.summary}
                  </p>
                  <div className="mt-1.5 grid gap-1">
                    <div className="flex justify-between gap-3">
                      <span className="text-muted">{c.step1}</span>
                      <span className="truncate font-semibold text-ink">
                        {doctor ? doctor.name : c.notChosen}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted">{c.step2}</span>
                      <span className="font-semibold text-ink">
                        {date ? formatDay(date, lang) : c.notChosen}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted">{c.step3}</span>
                      <span className="dd-mono font-semibold text-accent">
                        {time || c.notChosen}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-semibold text-ink">{c.name}</span>
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
                    <span className="font-semibold text-ink">{c.phone}</span>
                    <input
                      className="dd-input"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel"
                      placeholder={c.phonePh}
                      maxLength={32}
                      required
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-semibold text-ink">{c.reason}</span>
                    <select
                      className="dd-input"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    >
                      <option value="">{c.reasonChoose}</option>
                      {REASONS.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r[lang]}
                        </option>
                      ))}
                    </select>
                  </label>
                  {reason === "emergency" ? (
                    <input
                      className="dd-input"
                      value={reasonOther}
                      onChange={(e) => setReasonOther(e.target.value)}
                      placeholder={c.reasonOther}
                      maxLength={200}
                    />
                  ) : null}
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
                  disabled={sending || !info.doctors.length}
                  className="dd-btn dd-btn-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? c.sending : c.submit}
                </button>
                <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">
                  {c.privacy}
                </p>
              </form>
            </aside>
          </div>
        )}
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
