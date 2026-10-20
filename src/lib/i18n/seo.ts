import type { Metadata } from 'next';
import type { Language } from './translations';
import { OG_LOCALE, languageAlternates } from './routing';

// Search/social titles and descriptions for the public pages, per language —
// each /ru/... and /uz/... page is indexed in its own language, so its title
// and description must be too. `title` goes through the root layout's
// "%s | Art Qala Gallery" template (except the home page, which is absolute).
type PageKey = 'home' | 'gallery' | 'artists' | 'services' | 'contact' | 'reviews' | 'privacy' | 'terms';

const PAGES: Record<PageKey, { path: string } & Record<Language, { title: string; description: string }>> = {
  home: {
    path: '/',
    en: {
      title: 'Art Qala — Gallery & Studio | Tashkent, Uzbekistan',
      description:
        'Art Qala is an art gallery in Tashkent, Uzbekistan, showcasing original paintings of historical monuments, portraits and traditional crafts, alongside custom murals and ceramics.',
    },
    ru: {
      title: 'Art Qala — галерея и студия | Ташкент, Узбекистан',
      description:
        'Art Qala — художественная галерея в Ташкенте: оригинальные картины исторических памятников, портреты и традиционные ремёсла, а также росписи стен и керамика на заказ.',
    },
    uz: {
      title: 'Art Qala — galereya va studiya | Toshkent, O‘zbekiston',
      description:
        'Art Qala — Toshkentdagi san’at galereyasi: tarixiy obidalar, portretlar va an’anaviy hunarmandchilik tasvirlangan original kartinalar, buyurtma asosida devoriy rasmlar va sopol buyumlar.',
    },
  },
  gallery: {
    path: '/gallery',
    en: {
      title: 'Gallery — Original Paintings Collection',
      description:
        'Explore original Uzbek paintings of historical monuments, portraits and courtyards at Art Qala Gallery in Tashkent — with worldwide shipping.',
    },
    ru: {
      title: 'Галерея — коллекция оригинальных картин',
      description:
        'Оригинальные узбекские картины: исторические памятники, портреты и дворики — галерея Art Qala в Ташкенте, доставка по всему миру.',
    },
    uz: {
      title: 'Galereya — original kartinalar to‘plami',
      description:
        'Tarixiy obidalar, portretlar va hovlilar tasvirlangan original o‘zbek kartinalari — Toshkentdagi Art Qala galereyasi, butun dunyo bo‘ylab yetkazib berish.',
    },
  },
  artists: {
    path: '/artists',
    en: {
      title: 'Artists — Uzbek Masters & Painters',
      description:
        'Meet the painters and craftspeople of Art Qala Gallery creating original Central Asian works in Tashkent.',
    },
    ru: {
      title: 'Художники — узбекские мастера и живописцы',
      description: 'Познакомьтесь с художниками и мастерами галереи Art Qala, создающими оригинальные работы в Ташкенте.',
    },
    uz: {
      title: 'Rassomlar — o‘zbek ustalari va musavvirlar',
      description: 'Toshkentda original asarlar yaratayotgan Art Qala galereyasi rassomlari va hunarmandlari bilan tanishing.',
    },
  },
  services: {
    path: '/services',
    en: {
      title: 'Services — Murals, Ceramics & Custom Art Commissions',
      description:
        'Commission custom wall murals, hand-painted ceramics or a personal painting from the artists of Art Qala in Tashkent.',
    },
    ru: {
      title: 'Услуги — росписи стен, керамика и картины на заказ',
      description:
        'Закажите роспись стен, расписную керамику или картину на заказ у художников Art Qala в Ташкенте.',
    },
    uz: {
      title: 'Xizmatlar — devoriy rasmlar, sopol va buyurtma kartinalar',
      description:
        'Toshkentdagi Art Qala rassomlaridan devoriy rasm, qo‘lda bezatilgan sopol buyumlar yoki buyurtma kartina buyurtma qiling.',
    },
  },
  contact: {
    path: '/contact',
    en: {
      title: 'Contact Us & Gallery Location | Tashkent',
      description:
        'Visit Art Qala Gallery at Barakhon Madrasah, Tashkent, Uzbekistan, or get in touch about a painting, a commission or delivery.',
    },
    ru: {
      title: 'Контакты и адрес галереи | Ташкент',
      description:
        'Посетите галерею Art Qala в медресе Баракхан, Ташкент, или свяжитесь с нами по поводу картины, заказа или доставки.',
    },
    uz: {
      title: 'Aloqa va galereya manzili | Toshkent',
      description:
        'Toshkentdagi Baroqxon madrasasida joylashgan Art Qala galereyasiga keling yoki kartina, buyurtma va yetkazib berish haqida biz bilan bog‘laning.',
    },
  },
  reviews: {
    path: '/reviews',
    en: {
      title: 'Client Reviews & Collector Testimonials',
      description:
        'Reviews from collectors and clients of Art Qala Gallery in Tashkent — written by verified buyers of original paintings and commissions.',
    },
    ru: {
      title: 'Отзывы клиентов и коллекционеров',
      description:
        'Отзывы коллекционеров и клиентов галереи Art Qala в Ташкенте — от подтверждённых покупателей картин и заказчиков.',
    },
    uz: {
      title: 'Mijozlar va kolleksionerlar sharhlari',
      description:
        'Toshkentdagi Art Qala galereyasi kolleksionerlari va mijozlarining sharhlari — kartinalarning tasdiqlangan xaridorlari va buyurtmachilardan.',
    },
  },
  privacy: {
    path: '/privacy',
    en: {
      title: 'Privacy Policy',
      description: 'How Art Qala Gallery in Tashkent handles your personal information, inquiries and orders.',
    },
    ru: {
      title: 'Политика конфиденциальности',
      description: 'Как галерея Art Qala в Ташкенте обрабатывает ваши персональные данные, запросы и заказы.',
    },
    uz: {
      title: 'Maxfiylik siyosati',
      description: 'Toshkentdagi Art Qala galereyasi shaxsiy ma’lumotlaringiz, so‘rovlaringiz va buyurtmalaringizni qanday qayta ishlaydi.',
    },
  },
  terms: {
    path: '/terms',
    en: {
      title: 'Terms of Service',
      description: 'Terms for buying original artworks, certificates of authenticity and commissions at Art Qala Gallery, Tashkent.',
    },
    ru: {
      title: 'Условия использования',
      description: 'Условия покупки оригинальных работ, сертификатов подлинности и заказов в галерее Art Qala, Ташкент.',
    },
    uz: {
      title: 'Foydalanish shartlari',
      description: 'Toshkentdagi Art Qala galereyasida original asarlar xaridi, haqiqiylik sertifikatlari va buyurtmalar shartlari.',
    },
  },
};

