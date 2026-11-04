# Arxitektura va xavfsizlik

## 1. Umumiy ko'rinish

```
Brauzer
  │  HTTPS
  ▼
Next.js 15 (App Router)
  ├── /app, /settings, /admin  — himoyalangan sahifalar
  ├── /b/[slug]                — anonim onlayn yozilish sahifasi
  ├── content/app.html         — klinika ilovasi (prototip qobig'i)
  ├── /api/auth/*              — signup, login, logout, demo
  ├── /api/db/*                — snapshot, version, CRUD
  ├── /api/public/*            — klinika, slotlar, so'rov (autentifikatsiyasiz)
  ├── /api/staff/*             — xodimlar
  ├── /api/admin/*             — super-admin, hisob-fakturalar
  ├── /api/assistant           — AI yordamchi (LLM yoki lokal)
  ├── /api/cron/billing        — obuna muddatini yopish
  └── /api/health              — monitoring
        │
        ▼
  Prisma ORM → SQLite (prisma/dev.db)
```

Ilova qobig'i `window.claude.use("db")` interfeysini kutadi.
`public/app-assets/adapter.js` bu interfeysni REST ustida emulyatsiya qiladi:

- 5 soniyada bir marta `/api/db/version` so'raladi;
- versiya o'zgargan bo'lsa, `/api/db/snapshot` olinadi va obunalarga tarqatiladi;
- yozish `PUT/PATCH/DELETE /api/db/:collection/:id` orqali;
- yozuvdan keyin darhol yangilanish so'raladi.

Shu tufayli prototip UI kodini qayta yozmasdan haqiqiy backendga ulandi.

## 2. Ma'lumot modeli

```
Clinic 1 ─── * User
Clinic 1 ─── * Record
Clinic 1 ─── * Invoice
```

| Model | Maydonlar | Izoh |
| --- | --- | --- |
| Clinic | id, name, slug, plan, status, trialEndsAt, paidUntil | Tarif, sinov va obuna holati |
| User | id, clinicId, email, passwordHash, name, role | Super-admin: clinicId = null |
| Record | id, clinicId, collection, docId, data (JSON) | Bemor, qabul, tashrif... |
| Invoice | id, clinicId, number, plan, amount, months, periodStart/End, status, method | Qo'lda tasdiqlanadigan obuna to'lovi |

`Record` — kalit-qiymat jadvali: `collection` (patients, appointments,
visits, doctors, slots, requests, reqstate, links, history) va `docId`.
Unikal indeks: `(clinicId, collection, docId)`. Har bir so'rov `clinicId`
bilan cheklanadi.

Onlayn so'rovlar ikkita collection'da yuritiladi:

- `requests` — hujjat `pub-<uuid>` yoki xodim uid'i ostida; ichida `items[]`
  (ism, telefon, shifokor, sana, vaqt, sabab, manba). Bir hujjatda bir nechta
  so'rov bo'lishi mumkin.
- `reqstate` — `docId` so'rov elementi id'si; holat (`requested`, `contacted`,
  `confirmed`, `declined`), bog'lanishlar tarixi (`contacts[]`), tasdiqlagan
  xodim va yaratilgan qabul id'si.

Tasdiqlash `patients`, `appointments` va `slots` yozuvlarini bitta oqimda
yaratadi. Tasdiqlanmagan so'rov vaqti `busyTimes()` orqali band hisoblanadi —
ommaviy sahifa ham, xodim jadvali ham uni bo'sh slot sifatida taklif qilmaydi.

Bu yondashuv prototipning Firestore-uslubidagi modelini saqlaydi va
sxema migratsiyasisiz yangi maydon qo'shish imkonini beradi. Kamchiligi:
murakkab analitik so'rovlar uchun alohida jadvallar kerak bo'ladi.

## 3. Autentifikatsiya

- Parollar `bcryptjs` bilan (10 raund) xeshlanadi; ochiq parol saqlanmaydi.
- Sessiya — `jose` bilan imzolangan HS256 JWT, HttpOnly cookie `dd_session`.
- Cookie: `SameSite=Lax`, productionda `Secure`, 30 kun.
- Demo sessiyasi 2 soat.
- `middleware.ts` `/app`, `/settings`, `/admin` ni himoyalaydi.
- Har bir API so'rovida `clinicContext()` foydalanuvchini bazadan qayta o'qiydi:
  rol o'zgarsa, xodim o'chirilsa yoki klinika almashsa — eski token darhol
  kuchini yo'qotadi. Bu JWT'dagi eski rolga ishonishdan himoya qiladi.
- Super-admin API'lari `isSuperAdmin()` orqali bazadagi rolni tekshiradi.

## 4. Avtorizatsiya va tarif nazorati

| Tekshiruv | Qayerda |
| --- | --- |
| Sessiya borligi | `middleware.ts`, `clinicContext()` |
| Rol bo'yicha yozish | `canWriteRole()` |
| Tarif/sinov faolligi | `clinicWritable()` |
| Shifokor limiti | `doctorSeatLimit()` (staff API) |
| Super-admin | `isSuperAdmin()` |
| Call markaz klinik ma'lumotdan ajratilgan | snapshot filtri + `/api/db` guard + `lib/assistant.ts` |
| AI yozish huquqi | `lib/assistant.ts` — `canWriteRole()` + `clinicWritable()` |

