'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';

const CONTENT = {
  en: {
    eyebrow: 'TERMS & CONDITIONS',
    title: 'Terms of Service',
    effectiveDate: 'Effective Date: September 2026 · Art Qala Gallery, Tashkent',
    intro:
      'By browsing artqala.com, creating an account, or submitting an inquiry, you agree to the following terms. Please read them carefully; they govern your relationship with Art Qala Gallery ("Art Qala", "we", "us").',
    sections: [
      {
        heading: '1. Original Artworks & Authenticity',
        body: "All paintings featured on Art Qala are original, one-of-a-kind canvases handcrafted by registered masters in Uzbekistan. Each purchased original artwork is accompanied by an official Certificate of Authenticity bearing the artist's signature and the gallery's embossed seal. Because every piece is one of a kind, once an artwork is marked sold it is no longer available.",
      },
      {
        heading: '2. Inquiries, Pricing and Reservation',
        body: "Submitting an inquiry through this platform does not constitute a binding financial charge or an online purchase — Art Qala does not process payments on this website. Our curators will confirm availability, calculate international insured freight or arrange personal collection at our Tashkent location, and issue a formal invoice for payment through agreed offline channels (bank transfer or in person). Displayed prices are indicative and may be adjusted by the curator to reflect final packaging, insurance, and shipping costs before an invoice is issued.",
      },
      {
        heading: '3. Bespoke Services & Murals',
        body: 'Quotes for custom paintings, wall murals, and ceramics include surface preparation, concept sketches, and on-site work where applicable. Project schedules and milestone payments are confirmed individually per agreement with the client before work begins. Cancelling a bespoke commission after work has started may incur a charge for work already completed, to be discussed case by case.',
      },
      {
        heading: '4. Shipping, Returns and Cancellations',
        body: 'Ready-made artworks may be cancelled free of charge before an invoice is issued and accepted. Once shipping has been arranged and dispatched, cancellations are handled case by case given the cost of international insured freight. If an artwork arrives damaged in transit, contact us within 7 days with photos so we can arrange a resolution with our courier partner. Because each artwork is unique and handmade, minor natural variations in texture or colour are not considered defects.',
      },
      {
        heading: '5. Cultural Heritage and Export Regulations',
        body: 'All contemporary artworks exported internationally comply fully with Ministry of Culture regulations of the Republic of Uzbekistan. We provide all necessary export clearance documentation for seamless customs transit; any additional import duties or taxes in the destination country are the buyer’s responsibility.',
      },
      {
        heading: '6. Accounts and Acceptable Use',
        body: 'You are responsible for keeping your account credentials confidential and for all activity under your account. You agree not to misuse the site — including attempting to bypass security measures, submitting false information, or scraping catalogue content for resale.',
      },
      {
        heading: '7. Reviews',
        body: 'Reviews should reflect your genuine experience with an order. We may moderate reviews to remove spam, unlawful content, or content unrelated to the gallery, but we do not edit the substance of a genuine review.',
      },
      {
        heading: '8. Intellectual Property',
        body: 'Photographs, descriptions, and the design of this website belong to Art Qala Gallery or its artists and may not be copied, reproduced, or used commercially without written permission. Purchasing a physical artwork does not transfer reproduction rights to the buyer.',
      },
      {
        heading: '9. Limitation of Liability',
        body: 'Art Qala provides the website and catalogue "as is". While we take reasonable care to ensure accuracy, we are not liable for indirect or incidental losses arising from use of the site, delays in courier delivery caused by third parties, or events beyond our reasonable control.',
      },
      {
        heading: '10. Governing Law',
        body: 'These Terms are governed by the laws of the Republic of Uzbekistan. Any dispute arising from these Terms will first be addressed through good-faith negotiation between the parties before pursuing formal proceedings.',
      },
      {
        heading: '11. Changes to These Terms',
        body: 'We may update these Terms from time to time; the "Effective Date" above reflects the latest revision. Continued use of the site after changes take effect constitutes acceptance of the revised Terms.',
      },
      {
        heading: '12. Contact Us',
        bodyPrefix: 'Questions about these Terms can be sent to: ',
        highlight: 'info@artqala.com',
        bodySuffix: ' or in person at our gallery at Barakhon Madrasah, Tashkent.',
      },
    ],
  },
  ru: {
    eyebrow: 'УСЛОВИЯ ИСПОЛЬЗОВАНИЯ',
    title: 'Условия обслуживания',
    effectiveDate: 'Дата вступления в силу: сентябрь 2026 г. · Галерея Art Qala, Ташкент',
    intro:
      'Используя artqala.com, создавая аккаунт или отправляя запрос, вы соглашаетесь со следующими условиями. Пожалуйста, внимательно прочитайте их — они регулируют ваши отношения с галереей Art Qala («Art Qala», «мы»).',
    sections: [
      {
        heading: '1. Оригинальные работы и подлинность',
        body: 'Все картины, представленные в Art Qala, — оригинальные, уникальные полотна, созданные вручную зарегистрированными мастерами Узбекистана. К каждой приобретённой оригинальной работе прилагается официальный Сертификат подлинности с подписью художника и тиснёной печатью галереи. Поскольку каждая работа уникальна, после отметки «продано» она больше не доступна.',
      },
      {
        heading: '2. Запросы, цены и бронирование',
        body: 'Отправка запроса на платформе не является обязательным финансовым списанием или онлайн-покупкой — Art Qala не обрабатывает платежи на этом сайте. Наши кураторы подтвердят наличие, рассчитают стоимость международной застрахованной доставки или организуют личное получение в Ташкенте, а также выставят официальный счёт для оплаты через согласованные офлайн-каналы (банковский перевод или наличными на месте). Указанные цены являются ориентировочными и могут быть скорректированы куратором с учётом окончательной упаковки, страховки и доставки перед выставлением счёта.',
      },
      {
        heading: '3. Индивидуальные заказы и мурали',
        body: 'Расчёт стоимости индивидуальных картин, настенных муралов и керамики включает подготовку поверхности, эскизы концепции и работу на месте, если применимо. График проекта и поэтапная оплата согласовываются индивидуально с клиентом до начала работы. Отмена индивидуального заказа после начала работы может повлечь оплату уже выполненной работы — это обсуждается отдельно в каждом случае.',
      },
      {
        heading: '4. Доставка, возврат и отмена заказа',
        body: 'Готовые работы можно отменить бесплатно до выставления и подтверждения счёта. После того как доставка организована и отправлена, отмена рассматривается индивидуально с учётом стоимости международной застрахованной перевозки. Если работа прибыла повреждённой, свяжитесь с нами в течение 7 дней с фотографиями, чтобы мы могли урегулировать вопрос с курьерским партнёром. Поскольку каждая работа уникальна и создана вручную, незначительные природные отличия в текстуре или цвете не считаются дефектом.',
      },
      {
        heading: '5. Регулирование культурного наследия и экспорт',
        body: 'Все современные произведения искусства, вывозимые за рубеж, полностью соответствуют требованиям Министерства культуры Республики Узбекистан. Мы предоставляем всю необходимую документацию для беспрепятственного таможенного оформления; дополнительные импортные пошлины или налоги в стране назначения являются обязанностью покупателя.',
      },
      {
        heading: '6. Аккаунты и допустимое использование',
        body: 'Вы несёте ответственность за конфиденциальность данных вашего аккаунта и за все действия, совершённые под ним. Вы соглашаетесь не использовать сайт ненадлежащим образом — включая попытки обойти меры безопасности, предоставление ложной информации или сбор содержимого каталога для перепродажи.',
      },
      {
        heading: '7. Отзывы',
        body: 'Отзывы должны отражать ваш подлинный опыт по заказу. Мы можем модерировать отзывы, удаляя спам, незаконный контент или контент, не относящийся к галерее, но мы не редактируем суть подлинного отзыва.',
      },
      {
        heading: '8. Интеллектуальная собственность',
        body: 'Фотографии, описания и дизайн этого сайта принадлежат галерее Art Qala или её художникам и не могут копироваться, воспроизводиться или использоваться в коммерческих целях без письменного разрешения. Покупка физической работы не передаёт покупателю права на её воспроизведение.',
      },
      {
        heading: '9. Ограничение ответственности',
        body: 'Art Qala предоставляет сайт и каталог «как есть». Несмотря на то что мы проявляем разумную осторожность для обеспечения точности, мы не несём ответственности за косвенные или случайные убытки, возникшие в результате использования сайта, задержки курьерской доставки по вине третьих лиц или обстоятельства, находящиеся вне нашего разумного контроля.',
      },
      {
        heading: '10. Применимое право',
        body: 'Настоящие Условия регулируются законодательством Республики Узбекистан. Любой спор, возникающий из настоящих Условий, первоначально разрешается путём добросовестных переговоров сторон до обращения к формальным процедурам.',
      },
      {
        heading: '11. Изменения настоящих Условий',
        body: 'Мы можем время от времени обновлять настоящие Условия; указанная выше «Дата вступления в силу» отражает последнюю редакцию. Продолжение использования сайта после вступления изменений в силу означает согласие с обновлёнными Условиями.',
      },
      {
        heading: '12. Свяжитесь с нами',
        bodyPrefix: 'Вопросы по настоящим Условиям можно направить на: ',
        highlight: 'info@artqala.com',
        bodySuffix: ' или лично в нашей галерее в медресе Баракхан, Ташкент.',
      },
    ],
  },
  uz: {
    eyebrow: 'FOYDALANISH SHARTLARI',
    title: "Xizmat ko'rsatish shartlari",
    effectiveDate: "Kuchga kirgan sana: 2026-yil sentyabr · Art Qala galereyasi, Toshkent",
    intro:
      "artqala.com saytidan foydalanish, hisob ochish yoki so'rov yuborish orqali siz quyidagi shartlarga rozilik bildirasiz. Iltimos, ularni diqqat bilan o'qing — ular sizning Art Qala galereyasi (\"Art Qala\", \"biz\") bilan munosabatlaringizni belgilaydi.",
    sections: [
      {
        heading: '1. Asl asarlar va asillik',
        body: "Art Qala'da taqdim etilgan barcha kartinalar — O'zbekistonda ro'yxatdan o'tgan ustalar tomonidan qo'lda yaratilgan asl, yagona nusxadagi asarlardir. Sotib olingan har bir asl asarga rassomning imzosi va galereyaning muhri tushirilgan rasmiy Asillik sertifikati biriktiriladi. Har bir asar yagona bo'lgani sababli, \"sotilgan\" deb belgilangandan so'ng u endi mavjud bo'lmaydi.",
      },
      {
        heading: "2. So'rovlar, narxlar va band qilish",
        body: "Ushbu platformada so'rov yuborish majburiy moliyaviy to'lovni yoki onlayn xaridni anglatmaydi — Art Qala ushbu saytda to'lovlarni qabul qilmaydi. Kuratorlarimiz mavjudlikni tasdiqlaydi, xalqaro sug'urtalangan yetkazib berish narxini hisoblaydi yoki Toshkentdagi galereyamizdan shaxsan olib ketishni tashkil qiladi, so'ngra kelishilgan oflayn kanallar (bank o'tkazmasi yoki joyida naqd/karta) orqali to'lov uchun rasmiy hisob-faktura chiqaradi. Saytda ko'rsatilgan narxlar taxminiy bo'lib, hisob-faktura chiqarilishidan oldin yakuniy qadoqlash, sug'urta va yetkazib berish xarajatlarini hisobga olgan holda kurator tomonidan aniqlashtirilishi mumkin.",
      },
      {
        heading: '3. Maxsus buyurtmalar va murallar',
        body: "Buyurtma asosidagi kartinalar, devoriy rasmlar (mural) va keramika narxiga sirtni tayyorlash, konsept eskizlar va (agar tegishli bo'lsa) joyida ishlash kiradi. Loyiha jadvali va bosqichma-bosqich to'lovlar ish boshlanishidan oldin mijoz bilan alohida kelishiladi. Ish boshlangandan keyin maxsus buyurtmani bekor qilish, allaqachon bajarilgan ish uchun to'lovni talab qilishi mumkin — bu har bir holatda alohida muhokama qilinadi.",
      },
      {
        heading: '4. Yetkazib berish, qaytarish va bekor qilish',
        body: "Tayyor asarlarni hisob-faktura chiqarilib tasdiqlanguncha bepul bekor qilish mumkin. Yetkazib berish tashkil etilib jo'natilgandan so'ng, bekor qilish xalqaro sug'urtalangan yuk tashish xarajatlarini hisobga olib, har bir holatda alohida ko'rib chiqiladi. Agar asar yetkazib berish jarayonida shikastlangan holda kelsa, buni hal qilish uchun kuryerlik hamkorimiz bilan 7 kun ichida suratlar bilan bizga murojaat qiling. Har bir asar yagona va qo'lda yaratilgani sababli, tekstura yoki rangdagi kichik tabiiy farqlar nuqson hisoblanmaydi.",
      },
      {
        heading: "5. Madaniy meros va eksport qoidalari",
        body: "Xalqaro jo'natiladigan barcha zamonaviy san'at asarlari O'zbekiston Respublikasi Madaniyat vazirligi qoidalariga to'liq muvofiq keladi. Bojxona orqali muammosiz o'tishi uchun barcha zarur eksport hujjatlarini biz taqdim etamiz; qabul qiluvchi mamlakatdagi qo'shimcha import bojlari yoki soliqlari xaridorning javobgarligidir.",
      },
      {
        heading: '6. Hisoblar va foydalanish qoidalari',
        body: "Hisobingiz ma'lumotlarining maxfiyligini saqlash va hisobingiz ostida amalga oshirilgan barcha harakatlar uchun javobgarlik sizga tegishli. Siz saytdan noto'g'ri foydalanmaslikka rozilik bildirasiz — jumladan, xavfsizlik choralarini chetlab o'tishga urinish, noto'g'ri ma'lumot taqdim etish yoki katalog kontentini qayta sotish maqsadida yig'ish.",
      },
      {
        heading: '7. Sharhlar',
        body: "Sharhlar buyurtma bo'yicha haqiqiy tajribangizni aks ettirishi kerak. Biz spam, noqonuniy kontent yoki galereyaga aloqasi bo'lmagan kontentni olib tashlash uchun sharhlarni moderatsiya qilishimiz mumkin, ammo haqiqiy sharhning mazmunini tahrirlamaymiz.",
      },
      {
        heading: '8. Intellektual mulk huquqlari',
        body: "Ushbu saytdagi fotosuratlar, tavsiflar va dizayn Art Qala galereyasi yoki uning rassomlariga tegishli bo'lib, yozma ruxsatnomasiz nusxalanishi, ko'chirilishi yoki tijorat maqsadida ishlatilishi mumkin emas. Jismoniy asarni sotib olish xaridorga uni ko'chirish huquqini bermaydi.",
      },
      {
        heading: '9. Javobgarlikni cheklash',
        body: 'Art Qala saytni va katalogni "mavjud holida" taqdim etadi. Aniqlikni ta\'minlash uchun oqilona choralar ko\'rsak-da, biz saytdan foydalanish natijasida yuzaga kelgan bilvosita yoki tasodifiy zararlar, uchinchi shaxslar sababli yuzaga kelgan kuryerlik kechikishlari yoki bizning oqilona nazoratimizdan tashqaridagi holatlar uchun javobgar emasmiz.',
      },
      {
        heading: '10. Amaldagi qonunchilik',
        body: "Ushbu Shartlar O'zbekiston Respublikasi qonunchiligiga muvofiq tartibga solinadi. Ushbu Shartlardan kelib chiqadigan har qanday nizo, rasmiy jarayonlarga o'tishdan oldin tomonlar o'rtasida halol muzokaralar orqali hal qilinadi.",
      },
      {
        heading: '11. Ushbu Shartlarga o\'zgartirishlar',
        body: "Biz vaqti-vaqti bilan ushbu Shartlarni yangilashimiz mumkin; yuqoridagi \"Kuchga kirgan sana\" oxirgi tahrirni bildiradi. O'zgarishlar kuchga kirgandan keyin saytdan foydalanishni davom ettirish yangilangan Shartlarni qabul qilishni bildiradi.",
      },
      {
        heading: "12. Biz bilan bog'lanish",
        bodyPrefix: "Ushbu Shartlar bo'yicha savollarni quyidagi manzilga yuborishingiz mumkin: ",
        highlight: 'info@artqala.com',
        bodySuffix: " yoki Toshkentdagi Baraxon madrasasidagi galereyamizga shaxsan tashrif buyurib.",
      },
    ],
  },
} as const;

export default function TermsClient() {
  const { lang } = useApp();
  const c = CONTENT[lang] || CONTENT.en;

  return (
    <div className="py-16 sm:py-20 px-6">
      <div className="max-w-3xl mx-auto bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-8 sm:p-12 space-y-6">
        <div className="space-y-2 border-b border-[#E7E0D8] pb-6">
          <span className="text-xs font-semibold tracking-[3px] text-[#429599] uppercase">
            {c.eyebrow}
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#281C18]">
            {c.title}
          </h1>
          <p className="text-xs text-[#8F8178]">{c.effectiveDate}</p>
        </div>

        <p className="text-xs sm:text-sm text-[#4D3F38] leading-relaxed">{c.intro}</p>

        <div className="space-y-4 text-xs sm:text-sm text-[#4D3F38] leading-relaxed">
          {c.sections.map((section, idx) => (
            <React.Fragment key={idx}>
              <h2 className="font-serif text-xl font-semibold text-[#281C18]">
                {section.heading}
              </h2>
              {'bodyPrefix' in section ? (
                <p>
                  {section.bodyPrefix}
                  <strong className="text-[#BA4E25]">{section.highlight}</strong>
                  {section.bodySuffix}
                </p>
              ) : (
                <p>{section.body}</p>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
