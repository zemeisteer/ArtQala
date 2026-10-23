import type { Language } from './i18n/translations';

// Payment & delivery terms, as given by the gallery owner (October 2026).
// One source for the /delivery page, the short block on every work's page,
// the FAQ JSON-LD and /llms.txt. Keep in line with the Terms page (7-day
// damage claim, import duties paid by the buyer).

export const FREE_TASHKENT_DELIVERY_FROM_USD = 500;

export type DeliveryIcon =
  | 'card'
  | 'coins'
  | 'store'
  | 'truck'
  | 'map'
  | 'plane'
  | 'package'
  | 'shield'
  | 'file'
  | 'alert';

export interface DeliverySection {
  icon: DeliveryIcon;
  heading: string;
  points: string[];
}

export interface DeliveryContent {
  eyebrow: string;
  title: string;
  intro: string;
  stepsHeading: string;
  steps: string[];
  sections: DeliverySection[];
  faq: { q: string; a: string }[];
  // The short block next to the inquiry form on every work's page.
  short: { payment: string; delivery: string; documents: string; more: string };
  questions: string;
}

const $ = `$${FREE_TASHKENT_DELIVERY_FROM_USD}`;

export const DELIVERY: Record<Language, DeliveryContent> = {
  en: {
    eyebrow: 'BUYING FROM ART QALA',
    title: 'Payment & Delivery',
    intro:
      'How paying for an artwork and getting it home works — whether you collect it at the gallery, live in Tashkent or anywhere in Uzbekistan, or are buying from abroad.',
    stepsHeading: 'How a purchase works',
    steps: [
      'Send an inquiry from the artwork’s page (or visit the gallery).',
      'A curator confirms availability, the final price and the delivery cost.',
      'You pay 100% in advance by the method that suits you.',
      'We pack the artwork safely and hand it over or ship it — with its passport and export documents.',
    ],
    sections: [
      {
        icon: 'card',
        heading: 'Payment',
        points: [
          'Full (100%) prepayment before the artwork is handed over or shipped.',
          'In Uzbekistan: cash, bank cards (Uzcard, Humo, Visa, Mastercard), Payme, Click or bank transfer.',
          'From abroad: Visa / Mastercard card payment or international bank transfer.',
        ],
      },
      {
        icon: 'coins',
        heading: 'Currency',
        points: [
          'Prices on the site are in US dollars.',
          'You can pay in the currency that suits you — US dollars, Uzbek soum, Russian roubles and others — at the exchange rate the curator confirms; you pay the exact amount stated.',
        ],
      },
      {
        icon: 'store',
        heading: 'Collect from the gallery',
        points: ['You can collect your artwork from the gallery yourself, free of charge.'],
      },
      {
        icon: 'truck',
        heading: 'Delivery in Tashkent',
        points: [`Free for purchases from ${$}.`, `Below ${$} delivery is paid — the curator tells you the cost in advance.`],
      },
      {
        icon: 'map',
        heading: 'Delivery across Uzbekistan',
        points: ['We deliver to every region of Uzbekistan; delivery is paid and confirmed by the curator in advance.'],
      },
      {
        icon: 'plane',
        heading: 'International shipping',
        points: [
          'Shipped worldwide by Uzbekistan Post (UzPost) — EMS express or a standard parcel.',
          'Each artwork’s page shows an estimated shipping cost for your country.',
          'If a shipment takes longer than 1 month, the shipping fee is refunded.',
          'Import duties or taxes in the destination country, if any, are paid by the buyer.',
        ],
      },
      {
        icon: 'package',
        heading: 'Packaging',
        points: [
          'Framed works are packed safely as they are, or the frame is removed and packed separately.',
          'Unframed canvases are rolled and shipped in a tube.',
          'If you bought a protective case, the artwork is packed in it.',
        ],
      },
      {
        icon: 'shield',
        heading: 'Insurance',
        points: ['Shipments are insured, and you receive the insurance document.'],
      },
      {
        icon: 'file',
        heading: 'Passport & export permit',
        points: [
          'Every artwork comes with its passport (certificate) and an export permit for customs — we prepare them for you, so you can take or send it out of Uzbekistan without trouble.',
        ],
      },
      {
        icon: 'alert',
        heading: 'If something is wrong',
        points: [
          'If the artwork arrives damaged, contact us within 7 days with photos. If the fault is on our side, we will review the case and resolve it with you.',
        ],
      },
    ],
    faq: [
      {
        q: 'How do I pay for an artwork?',
        a: 'Full prepayment. In Uzbekistan by cash, Uzcard, Humo, Visa, Mastercard, Payme, Click or bank transfer; from abroad by Visa/Mastercard or international bank transfer.',
      },
      {
        q: 'Can I pay in a currency other than US dollars?',
        a: 'Yes — in US dollars, Uzbek soum, Russian roubles or another currency, at the exchange rate the curator confirms.',
      },
      {
        q: 'Do you ship artworks abroad?',
        a: 'Yes, worldwide by UzPost (EMS or standard parcel), insured, with the export documents. The estimated cost is shown on each artwork’s page.',
      },
      {
        q: 'Is delivery in Tashkent free?',
        a: `Delivery in Tashkent is free for purchases from ${$}; below that it is paid. You can also collect the artwork from the gallery.`,
      },
      {
        q: 'Can I take a painting out of Uzbekistan?',
        a: 'Yes. Every artwork comes with its passport and an export permit for customs, prepared by the gallery.',
      },
    ],
    short: {
      payment: 'Payment: 100% in advance — card (Visa, Mastercard, Uzcard, Humo), Payme, Click, bank transfer or cash.',
      delivery: `Delivery: free in Tashkent from ${$}, across Uzbekistan and worldwide (UzPost, insured), or collect it at the gallery.`,
      documents: 'With the artwork’s passport and export permit for customs.',
      more: 'Payment & delivery details',
    },
    questions: 'Any questions about payment or delivery? Write to us — a curator will answer.',
  },
  ru: {
    eyebrow: 'ПОКУПКА В ART QALA',
    title: 'Оплата и доставка',
    intro:
      'Как оплатить работу и получить её — заберёте ли вы её в галерее, живёте в Ташкенте или в другом регионе Узбекистана либо покупаете из-за рубежа.',
    stepsHeading: 'Как проходит покупка',
    steps: [
      'Отправьте запрос со страницы работы (или приходите в галерею).',
      'Куратор подтвердит наличие, окончательную цену и стоимость доставки.',
      'Вы оплачиваете 100% заранее удобным способом.',
      'Мы надёжно упаковываем работу и передаём или отправляем её — с паспортом и документами на вывоз.',
    ],
    sections: [
      {
        icon: 'card',
        heading: 'Оплата',
        points: [
          'Полная (100%) предоплата до передачи или отправки работы.',
          'В Узбекистане: наличными, банковской картой (Uzcard, Humo, Visa, Mastercard), Payme, Click или банковским переводом.',
          'Из-за рубежа: оплата картой Visa / Mastercard или международный банковский перевод.',
        ],
      },
      {
        icon: 'coins',
        heading: 'Валюта',
        points: [
          'Цены на сайте указаны в долларах США.',
          'Оплатить можно в удобной валюте — долларах, сумах, рублях и других — по курсу, который подтвердит куратор; вы оплачиваете точную названную сумму.',
        ],
      },
      {
        icon: 'store',
        heading: 'Самовывоз из галереи',
        points: ['Работу можно бесплатно забрать в галерее самостоятельно.'],
      },
      {
        icon: 'truck',
        heading: 'Доставка по Ташкенту',
        points: [`Бесплатно при покупке от ${$}.`, `При покупке до ${$} доставка платная — куратор заранее назовёт стоимость.`],
      },
      {
        icon: 'map',
        heading: 'Доставка по Узбекистану',
        points: ['Доставляем во все регионы Узбекистана; доставка платная, стоимость куратор согласует заранее.'],
      },
      {
        icon: 'plane',
        heading: 'Международная доставка',
        points: [
          'Отправляем по всему миру через Почту Узбекистана (UzPost) — EMS-экспресс или стандартной посылкой.',
          'На странице каждой работы показана ориентировочная стоимость доставки в вашу страну.',
          'Если отправление идёт дольше 1 месяца, стоимость доставки возвращается.',
          'Ввозные пошлины и налоги страны назначения, если они есть, оплачивает покупатель.',
        ],
      },
      {
        icon: 'package',
        heading: 'Упаковка',
        points: [
          'Работы в раме упаковываются надёжно как есть либо рама снимается и упаковывается отдельно.',
          'Холсты без рамы сворачиваются в рулон и отправляются в тубусе.',
          'Если вы купили защитный футляр, работа упаковывается в него.',
        ],
      },
      {
        icon: 'shield',
        heading: 'Страховка',
        points: ['Отправления застрахованы, вы получаете страховой документ.'],
      },
      {
        icon: 'file',
        heading: 'Паспорт и разрешение на вывоз',
        points: [
          'К каждой работе прилагаются паспорт (сертификат) и разрешение на вывоз для таможни — мы оформляем их сами, чтобы вы без проблем вывезли или отправили работу из Узбекистана.',
        ],
      },
      {
        icon: 'alert',
        heading: 'Если что-то не так',
        points: [
          'Если работа пришла повреждённой, свяжитесь с нами в течение 7 дней и пришлите фото. Если вина на нашей стороне, мы рассмотрим случай и решим вопрос вместе с вами.',
        ],
      },
    ],
    faq: [
      {
        q: 'Как оплатить работу?',
        a: 'Полная предоплата. В Узбекистане — наличными, Uzcard, Humo, Visa, Mastercard, Payme, Click или банковским переводом; из-за рубежа — картой Visa/Mastercard или международным банковским переводом.',
      },
      {
        q: 'Можно ли оплатить не в долларах?',
        a: 'Да — в долларах, сумах, рублях или другой валюте по курсу, который подтвердит куратор.',
      },
      {
        q: 'Вы отправляете картины за границу?',
        a: 'Да, по всему миру через UzPost (EMS или посылкой), со страховкой и документами на вывоз. Ориентировочная стоимость указана на странице каждой работы.',
      },
      {
        q: 'Доставка по Ташкенту бесплатная?',
        a: `По Ташкенту доставка бесплатная при покупке от ${$}, дешевле — платная. Работу можно также забрать в галерее.`,
      },
      {
        q: 'Можно ли вывезти картину из Узбекистана?',
        a: 'Да. К каждой работе прилагаются паспорт и разрешение на вывоз для таможни, которые оформляет галерея.',
      },
    ],
    short: {
      payment: 'Оплата: 100% заранее — карта (Visa, Mastercard, Uzcard, Humo), Payme, Click, перевод или наличные.',
      delivery: `Доставка: бесплатно по Ташкенту от ${$}, по Узбекистану и по всему миру (UzPost, со страховкой) или самовывоз из галереи.`,
      documents: 'С паспортом работы и разрешением на вывоз для таможни.',
      more: 'Подробнее об оплате и доставке',
    },
    questions: 'Есть вопросы об оплате или доставке? Напишите нам — куратор ответит.',
  },
  uz: {
    eyebrow: 'ART QALADAN XARID',
    title: 'To‘lov va yetkazib berish',
    intro:
      'Asar uchun qanday to‘lash va uni qanday olish — galereyadan o‘zingiz olib ketasizmi, Toshkentda yoki O‘zbekistonning boshqa hududida yashaysizmi yoki chet eldan xarid qilyapsizmi.',
    stepsHeading: 'Xarid qanday bo‘ladi',
    steps: [
      'Asar sahifasidan so‘rov yuboring (yoki galereyaga keling).',
      'Kurator asar borligini, yakuniy narx va yetkazib berish narxini tasdiqlaydi.',
      'Siz o‘zingizga qulay usulda 100% oldindan to‘laysiz.',
      'Asarni xavfsiz qadoqlab, topshiramiz yoki jo‘natamiz — pasporti va olib chiqish hujjatlari bilan.',
    ],
    sections: [
      {
        icon: 'card',
        heading: 'To‘lov',
        points: [
          'To‘liq (100%) oldindan to‘lov — asar topshirilishi yoki jo‘natilishidan oldin.',
          'O‘zbekistonda: naqd, bank kartasi (Uzcard, Humo, Visa, Mastercard), Payme, Click yoki bank o‘tkazmasi.',
          'Chet eldan: Visa / Mastercard karta orqali yoki xalqaro bank o‘tkazmasi.',
        ],
      },
      {
        icon: 'coins',
        heading: 'Valyuta',
        points: [
          'Saytdagi narxlar AQSH dollarida.',
          'O‘zingizga qulay valyutada to‘lashingiz mumkin — dollar, so‘m, rubl va boshqalar — kurator tasdiqlagan kurs bo‘yicha; aytilgan aniq summani to‘laysiz.',
        ],
      },
      {
        icon: 'store',
        heading: 'Galereyadan olib ketish',
        points: ['Asarni galereyadan o‘zingiz bepul olib ketishingiz mumkin.'],
      },
      {
        icon: 'truck',
        heading: 'Toshkent bo‘ylab yetkazib berish',
        points: [`${$} va undan ortiq xaridlarda — bepul.`, `${$} dan kam xaridlarda — pullik, narxini kurator oldindan aytadi.`],
      },
      {
        icon: 'map',
        heading: 'O‘zbekiston bo‘ylab yetkazib berish',
        points: ['O‘zbekistonning barcha hududlariga yetkazamiz; yetkazib berish pullik, narxi kurator bilan oldindan kelishiladi.'],
      },
      {
        icon: 'plane',
        heading: 'Xalqaro yetkazib berish',
        points: [
          'O‘zbekiston pochtasi (UzPost) orqali butun dunyoga — EMS ekspress yoki oddiy posilka.',
          'Har bir asar sahifasida sizning davlatingizga taxminiy yetkazib berish narxi ko‘rsatilgan.',
          'Jo‘natma 1 oydan ko‘p yursa, yetkazib berish puli qaytariladi.',
          'Qabul qiluvchi davlatdagi import boji yoki soliqlar (bo‘lsa) xaridor zimmasida.',
        ],
      },
      {
        icon: 'package',
        heading: 'Qadoqlash',
        points: [
          'Ramkali asarlar o‘z holicha xavfsiz qadoqlanadi yoki ramkasi yechilib, alohida qadoqlanadi.',
          'Ramkasiz kartinalar rulon qilinib, tubusda jo‘natiladi.',
          'Himoya futlyari sotib olgan bo‘lsangiz, asar unga solib beriladi.',
        ],
      },
      {
        icon: 'shield',
        heading: 'Sug‘urta',
        points: ['Jo‘natmalar sug‘urtalanadi, sug‘urta hujjati sizga beriladi.'],
      },
      {
        icon: 'file',
        heading: 'Asar pasporti va olib chiqish ruxsatnomasi',
        points: [
          'Har bir asar bilan uning pasporti (sertifikati) va bojxona uchun olib chiqish ruxsatnomasi beriladi — ularni o‘zimiz rasmiylashtiramiz, asarni O‘zbekistondan bemalol olib chiqib ketishingiz yoki jo‘natishingiz mumkin.',
        ],
      },
      {
        icon: 'alert',
        heading: 'Muammo bo‘lsa',
        points: [
          'Asar shikastlanib yetib kelsa, 7 kun ichida rasmlari bilan bizga murojaat qiling. Ayb biz tomonda bo‘lsa, holatni ko‘rib chiqib, siz bilan birga hal qilamiz.',
        ],
      },
    ],
    faq: [
      {
        q: 'Asar uchun qanday to‘lanadi?',
        a: 'To‘liq oldindan to‘lov. O‘zbekistonda — naqd, Uzcard, Humo, Visa, Mastercard, Payme, Click yoki bank o‘tkazmasi; chet eldan — Visa/Mastercard yoki xalqaro bank o‘tkazmasi.',
      },
      {
        q: 'Dollardan boshqa valyutada to‘lash mumkinmi?',
        a: 'Ha — dollar, so‘m, rubl yoki boshqa valyutada, kurator tasdiqlagan kurs bo‘yicha.',
      },
      {
        q: 'Chet elga jo‘natasizmi?',
        a: 'Ha, butun dunyoga UzPost orqali (EMS yoki posilka), sug‘urta va olib chiqish hujjatlari bilan. Taxminiy narx har bir asar sahifasida ko‘rsatilgan.',
      },
      {
        q: 'Toshkent bo‘ylab yetkazib berish bepulmi?',
        a: `${$} va undan ortiq xaridlarda Toshkent bo‘ylab bepul, undan kamida pullik. Asarni galereyadan olib ketish ham mumkin.`,
      },
      {
        q: 'Kartinani O‘zbekistondan olib chiqib ketish mumkinmi?',
        a: 'Ha. Har bir asar bilan galereya rasmiylashtirgan pasport va bojxona uchun olib chiqish ruxsatnomasi beriladi.',
      },
    ],
    short: {
      payment: 'To‘lov: 100% oldindan — karta (Visa, Mastercard, Uzcard, Humo), Payme, Click, bank o‘tkazmasi yoki naqd.',
      delivery: `Yetkazib berish: Toshkentda ${$} dan bepul, O‘zbekiston bo‘ylab va butun dunyoga (UzPost, sug‘urtalangan) yoki galereyadan olib ketish.`,
      documents: 'Asar pasporti va bojxona uchun olib chiqish ruxsatnomasi bilan.',
      more: 'To‘lov va yetkazib berish haqida batafsil',
    },
    questions: 'To‘lov yoki yetkazib berish bo‘yicha savolingiz bormi? Bizga yozing — kurator javob beradi.',
  },
};
