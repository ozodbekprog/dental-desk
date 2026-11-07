import type { Metadata } from "next";
import Link from "next/link";
import {
  SPECIALTIES,
  SPECIALTY_LABELS,
  listClinics,
  listDoctors,
  listRecentReviews,
} from "@/lib/network";
import { NetworkFooter, NetworkHeader } from "@/components/network/NetworkChrome";
import { DoctorCardView } from "@/components/network/DoctorCard";
import { ClinicCardView } from "@/components/network/ClinicCard";
import { Avatar } from "@/components/network/Avatar";
import { Stars } from "@/components/network/Stars";
import { StarIcon } from "@/components/network/icons";
import { formatPrice, formatReviewDate } from "@/components/network/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dental Desk — shifokor topish va onlayn qabul",
  description:
    "Toshkentdagi stomatologlar tarmog'i: shifokor va klinika toping, narx va reytingni ko'ring, akkauntsiz onlayn qabulga yoziling.",
  robots: { index: true, follow: true },
};

const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

function ToothRow({ teeth }: { teeth: number[] }) {
  return (
    <div className="grid grid-cols-8 gap-1.5">
      {teeth.map((tooth) => (
        <span
          key={tooth}
          className={`dd-mono grid h-8 place-items-center rounded-md text-[10px] font-semibold ${
            tooth === 16
              ? "bg-[#39c4c9] text-[#04292c] shadow-[0_3px_0_#1a8e93]"
              : "bg-gradient-to-b from-white to-[#cfdfe1] text-[#33555a] shadow-[0_3px_0_#9cb5b8]"
          }`}
        >
          {tooth}
        </span>
      ))}
    </div>
  );
}

const FAQ = [
  {
    q: "Qabulga yozilish uchun akkaunt kerakmi?",
    a: "Yo'q. Shifokorni tanlab, telefon raqamingizni va qabul sababini yozsangiz bo'ldi. Bemor kabineti keyinroq SMS-kod bilan ochiladi va barcha tashriflaringiz shu yerda saqlanadi.",
  },
  {
    q: "Tasdiqlash qanday ishlaydi?",
    a: "So'rovingiz shifokorga (yoki klinika qabulxonasiga) boradi. Shifokor tasdiqlagach, aniq vaqt va qabul manzili ochiladi. Tasdiqlanmaguncha bemor qabulga kelishi shart emas.",
  },
  {
    q: "Narx qanday ko'rsatiladi?",
    a: "Har bir shifokor profilida qabul narxi «so'mdan» yoki «kelishiladi» ko'rinishida beriladi. Yakuniy narx ko'rik va davolash rejasi asosida belgilanadi.",
  },
  {
    q: "Mustaqil shifokor nima?",
    a: "Klinikaga bog'lanmagan, o'z qabulxonasida yoki shartnoma asosida ishlaydigan shifokor. U tarmoqda alohida profilga ega va so'rovlarni o'zi tasdiqlaydi.",
  },
  {
    q: "Tish tariximni kim ko'radi?",
    a: "Tishlar tarixi va 3D xarita bemorga va davolagan shifokorga ko'rinadi. Shikoyat yozuvlari esa faqat shifokorga yoki tanlovga ko'ra klinika qabulxonasiga ko'rinadi.",
  },
  {
    q: "Reyting va sharhlar qanday paydo bo'ladi?",
    a: "Qabuldan o'tgan bemor o'z kabinetida tashrifni 1–5 yulduz bilan baholay oladi. Sharhlar shifokor profilida ko'rinadi va o'rtacha reyting avtomatik hisoblanadi.",
  },
];

