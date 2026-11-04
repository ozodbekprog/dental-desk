# Administrator qo'llanmasi

Ikki daraja bor: **klinika administratori** (o'z klinikasi) va **super-admin**
(barcha klinikalar, faqat xizmat ko'rsatuvchi).

## 1. Klinika administratori

Sozlamalar sahifasi: `/settings`. Kirish huquqi — egasi va administrator roli.

### Klinika nomi

**Klinika** kartasida nomni o'zgartirish va **Saqlash**. Nom ilovada va
hisobotlarda ko'rinadi.

### Tarif holati

**Tarif** kartasida joriy tarif va holat ko'rsatiladi. Sinov muddati tugashiga
qolgan kunlar ko'rinadi. Tarifni faqat super-admin o'zgartiradi; "Tarifni
yangilash" tugmasi Telegram orqali bog'lanish uchun.

### Xodimlar

**Xodimlar** jadvalida: ism, email, rol, amallar.

Yangi xodim qo'shish:

1. Ism Familiya, email, boshlang'ich parol (8+ belgi).
2. Rolni tanlang: shifokor, qabulxona, call markaz, administrator, kuzatuvchi.
3. Shifokor roli uchun mutaxassislikni tanlang.
4. **Xodim qo'shish**.

Muhim:

- Shifokor qo'shilganda u ilovadagi shifokorlar ro'yxatiga avtomatik tushadi.
- Rolni o'zgartirish jadvaldagi select orqali; darhol kuchga kiradi (qayta
  kirish shart emas).
- **Parol** tugmasi yangi parol o'rnatadi. Xodim keyingi kirishda yangi parol
  bilan kiradi.
- **O'chirish** xodimni tizimdan olib tashlaydi. Uning tashriflari va bemor
  tarixi saqlanadi.
- O'zingizni va klinika egasini o'chirib bo'lmaydi.
- Tarif limiti: Start — 1 shifokor, Klinika — 5, Tarmoq — cheksiz. Limit
  tugaganda xato xabari chiqadi.

### Rollar va ruxsatlar

| Amal | Egasi | Admin | Shifokor | Qabulxona | Call markaz | Kuzatuvchi |
| --- | --- | --- | --- | --- | --- | --- |
| Ma'lumot yozish | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Onlayn so'rovlar bilan ishlash | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| AI orqali yozish | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Xodim qo'shish/o'chirish | ✅ | ✅ | — | — | — | — |
| Rol o'zgartirish | ✅ | ✅ | — | — | — | — |
| Klinika nomini o'zgartirish | ✅ | ✅ | — | — | — | — |
| Tashrif va klinik tarixni ko'rish | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| O'qish | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

Kuzatuvchi faqat o'qiydi; yozishga urinish "faqat o'qish" xatosini beradi.
Call markaz faqat qabul navbati va jadval bilan ishlaydi: bemorlar bo'limi,
tashriflar, klinik ogohlantirishlar va AI orqali tarix unga ko'rinmaydi.
So'rovni tasdiqlash esa unga ochiq — tasdiqlash bemor, qabul va slot yaratadi.

## 2. Super-admin

Manzil: `/admin`. Login — `.env` dagi `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
Bu hisob klinikaga bog'lanmagan (`clinicId` yo'q).

Jadvalda har bir klinika: nom, slug, tarif, holat, sinov tugashi, xodimlar va
yozuvlar soni, yaratilgan sana.

Amallar:

- **Tarif**: trial, start, clinic, network.
- **Holat**: active, expired, suspended.
- **Sinov**: +14 yoki +30 kun. Sinov tugagan bo'lsa, bugundan boshlab qo'shiladi.
- **Nom**: klinika nomini tuzatish.

Muhim qoidalar:

- `suspended` yoki `expired` holatida klinika **yoza olmaydi**, lekin o'qiy oladi.
- `trial` tarifida sinov sanasi o'tgan bo'lsa, yozish yopiladi.
- Tarifni `start/clinic/network` ga o'tkazish sinov cheklovini olib tashlaydi.
  To'lovni qo'lda tekshirmasdan tarifni faollashtirmang.
- Shifokor limiti tarifga bog'liq; tarif pasaytirilsa, ortiqcha shifokorlar
  avval o'chirilishi kerak.

### Hisob-fakturalar

Admin panelning **Hisob-fakturalar** kartasi orqali obuna to'lovi yuritiladi:

1. Klinika, tarif va oylar sonini tanlang — summa tarif narxidan avtomatik
   hisoblanadi.
2. **Hisob yaratish** — `DD-YYYYMM-NNNN` raqami bilan `pending` faktura
   yaratiladi.
3. To'lov kelgach **To'landi** tugmasini bosing — faktura `paid` bo'ladi va
   klinika obunasi davr oxirigacha avtomatik uzayadi (`paidUntil`); tarif va
   holat `active` ga o'tadi.
4. Xato fakturani **Bekor** qilish mumkin; to'langan fakturani bekor qilib
   bo'lmaydi.

Har kuni cron `GET /api/cron/billing` sinov muddati yoki obunasi o'tgan
klinikalarni `expired` holatiga o'tkazadi. Endpoint `CRON_SECRET` bilan
himoyalangan: `Authorization: Bearer <secret>` yoki `?secret=<secret>`.
To'lovni tekshirmasdan fakturani "to'langan" qilmang.

### Demo klinika

- Demo kirish: bosh sahifadagi **Demo ko'rish** (2 soatlik sessiya).
- Demo ma'lumotlarni tiklash: serverda `npm run seed:demo -- --reset`
  (37 ta namuna yozuv, shu jumladan ikkita onlayn so'rov).
- Demo klinikaning ommaviy havolasi: `/b/demo`. Uni **Qabul va call markaz**
  sahifasida nusxalash mumkin.
- Demo butunlay o'chirish: `.env` da `DEMO_ENABLED="false"` va serverni qayta
  ishga tushirish. Demo tugmasi 403 qaytaradi.
- Ommaviy serverda demo ma'lumotlarni vaqti-vaqti bilan tiklab turing, chunki
  tashrif buyuruvchilar ularni o'zgartirishi mumkin.

## 3. Super-admin parolini almashtirish

1. `.env` da `ADMIN_PASSWORD` ni yangilang.
2. `npm run seed:admin` — mavjud emailning parolini yangilaydi (skript
   idempotent).
3. Serverni qayta ishga tushiring (yoki env qayta o'qilishini ta'minlang).

`ADMIN_PASSWORD` ni chatga, Telegramga yoki repoga yozmang.

## 4. Klinikani to'xtatish va o'chirish

- Vaqtincha to'xtatish: holat `suspended`. Ma'lumot saqlanadi.
- To'lov tugashi: holat `expired` yoki sinov sanasini o'tkazish.
- Butunlay o'chirish hozircha faqat baza orqali (qo'llab-quvvatlash
  administratori). Avval backup oling:
  `npm run db:backup`, keyin klinika yozuvlarini o'chiring.
- O'chirish qaytarilmas; foydalanuvchi roziligisiz amalga oshirmang.

## 5. Kundalik tekshiruv ro'yxati

- [ ] Yangi ro'yxatdan o'tgan klinikalar ko'rib chiqildi.
- [ ] To'lovi tugaydigan klinikalar ro'yxati tekshirildi (7 kun oldin xabar).
- [ ] `pending` hisob-fakturalar va `paidUntil` sanalari ko'rib chiqildi.
- [ ] Billing cron ishlayapti (`/api/cron/billing`, `CRON_SECRET`).
- [ ] Demo ma'lumotlar buzilmagan.
- [ ] Backup muvaffaqiyatli o'tgan (`backups/` papkasi).
- [ ] Server loglarida 5xx xatolar yo'q.
