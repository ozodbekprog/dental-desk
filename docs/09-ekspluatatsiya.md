# Ekspluatatsiya qo'llanmasi

Maqsad: Dental Desk'ni bitta VPS'da ishonchli ishga tushirish va xizmat
ko'rsatish.

## 1. Talablar

- Ubuntu 22.04/24.04 yoki shunga mos Linux VPS.
- 2 vCPU, 2 GB RAM, 20 GB SSD (boshlang'ich yuklama uchun).
- Node.js 20 LTS yoki 22 LTS.
- Domen va DNS (masalan `dentaldesk.uz`).
- HTTPS uchun Caddy yoki Nginx + Let's Encrypt.
- SQLite uchun **doimiy disk**; serverless hosting tavsiya etilmaydi.

## 2. O'rnatish

```bash
sudo useradd -m -s /bin/bash dental
sudo mkdir -p /opt/dental-desk && sudo chown dental:dental /opt/dental-desk
sudo -u dental git clone <repo> /opt/dental-desk   # yoki arxivni ko'chiring
cd /opt/dental-desk
sudo -u dental cp .env.example .env
sudo -u dental nano .env
```

`.env`:

```ini
DATABASE_URL="file:./prod.db"
AUTH_SECRET="<openssl rand -hex 32>"
ADMIN_EMAIL="admin@dentaldesk.uz"
ADMIN_PASSWORD="<kuchli parol>"
DEMO_ENABLED="false"
CRON_SECRET="<openssl rand -hex 32>"

# Ixtiyoriy: AI yordamchi uchun OpenAI-mos LLM
# AI_API_KEY=""
# AI_BASE_URL="https://api.openai.com/v1"
# AI_MODEL="gpt-4o-mini"
```

```bash
sudo -u dental npm ci
sudo -u dental npx prisma migrate deploy
sudo -u dental npm run seed:admin
sudo -u dental npm run build
```

Birinchi klinikani saytdan ro'yxatdan o'tkazish orqali yarating; demo ma'lumot
kerak bo'lsa `DEMO_ENABLED="true"` qiling yoki `npm run seed:demo`.

## 3. systemd

`/etc/systemd/system/dental-desk.service`:

```ini
[Unit]
Description=Dental Desk
After=network.target

[Service]
Type=simple
User=dental
WorkingDirectory=/opt/dental-desk
EnvironmentFile=/opt/dental-desk/.env
ExecStart=/usr/bin/npm start -- --port 3000
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now dental-desk
sudo systemctl status dental-desk
```

## 4. Caddy (HTTPS)

`/etc/caddy/Caddyfile`:

```
dentaldesk.uz {
    encode gzip
    reverse_proxy 127.0.0.1:3000
}
```

```bash
sudo systemctl reload caddy
curl -s https://dentaldesk.uz/api/health
```

`/api/health` `{"ok":true}` qaytarishi kerak. Monitoring (UptimeRobot va h.k.)
shu manzilni har 1–5 daqiqada tekshirsin.

### Ommaviy yozilish sahifasi

- Har bir klinika uchun manzil: `https://<domen>/b/<slug>`.
- Sahifa autentifikatsiyasiz ishlaydi, lekin faqat faol klinika uchun so'rov
  qabul qiladi. Klinika `expired`/`suspended` bo'lsa, sahifa yopiq ko'rinadi.
- Ommaviy API lar IP bo'yicha cheklangan (ma'lumot 120/min, slotlar 240/min,
  so'rov 10/soat). Shikoyat bo'lsa, `app/api/public/[slug]/*/route.ts` dagi
  limitlarni tushiring yoki IP ni Caddy darajasida bloklang.
- Slot qulfi jarayon xotirasida (`lib/booking.ts`). Bitta instansiya uchun
  to'g'ri ishlaydi; ko'p instansiyaga o'tishda PostgreSQL advisory lock kerak.
- `requests` va `reqstate` ham oddiy `Record` yozuvlari — backup ularni qamrab
  oladi. Spam so'rovlarni navbatdan rad eting yoki bazadan tozalang.

## 5. Backup

Kunlik backup (cron):

```cron
15 2 * * * cd /opt/dental-desk && ./scripts/backup-db.sh >> /var/log/dd-backup.log 2>&1
```

- Skript SQLite `.backup` buyrug'idan foydalanadi — ishlayotgan bazadan
  xavfsiz nusxa oladi.
- 14 kunlik nusxa `backups/` da qoladi.
- **Tashqi nusxa majburiy**: `backups/` ni boshqa serverga yoki shifrlangan
  bulutga ko'chiring (rclone, rsync, S3).

### Backupni tiklash

```bash
sudo systemctl stop dental-desk
cp prisma/prod.db prisma/prod.db.before-restore
gunzip -c backups/dental-desk-YYYYMMDD-HHMMSS.db.gz > prisma/prod.db
sqlite3 prisma/prod.db "PRAGMA integrity_check;"
sudo systemctl start dental-desk
```

Tiklashdan keyin kamida bitta klinika va uning bemorlari ochilishini tekshiring.
Har chorakda bir marta sinov tiklash o'tkazing.

## 6. Billing cron

Har kuni sinov muddati va obunasi (`paidUntil`) o'tgan klinikalarni `expired`
holatiga o'tkazish kerak:

```cron
5 0 * * * cd /opt/dental-desk && set -a && . ./.env && set +a && curl -fsS -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/billing >> /var/log/dd-billing.log 2>&1
```

- Endpoint `CRON_SECRET` bo'lmasa `503`, noto'g'ri kalitda `403` qaytaradi.
- Qo'lda tekshirish: `curl -H "Authorization: Bearer $CRON_SECRET"
  http://127.0.0.1:3000/api/cron/billing`.
- Javob: `{"ok":true,"expiredTrials":N,"expiredPaid":M,"ts":...}`.
- To'lov tasdiqlanganda `paidUntil` oldinga suriladi; klinika yana yozadi.

## 7. Yangilash

```bash
cd /opt/dental-desk
./scripts/backup-db.sh
git pull
npm ci
npx prisma migrate deploy
npm run build
sudo systemctl restart dental-desk
curl -s https://dentaldesk.uz/api/health
```

Muammo bo'lsa: oldingi commitga qayting, backupni tiklang, `npm ci && npm run build`.

## 8. Loglar va disk

```bash
journalctl -u dental-desk -f
df -h
du -sh backups prisma
```

- SQLite fayli o'sadi; har oy hajmini tekshiring.
- `backups/` 14 nusxadan oshmasligi skript bilan ta'minlangan.
- Log rotation systemd/journald orqali.

## 9. Demo boshqaruvi

```bash
npm run seed:demo -- --reset   # namuna yozuvlarni tiklash
```

Ommaviy serverda demo **har kuni** tiklanadi (cron), chunki namuna qabullar
joriy sanaga bog'langan — ertasi kuni jadval bo'sh ko'rinadi. Foydalanuvchilar
demo ma'lumotlarni o'zgartirishi mumkin, shuning uchun tungi reset tavsiya
etiladi:

```cron
30 3 * * * cd /opt/dental-desk && npm run seed:demo -- --reset >> /var/log/dd-demo.log 2>&1
```

## 10. PostgreSQL'ga o'tish (kelgusi)

1. `prisma/schema.prisma` da `provider = "postgresql"`.
2. `DATABASE_URL` ni Postgres DSN ga almashtiring.
3. `prisma/migrations` ni yangidan yarating (`prisma migrate dev`), so'ng
   `prisma migrate deploy`.
4. Ma'lumotlarni ko'chirish skripti kerak (Clinic, User, Record).
5. Rate limitni Redis'ga almashtiring (ko'p instansiya uchun).
6. Yuklama testi o'tkazing.

