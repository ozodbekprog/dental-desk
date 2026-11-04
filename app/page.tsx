import Link from "next/link";
import { getSession } from "@/lib/auth";
import { DemoButton } from "@/components/DemoButton";
import { Logo } from "@/components/Logo";

const features = [
  {
    title: "AI yordamchi",
    text: "Ilova ichidagi chat: navbatlarni ko'rsatadi, bo'sh vaqtni topadi, bemor qo'shadi va tushumni hisoblaydi — o'zbek tilida.",
    icon: "ai",
  },
  {
    title: "Aqlli qabul jadvali",
    text: "Shifokor, vaqt va davomiylik bo'yicha qabul qo'shing. Band slotlar avtomatik bloklanadi, kunlik holat bir qarashda ko'rinadi.",
    icon: "calendar",
  },
  {
    title: "Bemor kartasi",
    text: "Telefon, tug'ilgan kun, allergiya va muhim ogohlantirishlar. Qidiruv bir necha soniyada kerakli bemorni topadi.",
    icon: "user",
  },
  {
    title: "3D tish xaritasi",
    text: "Har bir tish holatini belgilang: karies, plomba, kanal, koronka, implant yoki yo'q tish. Vizual tarix shifokor va bemor uchun tushunarli.",
    icon: "tooth",
  },
  {
    title: "Tashrif va muolajalar",
    text: "Bajarilgan ishlar, ishlatilgan asboblar, narx va izohlar. Har bir tashrif tarixi bemor kartasida saqlanadi.",
    icon: "note",
  },
  {
    title: "Rollar va ruxsatlar",
    text: "Egasi, administrator, shifokor va kuzatuvchi. Har bir xodim faqat o'ziga kerakli bo'limlarga kira oladi.",
    icon: "shield",
  },
  {
    title: "Uch til, ikki mavzu",
    text: "O'zbek, rus va ingliz interfeysi. Kunduzgi, tungi yoki tizim mavzusi — ko'z charchamaydi.",
    icon: "globe",
  },
  {
    title: "To'lov va obuna",
    text: "Hisob-faktura yaratish, to'lovni tasdiqlash va obunani avtomatik uzaytirish. Sinov muddati va tariflar admin panelda nazorat qilinadi.",
    icon: "card",
  },
];

const plans = [
  {
    name: "Start",
    price: "299 000",
    period: "so'm / oy",
    text: "Yangi ochilgan kichik kabinet uchun.",
    features: ["1 shifokor", "Qabul jadvali", "Bemor kartalari", "3D tish xaritasi", "AI yordamchi", "Email qo'llab-quvvatlash"],
    cta: "Bepul boshlash",
    href: "/signup",
    featured: false,
  },
  {
    name: "Klinika",
    price: "599 000",
    period: "so'm / oy",
    text: "Kundalik ishlaydigan klinika uchun to'liq tizim.",
    features: [
      "5 shifokorgacha",
      "Barcha imkoniyatlar",
      "AI yordamchi",
      "Rollar va ruxsatlar",
      "Tashriflar tarixi",
      "Ustuvor Telegram yordam",
    ],
    cta: "14 kun bepul",
    href: "/signup",
    featured: true,
  },
  {
    name: "Tarmoq",
    price: "999 000",
    period: "so'm / oy",
    text: "Ko'p shifokorli va tez o'sayotgan klinikalar uchun.",
    features: [
      "Cheksiz shifokor",
      "AI yordamchi",
      "Individual onboarding",
      "Ma'lumotlarni ko'chirish yordami",
      "Yillik hisobot va backup",
      "Shaxsiy menejer",
    ],
    cta: "Bog'lanish",
    href: "https://t.me/oz4vka",
    featured: false,
  },
];

