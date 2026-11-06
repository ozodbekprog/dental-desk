# Dental Desk v2 — klinikalar uchun to'liq boshqaruv tizimi

Dental Desk — xususiy stomatologiya klinikalari uchun ko'p ijarachi (multi-tenant)
SaaS: onlayn yozilish, qabul va call markaz navbati, qabul jadvali, bemor
kartalari, tashriflar tarixi, 3D tish xaritasi, xodimlar boshqaruvi,
hisob-fakturalar va ilova ichidagi AI yordamchi bitta tizimda. Interfeys
o'zbek, rus va ingliz tillarida.

Egasi va muallifi: **Ozodbek Xoshimov Xusanovich, Xoshimov Group** (2026).

## Tarkib

| Qism | Texnologiya |
| --- | --- |
| Veb-ilova va API | Next.js 15 (App Router, Turbopack), React 19, TypeScript |
| Stil | Tailwind CSS v4 |
| Ma'lumotlar bazasi | Prisma 6 + SQLite (`prisma/dev.db`) |
| Autentifikatsiya | bcryptjs + `jose` HS256 JWT, HttpOnly cookie |
| Ilova qobig'i | `content/app.html` + `public/app-assets/adapter.js` |
| 3D tish xaritasi | Three.js r128 (lokal, CDN'siz) |

## Imkoniyatlar

- **Onlayn yozilish va qabul navbati** — har bir klinika uchun anonim havola
  (`/b/<slug>`): bemor shifokor va bo'sh vaqtni tanlab so'rov qoldiradi. So'rov
  qabul/call markaz navbatiga tushadi; xodim bog'lanishni qayd etadi, vaqtni
  tasdiqlaydi (band bo'lsa boshqa slot tanlaydi) yoki sababi bilan rad etadi.
  Tasdiqlanganda bemor kartasi, qabul va slot avtomatik yaratiladi.
- **Qabul jadvali** — kunlik/haftalik ko'rinish, shifokor bo'yicha filtr, kreslo
  bandligi, check-in va qabulni boshlash.
- **Bemor kartasi** — aloqa ma'lumotlari, ogohlantirishlar, tashriflar tarixi.
- **3D tish xaritasi** — 32 tish, FDI/Universal raqamlash, har bir tish bo'yicha
  muolaja va izohlar.
- **Tashriflar** — muolajalar, to'lov summasi, tish holati, keyingi ko'rik.
- **Shifokor narxlari** — har bir shifokor o'z narxlar katalogini yuritadi;
  katalogda shifokor tanlanadi va uning narxlari ko'rinadi. Narx qo'yilmagan
  qatorlar **Kelishiladi** deb belgilanadi. Narxlar qabul formasiga avtomatik
  tushadi, yakuniy summani shifokor qabulda o'zgartira oladi. Egasi/administrator
  istalgan shifokor narxini, shifokor esa faqat o'zinikini tahrirlaydi.
- **Xodimlar va rollar** — egasi, administrator, shifokor, qabulxona, call
  markaz, kuzatuvchi. Call markaz faqat so'rovlar navbati bilan ishlaydi; klinik
  yozuvlar (tashriflar, tarix, ogohlantirishlar) unga ko'rinmaydi.
- **Klinika sozlamalari** — nom, tarif holati, xodim qo'shish/o'chirish.
- **Super-admin** — barcha klinikalar, tariflar, sinov muddatini uzaytirish.
- **Hisob-fakturalar** — admin panelda faktura yaratish, to'lovni tasdiqlash;
  tasdiqlanganda obuna (`paidUntil`) avtomatik uzayadi, kunlik cron muddati
  o'tganlarni `expired` qiladi.
- **AI yordamchi** — ilova ichidagi chat: navbat va bo'sh vaqtlar, bemor qidirish
  va qo'shish, navbat yozish/holatini o'zgartirish, statistika va tushum.
  Ixtiyoriy LLM (`AI_API_KEY`) yoki lokal oflayn rejim; yozish rollar va tarif
  holati bilan cheklanadi.
- **14 kunlik sinov** — karta talab qilinmaydi; sinov tugagach yozish yopiladi,
  o'qish saqlanadi.
- **Tarif limitlari** — Start 1 shifokor, Klinika 5 shifokor, Tarmoq cheksiz;
  modul darajasidagi cheklovlar `lib/plans.ts` da.

### v2 da qo'shilgan modullar

- **Kabinetlar (chairs) va smenalar** — kalendar kabinet bo'yicha, smena jadvali,
  ish joyi; navbat ro'yxati (waitlist) bo'sh vaqtga birikadi.
- **Ko'p filial** — filiallar, sidebar'dan filial tanlash, filial bo'yicha filtr.
- **Bemor kartasi v2** — tablar: Asosiy, Tish, Tashriflar, Rejalar, Hisob-kitoblar,
  Aloqa, Fayllar; teglar, anamnez, qarz, fayl biriktirish (drag & drop).
- **Tish tarixi** — har tish bo'yicha muolajalar, sirtlar, kanal, izoh, rasm.
- **Bolalar tish formulasi** — sut tishlari (FDI 51–85), aralash tishlash.
- **Muolaja shablonlari** — tayyor shablonlar tashrifga avtomatik protseduralar beradi.
- **ICD-10 katalogi** — diagnozni tashrifga biriktirish.
- **Ko'p varianti davolash rejasi** — 2–3 variant, bosqichlar, narx, qabul qilish,
  bajarilganini belgilash, chop etish; qabul qilingan variant tashrifga o'tadi.
- **Laboratoriya** — lablar katalogi, buyurtmalar, bosqichlar, muddat nazorati,
  texnik to'lovi (fiks/foiz).
- **Marketing** — segment (teg, shifokor, oxirgi tashrif, yosh, qarz), kanal
  (SMS/Telegram/WhatsApp/Email), shablon, progress, aloqa lenti, outbox.
- **Analitika** — kassa, tushum, qarz, yuklama, xizmat bo'yicha tushum,
  o'rtacha chek, davr filtri, SVG chartlar.
- **Ombor** — materiallar, qoldiq, minimal qoldiq ogohlantirishi, sarf (qabuldan
  avtomatik), shtrix-kod, qabul (purchase), ta'minotchilar.
- **Kassa** — to'lov oynasi, chegirma (sabab bilan, ruxsat tekshiruvi), usul,
  chek, qarz, balans.
- **Ish haqi** — shifokor bo'yicha foiz/fiksa, davr, to'langanini belgilash.
- **Hujjatlar** — 043/u forma, davolash rejasi, tashriflar xulosasi, chek;
  chop etish, email/Telegramga yuborish (stub), saqlangan hujjatlar.
- **Global qidiruv ⌘K** — bemor, tashrif, navbat, tez yozilish.
- **Audit lenti** — kim, qaysi yozuvni, qanday o'zgartirgan.
- **Vazifalar/aloqa lenti** — bemor bilan barcha xabarlar bir joyda.
- **AI yordamchi v2** — reja, lab, kassa, ombor kam qoldiq, ish haqi, tish
  tarixi tool'lari.
- **PWA** — `manifest.webmanifest`, service worker, oflayn qobiq, mobil pastki tab.

## 32Desk bilan taqqoslash

| Funksiya | 32Desk | Dental Desk v2 |
| --- | --- | --- |
| Kalendar, check-in, call markaz | ✔ | ✔ |
| Onlayn yozilish sahifasi | ✔ | ✔ `/b/<slug>` |
| Bemor kartasi, tashriflar tarixi | ✔ | ✔ + 7 tab |
| 3D tish xaritasi (32 tish) | — | ✔ FDI/Universal, bolalar tishlari |
| Kabinetlar, smenalar, navbat (waitlist) | ✔ | ✔ |
| Ko'p filial | ✔ | ✔ |
| ICD-10, muolaja shablonlari | ✔ | ✔ |
| 043 forma, hujjat shablonlari | ✔ | ✔ (chop etish → PDF) |
| Ko'p varianti davolash rejasi | ✔ | ✔ |
| Laboratoriya buyurtmalari | ✔ | ✔ |
| Marketing (SMS/Telegram/WA/Email) | ✔ | ✔ + outbox stub (env bilan real) |
| Analitika va hisobotlar | ✔ | ✔ |
| Ombor va sarf | ✔ | ✔ |
| Kassa, chegirmalar, chek | ✔ | ✔ |
| Ish haqi | ✔ | ✔ |
| Global qidiruv ⌘K | — | ✔ |
| AI yordamchi | — | ✔ |
| PWA / mobil | ✔ | ✔ |
| Audit lenti | ✔ | ✔ |

## Tez boshlash

Talablar: Node.js 20+, npm.

```bash
cp .env.example .env

# AUTH_SECRET va ADMIN_PASSWORD ni o'zingizga moslang
# AUTH_SECRET: openssl rand -hex 32

npm install
npx prisma migrate deploy      # yoki: npm run db:migrate
npm run seed:admin             # super-admin yaratadi
npm run seed:demo              # demo klinika + namuna yozuvlar
npm run dev                    # http://localhost:3000
```

`seed:demo` ni qayta ishga tushirish uchun: `npm run seed:demo -- --reset`
(namuna yozuvlarni o'chirib qayta yaratadi).

### Muhit o'zgaruvchilari

| Kalit | Tavsif |
| --- | --- |
| `DATABASE_URL` | SQLite yo'li, masalan `file:./dev.db` (prisma papkasiga nisbatan) |
| `AUTH_SECRET` | JWT imzolash kaliti, kamida 32 bayt |
| `ADMIN_EMAIL` | Super-admin emaili (`seed:admin` uchun) |
| `ADMIN_PASSWORD` | Super-admin paroli (`seed:admin` uchun) |
| `DEMO_ENABLED` | `"true"` bo'lsa, demo tugmasi va demo login ochiq |
| `CRON_SECRET` | `/api/cron/billing` va `/api/cron/outbox` uchun maxfiy kalit (Bearer yoki `?secret=`) |
| `TELEGRAM_BOT_TOKEN` | Ixtiyoriy: Telegram orqali xabar yuborish (kalitsiz — demo rejim) |
| `SMS_API_URL`, `SMS_API_KEY` | Ixtiyoriy: SMS shlyuzi (POST `{to, text}` JSON) |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` | Ixtiyoriy: WhatsApp Cloud API |
| `SMTP_API_URL` (+ `SMTP_TOKEN`, `SMTP_FROM`) | Ixtiyoriy: email yuborish endpointi |
| `AI_API_KEY` | Ixtiyoriy: OpenAI-mos LLM kaliti (bo'lmasa lokal rejim) |
| `AI_BASE_URL` | Ixtiyoriy: LLM endpoint, standart `https://api.openai.com/v1` |
| `AI_MODEL` | Ixtiyoriy: model nomi, standart `gpt-4o-mini` |

Haqiqiy parollar faqat `.env` faylida saqlanadi va repoga qo'shilmaydi.

### Demo va admin

- Demo: kirish sahifasidagi **"Demo ko'rish"** tugmasi (2 soatlik sessiya).
- Super-admin: `.env` dagi `ADMIN_EMAIL` / `ADMIN_PASSWORD`, `/admin` manzili.

## Skriptlar

| Buyruq | Vazifa |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `npm start` | Production build va ishga tushirish |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Prisma migratsiya (dev) |
| `npm run db:deploy` | Migratsiyalarni qo'llash (prod) |
| `npm run db:backup` | SQLite `.backup` + gzip, 14 kunlik retention |
| `npm run seed:admin` | Super-admin yaratish/yangilash |
| `npm run seed:demo` | Demo klinika va namuna yozuvlar |
| `npm run check:e2e` | 41 ta endpoint/UI tekshiruvi (dev server kerak; `E2E_BASE` bilan manzil) |
| `npm run screenshots` | Marketing skrinshotlarini yangilash |
| Outbox cron | `POST /api/cron/outbox` (`CRON_SECRET`) — marketing xabarlarini yuboradi |

## Arxitektura qisqacha

```
app/                 Next.js sahifalar va API route'lar
  b/[slug]/          anonim onlayn yozilish sahifasi
  api/auth/*         signup, login, logout, demo
  api/db/*           snapshot, changes (delta feed), version, collection CRUD
  api/public/*       klinika ma'lumoti, bo'sh slotlar, so'rov qabul qilish
  api/staff/*        xodimlar CRUD
  api/admin/*        super-admin klinikalar va hisob-fakturalar
  api/assistant      AI yordamchi (tool calling yoki lokal javob)
  api/cron/billing   obuna/sinov muddatini yopish (CRON_SECRET)
  api/cron/outbox    marketing xabarlarini yuborish (CRON_SECRET yoki egasi)
  app/route.ts       content/app.html ni sessiya bilan uzatadi
content/app.html     ilova qobig'i (prototipdan moslashtirilgan)
public/app-assets/   adapter.js (delta sync) + assistant.js + three.min.js + v2.css
public/sw.js         PWA service worker (qobiq cache, oflayn sahifa)
lib/                 prisma, jwt, auth, api guard, demo seed, plans,
                     billing, assistant, channels (SMS/Telegram/Email/WA)
prisma/schema.prisma Clinic, User, Record, Invoice
middleware.ts        /app, /settings, /admin himoyasi
```

Ilova qobig'i `window.claude.use("db")` interfeysini kutadi. `adapter.js` shu
interfeysni REST API ustida emulyatsiya qiladi: 5 soniyalik polling, snapshot
dispersiyasi va optimistik yozish. Shu sababli prototip kodini qayta yozmasdan
haqiqiy ko'p ijarachi backendga ulandi.

Har bir yozuv `clinicId` bilan ajratiladi; API har so'rovda foydalanuvchi rolini
va klinika holatini bazadan qayta o'qiydi (rol o'zgarsa yoki xodim o'chirilsa,
eski token darhol kuchini yo'qotadi).

## Production

Batafsil qo'llanma: [`docs/09-ekspluatatsiya.md`](docs/09-ekspluatatsiya.md).

Qisqa talablar:

- Node.js 20+, bitta instansiya, doimiy disk (SQLite uchun).
- `.env` da kuchli `AUTH_SECRET`, alohida `ADMIN_PASSWORD`, `CRON_SECRET`.
- `npm run db:deploy && npm run build && npm start`.
- Kunlik `npm run db:backup` (cron) va backupni tashqi joyga ko'chirish.
- Kunlik billing cron: `GET /api/cron/billing` (`CRON_SECRET` bilan).
- HTTPS reverse proxy (Caddy/Nginx) ortida ishga tushirish.

SQLite bir vaqtda bir nechta instansiyani qo'llamaydi. Keyingi bosqichda
PostgreSQLga o'tish rejalashtirilgan (`docs/07-yol-xaritasi.md`).

## Cheklovlar (halol ro'yxat)

- Payme/Click avtoto'lovi yo'q; hisob-fakturalar admin panelda qo'lda yaratiladi
  va to'lov tasdiqlanadi (obuna shunda avtomatik uzayadi).
- Onlayn so'rov tasdiqlanganda bemorga SMS yoki Telegram xabari yuborilmaydi;
  call markaz qo'ng'iroq qiladi. Telegram bot keyingi bosqichda.
- AI yordamchi LLM kalitisiz lokal qoidalar bilan ishlaydi; murakkab erkin
  savollarga javob sifati kalit ulanganda yuqoriroq bo'ladi.
- SMS/Telegram/WhatsApp/Email yuborish provider kaliti qo'yilmasa demo rejimda
  ishlaydi (outbox'da `demo` statusi).
- Payme/Click avtoto'lovi UI darajasida; integratsiya keyingi bosqichda.
- Filiallar bitta bazada; filiallar orasidagi sinxronizatsiya keyingi bosqichda.
- SQLite bitta server uchun; yuqori yuklamada PostgreSQL tavsiya etiladi.

## Hujjatlar

To'liq ro'yxat: [`docs/README.md`](docs/README.md).

## Litsenziya

Proprietary. Batafsil: [LICENSE](LICENSE) va [NOTICE](NOTICE).
