import { LegalShell } from "@/components/LegalShell";

export const metadata = {
  title: "Maxfiylik siyosati — Dental Desk",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Maxfiylik siyosati" updated="2026 yil 2 noyabr">
      <section>
        <h2 className="dd-display mb-2 text-lg font-bold text-ink">1. Umumiy ma&apos;lumot</h2>
        <p>
          Ushbu siyosat Dental Desk bulutli tizimi (keyingi o&apos;rinlarda — «Tizim»)
          foydalanuvchilari va ularning bemorlari ma&apos;lumotlariga qanday munosabatda
          bo&apos;lishimizni tushuntiradi. Tizim egasi va operatori — Xoshimov Group
          (Ozodbek Xoshimov Xusanovich), Toshkent, O&apos;zbekiston.
        </p>
      </section>

      <section>
        <h2 className="dd-display mb-2 text-lg font-bold text-ink">
          2. Qanday ma&apos;lumotlar saqlanadi
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Xodimlar: ism, email, rol, parolning hash ko&apos;rinishi.</li>
          <li>
            Bemorlar: ism, telefon, tug&apos;ilgan sana, tibbiy ogohlantirishlar, tashriflar va
            muolajalar tarixi.
          </li>
          <li>Texnik ma&apos;lumotlar: sessiya cookie, harakatlar vaqti va xatolik jurnallari.</li>
        </ul>
        <p className="mt-2">
          Bemor ma&apos;lumotlari klinika tomonidan kiritiladi. Klinika — ma&apos;lumotlar
          egasi, Xoshimov Group esa ularni saqlash xizmatini ko&apos;rsatuvchi operator
          hisoblanadi.
        </p>
      </section>

      <section>
        <h2 className="dd-display mb-2 text-lg font-bold text-ink">3. Maqsad va huquqiy asos</h2>
        <p>
          Ma&apos;lumotlar bemorlarga xizmat ko&apos;rsatish, qabulni boshqarish, tibbiy
          tarixni saqlash va klinika faoliyatini yuritish uchun ishlatiladi. Qayta ishlash
          klinika va bemor o&apos;rtasidagi xizmat munosabatlari hamda O&apos;zbekiston
          Respublikasining shaxsiy ma&apos;lumotlar to&apos;g&apos;risidagi qonunchiligi
          asosida amalga oshiriladi.
        </p>
      </section>

      <section>
        <h2 className="dd-display mb-2 text-lg font-bold text-ink">4. Izolyatsiya va xavfsizlik</h2>
        <p>
          Har bir klinika ma&apos;lumotlari alohida hisob (tenant) doirasida saqlanadi va
          boshqa klinikalar bilan aralashmaydi. Kirish faqat autentifikatsiyadan o&apos;tgan
          xodimlarga beriladi. Parollar qaytarilmas hash bilan saqlanadi, sessiyalar
          HttpOnly cookie orqali himoyalanadi, barcha API so&apos;rovlari klinika hisobiga
          bog&apos;lanadi.
        </p>
      </section>

      <section>
        <h2 className="dd-display mb-2 text-lg font-bold text-ink">5. Uchinchi tomonlar</h2>
        <p>
          Ma&apos;lumotlar reklama maqsadida sotilmaydi yoki uchinchi tomonlarga
          berilmaydi. Xosting, zaxira nusxa va texnik yordam uchun cheklangan
          pudratchilar jalb qilinishi mumkin; ular maxfiylik majburiyatini oladi.
        </p>
      </section>

      <section>
        <h2 className="dd-display mb-2 text-lg font-bold text-ink">6. Saqlash muddati</h2>
        <p>
          Ma&apos;lumotlar klinika hisobi faol bo&apos;lgan davrda saqlanadi. Hisob
          yopilganda klinika o&apos;z ma&apos;lumotlarini eksport qilish uchun 30 kun vaqtga
          ega; so&apos;ngra ular o&apos;chiriladi yoki qonunchilikka muvofiq arxivlanadi.
        </p>
      </section>

      <section>
        <h2 className="dd-display mb-2 text-lg font-bold text-ink">
          7. Foydalanuvchi huquqlari
        </h2>
        <p>
          Xodimlar o&apos;z ma&apos;lumotlarini ko&apos;rish va tuzatishni so&apos;rashi,
          klinika esa o&apos;z hisobini va ma&apos;lumotlarini eksport qilish yoki
          o&apos;chirishni talab qilishi mumkin. Bemorlar o&apos;z ma&apos;lumotlari
          bo&apos;yicha so&apos;rovni avvalo xizmat ko&apos;rsatgan klinikaga yuboradi.
        </p>
      </section>

      <section>
        <h2 className="dd-display mb-2 text-lg font-bold text-ink">8. Cookie</h2>
        <p>
          Tizim faqat zarur cookie fayllardan foydalanadi: sessiyani saqlash, til va mavzu
          tanlovini eslab qolish. Reklama cookie&apos;lari ishlatilmaydi.
        </p>
      </section>

      <section>
        <h2 className="dd-display mb-2 text-lg font-bold text-ink">9. Aloqa</h2>
        <p>
          Maxfiylik bo&apos;yicha savollar: Telegram{" "}
          <a href="https://t.me/oz4vka" className="text-accent underline">
            @oz4vka
          </a>
          . Murojaatlar 5 ish kuni ichida ko&apos;rib chiqiladi.
        </p>
      </section>
    </LegalShell>
  );
}