export default async function HomePage() {
  const [doctors, clinics, reviews] = await Promise.all([
    listDoctors({}),
    listClinics(),
    listRecentReviews(3),
  ]);

  const topDoctors = doctors.slice(0, 3);
  const heroDoctor = doctors[0];
  const ratedDoctors = doctors.filter((doctor) => doctor.ratingCount > 0);
  const averageRating = ratedDoctors.length
    ? ratedDoctors.reduce((sum, doctor) => sum + doctor.rating, 0) / ratedDoctors.length
    : 0;
  const reviewTotal = doctors.reduce((sum, doctor) => sum + doctor.ratingCount, 0);

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <NetworkHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-line bg-surface">
          <div className="dd-noise absolute inset-0 opacity-60" />
          <div className="absolute -right-40 top-10 h-96 w-96 rounded-full bg-accent/5 blur-2xl" />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-14 pt-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-20 lg:pt-16">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent-soft px-3.5 py-1.5 text-xs font-semibold text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Stomatologlar tarmog&apos;i · Toshkent
              </span>
              <h1 className="dd-display mt-5 text-4xl font-extrabold leading-[1.04] text-ink sm:text-5xl lg:text-[3.4rem]">
                Shifokoringizni toping.{" "}
                <span className="text-accent">Qabulga bir daqiqada yoziling.</span>
              </h1>
              <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-muted">
                Klinika va mustaqil stomatologlar bir joyda: mutaxassislik, narx, reyting va
                bo&apos;sh vaqt. Akkaunt ochish shart emas — telefon raqam va qabul sababi yetarli.
              </p>

              <form
                action="/shifokorlar"
                method="get"
                className="mt-7 rounded-2xl border border-line-strong bg-surface p-2 shadow-[0_20px_50px_-30px_rgba(9,56,60,0.45)] sm:flex sm:items-center"
              >
                <label className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2">
                  <span className="sr-only">Shifokor yoki xizmat</span>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    className="shrink-0 text-muted"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="6.5" />
                    <path d="m16 16 4.5 4.5" />
                  </svg>
                  <input
                    name="q"
                    type="search"
                    placeholder="Shifokor ismi yoki xizmat"
                    maxLength={60}
                    className="w-full min-w-0 border-0 bg-transparent py-1.5 text-[0.95rem] text-ink outline-none placeholder:text-muted"
                  />
                </label>
                <span className="mx-1 hidden h-9 w-px bg-line sm:block" aria-hidden="true" />
                <label className="flex items-center gap-2 px-3 py-2">
                  <span className="sr-only">Mutaxassislik</span>
                  <select
                    name="specialty"
                    defaultValue=""
                    className="max-w-full border-0 bg-transparent py-1.5 text-[0.95rem] text-ink outline-none"
                  >
                    <option value="">Barcha mutaxassisliklar</option>
                    {SPECIALTIES.map((item) => (
                      <option key={item} value={item}>
                        {SPECIALTY_LABELS[item]}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  className="dd-btn dd-btn-primary mt-2 w-full sm:mt-0 sm:w-auto"
                >
                  Qidirish
                </button>
              </form>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-muted">Ko&apos;p tanlanadi:</span>
                {SPECIALTIES.slice(0, 4).map((item) => (
                  <Link
                    key={item}
                    href={`/shifokorlar?specialty=${item}`}
                    className="rounded-full border border-line bg-surface px-3 py-1.5 font-medium text-ink-soft transition hover:border-accent/40 hover:text-accent"
                  >
                    {SPECIALTY_LABELS[item]}
                  </Link>
                ))}
              </div>

              <dl className="mt-8 grid grid-cols-3 gap-3 border-t border-line pt-6 text-sm">
                <div>
                  <dt className="dd-display text-2xl font-extrabold text-ink">{doctors.length}</dt>
                  <dd className="mt-0.5 text-xs text-muted">shifokor profili</dd>
                </div>
                <div>
                  <dt className="dd-display text-2xl font-extrabold text-ink">{clinics.length}</dt>
                  <dd className="mt-0.5 text-xs text-muted">klinika tarmoqda</dd>
                </div>
                <div>
                  <dt className="dd-display flex items-center gap-1.5 text-2xl font-extrabold text-ink">
                    {averageRating > 0 ? averageRating.toFixed(1) : "—"}
                    <StarIcon className="h-4 w-4 text-gold" />
                  </dt>
                  <dd className="mt-0.5 text-xs text-muted">{reviewTotal} sharh asosida</dd>
                </div>
              </dl>
            </div>

            <div className="relative mx-auto w-full max-w-[420px] lg:mx-0">
              <div className="absolute -inset-5 rounded-[36px] bg-accent/5" aria-hidden="true" />
              <div className="dd-card relative overflow-hidden rounded-[26px] border-line-strong shadow-[0_30px_80px_-40px_rgba(9,56,60,0.55)]">
                <div className="flex items-center justify-between gap-2 border-b border-line bg-surface-2 px-5 py-3">
                  <span className="inline-flex items-center gap-2 text-xs font-bold text-ok">
                    <span className="h-2 w-2 rounded-full bg-ok" />
                    Qabul tasdiqlandi
                  </span>
                  <span className="dd-mono text-[11px] text-muted">DD-2041</span>
                </div>
                <div className="p-5">
                  {heroDoctor ? (
                    <div className="flex items-center gap-3">
                      <Avatar name={heroDoctor.name} photoUrl={heroDoctor.photoUrl} size="md" />
                      <div className="min-w-0">
                        <p className="dd-display truncate text-lg font-bold text-ink">
                          {heroDoctor.name}
                        </p>
                        <p className="text-sm text-accent">{heroDoctor.specialtyLabel}</p>
                        <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted">
                          <StarIcon className="h-3.5 w-3.5 text-gold" />
                          {heroDoctor.rating > 0 ? heroDoctor.rating.toFixed(1) : "Yangi"} ·{" "}
                          {formatPrice(heroDoctor.priceFrom)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted">Shifokor profili tez orada qo&apos;shiladi.</p>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    <div className="rounded-xl border border-line bg-surface-2/70 px-3 py-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Kun</p>
                      <p className="dd-display mt-0.5 text-base font-extrabold text-ink">
                        Dush, 9-noyabr
                      </p>
                    </div>
                    <div className="rounded-xl border border-line bg-surface-2/70 px-3 py-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                        Vaqt
                      </p>
                      <p className="dd-mono mt-0.5 text-base font-extrabold text-ink">09:00</p>
                    </div>
                  </div>

                  <div className="mt-2.5 rounded-xl border border-line bg-surface-2/70 px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                      Qabul manzili
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-ink">
                      {heroDoctor?.address || "Manzil tasdiqlangandan keyin ochiladi"}
                    </p>
                  </div>

                  <ol className="mt-4 space-y-2.5 text-xs">
                    {["So'rov yuborildi", "Shifokor tasdiqladi", "Vaqt va manzil ochildi"].map(
                      (step, index) => (
                        <li key={step} className="flex items-center gap-2.5">
                          <span
                            className={`grid h-5 w-5 place-items-center rounded-full ${
                              index < 2 ? "bg-ok text-white" : "bg-accent text-white"
                            }`}
                          >
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              aria-hidden="true"
                            >
                              <path d="m5 12 5 5L20 7" />
                            </svg>
                          </span>
                          <span className={index < 2 ? "text-ink-soft" : "font-semibold text-ink"}>
                            {step}
                          </span>
                        </li>
                      )
                    )}
                  </ol>
                </div>
                <div className="border-t border-line bg-surface-2/60 px-5 py-2.5 text-center text-[11px] text-muted">
                  Ko&apos;rinish namunasi · holat havolasi orqali kuzatiladi
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 lg:py-18">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
                  Shifokorlar
                </p>
                <h2 className="dd-display mt-2 text-3xl font-extrabold text-ink sm:text-4xl">
                  Reytingi yuqori mutaxassislar
                </h2>
              </div>
              <Link
                href="/shifokorlar"
                className="text-sm font-semibold text-accent hover:underline"
              >
                Barcha shifokorlar →
              </Link>
            </div>
            {topDoctors.length ? (
              <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {topDoctors.map((doctor) => (
                  <DoctorCardView key={doctor.id} doctor={doctor} />
                ))}
              </div>
            ) : (
              <div className="dd-card mt-7 p-8 text-center text-sm text-muted">
                Hozircha ochiq shifokor profillari yo&apos;q. Klinikangizni ulab, birinchilardan
                bo&apos;ling.
              </div>
            )}
          </div>
        </section>

        <section className="border-y border-line bg-surface py-14 lg:py-18">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
                Qanday ishlaydi
              </p>
              <h2 className="dd-display mt-2 text-3xl font-extrabold text-ink sm:text-4xl">
                Uch qadam — akkauntsiz ham bo&apos;ladi
              </h2>
              <p className="mt-3 text-muted">
                Ro&apos;yxatdan o&apos;tishni qabuldan keyinga qoldiring. Birinchi navbatda
                shifokor va vaqt muhim.
              </p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                {
                  n: "01",
                  title: "Shifokorni tanlang",
                  text: "Mutaxassislik, tajriba, narx, reyting va qabul joyi bo'yicha solishtiring.",
                  icon: <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 5 5" />,
                },
                {
                  n: "02",
                  title: "Vaqtni band qiling",
                  text: "Telefon raqamingizni va sababni yozing — matn yoki ovozli xabar bilan.",
                  icon: (
                    <>
                      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
                      <path d="M8 3v4M16 3v4M3.5 9.5h17" />
                    </>
                  ),
                },
                {
                  n: "03",
                  title: "Tasdiqni oling",
                  text: "Shifokor tasdiqlagach aniq vaqt va manzil ochiladi. Holatni havola orqali kuzating.",
                  icon: (
                    <>
                      <path d="M12 3 5 6v5.5c0 4.4 3 7.9 7 9.5 4-1.6 7-5.1 7-9.5V6l-7-3Z" />
                      <path d="m9 12 2 2 4-4" />
                    </>
                  ),
                },
              ].map((step) => (
                <div key={step.n} className="dd-card relative p-6">
                  <span className="dd-mono absolute right-5 top-5 text-xs font-semibold text-line-strong">
                    {step.n}
                  </span>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      {step.icon}
                    </svg>
                  </span>
                  <h3 className="dd-display mt-4 text-lg font-bold text-ink">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-accent/20 bg-accent-soft/50 px-5 py-4 text-sm">
              <span className="font-semibold text-ink">Muhim:</span>
              <span className="text-ink-soft">
                Shifokor tasdiqlamaguncha qabul vaqti va manzili ko&apos;rinmaydi.
              </span>
              <Link
                href="/shifokorlar"
                className="ml-auto font-semibold text-accent hover:underline"
              >
                Shifokor tanlash →
              </Link>
            </div>
          </div>
        </section>

        <section className="py-14 lg:py-18">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
                Bemor kabineti
              </p>
              <h2 className="dd-display mt-2 text-3xl font-extrabold text-ink sm:text-4xl">
                Tishlaringiz tarixi — 3D xaritada
              </h2>
              <p className="mt-4 text-muted">
                Har bir tashrifdan keyin qaysi tishga nima qilingani saqlanadi. Bemor ham,
                davolagan shifokor ham bir xil manzarani ko&apos;radi: plomba, kanal, koronka
                yoki shikoyat.
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  "32 ta tish bo'yicha to'liq tarix va izohlar",
                  "Tashriflar, bronlar va tasdiqlangan manzillar bir joyda",
                  "Shifokor qabul paytida tarixni ochib, davolashni rejalashtiradi",
                  "Ma'lumotlar faqat bemor va unga xizmat ko'rsatgan klinikaga ko'rinadi",
                ].map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        aria-hidden="true"
                      >
                        <path d="m5 12 5 5L20 7" />
                      </svg>
                    </span>
                    <span className="text-ink-soft">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/kabinet" className="dd-btn dd-btn-primary">
                  Bemor kabinetiga kirish
                </Link>
                <Link href="/shifokorlar" className="dd-btn dd-btn-ghost">
                  Shifokor topish
                </Link>
              </div>
              <p className="mt-3 text-xs text-muted">
                Kirish telefon raqam va SMS-kod orqali — parol yodlash shart emas.
              </p>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-[26px] border border-[#12383d] bg-[#0c2429] p-5 text-white shadow-[0_30px_70px_-40px_rgba(4,30,34,0.8)] sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">
                      Tish xaritasi
                    </p>
                    <p className="dd-display mt-1 text-lg font-bold">Yuqori va pastki jag&apos;</p>
                  </div>
                  <span className="rounded-full border border-[#39c4c9]/40 bg-[#39c4c9]/10 px-2.5 py-1 text-[10px] font-semibold text-[#7fe0e3]">
                    1 tishda tarix
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  <ToothRow teeth={UPPER_TEETH} />
                  <ToothRow teeth={LOWER_TEETH} />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-white/60">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm bg-[#cfdfe1]" /> Sog&apos;lom
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm bg-[#39c4c9]" /> Davolangan
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm bg-[#e0a24a]" /> Shikoyat
                  </span>
                </div>
                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-white">Tish 16 · yuqori o&apos;ng</p>
                    <span className="text-[10px] text-white/50">23-oktabr 2026</span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/70">
                    Kompozit plomba · 350 000 so&apos;m · Dr. Aziza Karimova
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-line bg-surface py-14 lg:py-18">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
                  Klinikalar
                </p>
                <h2 className="dd-display mt-2 text-3xl font-extrabold text-ink sm:text-4xl">
                  Tarmoqdagi qabul joylari
                </h2>
              </div>
              <Link
                href="/klinikalar"
                className="text-sm font-semibold text-accent hover:underline"
              >
                Barcha klinikalar →
              </Link>
            </div>
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clinics.slice(0, 2).map((clinic) => (
                <ClinicCardView key={clinic.id} clinic={clinic} />
              ))}
              <div className="flex flex-col justify-between rounded-[20px] border border-dashed border-line-strong bg-surface-2/50 p-5">
                <div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M4 20V7.5L12 4l8 3.5V20" />
                      <path d="M4 20h16M9 20v-5h6v5" />
                    </svg>
                  </span>
                  <h3 className="dd-display mt-4 text-lg font-bold text-ink">
                    Klinikangiz shu yerda bo&apos;lsinmi?
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    Klinikani ulang — barcha shifokorlaringiz katalogda chiqadi, onlayn bron
                    qabulxonaga tushadi.
                  </p>
                </div>
                <Link href="/klinika-uchun" className="dd-btn dd-btn-ghost mt-5">
                  Klinika uchun
                </Link>
              </div>
            </div>
          </div>
        </section>

        {reviews.length ? (
          <section className="py-14 lg:py-18">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
                    Sharhlar
                  </p>
                  <h2 className="dd-display mt-2 text-3xl font-extrabold text-ink sm:text-4xl">
                    Bemorlar nima deydi
                  </h2>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm">
                  <StarIcon className="h-4 w-4 text-gold" />
                  <span className="font-bold text-ink">
                    {averageRating > 0 ? averageRating.toFixed(1) : "—"}
                  </span>
                  <span className="text-muted">· {reviewTotal} sharh</span>
                </span>
              </div>
              <div className="mt-7 grid gap-4 md:grid-cols-3">
                {reviews.map((review) => (
                  <figure key={review.id} className="dd-card flex flex-col p-5">
                    <Stars value={review.rating} />
                    <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">
                      “{review.comment}”
                    </blockquote>
                    <figcaption className="mt-4 border-t border-line pt-3">
                      <Link
                        href={`/shifokorlar/${encodeURIComponent(review.doctor.id)}`}
                        className="text-sm font-semibold text-ink hover:text-accent"
                      >
                        {review.doctor.name}
                      </Link>
                      <p className="text-xs text-muted">
                        {review.doctor.specialtyLabel} · {formatReviewDate(review.createdAt)}
                      </p>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="border-t border-line bg-surface py-14 lg:py-18">
          <div className="mx-auto grid max-w-6xl gap-4 px-4 sm:px-6 md:grid-cols-2">
            <div className="dd-card flex flex-col p-6">
              <span className="w-fit rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent">
                Shifokorlar uchun
              </span>
              <h2 className="dd-display mt-4 text-2xl font-extrabold text-ink">
                Mustaqil shifokor sifatida qo&apos;shiling
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                O&apos;z profilingiz, narxingiz va qabul joyingiz. Onlayn so&apos;rovlarni
                tasdiqlang, bemor tarixini ko&apos;ring va vaqtni boshqaring.
              </p>
              <div className="mt-auto flex flex-wrap gap-2 pt-5">
                <Link href="/doktor" className="dd-btn dd-btn-primary">
                  Shifokor kirishi
                </Link>
                <a
                  href="https://t.me/oz4vka"
                  target="_blank"
                  rel="noreferrer"
                  className="dd-btn dd-btn-ghost"
                >
                  Bog&apos;lanish
                </a>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-[20px] bg-accent p-6 text-white">
              <div className="absolute -right-10 -top-16 h-44 w-44 rounded-full bg-white/10" />
              <span className="relative w-fit rounded-full border border-white/25 px-3 py-1 text-xs font-bold text-white/85">
                Klinikalar uchun
              </span>
              <h2 className="dd-display relative mt-4 text-2xl font-extrabold">
                Klinikani tarmoq bilan bog&apos;lang
              </h2>
              <p className="relative mt-2 text-sm leading-relaxed text-white/80">
                Qabul jadvali, bemor kartasi, 3D tish tarixi va hisobotlar. Klinika obunasi
                orqali barcha shifokorlar katalogga avtomatik chiqadi.
              </p>
              <div className="relative mt-5 flex flex-wrap gap-2">
                <Link
                  href="/klinika-uchun"
                  className="dd-btn bg-white text-accent hover:bg-accent-soft"
                >
                  Batafsil
                </Link>
                <Link
                  href="/signup"
                  className="dd-btn border border-white/35 bg-transparent text-white hover:bg-white/10"
                >
                  14 kun bepul
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 lg:py-18">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="dd-display text-center text-3xl font-extrabold text-ink sm:text-4xl">
              Ko&apos;p beriladigan savollar
            </h2>
            <div className="mt-7 space-y-3">
              {FAQ.map((item) => (
                <details key={item.q} className="dd-card group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-ink">
                    {item.q}
                    <span className="text-accent transition group-open:rotate-45">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-[28px] bg-accent px-6 py-10 text-white sm:px-10">
              <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10" />
              <div className="absolute -bottom-24 right-24 h-56 w-56 rounded-full bg-white/5" />
              <div className="relative flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
                <div className="max-w-xl">
                  <h2 className="dd-display text-3xl font-extrabold sm:text-4xl">
                    Tish og&apos;rig&apos;i kutishni yoqtirmaydi
                  </h2>
                  <p className="mt-3 text-white/80">
                    Yaqin shifokorni toping, bo&apos;sh vaqtni tanlang va tasdiqni kuting.
                    Qolganini tizim bajaradi.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/shifokorlar"
                    className="dd-btn bg-white text-accent hover:bg-accent-soft"
                  >
                    Shifokor topish
                  </Link>
                  <Link
                    href="/kabinet"
                    className="dd-btn border border-white/35 bg-transparent text-white hover:bg-white/10"
                  >
                    Bemor kabineti
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <NetworkFooter />
    </div>
  );
}
