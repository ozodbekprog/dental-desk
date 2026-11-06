# Dental Desk v2 — o'zgarishlar

v2 — Dental Desk'ning yangi avlodi: zamonaviy klinik dizayn, delta sinxronizatsiya
va 32Desk'dagi barcha klinik funksiyalar. Asl `dental-desk` o'zgarishsiz qoldi.

## Asosiy

- **Yangi dizayn tizimi** — deep teal + mint palitra, Manrope/Onest, karta
  dashboard, yumshoq soyalar, mobil drawer va pastki tab bar (`v2.css`).
- **Delta sinxronizatsiya** — `Record.rev` + `/api/db/changes?since=`; adapter
  avval snapshot, keyin faqat o'zgargan doclarni tortadi. `focus` va
  `visibilitychange` da zudlik bilan yangilanish.
- **Yangi kolleksiyalar** — chairs, branches, waitlist, toothHistory, diagnoses,
  plans, labOrders, labs, templates, documents, campaigns, messages,
  msgTemplates, outbox, inventory, materialUse, suppliers, purchases, payments,
  payroll, shifts, audit, files, fileData.
- **Tarif modullari** — `lib/plans.ts`: Start (ombor va ish haqi yo'q), Klinika,
  Tarmoq; 403 `plan_restricted`.
- **Call markaz himoyasi** — klinik va moliyaviy kolleksiyalar GET va snapshot
  darajasida yashirin (403).

## Yangi modullar

- Kalendar v2: kabinetlar, smenalar, navbat (waitlist), band emas.
- Bemor kartasi v2: 7 tab, teglar, anamnez, fayllar, qarz.
- 3D tish: bolalar tishlari (FDI 51–85), tish tarixi, sirtlar.
- Muolaja shablonlari, ICD-10, 043/u forma.
- Ko'p varianti davolash rejasi (bosqichlar, qabul, tashrifga o'tkazish).
- Laboratoriya: buyurtmalar, bosqichlar, texnik to'lovi.
- Marketing: segment, kanal, shablon, progress, aloqa lenti.
- Analitika: kassa, tushum, qarz, konversiya, SVG chartlar.
- Ombor: materiallar, sarf, kam qoldiq, shtrix-kod, qabul, ta'minotchilar.
- Kassa: to'lov, chegirma, chek, qarz.
- Ish haqi: foiz/fiksa, davr, to'lov.
- Hujjatlar: 043, reja, xulosalar, chek; chop etish va yuborish.
- Global qidiruv ⌘K, audit lenti.
- AI assistent: yangi tool'lar (reja, lab, kassa, ombor, ish haqi, ombor lokali).

## Integratsiya

- `lib/channels.ts` — Telegram, SMS, WhatsApp, Email yuborish (env bo'lsa real,
  bo'lmasa `demo`).
- `POST /api/cron/outbox` — navbatdagi xabarlarni yuboradi.
- PWA: `manifest.webmanifest`, `sw.js`, oflayn sahifa, ikonkalar.

## Test

- `npm run check:e2e` — 41 tekshiruv: CRUD, rollar, tarif, delta feed,
  call markaz himoyasi, outbox, AI.
- `npx tsc --noEmit` va `npm run lint` — 0 xato.