Yozish rad etilganda API `403` va `read_only` yoki `trial_expired` kodini
qaytaradi; ilova tushunarli xabar ko'rsatadi.

Klinikalar izolyatsiyasi: barcha `Record` so'rovlari sessiyadagi `clinicId`
bilan filtrlangan; boshqa klinika `docId` sini bilgan holda ham o'qiy yoki
yoza olmaydi. E2E test buni tekshiradi.

## 5. Kiritilgan himoya choralari

- Login: 15 daqiqada 10 urinish (IP + email), muvaffaqiyatli kirishda hisob
  nolga tushadi.
- Ro'yxatdan o'tish: soatiga 5 ta (IP).
- Demo: soatiga 20 ta (IP).
- AI yordamchi: daqiqada 60 so'rov (foydalanuvchi + IP).
- Ommaviy sahifa ma'lumoti: daqiqada 120 so'rov (IP).
- Ommaviy slotlar: daqiqada 240 so'rov (IP).
- Ommaviy so'rov: soatiga 10 ta (IP + klinika); bir telefon uchun 3 ta ochiq
  so'rov. Bir vaqtga ikki so'rov tushmasligi uchun klinika+slot bo'yicha
  in-memory qulf (`withLock`) ishlatiladi.
- Tizimga kirmagan foydalanuvchi faqat shu uchta ommaviy endpointga kira oladi.
- JSON hajmi: bitta yozuv 512 KB bilan cheklangan.
- Collection nomlari oq ro'yxat (`COLLECTIONS`) orqali.
- SQL in'ektsiyasi: Prisma parametrlangan so'rovlar.
- XSS: React/Next escaping; ilova qobig'ida `esc()` ishlatiladi.
- CSRF: `SameSite=Lax` cookie + `Content-Type: application/json` API'lar;
  holat o'zgartiruvchi amallar faqat POST/PUT/PATCH/DELETE.
- Parol minimal uzunligi 8 belgi.
- `.env` va baza fayli repoga kirmaydi (`.gitignore`).

## 6. Ma'lumotlar va maxfiylik

- Tibbiy ma'lumot shaxsiy ma'lumot hisoblanadi. Operator O'zbekiston
  Respublikasining shaxsiy ma'lumotlar to'g'risidagi qonunchiligiga rioya
  qilishi shart.
- Klinika — ma'lumot egasi; platforma operatori topshiriq bo'yicha qayta
  ishlovchi. Shartnomada qayta ishlash shartlari, saqlash muddati va o'chirish
  tartibi belgilanadi.
- Saytdagi `/legal/privacy` va `/legal/terms` — boshlang'ich matnlar; yuridik
  kuchga ega yakuniy hujjatlar emas.
- Backup fayllari shifrlangan diskda saqlanishi tavsiya etiladi; tashqi
  joyga ko'chirishda shifrlash qo'llaniladi.
- Ommaviy sahifa faqat klinika nomi, shifokorlar ismi va bo'sh vaqtlarni
  ko'rsatadi; bemorlar ro'yxati va tarix ochilmaydi. So'rovda kiritilgan ism va
  telefon klinika navbatiga tushadi.
- Call markaz roli snapshot'dan `visits` va `history`ni olmaydi, bemor
  ogohlantirishlari (`alerts`, `alertIds`) tozalanadi, `/api/db` orqali
  tashrif/tarix yozish 403 bilan yopiladi; AI yordamchi ham shu rolga klinik
  tarixni bermaydi.
- Repoda haqiqiy bemor ma'lumoti yo'q; barcha namunalar xayoliy.

## 7. Ma'lum cheklovlar

| Cheklov | Ta'sir | Yechim yo'nalishi |
| --- | --- | --- |
| Audit jurnali yo'q | Kim nimani o'zgartirganini kuzatib bo'lmaydi | `AuditLog` jadvali |
| 2FA yo'q | Parol o'g'irlansa, kirish mumkin | TOTP qo'shish |
| Email tiklash yo'q | Parolni faqat admin tiklaydi | Email xizmati |
| SQLite | Bitta instansiya, yozishda navbat | PostgreSQL |
| Fayl cheklovi 512 KB | Juda katta JSON rad etiladi | Yetarli, hujjatlashtirilgan |
| Rate limit xotirada | Ko'p instansiyada ishlamaydi | Redis |
| Shifrlash at-rest yo'q | Disk darajasida himoya kerak | LUKS/volume shifrlash |
| Payme/Click avtoto'lovi yo'q | Faktura va tasdiqlash qo'lda | Onlayn to'lov integratsiyasi |
| AI LLM kaliti ixtiyoriy | Kalitsiz javoblar lokal qoidalarga asoslanadi | Har doim lokal fallback mavjud |
| Ommaviy so'rovda CAPTCHA yo'q | Botlar so'rov yuborishi mumkin | IP limit + slot qulfi; keyin CAPTCHA |
| Slot qulfi xotirada | Ko'p instansiyada ishlamaydi | PostgreSQL advisory lock |

Bu ro'yxat xaridorga ochiq ko'rsatiladi; yashirish noto'g'ri va'dalarga olib
keladi.
