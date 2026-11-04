# Joriy etish rejasi (onboarding)

Bu reja yangi klinikani 1 hafta ichida ishga tushirish uchun. Mas'ul:
yetkazib beruvchi (siz) va klinika administratori.

## 0-kun — tayyorgarlik

- [ ] Klinika nomi, filial manzili, telefon va mas'ul shaxs aniqlanadi.
- [ ] Tarif tanlanadi (sinov yoki to'langan).
- [ ] Klinika ro'yxatdan o'tadi: `/signup` — klinika nomi, egasining ismi,
      email, parol (kamida 8 belgi).
- [ ] Super-admin panelida klinika tarifi tekshiriladi: `/admin`.
- [ ] Klinika egasi birinchi marta kiradi va parolni saqlaydi.

## 1-kun — sozlash

- [ ] **Sozlamalar** sahifasida klinika nomi tekshiriladi.
- [ ] Xodimlar qo'shiladi: shifokor, qabulxona, call markaz, administrator,
      kuzatuvchi. Har bir xodimga alohida email va boshlang'ich parol beriladi.
- [ ] Shifokorlar ro'yxati **Jadval → Shifokorlar** bo'limida tekshiriladi;
      shifokor roli qo'shilganda u avtomatik ro'yxatga tushadi.
- [ ] Namuna yozuvlar o'chiriladi: yuqoridagi "Namunalarni o'chirish" tugmasi.
- [ ] **Qabul va call markaz** sahifasidan ommaviy havola (`/b/<slug>`)
      nusxalanadi va sayt, Instagram profili yoki Telegram kanaliga qo'yiladi.
- [ ] Telefondan sinov so'rovi yuboriladi; so'rov navbatda ko'rinishi,
      **Bog'landim** va **Tasdiqlash** oqimi mashq qilinadi.
- [ ] Call markaz xodimiga faqat navbat ko'rinishi tushuntiriladi (bemorlar va
      tarix yopiq).
- [ ] Ish vaqti eslatiladi: hozircha 09:00–18:00, tushlik 13:00–14:00,
      yakshanba yopiq, slot 30 daqiqa.

## 2-kun — ma'lumot ko'chirish (agar kerak bo'lsa)

- [ ] Klinikadan bemorlar ro'yxati olinadi: ism, telefon, tug'ilgan sana.
- [ ] Format kelishiladi (Excel/CSV ustunlari).
- [ ] Ko'chirish sinovdan oldin qilinadi; dublikatlar telefon bo'yicha
      tekshiriladi.
- [ ] Ko'chirilgandan keyin 10 ta bemor tanlab solishtiriladi.

Eslatma: ommaviy import hozircha qo'lda skript orqali bajariladi; API'da
tayyor import vositasi yo'q.

## 3–5-kun — real foydalanish

- [ ] Ertalabgi jadval qabulxona tomonidan kiritiladi.
- [ ] Onlayn so'rovlar har kuni kamida ikki marta ko'rib chiqiladi: bemorga
      qo'ng'iroq, kelishuv yozuvi, tasdiqlash yoki sababli rad etish.
- [ ] Har bir qabul check-in → "Qabulni boshlash" → tashrif yopish bilan
      o'tkaziladi.
- [ ] Shifokor bemor kartasida 3D xarita va tish izohlarini sinab ko'radi.
- [ ] Har kuni kechqurun egasi jadval va tashriflar tarixini tekshiradi.
- [ ] Muammolar Telegram guruhida yig'iladi.

## 6-kun — tekshiruv

- [ ] Barcha shifokorlar tizimga kira oladi.
- [ ] Har bir shifokorda kamida 3 ta real tashrif yopilgan.
- [ ] Namuna yozuvlar qolmagan ("Namuna" yorlig'i ko'rinmaydi).
- [ ] Backup ishlayapti (server administratori tekshiradi).
- [ ] Klinika egasi rol va ruxsatlarni tekshirgan.

## 7-kun — yakun va keyingi qadam

- [ ] 20 daqiqalik yakuniy suhbat: nima ishladi, nima qiyin bo'ldi.
- [ ] Tarif tasdiqlanadi va to'lov rasmiylashtiriladi.
- [ ] Qo'llab-quvvatlash kanali va javob vaqti kelishiladi.
- [ ] 30 kundan keyin qayta ko'rik belgilanadi.

## Javobgarlik matritsasi

| Vazifa | Klinika | Yetkazib beruvchi |
| --- | --- | --- |
| Xodimlar ro'yxati va parollar | ✅ | maslahat |
| Kundalik jadval kiritish | ✅ | — |
| Tarif va to'lov | ✅ | hisob-faktura |
| Server, backup, yangilanish | — | ✅ |
| Ma'lumot ko'chirish | ma'lumot beradi | ✅ |
| Xatoliklarni qabul qilish | xabar beradi | tuzatadi |

## Tez-tez uchraydigan savollar

**Xodim parolni unutdi.** Egasi Sozlamalar → Xodimlar orqali yangi parol
o'rnatadi (xodimni o'chirib qayta qo'shish shart emas: tahrirlash oynasida
parol maydoni mavjud).

**Shifokor o'chirildi, tarixi nima bo'ladi?** Tashriflar va bemor kartalari
saqlanadi; shifokor nomi tarixda qoladi. Yangi shifokor qo'shilsa, eski
tashriflar unga o'tmaydi.

**Tarif limiti tugadi.** Sozlamalarda yangi shifokor qo'shishda xato chiqadi.
Tarifni oshirish uchun super-adminga murojaat qilinadi.

**Sinov tugadi.** Yozish yopiladi, o'qish ochiq. To'lov tasdiqlangach yozish
avtomatik qayta ochiladi.