Bu ish 0–3 oy rejasida (`07-yol-xaritasi.md`).

## 11. Hodisalar (incident) tartibi

**Sayt ochilmayapti**

1. `systemctl status dental-desk`
2. `journalctl -u dental-desk -n 100`
3. `/api/health` ni tekshiring.
4. Disk to'lganmi: `df -h`.
5. Kerak bo'lsa qayta ishga tushiring: `systemctl restart dental-desk`.

**Baza buzilgan**

1. Xizmatni to'xtating.
2. Eng so'nggi backupni tiklang.
3. `PRAGMA integrity_check` o'tkazing.
4. Yo'qotilgan davr uchun klinikalarni xabardor qiling.

**Super-admin paroli yo'qolgan**

1. `.env` da yangi `ADMIN_PASSWORD`.
2. `npm run seed:admin`.
3. `systemctl restart dental-desk`.

**Demo buzilgan**

`npm run seed:demo -- --reset`.

**Onlayn so'rovlar navbatga tushmayapti**

1. Havoladagi slug to'g'rimi: `/b/<slug>` (Sozlamalar yoki klinika qatorida).
2. Klinika holati `active` va tarif faolmi (`/admin`).
3. `/api/public/<slug>` 200 qaytaradimi; 404 bo'lsa slug xato.
4. So'rov 429 qaytarmayaptimi — IP limiti (soatiga 10 ta).
5. Navbatdagi filtr «Ochiq»da va qidiruv bo'sh ekanini tekshiring.
6. So'rov yuborilgach 5 soniya ichida yangilanadi; sahifani yangilang.

**Klinika to'lov qilmadi**

Admin panelida hisob-faktura yarating yoki mavjud `pending` fakturani
tekshiring. To'lov kelgach **To'landi** tugmasi obunani uzaytiradi. To'lov
kelmasa, billing cron `paidUntil` o'tgach holatni `expired` ga o'tkazadi —
klinika faqat o'qiydi.

## 12. Xavfsizlik amaliyotlari

- SSH: faqat kalit, root login o'chirilgan.
- Firewall: 22, 80, 443 ochiq; 3000 faqat localhost.
- `.env` huquqi `600`, egasi `dental`.
- Har 90 kunda `AUTH_SECRET` almashtirish (barcha sessiyalar tugaydi).
- `AUTH_SECRET` almashganda foydalanuvchilar qayta kiradi — oldin xabar bering.
- Backup fayllarini shifrlangan joyda saqlang.
- Serverda boshqa ilovalar bilan aralashtirmang.

## 13. Ishga tushirish ro'yxati

- [ ] Domen va HTTPS ishlaydi.
- [ ] `/api/health` 200 qaytaradi.
- [ ] Super-admin kira oladi, parol kuchli.
- [ ] `.env` repoga tushmagan; `CRON_SECRET` o'rnatilgan.
- [ ] `DEMO_ENABLED` qaror qilingan.
- [ ] `AI_API_KEY` qaror qilingan (yo'q bo'lsa lokal rejim ishlaydi).
- [ ] Birinchi haqiqiy klinika yaratilgan va sinovdan o'tgan.
- [ ] Ommaviy havola (`/b/<slug>`) telefondan ochilgan va sinov so'rovi
      navbatda ko'ringan.
- [ ] Kunlik backup cron o'rnatilgan, tashqi nusxa sozlangan.
- [ ] Billing cron o'rnatilgan va bir marta qo'lda tekshirilgan.
- [ ] Tiklash sinovi bajarilgan.
- [ ] Monitoring ogohlantirishi ulangan.
- [ ] Maxfiylik va shartlar sahifalari yurist bilan tekshirilgan.