export function pageMetadata(key: PageKey, lang: Language): Metadata {
  const page = PAGES[key];
  const { title, description } = page[lang];
  const alternates = languageAlternates(page.path, lang);
  return {
    title: key === 'home' ? { absolute: title } : title,
    description,
    alternates,
    openGraph: {
      title: key === 'home' ? title : `${title} | Art Qala Gallery`,
      description,
      url: alternates.canonical,
      locale: OG_LOCALE[lang],
    },
  };
}

// The home page names the gallery's city in its title/description. When
// Settings lists addresses in more (or other) cities — e.g. Tashkent and
// Khiva — they are all named, so "gallery in Khiva" searches match too.
const CITY_NAMES: Record<string, { en: string; ru: string; ruIn: string; uz: string }> = {
  Tashkent: { en: 'Tashkent', ru: 'Ташкент', ruIn: 'Ташкенте', uz: 'Toshkent' },
  Khiva: { en: 'Khiva', ru: 'Хива', ruIn: 'Хиве', uz: 'Xiva' },
  Samarkand: { en: 'Samarkand', ru: 'Самарканд', ruIn: 'Самарканде', uz: 'Samarqand' },
  Bukhara: { en: 'Bukhara', ru: 'Бухара', ruIn: 'Бухаре', uz: 'Buxoro' },
  Urgench: { en: 'Urgench', ru: 'Ургенч', ruIn: 'Ургенче', uz: 'Urganch' },
};

export function homeMetadata(lang: Language, cities: string[]): Metadata {
  const meta = pageMetadata('home', lang);
  const known = cities.filter((c) => CITY_NAMES[c]);
  if (known.length === 0 || (known.length === 1 && known[0] === 'Tashkent')) return meta;
  const names = known.map((c) => CITY_NAMES[c]);
  const { title, description } = PAGES.home[lang];
  const list = (xs: string[], and: string) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} ${and} ${xs[xs.length - 1]}` : xs[0]);
  const next =
    lang === 'ru'
      ? {
          title: title.replace('Ташкент', list(names.map((n) => n.ru), 'и')),
          description: description.replace('в Ташкенте', `в ${list(names.map((n) => n.ruIn), 'и')}`),
        }
      : lang === 'uz'
        ? {
            title: title.replace('Toshkent', list(names.map((n) => n.uz), 'va')),
            description: description.replace('Toshkentdagi', `${list(names.map((n) => n.uz), 'va')}dagi`),
          }
        : {
            title: title.replace('Tashkent', list(names.map((n) => n.en), '&')),
            description: description.replace('in Tashkent', `in ${list(names.map((n) => n.en), 'and')}`),
          };
  return {
    ...meta,
    title: { absolute: next.title },
    description: next.description,
    openGraph: { ...meta.openGraph, title: next.title, description: next.description },
  };
}
