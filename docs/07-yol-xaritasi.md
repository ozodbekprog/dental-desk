# Yol xaritasi va cheklovlar

## Hozirgi holat (2026-yil noyabr)

Mahsulot real foydalanishga yaroqli MVP:

- ko'p ijarachi arxitektura, klinikalar izolyatsiyasi;
- autentifikatsiya, rollar, sinov va tarif nazorati;
- qabul jadvali, bemor kartasi, tashriflar, 3D tish xaritasi;
- anonim onlayn yozilish sahifasi (`/b/:slug`), qabul va call markaz navbati:
  bog'lanish tarixi, vaqtni tasdiqlash, band slotni almashtirish, rad etish va
  qayta ochish;
- call markaz roli klinik yozuvlardan ajratilgan;
- xodimlar boshqaruvi, super-admin panel;
- hisob-fakturalar, obuna uzaytirish va kunlik billing cron;
- ilova ichidagi AI yordamchi (lokal + ixtiyoriy LLM, yozish rollar bilan);
- 35 ta avtomatik E2E tekshiruv, marketing skrinshotlari;
- tijoriy hujjatlar to'plami.

## 0–3 oy (sotuvni boshlash uchun)

1. **Telegram bot orqali tasdiqlash** — bemorga so'rov holati va tasdiqlangan
   vaqt haqida xabar. Anonim onlayn sahifa (`/b/:slug`) va call markaz navbati
   allaqachon ishlaydi; hozir tasdiqni xodim qo'ng'iroq qilib aytadi.
2. **Ish vaqtini sozlash** — klinika bo'yicha ish boshlanishi, tugashi,
   tushlik va dam kunlari (hozir 09:00–18:00, 13:00–14:00, yakshanba yopiq).
3. **Onlayn to'lov integratsiyasi** — Payme/Click orqali oylik obuna.
   Hisob-faktura, qo'lda tasdiqlash va avtomatik `expired` allaqachon bor.
4. **Audit jurnali** — kim, qachon, qaysi yozuvni o'zgartirgani.
5. **PostgreSQL** — bir nechta instansiya va katta hajm uchun.
6. **Email/Telegram eslatmalar** — qabuldan 24 soat va 2 soat oldin.

## 3–6 oy

- Ko'p filial: bitta klinika ostida bir nechta manzil va markaziy hisobot.
- Bemor portali: o'z tarixi, navbatni ko'rish va bekor qilish.
- Excel/CSV import va eksport (bemorlar, tashriflar).
- Kassa: to'lov usullari, qarz, kunlik kassa hisoboti.
- 2FA va email orqali parol tiklash.
- Shifokor yuklamasi va daromad bo'yicha hisobotlar.

## 6–12 oy

- SMS eslatmalar (Eskiz.uz va h.k.).
- Sug'urta va korporativ mijozlar.
- Ko'p tilli hisobot shablonlari.
- Ochiq API va webhooklar.
- Mobil ilova (PWA birinchi navbatda).

## Hozirgi cheklovlar (xaridorga ochiq)

| Cheklov | Holat | Reja |
| --- | --- | --- |
| Telegram/SMS tasdiq xabari | Yo'q; xodim qo'ng'iroq qiladi | 0–3 oy |
| Ish vaqtini sozlash | Yo'q (qat'iy 09–18) | 0–3 oy |
| Onlayn to'lov (Payme/Click) | Yo'q; faktura + qo'lda tasdiqlash bor | 0–3 oy |
| Ko'p filial | Yo'q | 3–6 oy |
| SMS/Telegram eslatma va tasdiq | Yo'q | 0–6 oy |
| Audit jurnali | Yo'q | 0–3 oy |
| 2FA, parol tiklash | Yo'q | 3–6 oy |
| PostgreSQL | Yo'q (SQLite) | 0–3 oy |
| Yuklama testi | O'tkazilmagan | PostgreSQL bilan |
| Mobil ilova | Yo'q (responsiv veb) | 6–12 oy |
| Bank/Click/Payme reconciliatsiya | Yo'q (qo'lda faktura) | 0–3 oy |

## Texnik qarzlar

- `content/app.html` — 6000 qatorli monolit; keyingi yirik o'zgarishlarda
  komponentlarga bo'lish kerak.
- Adapter polling asosida (5 s); WebSocket/SSE ga o'tish mumkin.
- E2E testlar Playwright + tizim Chrome'ga bog'langan; CI'da headless Chrome
  o'rnatish kerak.
- Avtomatik unit testlar yo'q; API uchun Vitest qo'shish tavsiya etiladi.
- Bitta server instansiyasi; gorizontal masshtablash uchun PostgreSQL + Redis
  kerak.

## Strategik imkoniyatlar

- Toshkentdagi klinikalar uchun pilot narx va yillik shartnoma.
- Tumanlar bo'yicha rasmiy tarqatuvchi (reseller) modeli.
- Stomatologiya kollejlari uchun o'quv litsenziyasi.
- Klinika ochilishiga tayyor "start paket": dastur + onboarding + trening.
