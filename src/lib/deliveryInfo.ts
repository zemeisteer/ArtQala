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
  de: {
    eyebrow: 'KAUFEN BEI ART QALA',
    title: 'Zahlung & Lieferung',
    intro:
      'So bezahlen Sie ein Kunstwerk und bekommen es nach Hause – ob Sie es in der Galerie abholen, in Taschkent oder anderswo in Usbekistan wohnen oder aus dem Ausland kaufen.',
    stepsHeading: 'So läuft ein Kauf ab',
    steps: [
      'Senden Sie eine Anfrage von der Seite des Werks (oder besuchen Sie die Galerie).',
      'Ein Kurator bestätigt Verfügbarkeit, Endpreis und Lieferkosten.',
      'Sie zahlen 100 % im Voraus auf die für Sie passende Weise.',
      'Wir verpacken das Werk sicher und übergeben oder versenden es – mit Pass und Ausfuhrpapieren.',
    ],
    sections: [
      {
        icon: 'card',
        heading: 'Zahlung',
        points: [
          'Volle (100 %) Vorauszahlung, bevor das Werk übergeben oder versandt wird.',
          'In Usbekistan: bar, Bankkarten (Uzcard, Humo, Visa, Mastercard), Payme, Click oder Banküberweisung.',
          'Aus dem Ausland: Kartenzahlung mit Visa / Mastercard oder internationale Banküberweisung.',
        ],
      },
      {
        icon: 'coins',
        heading: 'Währung',
        points: [
          'Die Preise auf der Seite sind in US-Dollar angegeben.',
          'Sie können in der für Sie passenden Währung zahlen – US-Dollar, usbekische Sum, russische Rubel und andere – zum vom Kurator bestätigten Kurs; Sie zahlen genau den genannten Betrag.',
        ],
      },
      {
        icon: 'store',
        heading: 'Abholung in der Galerie',
        points: ['Sie können Ihr Werk kostenlos selbst in der Galerie abholen.'],
      },
      {
        icon: 'truck',
        heading: 'Lieferung in Taschkent',
        points: [`Kostenlos ab einem Einkauf von ${$}.`, `Unter ${$} ist die Lieferung kostenpflichtig – der Kurator nennt Ihnen die Kosten vorab.`],
      },
      {
        icon: 'map',
        heading: 'Lieferung in ganz Usbekistan',
        points: ['Wir liefern in alle Regionen Usbekistans; die Lieferung ist kostenpflichtig und wird vorab vom Kurator bestätigt.'],
      },
      {
        icon: 'plane',
        heading: 'Internationaler Versand',
        points: [
          'Weltweiter Versand mit der usbekischen Post (UzPost) – EMS Express oder Standardpaket.',
          'Auf der Seite jedes Werks sehen Sie die geschätzten Versandkosten für Ihr Land.',
          'Dauert eine Sendung länger als 1 Monat, erstatten wir die Versandkosten.',
          'Eventuelle Einfuhrzölle oder Steuern im Zielland trägt der Käufer.',
        ],
      },
      {
        icon: 'package',
        heading: 'Verpackung',
        points: [
          'Gerahmte Werke werden sicher so verpackt, wie sie sind, oder der Rahmen wird abgenommen und separat verpackt.',
          'Ungerahmte Leinwände werden gerollt und in einer Röhre verschickt.',
          'Wenn Sie eine Schutzhülle gekauft haben, wird das Werk darin verpackt.',
        ],
      },
      {
        icon: 'shield',
        heading: 'Versicherung',
        points: ['Sendungen sind versichert, und Sie erhalten das Versicherungsdokument.'],
      },
      {
        icon: 'file',
        heading: 'Pass & Ausfuhrgenehmigung',
        points: [
          'Jedes Werk erhält seinen Pass (Zertifikat) und eine Ausfuhrgenehmigung für den Zoll – wir bereiten beides vor, damit Sie es problemlos aus Usbekistan mitnehmen oder versenden können.',
        ],
      },
      {
        icon: 'alert',
        heading: 'Wenn etwas nicht stimmt',
        points: [
          'Kommt das Werk beschädigt an, melden Sie sich innerhalb von 7 Tagen mit Fotos. Liegt der Fehler bei uns, prüfen wir den Fall und lösen ihn gemeinsam mit Ihnen.',
        ],
      },
    ],
    faq: [
      {
        q: 'Wie bezahle ich ein Kunstwerk?',
        a: 'Volle Vorauszahlung. In Usbekistan bar, mit Uzcard, Humo, Visa, Mastercard, Payme, Click oder per Überweisung; aus dem Ausland mit Visa/Mastercard oder internationaler Banküberweisung.',
      },
      {
        q: 'Kann ich in einer anderen Währung als US-Dollar zahlen?',
        a: 'Ja – in US-Dollar, usbekischen Sum, russischen Rubeln oder einer anderen Währung, zum vom Kurator bestätigten Kurs.',
      },
      {
        q: 'Versenden Sie Kunstwerke ins Ausland?',
        a: 'Ja, weltweit mit UzPost (EMS oder Standardpaket), versichert und mit Ausfuhrpapieren. Die geschätzten Kosten stehen auf der Seite jedes Werks.',
      },
      {
        q: 'Ist die Lieferung in Taschkent kostenlos?',
        a: `In Taschkent ist die Lieferung ab einem Einkauf von ${$} kostenlos, darunter kostenpflichtig. Sie können das Werk auch in der Galerie abholen.`,
      },
      {
        q: 'Darf ich ein Gemälde aus Usbekistan ausführen?',
        a: 'Ja. Jedes Werk erhält seinen Pass und eine Ausfuhrgenehmigung für den Zoll, die die Galerie vorbereitet.',
      },
    ],
    short: {
      payment: 'Zahlung: 100 % im Voraus – Karte (Visa, Mastercard, Uzcard, Humo), Payme, Click, Überweisung oder bar.',
      delivery: `Lieferung: in Taschkent kostenlos ab ${$}, in ganz Usbekistan und weltweit (UzPost, versichert) oder Abholung in der Galerie.`,
      documents: 'Mit Pass des Werks und Ausfuhrgenehmigung für den Zoll.',
      more: 'Details zu Zahlung & Lieferung',
    },
    questions: 'Fragen zu Zahlung oder Lieferung? Schreiben Sie uns – ein Kurator antwortet.',
  },
  fr: {
    eyebrow: 'ACHETER CHEZ ART QALA',
    title: 'Paiement & livraison',
    intro:
      'Comment payer une œuvre et la recevoir — que vous la retiriez à la galerie, viviez à Tachkent ou ailleurs en Ouzbékistan, ou achetiez depuis l’étranger.',
    stepsHeading: 'Comment se passe un achat',
    steps: [
      'Envoyez une demande depuis la page de l’œuvre (ou venez à la galerie).',
      'Un conservateur confirme la disponibilité, le prix final et le coût de livraison.',
      'Vous payez 100 % à l’avance par le moyen qui vous convient.',
      'Nous emballons l’œuvre avec soin et vous la remettons ou l’expédions — avec son passeport et ses documents d’exportation.',
    ],
    sections: [
      {
        icon: 'card',
        heading: 'Paiement',
        points: [
          'Paiement intégral (100 %) à l’avance, avant la remise ou l’expédition de l’œuvre.',
          'En Ouzbékistan : espèces, cartes bancaires (Uzcard, Humo, Visa, Mastercard), Payme, Click ou virement bancaire.',
          'Depuis l’étranger : paiement par carte Visa / Mastercard ou virement bancaire international.',
        ],
      },
      {
        icon: 'coins',
        heading: 'Devise',
        points: [
          'Les prix du site sont en dollars américains.',
          'Vous pouvez payer dans la devise qui vous convient — dollars américains, soums ouzbeks, roubles russes et autres — au taux confirmé par le conservateur ; vous payez exactement le montant indiqué.',
        ],
      },
      {
        icon: 'store',
        heading: 'Retrait à la galerie',
        points: ['Vous pouvez retirer vous-même votre œuvre à la galerie, gratuitement.'],
      },
      {
        icon: 'truck',
        heading: 'Livraison à Tachkent',
        points: [`Gratuite à partir de ${$} d’achat.`, `En dessous de ${$}, la livraison est payante — le conservateur vous en indique le coût à l’avance.`],
      },
      {
        icon: 'map',
        heading: 'Livraison dans tout l’Ouzbékistan',
        points: ['Nous livrons dans toutes les régions d’Ouzbékistan ; la livraison est payante et confirmée à l’avance par le conservateur.'],
      },
      {
        icon: 'plane',
        heading: 'Expédition internationale',
        points: [
          'Expédition dans le monde entier par la poste ouzbèke (UzPost) — EMS express ou colis standard.',
          'La page de chaque œuvre indique une estimation des frais d’envoi pour votre pays.',
          'Si un envoi prend plus d’un mois, les frais d’envoi sont remboursés.',
          'Les droits de douane ou taxes éventuels dans le pays de destination sont à la charge de l’acheteur.',
        ],
      },
      {
        icon: 'package',
        heading: 'Emballage',
        points: [
          'Les œuvres encadrées sont emballées avec soin telles quelles, ou le cadre est retiré et emballé séparément.',
          'Les toiles non encadrées sont roulées et envoyées dans un tube.',
          'Si vous avez acheté un étui de protection, l’œuvre y est emballée.',
        ],
      },
      {
        icon: 'shield',
        heading: 'Assurance',
        points: ['Les envois sont assurés et vous recevez le document d’assurance.'],
      },
      {
        icon: 'file',
        heading: 'Passeport & autorisation d’exportation',
        points: [
          'Chaque œuvre est accompagnée de son passeport (certificat) et d’une autorisation d’exportation pour la douane — nous les préparons pour vous, afin que vous puissiez l’emporter ou l’envoyer hors d’Ouzbékistan sans difficulté.',
        ],
      },
      {
        icon: 'alert',
        heading: 'En cas de problème',
        points: [
          'Si l’œuvre arrive endommagée, contactez-nous sous 7 jours avec des photos. Si la faute nous incombe, nous examinerons le cas et le réglerons avec vous.',
        ],
      },
    ],
    faq: [
      {
        q: 'Comment payer une œuvre ?',
        a: 'Paiement intégral à l’avance. En Ouzbékistan en espèces, Uzcard, Humo, Visa, Mastercard, Payme, Click ou virement ; depuis l’étranger par Visa/Mastercard ou virement international.',
      },
      {
        q: 'Puis-je payer dans une autre devise que le dollar ?',
        a: 'Oui — en dollars américains, soums ouzbeks, roubles russes ou une autre devise, au taux confirmé par le conservateur.',
      },
      {
        q: 'Expédiez-vous des œuvres à l’étranger ?',
        a: 'Oui, dans le monde entier par UzPost (EMS ou colis standard), assuré, avec les documents d’exportation. Le coût estimé figure sur la page de chaque œuvre.',
      },
      {
        q: 'La livraison à Tachkent est-elle gratuite ?',
        a: `La livraison à Tachkent est gratuite à partir de ${$} d’achat, payante en dessous. Vous pouvez aussi retirer l’œuvre à la galerie.`,
      },
      {
        q: 'Puis-je sortir un tableau d’Ouzbékistan ?',
        a: 'Oui. Chaque œuvre est accompagnée de son passeport et d’une autorisation d’exportation pour la douane, préparés par la galerie.',
      },
    ],
    short: {
      payment: 'Paiement : 100 % à l’avance — carte (Visa, Mastercard, Uzcard, Humo), Payme, Click, virement ou espèces.',
      delivery: `Livraison : gratuite à Tachkent dès ${$}, dans tout l’Ouzbékistan et dans le monde (UzPost, assuré), ou retrait à la galerie.`,
      documents: 'Avec le passeport de l’œuvre et l’autorisation d’exportation pour la douane.',
      more: 'Détails paiement & livraison',
    },
    questions: 'Une question sur le paiement ou la livraison ? Écrivez-nous — un conservateur vous répondra.',
  },
  ko: {
    eyebrow: 'ART QALA에서 구매하기',
    title: '결제 & 배송',
    intro: '갤러리에서 직접 받으시든, 타슈켄트나 우즈베키스탄 다른 지역에 사시든, 해외에서 구매하시든 — 작품 결제와 수령 방법을 안내합니다.',
    stepsHeading: '구매 절차',
    steps: [
      '작품 페이지에서 문의를 보내세요(또는 갤러리를 방문하세요).',
      '큐레이터가 재고, 최종 가격, 배송비를 확인해 드립니다.',
      '편한 방법으로 100% 선결제합니다.',
      '작품을 안전하게 포장해 전달하거나 발송합니다 — 작품 여권과 반출 서류 포함.',
    ],
    sections: [
      {
        icon: 'card',
        heading: '결제',
        points: [
          '작품 전달 또는 발송 전 100% 선결제.',
          '우즈베키스탄 내: 현금, 은행 카드(Uzcard, Humo, Visa, Mastercard), Payme, Click 또는 계좌 이체.',
          '해외: Visa / Mastercard 카드 결제 또는 국제 송금.',
        ],
      },
      {
        icon: 'coins',
        heading: '통화',
        points: [
          '사이트의 가격은 미국 달러 기준입니다.',
          '미국 달러, 우즈베키스탄 숨, 러시아 루블 등 편한 통화로, 큐레이터가 확인한 환율에 따라 결제하실 수 있으며 안내된 금액을 정확히 지불합니다.',
        ],
      },
      {
        icon: 'store',
        heading: '갤러리에서 수령',
        points: ['갤러리에서 무료로 직접 수령하실 수 있습니다.'],
      },
      {
        icon: 'truck',
        heading: '타슈켄트 배송',
        points: [`${$} 이상 구매 시 무료.`, `${$} 미만은 유료이며, 큐레이터가 비용을 미리 알려 드립니다.`],
      },
      {
        icon: 'map',
        heading: '우즈베키스탄 전역 배송',
        points: ['우즈베키스탄 모든 지역으로 배송하며, 배송비는 유료로 큐레이터가 미리 확인해 드립니다.'],
      },
      {
        icon: 'plane',
        heading: '해외 배송',
        points: [
          '우즈베키스탄 우체국(UzPost)으로 전 세계 배송 — EMS 특급 또는 일반 소포.',
          '각 작품 페이지에서 국가별 예상 배송비를 확인할 수 있습니다.',
          '배송이 1개월 이상 걸리면 배송비를 환불해 드립니다.',
          '도착 국가의 수입 관세나 세금이 있는 경우 구매자가 부담합니다.',
        ],
      },
      {
        icon: 'package',
        heading: '포장',
        points: [
          '액자 작품은 그대로 안전하게 포장하거나, 액자를 분리해 따로 포장합니다.',
          '액자 없는 캔버스는 말아서 튜브에 넣어 발송합니다.',
          '보호 케이스를 구매하셨다면 작품을 케이스에 넣어 포장합니다.',
        ],
      },
      {
        icon: 'shield',
        heading: '보험',
        points: ['발송물은 보험에 가입되며, 보험 서류를 받으실 수 있습니다.'],
      },
      {
        icon: 'file',
        heading: '작품 여권 & 반출 허가',
        points: ['모든 작품에는 작품 여권(증명서)과 세관용 반출 허가서가 제공됩니다. 저희가 준비해 드리므로 우즈베키스탄에서 문제없이 가져가거나 보내실 수 있습니다.'],
      },
      {
        icon: 'alert',
        heading: '문제가 생겼을 때',
        points: ['작품이 손상되어 도착한 경우 7일 이내에 사진과 함께 연락 주세요. 저희 측 잘못이라면 검토 후 함께 해결해 드립니다.'],
      },
    ],
    faq: [
      {
        q: '작품 대금은 어떻게 결제하나요?',
        a: '100% 선결제입니다. 우즈베키스탄 내에서는 현금, Uzcard, Humo, Visa, Mastercard, Payme, Click 또는 계좌 이체, 해외에서는 Visa/Mastercard 또는 국제 송금으로 결제합니다.',
      },
      {
        q: '미국 달러 외의 통화로 결제할 수 있나요?',
        a: '네 — 미국 달러, 우즈베키스탄 숨, 러시아 루블 또는 다른 통화로 큐레이터가 확인한 환율에 따라 결제할 수 있습니다.',
      },
      {
        q: '해외로 작품을 배송하나요?',
        a: '네, UzPost(EMS 또는 일반 소포)로 전 세계에 보험 가입 후 반출 서류와 함께 배송합니다. 예상 비용은 각 작품 페이지에 표시됩니다.',
      },
      {
        q: '타슈켄트 배송은 무료인가요?',
        a: `타슈켄트 배송은 ${$} 이상 구매 시 무료이며, 그 미만은 유료입니다. 갤러리에서 직접 수령하셔도 됩니다.`,
      },
      {
        q: '그림을 우즈베키스탄 밖으로 가져갈 수 있나요?',
        a: '네. 모든 작품에는 갤러리가 준비한 작품 여권과 세관용 반출 허가서가 제공됩니다.',
      },
    ],
    short: {
      payment: '결제: 100% 선결제 — 카드(Visa, Mastercard, Uzcard, Humo), Payme, Click, 계좌 이체 또는 현금.',
      delivery: `배송: 타슈켄트 ${$} 이상 무료, 우즈베키스탄 전역 및 전 세계(UzPost, 보험 가입), 또는 갤러리 수령.`,
      documents: '작품 여권과 세관용 반출 허가서 포함.',
      more: '결제 & 배송 자세히 보기',
    },
    questions: '결제나 배송에 관한 질문이 있으신가요? 메시지를 보내 주시면 큐레이터가 답변드립니다.',
  },
  ja: {
    eyebrow: 'ART QALA でのご購入',
    title: 'お支払い・配送',
    intro: 'ギャラリーで受け取る方、タシケントやウズベキスタン各地にお住まいの方、海外からご購入の方 — 作品のお支払いとお届けの流れをご案内します。',
    stepsHeading: 'ご購入の流れ',
    steps: [
      '作品ページからお問い合わせください（またはギャラリーへお越しください）。',
      'キュレーターが在庫、最終価格、配送料を確認します。',
      'ご都合のよい方法で全額（100%）を前払いいただきます。',
      '作品を丁寧に梱包し、お渡しまたは発送します（作品パスポートと輸出書類付き）。',
    ],
    sections: [
      {
        icon: 'card',
        heading: 'お支払い',
        points: [
          '作品のお渡し・発送前に全額（100%）前払い。',
          'ウズベキスタン国内：現金、銀行カード（Uzcard、Humo、Visa、Mastercard）、Payme、Click、銀行振込。',
          '海外から：Visa / Mastercard のカード決済または国際送金。',
        ],
      },
      {
        icon: 'coins',
        heading: '通貨',
        points: [
          'サイトの価格は米ドル表示です。',
          '米ドル、ウズベキスタン・スム、ロシア・ルーブルなど、ご都合のよい通貨で、キュレーターが確認したレートでお支払いいただけます。提示された金額をそのままお支払いください。',
        ],
      },
      {
        icon: 'store',
        heading: 'ギャラリーでの受け取り',
        points: ['ギャラリーで無料で直接お受け取りいただけます。'],
      },
      {
        icon: 'truck',
        heading: 'タシケント市内の配送',
        points: [`${$}以上のご購入で無料。`, `${$}未満は有料で、キュレーターが事前に料金をお知らせします。`],
      },
      {
        icon: 'map',
        heading: 'ウズベキスタン全土への配送',
        points: ['ウズベキスタンのすべての地域へお届けします。配送は有料で、事前にキュレーターが確認します。'],
      },
      {
        icon: 'plane',
        heading: '海外発送',
        points: [
          'ウズベキスタン郵便（UzPost）で世界中へ発送 — EMS 速達または通常小包。',
          '各作品ページで、お届け先の国の送料の目安をご確認いただけます。',
          '配送に1か月以上かかった場合は、送料を返金します。',
          'お届け先の国で輸入関税や税金がかかる場合は、購入者のご負担となります。',
        ],
      },
      {
        icon: 'package',
        heading: '梱包',
        points: [
          '額装作品はそのまま安全に梱包するか、額縁を外して別に梱包します。',
          '額のないキャンバスは巻いて筒に入れて発送します。',
          '保護ケースをご購入の場合は、ケースに入れて梱包します。',
        ],
      },
      {
        icon: 'shield',
        heading: '保険',
        points: ['発送品には保険が付き、保険書類をお受け取りいただけます。'],
      },
      {
        icon: 'file',
        heading: '作品パスポート・輸出許可',
        points: ['すべての作品に作品パスポート（証明書）と税関用の輸出許可が付きます。ギャラリーで準備するので、ウズベキスタンから問題なく持ち出し・発送できます。'],
      },
      {
        icon: 'alert',
        heading: '問題があった場合',
        points: ['作品が破損して届いた場合は、7日以内に写真を添えてご連絡ください。当方に原因がある場合は、確認のうえ解決いたします。'],
      },
    ],
    faq: [
      {
        q: '作品の代金はどのように支払いますか？',
        a: '全額前払いです。ウズベキスタン国内では現金、Uzcard、Humo、Visa、Mastercard、Payme、Click、銀行振込、海外からは Visa/Mastercard または国際送金でお支払いいただけます。',
      },
      {
        q: '米ドル以外の通貨で支払えますか？',
        a: 'はい。米ドル、ウズベキスタン・スム、ロシア・ルーブルなど、キュレーターが確認したレートでお支払いいただけます。',
      },
      {
        q: '海外に作品を発送できますか？',
        a: 'はい。UzPost（EMS または通常小包）で世界中へ、保険付き・輸出書類付きで発送します。送料の目安は各作品ページに表示しています。',
      },
      {
        q: 'タシケント市内の配送は無料ですか？',
        a: `タシケント市内は${$}以上のご購入で無料、それ未満は有料です。ギャラリーで受け取ることもできます。`,
      },
      {
        q: '絵画をウズベキスタン国外へ持ち出せますか？',
        a: 'はい。すべての作品に、ギャラリーが用意する作品パスポートと税関用の輸出許可が付きます。',
      },
    ],
    short: {
      payment: 'お支払い：全額前払い — カード（Visa、Mastercard、Uzcard、Humo）、Payme、Click、銀行振込、現金。',
      delivery: `配送：タシケント市内は${$}以上で無料、ウズベキスタン全土・世界中へ（UzPost、保険付き）、またはギャラリーで受け取り。`,
      documents: '作品パスポートと税関用輸出許可付き。',
      more: 'お支払い・配送の詳細',
    },
    questions: 'お支払いや配送についてご質問がありますか？メッセージをお送りください。キュレーターがお答えします。',
  },
  zh: {
    eyebrow: '在 ART QALA 购买',
    title: '付款与配送',
    intro: '无论您是到画廊自取、住在塔什干或乌兹别克斯坦其他地区，还是从海外购买——这里说明如何为作品付款并收到作品。',
    stepsHeading: '购买流程',
    steps: [
      '在作品页面发送咨询（或亲临画廊）。',
      '策展人确认库存、最终价格和运费。',
      '您以合适的方式 100% 预付。',
      '我们妥善包装后交付或寄出作品——附作品护照和出境文件。',
    ],
    sections: [
      {
        icon: 'card',
        heading: '付款',
        points: [
          '作品交付或寄出前全额（100%）预付。',
          '乌兹别克斯坦境内：现金、银行卡（Uzcard、Humo、Visa、Mastercard）、Payme、Click 或银行转账。',
          '海外：Visa / Mastercard 刷卡或国际银行汇款。',
        ],
      },
      {
        icon: 'coins',
        heading: '货币',
        points: [
          '网站价格以美元标示。',
          '您可以用合适的货币付款——美元、乌兹别克苏姆、俄罗斯卢布等——按策展人确认的汇率，支付所告知的确切金额。',
        ],
      },
      {
        icon: 'store',
        heading: '画廊自取',
        points: ['您可以免费到画廊自取作品。'],
      },
      {
        icon: 'truck',
        heading: '塔什干市内配送',
        points: [`购买满 ${$} 免费配送。`, `不满 ${$} 需付配送费——策展人会提前告知费用。`],
      },
      {
        icon: 'map',
        heading: '乌兹别克斯坦全境配送',
        points: ['我们可配送至乌兹别克斯坦各地区；配送需付费，并由策展人提前确认。'],
      },
      {
        icon: 'plane',
        heading: '国际运输',
        points: [
          '通过乌兹别克斯坦邮政（UzPost）寄往全球——EMS 快递或普通包裹。',
          '每件作品页面都会显示寄往您所在国家的运费估算。',
          '如运输超过 1 个月，将退还运费。',
          '目的地国家如有进口关税或税费，由买家承担。',
        ],
      },
      {
        icon: 'package',
        heading: '包装',
        points: [
          '带框作品按原样妥善包装，或拆下画框单独包装。',
          '无框画布卷起后装入画筒寄出。',
          '如您购买了保护箱，作品将装入保护箱包装。',
        ],
      },
      {
        icon: 'shield',
        heading: '保险',
        points: ['寄件均已投保，您将收到保险单据。'],
      },
      {
        icon: 'file',
        heading: '作品护照与出境许可',
        points: ['每件作品都附有作品护照（证书）和海关出境许可——由我们为您准备，让您能顺利带出或寄出乌兹别克斯坦。'],
      },
      {
        icon: 'alert',
        heading: '如有问题',
        points: ['如作品到达时有损坏，请在 7 天内附照片联系我们。如属我方责任，我们将审核并与您一起解决。'],
      },
    ],
    faq: [
      {
        q: '如何为作品付款？',
        a: '全额预付。在乌兹别克斯坦可用现金、Uzcard、Humo、Visa、Mastercard、Payme、Click 或银行转账；海外可用 Visa/Mastercard 或国际汇款。',
      },
      {
        q: '可以用美元以外的货币付款吗？',
        a: '可以——美元、乌兹别克苏姆、俄罗斯卢布或其他货币，按策展人确认的汇率支付。',
      },
      {
        q: '你们可以把作品寄到国外吗？',
        a: '可以，通过 UzPost（EMS 或普通包裹）寄往全球，含保险并附出境文件。每件作品页面都显示估算运费。',
      },
      {
        q: '塔什干市内配送免费吗？',
        a: `塔什干市内购买满 ${$} 免费配送，不满则需付费。您也可以到画廊自取。`,
      },
      {
        q: '可以把画作带出乌兹别克斯坦吗？',
        a: '可以。每件作品都附有画廊准备的作品护照和海关出境许可。',
      },
    ],
    short: {
      payment: '付款：100% 预付——银行卡（Visa、Mastercard、Uzcard、Humo）、Payme、Click、银行转账或现金。',
      delivery: `配送：塔什干满 ${$} 免费，乌兹别克斯坦全境及全球（UzPost，含保险），或画廊自取。`,
      documents: '附作品护照和海关出境许可。',
      more: '付款与配送详情',
    },
    questions: '对付款或配送有疑问？给我们留言——策展人会为您解答。',
  },
};
