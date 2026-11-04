import { LegalShell } from "@/components/LegalShell";

export const metadata = {
  title: "Foydalanish shartlari — Dental Desk",
};

export default function TermsPage() {
  return (
    <LegalShell title="Foydalanish shartlari" updated="2026 yil 2 noyabr">
      <section>
        <h2 className="dd-display mb-2 text-lg font-bold text-ink">1. Xizmat predmeti</h2>
        <p>
          Xoshimov Group (keyingi o&apos;rinlarda — «Provayder») Dental Desk bulutli
          tizimidan foydalanish huquqini klinikaga (keyingi o&apos;rinlarda — «Mijoz»)
          taqdim etadi. Tizim qabul jadvali, bemor kartalari, tish xaritasi va tashriflar
          tarixini yuritish uchun mo&apos;ljallangan.
        </p>
      </section>

      <section>
        <h2 className="dd-display mb-2 text-lg font-bold text-ink">
          2. Sinov muddati va tariflar
        </h2>
        <p>
          Yangi hisob 14 kunlik bepul sinovdan boshlanadi. Sinov uchun bank kartasi talab
          qilinmaydi. Sinov tugagach, tarif tanlanmaguncha hisob faqat o&apos;qish rejimida
          qoladi. Tarif narxlari veb-saytda ko&apos;rsatiladi va shartnoma bilan
          tasdiqlanadi.
        </p>
      </section>

      <section>
        <h2 className="dd-display mb-2 text-lg font-bold text-ink">3. To&apos;lov</h2>
        <p>
          To&apos;lov oylik yoki yillik oldindan amalga oshiriladi. Yillik to&apos;lovda 2
          oy chegirma qo&apos;llaniladi. Hozircha to&apos;lovlar hisob-faktura orqali qo&apos;lda
          qayd etiladi; onlayn to&apos;lov integratsiyasi keyingi bosqichda kiritiladi.
          To&apos;lov kechiksa, Provayder xizmatni to&apos;xtatishga haqli, oldindan
          ogohlantirib.
        </p>
      </section>

      <section>
        <h2 className="dd-display mb-2 text-lg font-bold text-ink">
          4. Mijozning majburiyatlari
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Xodimlar uchun alohida hisob ochish va parollarni maxfiy saqlash.</li>
          <li>Bemor ma&apos;lumotlarini faqat qonuniy asosda kiritish.</li>
          <li>Hisobdan ruxsatsiz foydalanish holatida darhol xabar berish.</li>
          <li>Xizmatdan faqat o&apos;z klinikasi faoliyati uchun foydalanish.</li>
        </ul>
      </section>

      <section>
        <h2 className="dd-display mb-2 text-lg font-bold text-ink">5. Provayder majburiyatlari</h2>
        <p>
          Provayder xizmatning uzluksiz ishlashi uchun oqilona choralarni ko&apos;radi,
          rejaviy texnik ishlar haqida oldindan xabar beradi va ma&apos;lumotlar maxfiyligini
          ta&apos;minlaydi. Kutilmagan uzilishlar uchun javobgarlik oqilona chegaralar bilan
          cheklanadi.
        </p>
      </section>

      <section>
        <h2 className="dd-display mb-2 text-lg font-bold text-ink">6. Ma&apos;lumotlar egaligi</h2>
        <p>
          Klinika kiritgan barcha ma&apos;lumotlar Mijozga tegishli. Provayder ularni faqat
          xizmat ko&apos;rsatish uchun qayta ishlaydi. Shartnoma tugagach, Mijoz
          ma&apos;lumotlarini eksport qilish uchun 30 kun oladi.
        </p>
      </section>

      <section>
        <h2 className="dd-display mb-2 text-lg font-bold text-ink">7. Javobgarlik chegarasi</h2>
        <p>
          Provayderning umumiy javobgarligi oxirgi 12 oy davomida to&apos;langan xizmat
          narxidan oshmaydi. Tizim tibbiy qarorlar qabul qilish vositasi emas; klinik
          xulosalar uchun javobgarlik shifokorga tegishli.
        </p>
      </section>

      <section>
        <h2 className="dd-display mb-2 text-lg font-bold text-ink">8. Bekor qilish</h2>
        <p>
          Mijoz istalgan vaqtda keyingi to&apos;lov davri uchun obunani bekor qilishi
          mumkin. Provayder shartlarni buzgan hisoblarni ogohlantirish bilan to&apos;xtatishi
          yoki yopishi mumkin.
        </p>
      </section>

      <section>
        <h2 className="dd-display mb-2 text-lg font-bold text-ink">9. Amaldagi qonunchilik</h2>
        <p>
          Ushbu shartlar O&apos;zbekiston Respublikasi qonunchiligi asosida tartibga
          solinadi. Nizolar muzokaralar yo&apos;li bilan hal etiladi; kelishuv bo&apos;lmasa,
          Toshkent shahar sudlarida ko&apos;rib chiqiladi.
        </p>
      </section>

      <section>
        <h2 className="dd-display mb-2 text-lg font-bold text-ink">10. Aloqa</h2>
        <p>
          Shartlar bo&apos;yicha savollar: Telegram{" "}
          <a href="https://t.me/oz4vka" className="text-accent underline">
            @oz4vka
          </a>
          .
        </p>
      </section>
    </LegalShell>
  );
}
