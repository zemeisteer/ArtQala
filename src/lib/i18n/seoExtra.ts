import type { ExtraLanguage } from './dictionary';

// Search titles/descriptions for the languages beyond EN/RU/UZ (see seo.ts).
// {cities} in the home entry is replaced with the gallery's cities.

type Entry = { title: string; description: string };
export type ExtraPageKey =
  | 'home'
  | 'gallery'
  | 'artists'
  | 'services'
  | 'contact'
  | 'reviews'
  | 'privacy'
  | 'terms'
  | 'delivery'
  | 'gift'
  | 'workshops';

export const CITY_LOCAL: Record<string, Record<ExtraLanguage, string>> = {
  Tashkent: { de: 'Taschkent', fr: 'Tachkent', ko: '타슈켄트', ja: 'タシケント', zh: '塔什干' },
  Khiva: { de: 'Chiwa', fr: 'Khiva', ko: '히바', ja: 'ヒヴァ', zh: '希瓦' },
  Samarkand: { de: 'Samarkand', fr: 'Samarcande', ko: '사마르칸트', ja: 'サマルカンド', zh: '撒马尔罕' },
  Bukhara: { de: 'Buchara', fr: 'Boukhara', ko: '부하라', ja: 'ブハラ', zh: '布哈拉' },
  Urgench: { de: 'Urgentsch', fr: 'Ourguentch', ko: '우르겐치', ja: 'ウルゲンチ', zh: '乌尔根奇' },
};

export const CITY_JOIN: Record<ExtraLanguage, string> = { de: ' und ', fr: ' et ', ko: '·', ja: '・', zh: '、' };