function Icon({ name }: { name: string }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "ai")
    return (
      <svg {...common}>
        <path d="M12 3.2l1.9 4.9 4.9 1.9-4.9 1.9L12 16.8l-1.9-4.9L5.2 10l4.9-1.9z" />
        <path d="M18.6 14.6l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" />
      </svg>
    );
  if (name === "card")
    return (
      <svg {...common}>
        <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
        <path d="M3 9.5h18M6.5 14.5h4" />
      </svg>
    );
  if (name === "calendar")
    return (
      <svg {...common}>
        <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
        <path d="M8 3v4M16 3v4M3.5 9.5h17" />
      </svg>
    );
  if (name === "user")
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3.6" />
        <path d="M5 20c.7-3.4 3.5-5.5 7-5.5s6.3 2.1 7 5.5" />
      </svg>
    );
  if (name === "tooth")
    return (
      <svg {...common}>
        <path d="M12 3.8c-2 0-3-1-4.7-1-2.4 0-3.9 1.9-3.9 4.4 0 2.1.8 3.4 1.2 5.1.4 1.5.5 3.1.9 4.8.3 1.2.8 2.4 1.7 2.4 1.2 0 1.3-2.3 1.8-4 .4-1.4.9-2.6 2.9-2.6s2.6 1.2 2.9 2.6c.5 1.7.6 4 1.8 4 .9 0 1.4-1.2 1.7-2.4.4-1.7.5-3.3.9-4.8.4-1.7 1.2-3 1.2-5.1 0-2.5-1.4-4.4-3.8-4.4-1.7 0-2.7 1-4.7 1Z" />
      </svg>
    );
  if (name === "note")
    return (
      <svg {...common}>
        <path d="M6 3.5h9l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V5a1.5 1.5 0 0 1 1-1.5Z" />
        <path d="M15 3.5V8h4.2M8.5 13h7M8.5 17h5" />
      </svg>
    );
  if (name === "shield")
    return (
      <svg {...common}>
        <path d="M12 3 5 6v5.5c0 4.4 3 7.9 7 9.5 4-1.6 7-5.1 7-9.5V6l-7-3Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.4 2.2 3.7 5.2 3.7 8.5S14.4 18.3 12 20.5c-2.4-2.2-3.7-5.2-3.7-8.5S9.6 5.7 12 3.5Z" />
    </svg>
  );
}

