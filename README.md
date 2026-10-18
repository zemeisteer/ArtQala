<p align="center">
  <img src="assets/logo.png" alt="Art Qala" width="140"/>
</p>

<h1 align="center">Art Qala — San'at Galereyasi Veb-sayti</h1>

<p align="center">
  Samarqand shahridagi <strong>"Art Qala"</strong> san'at galereyasi uchun zamonaviy, nafis va to'liq funksional veb-platforma.
</p>

<p align="center">
  <a href="https://art-qala.vercel.app"><img src="https://img.shields.io/badge/demo-live-3b7a57?style=flat-square" alt="Live Demo"/></a>
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs" alt="Next.js"/>
  <img src="https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react" alt="React"/>
  <img src="https://img.shields.io/badge/TypeScript-blue?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma" alt="Prisma"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS"/>
  <img src="https://img.shields.io/badge/deployed_on-Vercel-black?style=flat-square&logo=vercel" alt="Vercel"/>
</p>

<p align="center">
  <a href="https://artqala.com"><strong>🔗 Live Demo</strong></a>
  &nbsp;·&nbsp;
  <a href="./README.en.md">🇬🇧 English</a>
</p>

Ushbu loyiha [AGENTS.md](./AGENTS.md) qoidalari hamda [TZ/ArtQala_TZ.docx](./TZ/ArtQala_TZ.docx) talablariga to'liq muvofiq ishlab chiqilgan.

---

## Mundarija