export const EXTRA_PAGES: Record<ExtraLanguage, Record<ExtraPageKey, Entry>> = {
  de: {
    home: {
      title: 'Art Qala — Galerie & Atelier | {cities}, Usbekistan',
      description:
        'Art Qala ist eine Kunstgalerie in {cities}, Usbekistan: Originalgemälde historischer Monumente, Porträts und traditionelles Handwerk, dazu Wandmalereien und Keramik auf Bestellung.',
    },
    gallery: { title: 'Galerie — Originalgemälde aus Usbekistan', description: 'Originalgemälde usbekischer Künstler: Monumente, Porträts, Innenhöfe und Handwerk. Preise in Ihrer Währung, weltweiter Versand.' },
    artists: { title: 'Künstler — usbekische Maler & Meister', description: 'Lernen Sie die Maler und Kunsthandwerker von Art Qala kennen und sehen Sie ihre Werke.' },
    services: { title: 'Leistungen — Wandmalerei, Keramik & Auftragsgemälde', description: 'Wandmalereien, handgemachte Keramik und Auftragsgemälde von den Künstlern der Galerie Art Qala.' },
    contact: { title: 'Kontakt & Anfahrt', description: 'Besuchen Sie die Galerie Art Qala oder schreiben Sie uns zu einem Gemälde, einem Auftrag oder zur Lieferung.' },
    reviews: { title: 'Bewertungen von Kunden & Sammlern', description: 'Was Kunstliebhaber und Sammler über ihre Originale von Art Qala sagen.' },
    privacy: { title: 'Datenschutz', description: 'Wie die Galerie Art Qala Ihre persönlichen Daten, Anfragen und Bestellungen verarbeitet.' },
    terms: { title: 'Nutzungsbedingungen', description: 'Bedingungen für den Kauf von Originalen, Echtheitszertifikaten und Auftragsarbeiten bei Art Qala.' },
    delivery: { title: 'Zahlung & Lieferung', description: 'Wie Sie ein Werk bei Art Qala bezahlen und wie es zu Ihnen kommt: versicherter Versand weltweit mit Ausfuhrpapieren.' },
    gift: { title: 'Geschenkgutschein', description: 'Verschenken Sie einen Gutschein von Art Qala — der Beschenkte wählt ein usbekisches Original oder einen Workshop.' },
    workshops: { title: 'Workshops & Führungen', description: 'Workshops mit usbekischen Künstlern bei Art Qala — Malerei, Keramik, Holzschnitzerei. Online buchen.' },
  },
  fr: {
    home: {
      title: 'Art Qala — Galerie & atelier | {cities}, Ouzbékistan',
      description:
        'Art Qala est une galerie d’art à {cities}, en Ouzbékistan : tableaux originaux de monuments historiques, portraits et artisanat traditionnel, ainsi que fresques et céramiques sur commande.',
    },
    gallery: { title: 'Galerie — tableaux originaux d’Ouzbékistan', description: 'Tableaux originaux d’artistes ouzbeks : monuments, portraits, cours intérieures et artisanat. Prix dans votre devise, livraison dans le monde entier.' },
    artists: { title: 'Artistes — peintres et maîtres ouzbeks', description: 'Découvrez les peintres et artisans d’Art Qala et leurs œuvres.' },
    services: { title: 'Services — fresques, céramiques & tableaux sur commande', description: 'Fresques, céramiques faites main et tableaux sur commande par les artistes de la galerie Art Qala.' },
    contact: { title: 'Contact & adresse de la galerie', description: 'Visitez la galerie Art Qala ou écrivez-nous au sujet d’un tableau, d’une commande ou de la livraison.' },
    reviews: { title: 'Avis de clients et collectionneurs', description: 'Ce que disent les amateurs d’art et collectionneurs de leurs originaux Art Qala.' },
    privacy: { title: 'Politique de confidentialité', description: 'Comment la galerie Art Qala traite vos données personnelles, demandes et commandes.' },
    terms: { title: 'Conditions d’utilisation', description: 'Conditions d’achat d’œuvres originales, de certificats d’authenticité et de commandes chez Art Qala.' },
    delivery: { title: 'Paiement & livraison', description: 'Comment payer une œuvre chez Art Qala et comment elle vous parvient : envoi assuré dans le monde entier avec documents d’exportation.' },
    gift: { title: 'Carte cadeau', description: 'Offrez une carte cadeau Art Qala — le bénéficiaire choisit une œuvre ouzbèke originale ou un atelier.' },
    workshops: { title: 'Ateliers & visites', description: 'Ateliers avec des artistes ouzbeks chez Art Qala — peinture, céramique, sculpture sur bois. Réservation en ligne.' },
  },
  ko: {
    home: {
      title: 'Art Qala — 갤러리 & 스튜디오 | 우즈베키스탄 {cities}',
      description: 'Art Qala는 우즈베키스탄 {cities}의 미술 갤러리입니다. 역사 유적, 초상화, 전통 공예를 담은 원화와 맞춤 벽화·도자기를 만나 보세요.',
    },
    gallery: { title: '갤러리 — 우즈베키스탄 원화 컬렉션', description: '우즈베키스탄 작가들의 원화: 유적, 초상, 안뜰, 공예. 원하는 통화로 가격 확인, 전 세계 배송.' },
    artists: { title: '작가 — 우즈베키스탄의 화가와 장인', description: 'Art Qala의 화가와 장인, 그리고 그들의 작품을 만나 보세요.' },
    services: { title: '서비스 — 벽화, 도자기 & 맞춤 그림', description: 'Art Qala 작가들이 제작하는 벽화, 수제 도자기, 맞춤 그림.' },
    contact: { title: '문의 & 갤러리 위치', description: 'Art Qala 갤러리를 방문하시거나 작품, 주문, 배송에 대해 문의하세요.' },
    reviews: { title: '고객 & 컬렉터 후기', description: 'Art Qala 원화를 구입한 예술 애호가와 컬렉터들의 이야기.' },
    privacy: { title: '개인정보처리방침', description: 'Art Qala 갤러리가 개인 정보, 문의, 주문을 처리하는 방법.' },
    terms: { title: '이용약관', description: 'Art Qala의 원화 구매, 진품 증명서, 맞춤 주문에 관한 약관.' },
    delivery: { title: '결제 & 배송', description: 'Art Qala 작품 결제 방법과 배송 안내: 보험 가입 해외 배송과 반출 서류 제공.' },
    gift: { title: '기프트 카드', description: 'Art Qala 기프트 카드를 선물하세요 — 받는 분이 우즈베크 원화나 마스터클래스를 직접 고릅니다.' },
    workshops: { title: '마스터클래스 & 투어', description: 'Art Qala에서 우즈베키스탄 작가와 함께하는 마스터클래스 — 회화, 도자기, 목공예. 온라인 예약.' },
  },
  ja: {
    home: {
      title: 'Art Qala — ギャラリー & スタジオ | ウズベキスタン・{cities}',
      description: 'Art Qala はウズベキスタン・{cities}のアートギャラリー。歴史的建造物、肖像画、伝統工芸を描いた原画のほか、壁画や陶器のオーダーも承ります。',
    },
    gallery: { title: 'ギャラリー — ウズベキスタンの原画', description: 'ウズベキスタンの作家による原画：建造物、肖像、中庭、工芸。お好きな通貨で価格表示、世界中へ配送。' },
    artists: { title: 'アーティスト — ウズベキスタンの画家と職人', description: 'Art Qala の画家・職人とその作品をご紹介します。' },
    services: { title: 'サービス — 壁画・陶器・オーダーメイド絵画', description: 'Art Qala の作家による壁画、手作りの陶器、オーダーメイドの絵画。' },
    contact: { title: 'お問い合わせ・アクセス', description: 'Art Qala ギャラリーへのご来館、作品・ご注文・配送についてのお問い合わせ。' },
    reviews: { title: 'お客様・コレクターのレビュー', description: 'Art Qala の原画を手にしたアート愛好家とコレクターの声。' },
    privacy: { title: 'プライバシーポリシー', description: 'Art Qala ギャラリーにおける個人情報、お問い合わせ、ご注文の取り扱いについて。' },
    terms: { title: '利用規約', description: 'Art Qala での原画購入、真作証明書、オーダー制作に関する規約。' },
    delivery: { title: 'お支払い・配送', description: 'Art Qala の作品のお支払い方法と配送：保険付きの国際配送、輸出書類付き。' },
    gift: { title: 'ギフト券', description: 'Art Qala のギフト券を贈りませんか — ウズベクの原画やワークショップを受取人が選べます。' },
    workshops: { title: 'ワークショップ & ツアー', description: 'Art Qala でウズベキスタンの作家と体験するワークショップ — 絵画、陶芸、木彫り。オンライン予約。' },
  },
  zh: {
    home: {
      title: 'Art Qala — 画廊与工作室 | 乌兹别克斯坦{cities}',
      description: 'Art Qala 是位于乌兹别克斯坦{cities}的艺术画廊，展出历史古迹、肖像和传统手工艺原创画作，并承接定制壁画与陶瓷。',
    },
    gallery: { title: '画廊 — 乌兹别克斯坦原创画作', description: '乌兹别克斯坦艺术家的原创画作：古迹、肖像、庭院与手工艺。以您的货币显示价格，全球配送。' },
    artists: { title: '艺术家 — 乌兹别克画家与工匠', description: '认识 Art Qala 的画家与工匠及其作品。' },
    services: { title: '服务 — 壁画、陶瓷与定制画作', description: 'Art Qala 艺术家创作的壁画、手工陶瓷和定制画作。' },
    contact: { title: '联系我们与画廊地址', description: '参观 Art Qala 画廊，或就画作、定制和配送事宜联系我们。' },
    reviews: { title: '顾客与收藏家评价', description: '艺术爱好者和收藏家对 Art Qala 原作的评价。' },
    privacy: { title: '隐私政策', description: 'Art Qala 画廊如何处理您的个人信息、咨询和订单。' },
    terms: { title: '服务条款', description: '在 Art Qala 购买原作、真品证书及定制服务的相关条款。' },
    delivery: { title: '付款与配送', description: '如何为 Art Qala 的作品付款以及作品如何送达：带保险的国际运输并提供出境文件。' },
    gift: { title: '礼品卡', description: '赠送 Art Qala 礼品卡——由收礼人挑选乌兹别克原创作品或大师课。' },
    workshops: { title: '大师课与导览', description: '在 Art Qala 与乌兹别克艺术家一起上大师课——绘画、陶艺、木雕。在线预约。' },
  },
};
