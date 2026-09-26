'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';

// Placeholder in the section text below, swapped for Settings' email at render.
const CONTACT_EMAIL_TOKEN = '{contactEmail}';

const CONTENT = {
  en: {
    eyebrow: 'LEGAL INFORMATION',
    title: 'Privacy Policy',
    effectiveDate: 'Effective Date: September 2026 · Art Qala Gallery, Tashkent',
    intro:
      "Art Qala Gallery (\"Art Qala\", \"we\", \"us\") respects your privacy. This policy explains what personal information we collect through artqala.com, why we collect it, who we share it with, and the choices you have.",
    sections: [
      {
        heading: '1. Information We Collect',
        body: 'We collect information you provide directly to us, and a small amount of information collected automatically:',
        list: [
          'Account details — name, email address, phone/Telegram number, and country of residence when you register or sign in.',
          'Inquiry and order details — the artwork, accessory, mural, or ceramics service you request, your shipping preferences, and any message you send us.',
          'Reviews — your name and the text of any review you submit for a completed order.',
          'Technical data — IP address, browser type, and pages visited, collected automatically via Google Analytics for site performance and security purposes (for example, rate-limiting repeated login attempts).',
        ],
      },
      {
        heading: '2. How We Use Your Data',
        body: 'Your information is used exclusively to:',
        list: [
          'Process artwork, accessory, mural, or ceramics inquiries and coordinate secure packing and courier shipping.',
          'Send one-time passwords (OTP) by email to verify your account and secure sign-in.',
          'Maintain your saved wishlist and inquiry history in your private client dashboard.',
          'Issue official Certificates of Authenticity registered under your name for purchased original artworks.',
          'Respond to contact-form messages and service requests.',
          'Understand aggregate site usage (via Google Analytics) so we can improve the gallery and catalogue.',
        ],
      },
      {
        heading: '3. Cookies and Similar Technologies',
        body: 'We use essential cookies to keep you signed in and remember your language/currency preference, and analytics cookies (Google Analytics) to understand how visitors use the site. You can control cookies through your browser settings; disabling them may limit some site features such as staying signed in.',
      },
      {
        heading: '4. Sharing Your Information',
        body: "We do not sell, rent, or trade your personal data to third parties for advertising. We share limited data only with service providers who process it on our behalf, strictly to operate the site:",
        list: [
          'Cloud hosting and database providers (Vercel, Neon) that store the site and its data.',
          'Image hosting (Cloudinary) that stores artwork and uploaded photos.',
          'Email delivery (Resend) that sends OTP codes and notification emails.',
          'AI-assisted translation and image tools (Google Gemini) used to prepare multilingual catalogue text — never your personal messages.',
        ],
      },
      {
        heading: '5. Data Retention',
        body: 'We retain account and order information for as long as your account is active or as needed to provide services, comply with our legal obligations, resolve disputes, and enforce our agreements. You may request deletion of your account at any time (see Section 7).',
      },
      {
        heading: '6. Data Protection and Security',
        body: "We protect your personal details in accordance with the laws of the Republic of Uzbekistan and industry-standard technical safeguards (encrypted connections, hashed passwords, and rate-limited sign-in attempts). No online system is completely risk-free, but we take reasonable steps to protect your data from unauthorized access.",
      },
      {
        heading: '7. Your Rights',
        body: 'You may request to access, correct, or delete the personal data we hold about you, or ask questions about how it is used, by contacting us using the details below. We will respond within a reasonable time.',
      },
      {
        heading: "8. Children's Privacy",
        body: 'Art Qala services are intended for adults. We do not knowingly collect personal data from children under 18. If you believe a child has provided us with personal data, please contact us so we can remove it.',
      },
      {
        heading: '9. Changes to This Policy',
        body: "We may update this Privacy Policy from time to time to reflect changes in our practices or for legal reasons. The \"Effective Date\" above indicates when this policy was last revised. Continued use of the site after changes take effect constitutes acceptance of the revised policy.",
      },
      {
        heading: '10. Contact Us',
        bodyPrefix: 'If you have questions regarding your data or wish to request deletion of your account, contact our data curator at: ',
        highlight: CONTACT_EMAIL_TOKEN,
        bodySuffix: ' or visit our gallery at Barakhon Madrasah, Tashkent.',
      },
    ],
  },
  ru: {
    eyebrow: 'ПРАВОВАЯ ИНФОРМАЦИЯ',
    title: 'Политика конфиденциальности',
    effectiveDate: 'Дата вступления в силу: сентябрь 2026 г. · Галерея Art Qala, Ташкент',
    intro:
      'Галерея Art Qala («Art Qala», «мы») уважает вашу конфиденциальность. Настоящая политика объясняет, какую персональную информацию мы собираем на artqala.com, для чего мы её собираем, с кем делимся и какие у вас есть возможности выбора.',
    sections: [
      {
        heading: '1. Какую информацию мы собираем',
        body: 'Мы собираем информацию, которую вы предоставляете нам напрямую, а также небольшой объём данных, собираемых автоматически:',
        list: [
          'Данные аккаунта — имя, email, номер телефона/Telegram и страна проживания при регистрации или входе.',
          'Данные запроса или заказа — картина, аксессуар, мурал или керамическая услуга, которую вы запрашиваете, предпочтения по доставке и любые сообщения, которые вы нам отправляете.',
          'Отзывы — ваше имя и текст любого отзыва, оставленного о выполненном заказе.',
          'Технические данные — IP-адрес, тип браузера и посещённые страницы, собираемые автоматически через Google Analytics для оценки работы сайта и безопасности (например, ограничение частоты повторных попыток входа).',
        ],
      },
      {
        heading: '2. Как мы используем ваши данные',
        body: 'Ваша информация используется исключительно для того, чтобы:',
        list: [
          'Обрабатывать запросы на картины, аксессуары, мурал или керамику и организовывать безопасную упаковку и курьерскую доставку.',
          'Отправлять одноразовые коды подтверждения (OTP) по email для защиты вашего аккаунта и безопасного входа.',
          'Вести список избранных работ и историю запросов в вашем личном кабинете.',
          'Оформлять официальные Сертификаты подлинности на ваше имя для приобретённых оригинальных работ.',
          'Отвечать на сообщения через форму обратной связи и заявки на услуги.',
          'Понимать общую статистику использования сайта (через Google Analytics), чтобы улучшать галерею и каталог.',
        ],
      },
      {
        heading: '3. Файлы cookie и аналогичные технологии',
        body: 'Мы используем необходимые cookie, чтобы сохранять вашу сессию и языковые/валютные предпочтения, а также аналитические cookie (Google Analytics), чтобы понимать, как посетители используют сайт. Вы можете управлять cookie в настройках браузера; их отключение может ограничить некоторые функции сайта, например, сохранение сессии входа.',
      },
      {
        heading: '4. Передача вашей информации',
        body: 'Мы не продаём, не сдаём в аренду и не передаём ваши персональные данные третьим лицам в рекламных целях. Мы передаём ограниченный объём данных только поставщикам услуг, которые обрабатывают их от нашего имени исключительно для работы сайта:',
        list: [
          'Провайдеры облачного хостинга и баз данных (Vercel, Neon), которые хранят сайт и его данные.',
          'Хостинг изображений (Cloudinary), где хранятся фотографии работ.',
          'Сервис доставки email (Resend), который отправляет коды OTP и уведомления.',
          'Инструменты перевода и изображений с ИИ (Google Gemini), используемые для подготовки многоязычного текста каталога — никогда для ваших личных сообщений.',
        ],
      },
      {
        heading: '5. Срок хранения данных',
        body: 'Мы храним данные аккаунта и заказов до тех пор, пока ваш аккаунт активен или пока это необходимо для оказания услуг, соблюдения юридических обязательств, разрешения споров и исполнения соглашений. Вы можете запросить удаление своего аккаунта в любое время (см. раздел 7).',
      },
      {
        heading: '6. Защита данных и безопасность',
        body: 'Мы защищаем ваши персональные данные в соответствии с законодательством Республики Узбекистан и стандартными техническими мерами (зашифрованные соединения, хеширование паролей и ограничение попыток входа). Ни одна онлайн-система не является абсолютно безрисковой, но мы принимаем разумные меры для защиты ваших данных от несанкционированного доступа.',
      },
      {
        heading: '7. Ваши права',
        body: 'Вы можете запросить доступ, исправление или удаление персональных данных, которые мы храним о вас, а также задать вопросы об их использовании, обратившись к нам по контактам ниже. Мы ответим в разумный срок.',
      },
      {
        heading: '8. Конфиденциальность детей',
        body: 'Услуги Art Qala предназначены для взрослых. Мы сознательно не собираем персональные данные детей младше 18 лет. Если вы считаете, что ребёнок предоставил нам персональные данные, свяжитесь с нами, чтобы мы могли их удалить.',
      },
      {
        heading: '9. Изменения в этой политике',
        body: 'Мы можем время от времени обновлять данную Политику конфиденциальности с учётом изменений в нашей практике или по юридическим причинам. Указанная выше «Дата вступления в силу» отражает последнюю редакцию. Продолжение использования сайта после вступления изменений в силу означает согласие с обновлённой политикой.',
      },
      {
        heading: '10. Свяжитесь с нами',
        bodyPrefix: 'Если у вас есть вопросы о ваших данных или вы хотите удалить свой аккаунт, обратитесь к нашему куратору данных: ',
        highlight: CONTACT_EMAIL_TOKEN,
        bodySuffix: ' или посетите нашу галерею в медресе Баракхан, Ташкент.',
      },
    ],
  },
  uz: {
    eyebrow: "HUQUQIY MA'LUMOT",
    title: 'Maxfiylik siyosati',
    effectiveDate: "Kuchga kirgan sana: 2026-yil sentyabr · Art Qala galereyasi, Toshkent",
    intro:
      "Art Qala galereyasi (\"Art Qala\", \"biz\") sizning maxfiyligingizni hurmat qiladi. Ushbu siyosat artqala.com orqali qanday shaxsiy ma'lumotlarni to'plashimizni, buni nima uchun qilishimizni, kimlar bilan ulashishimizni va sizda qanday tanlov huquqlari borligini tushuntiradi.",
    sections: [
      {
        heading: "1. Biz qanday ma'lumotlarni to'playmiz",
        body: "Biz sizdan to'g'ridan-to'g'ri olingan ma'lumotlarni, shuningdek avtomatik ravishda to'planadigan oz miqdordagi ma'lumotlarni to'playmiz:",
        list: [
          "Hisob ma'lumotlari — ro'yxatdan o'tish yoki kirish paytida ismingiz, email manzilingiz, telefon/Telegram raqamingiz va yashash mamlakatingiz.",
          "So'rov/buyurtma tafsilotlari — siz so'rayotgan kartina, aksessuar, mural yoki keramika xizmati, yetkazib berish bo'yicha afzalliklaringiz va bizga yuborgan har qanday xabaringiz.",
          "Sharhlar — bajarilgan buyurtma haqida qoldirgan sharhingizning matni va ismingiz.",
          "Texnik ma'lumotlar — sayt ishlashi va xavfsizligi maqsadida (masalan, kirish urinishlarini cheklash) Google Analytics orqali avtomatik to'planadigan IP-manzil, brauzer turi va tashrif buyurilgan sahifalar.",
        ],
      },
      {
        heading: "2. Ma'lumotlaringizdan qanday foydalanamiz",
        body: "Sizning ma'lumotlaringiz faqat quyidagilar uchun ishlatiladi:",
        list: [
          "Kartina, aksessuar, mural yoki keramika bo'yicha so'rovlarni ko'rib chiqish va xavfsiz qadoqlash/kuryerlik yetkazib berishni tashkil qilish.",
          "Hisobingiz xavfsizligini va kirishni tasdiqlash uchun email orqali bir martalik kod (OTP) yuborish.",
          "Shaxsiy kabinetingizda saqlangan asarlar ro'yxati va so'rovlar tarixini yuritish.",
          "Sotib olingan asl asarlar uchun sizning nomingizga rasmiy Asillik sertifikatlarini rasmiylashtirish.",
          "Aloqa formasi orqali yuborilgan xabarlarga va xizmat so'rovlariga javob berish.",
          "Galereya va katalogni yaxshilash uchun saytdan umumiy foydalanish statistikasini (Google Analytics orqali) tushunish.",
        ],
      },
      {
        heading: "3. Cookie fayllari va shunga o'xshash texnologiyalar",
        body: "Biz sizni tizimga kirgan holda saqlash va til/valyuta afzalliklaringizni eslab qolish uchun zarur cookie fayllaridan, shuningdek tashrif buyuruvchilarning saytdan qanday foydalanishini tushunish uchun analitika cookie fayllaridan (Google Analytics) foydalanamiz. Cookie fayllarini brauzer sozlamalari orqali boshqarishingiz mumkin; ularni o'chirish tizimga kirgan holda qolish kabi ba'zi funksiyalarni cheklashi mumkin.",
      },
      {
        heading: "4. Ma'lumotlaringizni ulashish",
        body: "Biz shaxsiy ma'lumotlaringizni reklama maqsadida uchinchi shaxslarga sotmaymiz, ijaraga bermaymiz yoki ulashmaymiz. Biz cheklangan ma'lumotni faqat saytni ishlatish uchun bizning nomimizdan ma'lumotni qayta ishlaydigan xizmat ko'rsatuvchilar bilan ulashamiz:",
        list: [
          "Saytni va uning ma'lumotlarini saqlaydigan bulutli xosting va ma'lumotlar bazasi provayderlari (Vercel, Neon).",
          "Asarlar va yuklangan suratlarni saqlaydigan rasm xostingi (Cloudinary).",
          "OTP kodlari va bildirishnoma xatlarini yuboradigan email xizmati (Resend).",
          "Ko'p tillik katalog matnini tayyorlash uchun ishlatiladigan AI tarjima va rasm vositalari (Google Gemini) — hech qachon sizning shaxsiy xabarlaringiz uchun emas.",
        ],
      },
      {
        heading: "5. Ma'lumotlarni saqlash muddati",
        body: "Biz hisob va buyurtma ma'lumotlarini hisobingiz faol bo'lgan davrda yoki xizmatlarni ko'rsatish, huquqiy majburiyatlarga rioya qilish, nizolarni hal qilish va shartnomalarni bajarish uchun zarur bo'lgan muddatda saqlaymiz. Siz istagan vaqtda hisobingizni o'chirishni so'rashingiz mumkin (7-bandga qarang).",
      },
      {
        heading: "6. Ma'lumotlarni himoya qilish va xavfsizlik",
        body: "Biz sizning shaxsiy ma'lumotlaringizni O'zbekiston Respublikasi qonunchiligiga va standart texnik choralarga (shifrlangan ulanishlar, parollarni xesh qilish va kirish urinishlarini cheklash) muvofiq himoya qilamiz. Hech qanday onlayn tizim mutlaqo xavfsiz emas, ammo biz ma'lumotlaringizni ruxsatsiz kirishdan himoya qilish uchun oqilona choralar ko'ramiz.",
      },
      {
        heading: "7. Sizning huquqlaringiz",
        body: "Siz biz saqlayotgan shaxsiy ma'lumotlaringizga kirish, ularni tuzatish yoki o'chirishni so'rashingiz, shuningdek ulardan qanday foydalanilishi haqida savol berishingiz mumkin — quyidagi aloqa ma'lumotlari orqali bizga murojaat qiling. Biz oqilona muddat ichida javob beramiz.",
      },
      {
        heading: "8. Bolalar maxfiyligi",
        body: "Art Qala xizmatlari kattalar uchun mo'ljallangan. Biz 18 yoshga to'lmagan bolalarning shaxsiy ma'lumotlarini bilib turib to'plamaymiz. Agar bola bizga shaxsiy ma'lumot taqdim etgan deb hisoblasangiz, uni o'chirishimiz uchun biz bilan bog'laning.",
      },
      {
        heading: "9. Ushbu siyosatga o'zgartirishlar",
        body: "Biz amaliyotimizdagi o'zgarishlar yoki huquqiy sabablarga ko'ra vaqti-vaqti bilan ushbu Maxfiylik siyosatini yangilashimiz mumkin. Yuqoridagi \"Kuchga kirgan sana\" ushbu siyosat oxirgi marta qayta ko'rib chiqilgan sanani bildiradi. O'zgarishlar kuchga kirgandan keyin saytdan foydalanishni davom ettirish yangilangan siyosatni qabul qilishni bildiradi.",
      },
      {
        heading: "10. Biz bilan bog'lanish",
        bodyPrefix: "Ma'lumotlaringiz yuzasidan savollaringiz bo'lsa yoki hisobingizni o'chirishni so'ramoqchi bo'lsangiz, ma'lumotlar kuratorimizga murojaat qiling: ",
        highlight: CONTACT_EMAIL_TOKEN,
        bodySuffix: " yoki Toshkentdagi Baraxon madrasasidagi galereyamizga tashrif buyuring.",
      },
    ],
  },
} as const;

export default function PrivacyClient() {
  const { lang, settings } = useApp();
  // The real contact address set in Admin → Settings, never a made-up one.
  const contactEmail = settings?.email || '';
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
                  <strong className="text-[#BA4E25]">
                    {section.highlight === CONTACT_EMAIL_TOKEN ? contactEmail : section.highlight}
                  </strong>
                  {section.bodySuffix}
                </p>
              ) : (
                <p>{section.body}</p>
              )}
              {'list' in section && (
                <ul className="list-disc pl-5 space-y-1">
                  {section.list.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