export default async function Home() {
  const session = await getSession();
  const loginHref = session?.role === "super" ? "/admin" : session ? "/app" : "/login";

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 text-accent">
            <Logo />
            <span className="dd-display text-lg font-extrabold text-ink">Dental Desk</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
            <a href="#imkoniyatlar" className="hover:text-accent">
              Imkoniyatlar
            </a>
            <a href="#ai" className="hover:text-accent">
              AI yordamchi
            </a>
            <a href="#narxlar" className="hover:text-accent">
              Narxlar
            </a>
            <a href="#savollar" className="hover:text-accent">
              Savollar
            </a>
            <a href="#aloqa" className="hover:text-accent">
              Aloqa
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href={loginHref} className="dd-btn dd-btn-ghost !px-3.5 !py-2 text-sm">
              {session ? "Ilovaga o'tish" : "Kirish"}
            </Link>
            <Link href="/signup" className="dd-btn dd-btn-primary !px-3.5 !py-2 text-sm">
              Bepul boshlash
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="dd-noise absolute inset-0 opacity-60" />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:pb-24 lg:pt-20">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent-soft px-3.5 py-1.5 text-xs font-semibold text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Stomatologiya klinikalari uchun boshqaruv tizimi
              </span>
              <h1 className="dd-display mt-6 text-4xl font-extrabold leading-[1.05] text-ink sm:text-5xl lg:text-[3.55rem]">
                Qabul, bemor kartasi va tish tarixi —{" "}
                <span className="text-accent">bitta tartibli tizimda.</span>
              </h1>
              <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-muted">
                Dental Desk kunlik qabulni, tashriflarni va 3D tish xaritasini birlashtiradi.
                Ichidagi AI yordamchi navbat, bemor va hisobotlarni chat orqali bajaradi.
                Administrator, shifokor va klinika egasi bir xil ma'lumotni ko'radi — qog'oz
                daftar va tarqoq Excel fayllardan voz keching.
              </p>
              <div className="mt-8 flex flex-wrap items-start gap-3">
                <Link href="/signup" className="dd-btn dd-btn-primary">
                  14 kun bepul boshlash
                </Link>
                <DemoButton />
              </div>
              <p className="mt-4 text-sm text-muted">
                Karta talab qilinmaydi · O'zbek tilida · O'rnatish shart emas
              </p>
              <dl className="mt-10 grid grid-cols-3 gap-3 border-t border-line pt-6 text-sm">
                <div>
                  <dt className="font-semibold text-ink">3D xarita</dt>
                  <dd className="mt-0.5 text-muted">Har bir tish tarixi</dd>
                </div>
                <div>
                  <dt className="font-semibold text-ink">UZ / RU / EN</dt>
                  <dd className="mt-0.5 text-muted">Uch tilli interfeys</dd>
                </div>
                <div>
                  <dt className="font-semibold text-ink">Bulutda</dt>
                  <dd className="mt-0.5 text-muted">Har qurilmadan kirish</dd>
                </div>
              </dl>
            </div>

            <div className="relative">
              <div className="dd-card overflow-hidden rounded-[24px] border-line-strong bg-surface shadow-[0_30px_80px_-40px_rgba(9,56,60,0.55)]">
                <div className="flex items-center gap-1.5 border-b border-line bg-surface-2 px-4 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#e5675f]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#e9b44c]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#5abf7a]" />
                  <span className="dd-mono ml-3 truncate text-[11px] text-muted">
                    dentaldesk.uz/app
                  </span>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/screenshots/schedule.png"
                  alt="Dental Desk qabul jadvali ekrani"
                  className="block w-full"
                  width={1600}
                  height={1000}
                />
              </div>
              <div className="dd-card absolute -bottom-5 -left-4 hidden w-52 rounded-2xl p-4 shadow-lg sm:block">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Bugungi qabul
                </p>
                <p className="dd-display mt-1 text-2xl font-extrabold text-ink">8 bemor</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-ok">
                  <span className="h-1.5 w-1.5 rounded-full bg-ok" />
                  Jadval bo'yicha
                </div>
              </div>
              <div className="dd-card absolute -right-3 top-16 hidden rounded-2xl px-4 py-3 shadow-lg sm:block">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Keyingi bemor
                </p>
                <p className="dd-mono mt-1 text-lg font-semibold text-accent">09:30</p>
              </div>
            </div>
          </div>
        </section>

        <section id="imkoniyatlar" className="border-t border-line bg-surface py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
                Imkoniyatlar
              </p>
              <h2 className="dd-display mt-3 text-3xl font-extrabold text-ink sm:text-4xl">
                Kundalik ish uchun kerak bo'lgan hamma narsa
              </h2>
              <p className="mt-3 text-muted">
                Ortiqcha modullar yo'q. Faqat qabulni tezlashtiradigan va bemor tarixini
                saqlaydigan vositalar.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="dd-card group p-6 transition hover:-translate-y-0.5 hover:border-accent/40"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <Icon name={f.icon} />
                  </span>
                  <h3 className="dd-display mt-4 text-lg font-bold text-ink">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
                Nima uchun Dental Desk
              </p>
              <h2 className="dd-display mt-3 text-3xl font-extrabold text-ink sm:text-4xl">
                Klinika tartibi — bir kishining xotirasiga bog'liq bo'lmaydi
              </h2>
              <p className="mt-4 text-muted">
                Qabul daftari, Excel va alohida messenjerlar o'rniga yagona tizim. Har bir
                o'zgarish darhol barcha qurilmalarda ko'rinadi.
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  "Administrator qabulni yozadi — shifokor darhol ko'radi.",
                  "Tashrif tugagach muolaja, narx va izohlar bemor kartasiga tushadi.",
                  "Egasi klinikadagi yuklama va qabul holatini real vaqtda kuzatadi.",
                ].map((t) => (
                  <li key={t} className="flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="m5 12 5 5L20 7" />
                      </svg>
                    </span>
                    <span className="text-ink-soft">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { k: "8", v: "bugungi qabul", d: "jadval bilan" },
                { k: "3", v: "shifokor", d: "bitta panelda" },
                { k: "100%", v: "tarix saqlanadi", d: "har bir tish" },
                { k: "14 kun", v: "bepul sinov", d: "kartasiz" },
              ].map((s) => (
                <div key={s.v} className="dd-card p-6">
                  <p className="dd-display text-4xl font-extrabold text-accent">{s.k}</p>
                  <p className="mt-2 text-sm font-semibold text-ink">{s.v}</p>
                  <p className="text-xs text-muted">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="ai" className="py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-[28px] border border-accent/20 bg-surface-2/70 p-6 sm:p-10">
              <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent/5" />
              <div className="relative grid gap-10 lg:grid-cols-[1fr_0.78fr] lg:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
                    AI yordamchi
                  </p>
                  <h2 className="dd-display mt-3 text-3xl font-extrabold text-ink sm:text-4xl">
                    Navbat va hisobot — bitta chat buyrug'i bilan
                  </h2>
                  <p className="mt-4 max-w-xl text-muted">
                    Ilova ichidagi yordamchi klinika ma'lumotlarini tushunadi: bugungi jadvalni
                    ko'rsatadi, bo'sh vaqtni topadi, yangi bemorni qo'shadi va navbat holatini
                    o'zgartiradi. Har bir yozuv xodim roliga qarab cheklanadi.
                  </p>
                  <ul className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                    {[
                      "Bugungi va ertangi navbatlar",
                      "Bo'sh vaqtlarni topish",
                      "Yangi bemor va navbat yozish",
                      "Statistika va tushum hisoboti",
                      "Holat: keldi, kresloda, yakunlandi",
                      "O'zbek, rus va ingliz tili",
                    ].map((t) => (
                      <li key={t} className="flex gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="m5 12 5 5L20 7" />
                          </svg>
                        </span>
                        <span className="text-ink-soft">{t}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-muted">Misol:</span>
                    {['"bugun navbatlar"', '"ertaga bo\'sh vaqt"', '"statistika"'].map((c) => (
                      <span
                        key={c}
                        className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-muted"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                  <p className="mt-5 rounded-xl border border-line bg-surface px-4 py-3 text-xs leading-relaxed text-muted">
                    AI kaliti ulanmagan bo'lsa ham yordamchi lokal rejimda ishlaydi — navbat va
                    bemor amallari to'liq bajariladi.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <DemoButton className="dd-btn dd-btn-primary" />
                    <Link href="/signup" className="dd-btn dd-btn-ghost">
                      14 kun bepul
                    </Link>
                  </div>
                </div>
                <div>
                  <div className="dd-card mx-auto w-full max-w-[408px] overflow-hidden rounded-[22px] border-line-strong shadow-[0_30px_70px_-38px_rgba(9,56,60,0.55)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/screenshots/ai.png"
                      alt="Dental Desk AI yordamchisi suhbat oynasi"
                      className="block w-full"
                      width={408}
                      height={710}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="narxlar" className="border-t border-line bg-surface py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
                  Narxlar
                </p>
                <h2 className="dd-display mt-3 text-3xl font-extrabold text-ink sm:text-4xl">
                  Klinikangiz hajmiga mos tarif
                </h2>
              </div>
              <p className="rounded-full border border-line bg-surface-2 px-4 py-2 text-xs font-semibold text-muted">
                Yillik to'lovda 2 oy bepul
              </p>
            </div>
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {plans.map((p) => (
                <div
                  key={p.name}
                  className={`dd-card relative flex flex-col p-6 ${
                    p.featured ? "border-accent ring-2 ring-accent/15" : ""
                  }`}
                >
                  {p.featured ? (
                    <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                      Eng ommabop
                    </span>
                  ) : null}
                  <h3 className="dd-display text-xl font-extrabold text-ink">{p.name}</h3>
                  <p className="mt-1 text-sm text-muted">{p.text}</p>
                  <p className="mt-5">
                    <span className="dd-display text-3xl font-extrabold text-ink">
                      {p.price}
                    </span>{" "}
                    <span className="text-sm text-muted">{p.period}</span>
                  </p>
                  <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-ink-soft">
                        <svg
                          className="mt-0.5 shrink-0 text-accent"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <path d="m5 12 5 5L20 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={p.href}
                    className={`dd-btn mt-6 ${
                      p.featured ? "dd-btn-primary" : "dd-btn-ghost"
                    }`}
                  >
                    {p.cta}
                  </Link>
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs text-muted">
              Barcha tariflar 14 kunlik bepul sinovdan boshlanadi. Sinov uchun bank kartasi
              talab qilinmaydi. Yakuniy narx va to'lov jadvali shartnoma bilan tasdiqlanadi.
            </p>
          </div>
        </section>

        <section id="savollar" className="py-16 lg:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="dd-display text-center text-3xl font-extrabold text-ink sm:text-4xl">
              Ko'p beriladigan savollar
            </h2>
            <div className="mt-8 space-y-3">
              {[
                {
                  q: "Ma'lumotlar qayerda saqlanadi?",
                  a: "Har bir klinika ma'lumotlari alohida hisobda saqlanadi va boshqa klinikalar bilan aralashmaydi. Server O'zbekistonda joylashtiriladi; kirish faqat parol va sessiya orqali bo'ladi.",
                },
                {
                  q: "Internetsiz ishlaydimi?",
                  a: "Ilova brauzerda ochiladi va ma'lumotlar server bilan sinxron ishlaydi, shuning uchun internet aloqasi kerak. Uzilish bo'lsa, kiritilgan o'zgarishlar aloqa tiklanganda saqlanadi.",
                },
                {
                  q: "Eski bemorlar bazasini ko'chirish mumkinmi?",
                  a: "Ha. Pilot va Tarmoq tariflarida Excel yoki boshqa tizimdan ma'lumotlarni ko'chirishga yordam beramiz. Format va hajm shartnoma oldidan kelishiladi.",
                },
                {
                  q: "Sinov muddati qanday ishlaydi?",
                  a: "Ro'yxatdan o'tgandan so'ng 14 kun davomida Klinika tarifidagi barcha imkoniyatlar ochiq. Kartani kiritish shart emas. Sinov tugagach, tarifni tanlaysiz yoki hisob to'xtatiladi.",
                },
                {
                  q: "Xodimlar soni cheklanganmi?",
                  a: "Start tarifi 1 shifokor uchun, Klinika 5 shifokorgacha, Tarmoq cheksiz. Administrator va kuzatuvchi hisoblari alohida beriladi.",
                },
                {
                  q: "AI yordamchi nima qila oladi?",
                  a: "Ilova ichidagi chat navbatlarni ko'rsatadi, bo'sh vaqtni topadi, bemor qo'shadi, navbat holatini o'zgartiradi va statistika hisoblaydi. Yozish amallari faqat ruxsatli xodimlarga ochiq. Maxsus AI kaliti bo'lmasa, yordamchi lokal rejimda ishlaydi.",
                },
                {
                  q: "Xavfsizlik qanday ta'minlanadi?",
                  a: "Parollar hash bilan saqlanadi, sessiyalar HttpOnly cookie orqali himoyalanadi, har bir so'rov klinika hisobiga bog'lanadi. Ma'lumotlarga kirish rollar bilan cheklanadi.",
                },
              ].map((f) => (
                <details key={f.q} className="dd-card group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-ink">
                    {f.q}
                    <span className="text-accent transition group-open:rotate-45">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="aloqa" className="pb-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-[28px] bg-accent px-6 py-12 text-white sm:px-10">
              <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10" />
              <div className="absolute -bottom-24 right-24 h-56 w-56 rounded-full bg-white/5" />
              <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
                <div className="max-w-xl">
                  <h2 className="dd-display text-3xl font-extrabold sm:text-4xl">
                    Klinikangizni bugun tartibga soling
                  </h2>
                  <p className="mt-3 text-white/80">
                    14 kun bepul sinab ko'ring yoki tayyor demo klinikani ochib, tizimni
                    o'zingiz ko'ring. Savollaringiz bo'lsa — Telegram orqali yozing.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/signup"
                    className="dd-btn bg-white text-accent hover:bg-accent-soft"
                  >
                    Bepul boshlash
                  </Link>
                  <DemoButton className="dd-btn border border-white/35 bg-transparent text-white hover:bg-white/10" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-surface py-10">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-6 px-4 sm:px-6 md:flex-row">
          <div>
            <div className="flex items-center gap-2 text-accent">
              <Logo className="h-7 w-7" />
              <span className="dd-display text-base font-extrabold text-ink">Dental Desk</span>
            </div>
            <p className="mt-2 max-w-sm text-sm text-muted">
              Stomatologiya klinikasi uchun qabul, bemor kartasi va tish tarixi tizimi.
            </p>
          </div>
          <div className="flex flex-wrap gap-10 text-sm">
            <div className="space-y-2">
              <p className="font-semibold text-ink">Mahsulot</p>
              <a href="#imkoniyatlar" className="block text-muted hover:text-accent">
                Imkoniyatlar
              </a>
              <a href="#ai" className="block text-muted hover:text-accent">
                AI yordamchi
              </a>
              <a href="#narxlar" className="block text-muted hover:text-accent">
                Narxlar
              </a>
              <Link href="/signup" className="block text-muted hover:text-accent">
                Ro'yxatdan o'tish
              </Link>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-ink">Huquqiy</p>
              <Link href="/legal/privacy" className="block text-muted hover:text-accent">
                Maxfiylik siyosati
              </Link>
              <Link href="/legal/terms" className="block text-muted hover:text-accent">
                Foydalanish shartlari
              </Link>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-ink">Aloqa</p>
              <a
                href="https://t.me/oz4vka"
                target="_blank"
                rel="noreferrer"
                className="block text-muted hover:text-accent"
              >
                Telegram: @oz4vka
              </a>
              <span className="block text-muted">Toshkent, O'zbekiston</span>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-8 flex max-w-6xl flex-col justify-between gap-2 border-t border-line px-4 pt-5 text-xs text-muted sm:px-6 md:flex-row">
          <p>© {new Date().getFullYear()} Xoshimov Group. Barcha huquqlar himoyalangan.</p>
          <p>Dental Desk — Xoshimov Group mahsuloti.</p>
        </div>
      </footer>
    </div>
  );
}