- [Asosiy Imkoniyatlar](#asosiy-imkoniyatlar)
- [Ko'rinish (Screenshots)](#korinish-screenshots)
- [Texnologik Stack](#texnologik-stack)
- [Lokal O'rnatish va Ishga Tushirish](#lokal-ornatish-va-ishga-tushirish)
- [Dastlabki Hisoblar (Test Uchun)](#dastlabki-hisoblar-test-uchun)
- [Vercel'ga Joylashtirish (Deploy)](#vercelga-joylashtirish-deploy)
- [Litsenziya](#litsenziya)

---

## Asosiy Imkoniyatlar

### Mijoz Qismi (Public Gallery)
- **Tungi Galereya Hero**: Animatsion Ikat naqshi drifti, spotlight effekti, suzuvchi Registon asari va oltin jilo beruvchi sarlavha.
- **Ko'p Tillilik (i18n)**: Inglizcha (**EN** — asosiy), Ruscha (**RU**), O'zbekcha (**UZ** — faqat Lotin alifbosida).
- **Valyuta Konvertori**: **USD ($)**, **UZS (so'm)**, **RUB (₽)**, **EUR (€)** jonli kurslari.
- **Galereya & Filtrlar**: Tarixiy obidalar, Portretlar, Hovli-joylar, Hunarmandchilik mavzusi bo'yicha filtrlar, qidiruv va narxlar.
- **Kartina Batafsil**: O'lcham, texnika, yaratilgan yili, sertifikat kafolati va to'g'ridan-to'g'ri kuratorga so'rov yuborish.
- **Rassomlar Kataloogi**: Samarqandlik usta rassomlar profili, biografiyalari va portfolio topshirish imkoniyati.
- **Xizmatlar**: Mural (devoriy rasm), mualliflik keramikasi va buyurtma kartinalar uchun narx so'rash formasi.
- **Aloqa**: Samarqand galereyasi manzili, ish vaqti, ijtimoiy tarmoqlar va animatsion geo-pinli interaktiv xarita.
- **Asillik Sertifikati**: Har bir original kartina uchun galereya oltin muhri va rassom/kurator imzosi bilan rasmiy chop etiladigan (print-ready) sertifikat.

### Foydalanuvchi & Sevimlilar (Auth & Wishlist)
- **Ro'yxatdan o'tish & Kirish**: Ism, davlat, email va parol.
- **Email OTP**: 6 xonali tasdiqlash kodi bilan hisobni faollashtirish.
- **Wishlist (Sevimlilar)**: Ro'yxatdan o'tmasdan ham brauzerda ishlaydi, hisobga kirganda esa sinxronlanadi.
- **Mijoz Kabineti (`/account`)**: Yuborilgan so'rovlar holati (*Under Review, In Progress, Answered, Completed*), kurator javoblari, saqlangan asarlar va profil.

### Admin Panel (`/admin`)
- **Dizayn**: Qulay boshqaruv paneli (`#1D100B` sidebar, `#FAF4EC` fon).
- **Dashboard**: Asosiy statistika (kartinalar soni, yangi so'rovlar, faol aksiyalar), oxirgi so'rovlar va eng ko'p ko'rilgan asarlar.
- **Paintings CRUD**: Qidiruv, filtrlar, yangi kartina qo'shish, rasm yuklash, narx va skidka belgilash, "Mark as Sold" va "Featured on homepage" kalitlari.
- **4-Darajali Chegirma Tizimi**:
  1. *Kartinaning o'z skidkasi* (eng yuqori)
  2. *Rassom katalogi skidkasi*
  3. *Kategoriya skidkasi*
  4. *Sayt bo'yicha umumiy skidka* (eng quyi)
  Avtomatik amal qilish muddati (boshlanish va tugash sanalari).
- **So'rovlar (Inquiries)**: 2 ustunli boshqaruv paneli, mijozga javob yozish va holatni yangilash.
- **Xizmat So'rovlari**: Mural va keramika buyurtmalari ro'yxati va kurator qaydlari.
- **Mijozlar & Sharhlar moderatsiyasi**.

---

## Ko'rinish (Screenshots)

<p align="center">
  <img src="design/screenshots/AdminDashboard.png" alt="Admin Dashboard" width="49%"/>
  <img src="design/screenshots/AdminPaintings.png" alt="Admin Paintings" width="49%"/>
</p>
<p align="center">
  <img src="design/screenshots/AdminPaintingForm.png" alt="Admin Painting Form" width="49%"/>
  <img src="design/screenshots/AdminInquiries.png" alt="Admin Inquiries" width="49%"/>
</p>

> Jonli saytni to'liq ko'rish uchun: **[art-qala.vercel.app](https://art-qala.vercel.app)**

---

## Texnologik Stack

- **Frontend**: [Next.js 16](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/)
- **Shriftlar**: Google Fonts (`Cormorant Garamond` & `Work Sans`)
- **Backend & Database**: [Prisma ORM](https://www.prisma.io/) + SQLite (lokal test) / PostgreSQL (production, Neon)
- **Ikonkalar**: [Lucide React](https://lucide.dev/)
- **Xavfsizlik**: `bcryptjs` parollarni shifrlash va HMAC-SHA256 imzolangan sessiya kukilari
- **Hosting**: [Vercel](https://vercel.com/)

---

## Lokal O'rnatish va Ishga Tushirish

### 1. Repositoryni yuklab oling va paketlarni o'rnating
```bash
git clone https://github.com/zemeisteer/ArtQala.git
cd ArtQala
npm install
```

### 2. Muhit o'zgaruvchilarini sozlang
`.env.example` faylidan nusxa oling:
```bash
cp .env.example .env
```

### 3. Ma'lumotlar bazasini yarating va to'ldiring
```bash
# Bazani yaratish (dev.db)
npx prisma db push

# Dastlabki 8 ta asar, rassomlar, kategoriyalar va so'rovlarni yuklash
npm run seed
```

### 4. Dasturni ishga tushiring
```bash
npm run dev
```
Brauzerda oching: [http://localhost:3000](http://localhost:3000)

---

## Dastlabki Hisoblar (Test Uchun)

> ⚠️ Bu login ma'lumotlari faqat **lokal demo/test** muhiti uchun. Production'da albatta o'zgartiring.

- **Admin Paneli**:
  - URL: [http://localhost:3000/admin](http://localhost:3000/admin)
  - Email: `admin@artqala.uz`
  - Parol: `admin123`
- **Mijoz Demo Hisobi**:
  - Email: `emily.carter@example.com`
  - Parol: `password123`

---

## Vercel'ga Joylashtirish (Deploy)

1. O'zgarishlarni GitHub'ga yuboring:
   ```bash
   git add .
   git commit -m "feat: your changes"
   git push origin main
   ```
2. [Vercel](https://vercel.com/) platformasiga kiring va loyihani import qiling.
3. Environment variables bo'limiga quyidagilarni kiriting:
   - `DATABASE_URL`: PostgreSQL ulanish manzili (masalan [Neon](https://neon.tech/) yoki Vercel Postgres)
   - `NEXTAUTH_SECRET`: Istalgan maxfiy kalit
   - `NEXTAUTH_URL`: Sizning Vercel domeningiz (masalan `https://art-qala.vercel.app`)
4. **Deploy** tugmasini bosing!

To'liq birinchi marta sozlash bo'yicha qo'llanma uchun: [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## Litsenziya

Bu — "Art Qala" galereyasi uchun buyurtma asosida ishlab chiqilgan proprietar (yopiq) loyiha. Barcha huquqlar himoyalangan © 2026.
