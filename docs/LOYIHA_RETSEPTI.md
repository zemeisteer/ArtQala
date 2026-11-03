# Loyiha retsepti — Art Qala tajribasidan

> **Bu fayl nima?** Art Qala (artqala.com) saytini qurishda ishlatilgan barcha texnologiyalar, xizmatlar,
> xavfsizlik choralari, kirish (login) tizimi va yo'l-yo'lakay topilgan xatolar hamda ularning yechimlari.
> Yangi loyiha boshlaganda shu faylni AI'ga bering — u shu tajribani hisobga olib quradi va o'sha xatolarni
> takrorlamaydi.
>
> Faylda **hech qanday parol, kalit yoki maxfiy qiymat yo'q** — faqat nomlar va qoidalar. Haqiqiy qiymatlar
> faqat Vercel / GitHub sozlamalarida turadi.

---

## 0. AI uchun ko'rsatma (Instructions for the AI)

Agar sen (AI) shu faylni yangi loyiha uchun olgan bo'lsang:

1. **Shu fayldagi qoidalar standart (default) hisoblanadi.** Yangi loyihaning o'z talablari (TZ) ular bilan
   ziddiyatga kirsa — TZ ustun. Art Qala'ga xos narsalarni (kartina, rassom, aksessuar, sertifikat…) yangi
   loyihaning o'z mavzusiga moslashtir, ko'r-ko'rona ko'chirma.
2. **5–8-bo'limlar (xavfsizlik, kirish, ma'lumotlar bazasi, tezlik) har qanday loyihaga majburiy.**
3. **13-bo'limdagi "xatolar va saboqlar"ni boshidan hisobga ol** — ular haqiqatda yuz bergan va vaqt
   yo'qotgan.
4. **Egasi dasturchi emas va o'zbek tilida yozadi.** Unga o'zbek tilida, oddiy so'zlar bilan, qisqa javob
   ber. Unga kerak bo'lgan ishni (Vercel'da sozlama, Neon'da SQL, DNS) aniq qadamlar bilan yoz.
5. Kod ichidagi izohlar va commit xabarlari ingliz tilida.

---

## 1. Texnologiyalar (stack) va nima uchun

| Nima | Nima uchun |
|---|---|
| **Next.js 16 (App Router) + React 19 + TypeScript** | Bitta loyihada ham sayt sahifalari, ham server API. Sahifalar serverda tayyorlanadi (SEO uchun muhim), kesh (ISR) bilan tez ochiladi. |
| **Tailwind CSS v4** | Dizaynni tez va bir xil uslubda yozish. |
| **Prisma ORM** | Ma'lumotlar bazasi bilan xavfsiz, turi tekshiriladigan ishlash; `schema.prisma` — bazaning yagona tavsifi. |
| **PostgreSQL — Neon** (serverless) | Bepul tarifi bor, Vercel bilan yaxshi ishlaydi. Mahalliy ishlash uchun SQLite yoki mahalliy Postgres. `@prisma/adapter-neon` (HTTP/WebSocket orqali ulanadi — ba'zi tarmoqlar 5432-portni to'sadi). |
| **Vercel** (hosting) | `main` branch'ga push qilinganda sayt o'zi yangilanadi (auto-deploy). Cron (rejali vazifalar), Blob (rasm saqlash), domen boshqaruvi. |
| **GitHub** | Kod saqlanadi; Actions orqali har kecha zaxira (backup). |
| **Vercel Blob** (yoki Cloudinary) | Yuklangan rasmlar va PDF'lar. |
| **sharp** | Yuklangan rasmni avtomatik to'g'rilash: burilishni (EXIF) tuzatish, o'lchamini kichraytirish, WebP'ga o'tkazish. |
| **next/image** | Har bir ekranga mos o'lchamdagi rasm, lazy-loading. |
| **Resend** | Email yuborish (tasdiqlash kodlari, javoblar, xabarnomalar). |
| **Upstash Redis** | Rate limit (urinishlarni cheklash) — barcha serverlar orasida umumiy. Tarjima keshi. |
| **Google Gemini** (`@google/genai`) | Avtomatik tarjima (UZ → EN/RU va boshqa tillar), saytdagi AI yordamchi, rasmdan tavsif yozish, "xonamga mos rasm" funksiyasi. |
| **Sentry** (`@sentry/nextjs`) | Saytdagi xatolarni avtomatik ushlab, xabar beradi (EU mintaqasi). |
| **Google Analytics 4** + Consent Mode | Tashriflar statistikasi; Yevropa uchun cookie roziligi. |
| **Telegram Bot API** | Adminga yangi so'rovlar haqida Telegram xabari, tugmalar bilan javob berish, kanalga yangi asarlarni joylash. |
| **bcryptjs** | Parollarni xavfsiz saqlash (hash). |
| **jose** | Imzolangan tokenlar bilan ishlash. |
| **libphonenumber-js** | Telefon raqamlarini davlatga qarab tekshirish va formatlash. |
| **framer-motion, lucide-react, recharts** | Animatsiya, ikonkalar, admin grafiklari. |
| **react-image-crop** | Rasm yuklashda kesish (kartina — erkin, rassom rasmi — doira). |
| **qrcode** | QR kodlar (devor yorliqlari, telefonda ochish). |

**Ataylab ishlatilmagan narsalar va nima uchun:**
- **NextAuth ishlatilmagan** — o'zimizning kichik, tushunarli auth tizimi yozilgan (6-bo'lim). Har bir qism nazoratda.
- **Native `<select>`, `<input type="date">`, `<input type="time">` ishlatilmaydi** — har brauzer/telefonda har xil ko'rinadi. O'rniga o'zimizning `FilterSelect`, `DatePicker`, `TimePicker` komponentlari.
- **CAPTCHA kalitlari ishlatilmagan** — botlardan himoya boshqa yo'l bilan (7-bo'lim).
- **Test to'plami (test suite) yo'q** — o'rniga har o'zgarishdan keyin `tsc --noEmit`, `npm run build` va jonli saytda tekshirish.

---

## 2. Tashqi xizmatlar va muhit o'zgaruvchilari (env)

Qiymatlar **hech qachon** kodga, chatga yoki GitHub'ga yozilmaydi — faqat Vercel → Settings → Environment
Variables'ga (va GitHub → Settings → Secrets'ga). Repo ochiq (public) bo'lishi mumkin, shuning uchun bu juda muhim.

| O'zgaruvchi | Nima uchun | Qayerdan olinadi |
|---|---|---|
| `DATABASE_URL` | Ma'lumotlar bazasi | Neon → Connect |
| `NEXTAUTH_SECRET` | Sessiya imzosi, OTP hash, TOTP shifrlash, boshqa imzolar uchun asosiy sir. **Bo'lmasa production ishga tushmaydi.** | O'zing yaratasan (uzun tasodifiy satr) |
| `NEXTAUTH_URL` | Saytning asosiy manzili (`https://domen.com`) | — |
| `NEXT_PUBLIC_SITE_URL` | SEO manzillari (canonical, sitemap) uchun alohida manzil; bo'lmasa `NEXTAUTH_URL` ishlatiladi | — |
| `ADMIN_PASSWORD` | Birinchi admin paroli (seed uchun) | O'zing |
| `ADMIN_ACCESS_KEY` | (ixtiyoriy) Admin panelni maxfiy havola ortiga yashirish | O'zing yaratasan |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Email yuborish; jo'natuvchi tasdiqlangan domendan bo'lishi shart | resend.com |
| `GEMINI_API_KEY`, `GEMINI_TEXT_MODEL`, `GEMINI_IMAGE_MODEL`, `GEMINI_TRANSLATE_FALLBACK_MODELS` | Tarjima va AI funksiyalar; zaxira modellar ro'yxati | aistudio.google.com |
| `GEMINI_ASSISTANT_API_KEY`, `GEMINI_ASSISTANT_MODEL` | Saytdagi AI chat (alohida kalit — kvotasi tarjimalar bilan to'qnashmasin) | aistudio.google.com |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | "Google bilan kirish" | Google Cloud Console → OAuth |
| `GOOGLE_PLACES_API_KEY`, `GOOGLE_PLACE_ID` | (ixtiyoriy) Google Maps sharhlarini saytda ko'rsatish | Google Cloud Console |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Rate limit va kesh | upstash.com |
| `BLOB_READ_WRITE_TOKEN` | Rasm/PDF saqlash | Vercel → Storage → Blob |
| `CLOUDINARY_*` | (muqobil) rasm saqlash | cloudinary.com |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | Xatolarni kuzatish; token — source map'lar uchun | sentry.io |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics | analytics.google.com |
| `TELEGRAM_BOT_TOKEN` | Admin xabarnomalari | Telegram @BotFather |
| `CRON_SECRET` | Vercel Cron so'rovlarini himoyalash | O'zing yaratasan |
| `INDEXNOW_KEY` | (ixtiyoriy) Bing/ChatGPT qidiruviga o'zgarishni darhol bildirish | O'zing |

**GitHub Secrets** (zaxira uchun): `DATABASE_URL` (Neon'ning **direct**, pooler bo'lmagan manzili),
`BACKUP_PASSPHRASE`, `BLOB_READ_WRITE_TOKEN`.

**Muhim:** Vercel'da env qo'shilgandan yoki o'zgartirilgandan keyin **Redeploy** qilish kerak — ba'zi qiymatlar
build paytida o'qiladi.

**Tasodifiy sir yaratish (Windows PowerShell):**
```powershell
$b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); ($b | % { $_.ToString('x2') }) -join ''
```

---

## 3. Loyiha tuzilishi

```
prisma/schema.prisma        bazaning yagona tavsifi (migrations papkasi yo'q, "db push" uslubi)
prisma/seed.ts              boshlang'ich ma'lumotlar (admin, kategoriyalar...)
src/middleware.ts           til yo'naltirish, eski domendan yo'naltirish, admin himoyasi
src/app/[lang]/...          ommaviy sahifalar, har bir til uchun (en — prefikssiz, /ru, /uz ...)
src/app/[lang]/layout.tsx   ommaviy saytning ROOT layout'i (<html lang> shu yerda)
src/app/admin/...           admin panel (o'z root layout'i bilan)
src/app/api/...             server API (auth, inquiries, admin/*, cron, upload...)
src/components/             umumiy komponentlar (FilterSelect, DatePicker, PaintingCard...)
src/lib/                    biznes mantiq: auth, rateLimit, email, otp, totp, discounts, i18n...
src/lib/i18n/               tillar: routing.ts, translations.ts, seo.ts
docs/                       hujjatlar (shu fayl ham)
.github/workflows/          kechki zaxira
vercel.json                 cron jadvali
CLAUDE.md                   AI uchun loyiha qoidalari (har yangi loyihada yarat va yangilab bor)
```

**Har bir yangi loyihada `CLAUDE.md` yarat va to'ldirib bor** — buyruqlar, arxitektura, "buni hech qachon
qilma" qoidalari. Keyingi AI sessiyalari uni o'qib, avvalgi qarorlarni buzmaydi.

---

## 4. Asosiy funksiyalar (Art Qala misolida)

**Ommaviy sayt:** bosh sahifa (tasodifiy tanlangan asarlar karuseli), galereya (filtrlar: tur, mavzu, rassom,
yil, o'lcham, narx; qidiruv; saralash; sahifalash 60 tadan; filtrlar URL'da saqlanadi), asar sahifasi (bir nechta
rasm, kattalashtirish, "devorda ko'rish" va AR, yetkazib berish narxi kalkulyatori, so'rov formasi, sharhlar,
o'xshash asarlar), rassomlar (sahifalash, bio, mukofotlar, portfolio PDF), xizmatlar (mural, keramika, buyurtma),
aloqa, sharhlar, maxfiylik siyosati, shartlar, yetkazib berish va to'lov, sovg'a sertifikatlari, master-klasslar,
hikoyalar, haqiqiylik sertifikati (QR bilan), shaxsiy kabinet, istaklar ro'yxati (wishlist), 8 til, 4 valyuta,
WhatsApp tugmasi, AI chat yordamchi, cookie roziligi oynasi.

**Admin panel:** dashboard (daromad, tashriflar, ko'rishlar, so'rovlar; tashrifchilar davlati/shahri/manbasi/
qurilmasi), kartinalar (rasm yuklash + kesish, tartiblash, AI tavsif yozuvchi, chegirma, sotilgan narx, QR
yorliqlar), rassomlar (doira rasm, PDF), kategoriyalar (ota/bola daraxti), chegirmalar (4 darajali ustuvorlik),
aksessuarlar (o'lchamga qarab narx, mahsulot turiga bog'lash), so'rovlar (bitta so'rovda bir nechta asar), xizmat
so'rovlari, xabarlar, AI chatlar tarixi, mijozlar, sharhlarni tasdiqlash, xodimlar va kirishlar tarixi,
sozlamalar (manzillar ro'yxati, telefonlar, ijtimoiy tarmoqlar, ish vaqti, valyuta kurslari, Telegram), savdo
hisoboti (.xlsx), telefon versiyasi.

---

## 5. Ma'lumotlar bazasi qoidalari (MAJBURIY)

1. **Production bazaga hech qachon `prisma db push --force-reset` qilma** — u butun bazani o'chiradi.
2. **Jadvalga majburiy (required) ustun qo'shsang va jadvalda ma'lumot bo'lsa**, `db push` rad etadi. To'g'ri yo'l:
   ustunni avval ixtiyoriy (`?`) qil → push → ma'lumotni `UPDATE` bilan to'ldir → keyin majburiy qil → yana push.
3. **Neon'ga tashqaridan ulanishda pooler (`-pooler`) emas, direct manzildan foydalan** — pooler bu loyihada
   Vercel tarmog'idan tashqaridan qayta-qayta ulanmadi.
4. **Egasi bilan ishlash tartibi:** sxema o'zgarsa, SQL'ni `npx prisma migrate diff --from-schema-datamodel eski.prisma --to-schema-datamodel prisma/schema.prisma --script`
   bilan yarat, egasiga ber, u **Neon → SQL Editor**'da ishga tushiradi. Shu paytgacha kod **alohida branch'da**
   turadi — chunki yangi ustunni so'raydigan kod bazadan oldin saytga chiqsa, sayt buziladi.
   Egasi "done" desa → `main`ga merge → deploy → jonli saytda tekshir.
5. **Har kecha shifrlangan zaxira** (GitHub Actions): `pg_dump` (versiyasi server versiyasiga mos bo'lishi shart)
   + barcha yuklangan rasmlar → `tar.gz.gpg` (`BACKUP_PASSPHRASE` bilan) → 30 kun saqlanadi. Repo ochiq bo'lgani
   uchun shifrlash shart. Neon'da qo'shimcha snapshot/point-in-time restore ham yoqilgan.
6. **Ichki maydonlarni ommaviy saytdan yashir**: masalan `sold_price` (haqiqiy sotilgan narx) Prisma client'da
   global `omit` qilingan — admin so'rovlari uni alohida so'raydi.
7. **Bepul Neon kompyut limiti**: har bir so'rov bazani "uyg'otadi". Shuning uchun ommaviy sahifalar uzoq
   keshlanadi va faqat ma'lumot o'zgarganda yangilanadi (8-bo'lim).

---

## 6. Kirish (login) tizimi — qanday qurilgan

### 6.1. Sessiya (barcha foydalanuvchilar)
- Kirgandan keyin **imzolangan token** cookie'ga yoziladi: `base64url(payload).HMAC-SHA256(payload, NEXTAUTH_SECRET)`.
- Cookie: `httpOnly` (JavaScript o'qiy olmaydi), `secure` (faqat HTTPS), `sameSite: lax` (boshqa saytdan
  yuboriladigan so'rovlarga qarshi), `path: /`.
- Token ichida `iat` (yaratilgan vaqt) bor; muddat **token ichidan** tekshiriladi (cookie muddati faqat brauzerga
  maslahat): **mijozlar 30 kun, adminlar 12 soat**.
- Imzo **timing-safe** solishtiriladi (`crypto.timingSafeEqual`; Edge'da qo'lda yozilgan doimiy-vaqtli
  solishtirish) — aks holda javob vaqtidan imzoni bayt-bayt topish mumkin.
- **`NEXTAUTH_SECRET` bo'lmasa, production ishga tushmaydi** (kodda zaxira sir bor, lekin u ochiq — u bilan
  istalgan kishi admin tokenini soxtalashtirishi mumkin edi).
- Middleware (Edge runtime) imzoni Web Crypto bilan qayta tekshiradi va `/admin/*`, `/api/admin/*` ni himoyalaydi.

### 6.2. Ro'yxatdan o'tish va email tasdiqlash
- Email + parol (parol **bcrypt** bilan hash qilinadi, hech qachon ochiq saqlanmaydi).
- Emailga **6 xonali kod** (OTP) yuboriladi: **3 daqiqa** amal qiladi, faqat eng oxirgi kod ishlaydi.
- Kod bazada **ochiq emas, HMAC (sir bilan) ko'rinishida** saqlanadi — baza o'g'irlansa ham kod ishlatib bo'lmaydi.
  Oddiy SHA-256 yetmaydi: 6 xonali kodni million urinishda topish mumkin.
- Kod qayta yuborish: **bir emailga soatiga 5 ta** (birovning pochtasini kod bilan to'ldirib tashlashning oldini olish).
- Tasdiqlanmagan akkaunt bilan kirmoqchi bo'lsa — yangi kod yuboriladi va tasdiqlash sahifasiga yo'naltiriladi.

### 6.3. Parolni tiklash
- Emailga kod → yangi parol. Kodlar HMAC'langan, 3 daqiqa, urinishlar cheklangan.
- Admin parolni tiklasa, uning **boshqa barcha qurilmalardagi sessiyalari tugatiladi**.

### 6.4. Google bilan kirish (OAuth)
- Google Cloud Console'da OAuth client; redirect URI: `<sayt>/api/auth/oauth/google/callback`.
- Kirgandan keyingi qaytish manzili `safeRedirectTarget()` orqali tekshiriladi — faqat o'z saytimizdagi nisbiy
  yo'l (`/account`), `https://boshqa-sayt` yoki `//boshqa-sayt` rad etiladi (open redirect / fishingga qarshi).
- Apple bilan kirish olib tashlangan (egasining qarori).

### 6.5. Admin kirishi — qo'shimcha himoya qatlamlari
1. **Rol**: faqat `role = ADMIN` foydalanuvchi admin panelga kiradi; Google orqali kirgan mijoz admin bo'lmaydi.
2. **Har bir admin kirishi bazada qayd qilinadi** (`AdminSession`: kim, qurilma/brauzer, IP, shahar/davlat,
   kirgan vaqti, oxirgi faolligi). Admin tokeni ichida shu yozuvning `sid`'i bor; yozuv tugatilsa, token darhol
   ishlamay qoladi.
   - Admin → Xodimlar sahifasida ro'yxat va **"Chiqarib yuborish"**, **"Boshqa hammasini chiqarish"** tugmalari.
   - Chiqish (logout) yozuvni tugatadi — nusxalab olingan cookie ham ishlamaydi.
   - Middleware bazaga ulana olmagani uchun admin sahifalari uchun `/api/auth/session-check`'dan so'raydi
     (tekshiruv o'zi buzilsa — imzo bo'yicha o'tkazadi, API'lar baribir o'zi tekshiradi; shunday qilib hamma admin
     birdaniga qulflanib qolmaydi).
3. **Ikki bosqichli kirish (2FA, TOTP)**: Google Authenticator va shu kabilar. Sir bazada **AES-256-GCM bilan
   shifrlangan** (kalit `NEXTAUTH_SECRET`dan). 2FA yoqilgan akkaunt Google, parol tiklash yoki email kodi bilan
   admin panelga kira olmaydi — faqat parol + kod bilan. Telefon yo'qolsa: `UPDATE "User" SET "totp_secret" = NULL WHERE "email" = '…';`
4. **Yashirin admin panel** (`ADMIN_ACCESS_KEY`): kalit qo'yilsa, `/admin` va kirish sahifasi maxfiy havolani
   (`/admin/login?key=…`) bir marta ochmagan har qanday qurilmaga oddiy **404** ko'rsatadi. Havolani ochgan qurilma
   180 kun eslab qolinadi (cookie'da kalitning o'zi emas, uning imzolangan hash'i). Havolasiz qurilmadan parol
   to'g'ri bo'lsa ham admin kira olmaydi (javob "noto'g'ri parol" kabi). Kalitni almashtirish = barcha qurilmalar
   qayta havola ochishi kerak.
5. **Birinchi kirishda parolni almashtirish majburiy** (`must_change_password`) — yangi xodim admin bergan vaqtinchalik
   parolni saqlab qolmaydi. Parol almashtirilganda boshqa qurilmalardagi sessiyalar tugatiladi.
6. **Oxirgi adminni o'chirib bo'lmaydi.**
7. **Admin sahifalari qidiruv tizimlaridan yashirilgan** (`noindex, nofollow` + robots.txt'da `Disallow: /admin/`).

### 6.6. Urinishlarni cheklash (rate limit) — Upstash Redis bilan
| Joy | Cheklov |
|---|---|
| Kirish | 3 qatlam: (IP+email) 5 / 15 daq., IP 20 / 15 daq., email 10 / 15 daq. Muvaffaqiyatli kirishda IP limiti tiklanmaydi. |
| Ro'yxatdan o'tish, kod tasdiqlash, parol tiklash | 5 / 15 daq. |
| Kodni qayta yuborish | IP bo'yicha 10 / 15 daq. + email bo'yicha soatiga 5 ta |
| Aloqa formasi, so'rovlar | 5 / 15 daq. |
| Sharhlar | 3 / soat |
| AI chat | IP bo'yicha 30 / soat, bitta suhbatda 40 ta xabar, xabar ≤ 800 belgi |
| Admin AI (tarjima, tavsif, rasm) | admin bo'yicha 20–30 / 15 daq. |

Upstash bo'lmasa xotiradagi `Map` ishlatiladi — mahalliy ishlash uchun yetadi, lekin Vercel'da har server o'zicha
sanaydi. **Production'da Upstash shart.**

---

## 7. Xavfsizlik — tekshiruv ro'yxati (har yangi loyihada)

**Sirlar**
- [ ] Hech qanday kalit/parol kodda, `.env.example`'da (faqat nomi), chatda, commit'da yo'q.
- [ ] Ekranda ko'ringan kalit (skrinshotda) darhol yangisiga almashtiriladi.
- [ ] Repo ochiq bo'lsa — zaxiralar shifrlangan.

**Kiritilgan ma'lumotni tekshirish**
- [ ] Email, telefon, matn uzunligi serverda tekshiriladi (klientga ishonilmaydi).
- [ ] **Narxlar har doim serverda bazadan qayta hisoblanadi** — klient yuborgan narxga hech qachon ishonilmaydi
      (aksessuar narxi, chegirma, jami summa).
- [ ] Klient yuborgan "qo'shimcha"lar (aksessuarlar) serverda ham ruxsat etilgan ro'yxatga solishtiriladi.
- [ ] Emaildagi foydalanuvchi matni `escapeHtml()` qilinadi (ism maydoniga havola yozib, bizning domendan fishing xat yuborishning oldini olish).
- [ ] Qaytish manzillari (redirect) faqat o'z saytimiz ichida.

**Fayl yuklash**
- [ ] Faqat admin yuklay oladi.
- [ ] MIME turi ro'yxat bo'yicha; **SVG taqiqlangan** (ichida `<script>` bo'lishi mumkin va o'zgarishsiz saqlanardi).
- [ ] Rasmlar `sharp` bilan qayta kodlanadi (WebP, 1800px) — fayl ichidagi yashirin narsalar ham yo'qoladi.
- [ ] PDF: haqiqiy PDF ekanligi birinchi baytlaridan (`%PDF-`) tekshiriladi, ≤ 4 MB (Vercel 4,5 MB'dan katta so'rovni qabul qilmaydi).

**SSRF (server boshqa saytdan narsa yuklab olganda)**
- [ ] Server faqat ruxsat etilgan hostlardan yuklaydi (o'z Blob/Cloudinary'miz, Google Maps) — har bir yo'naltirish
      qadami ham qayta tekshiriladi. Aks holda admin formasi orqali ichki tarmoq manzillarini so'ratish mumkin bo'lardi.

**Botlar va spam (CAPTCHA'siz)**
- [ ] Ommaviy formalar: imzolangan "forma ochilgan vaqt" tokeni (skript to'g'ridan-to'g'ri API'ga yuborsa, tokeni yo'q;
      odam formani 2-3 soniyada to'ldira olmaydi), yashirin "honeypot" maydon (faqat botlar to'ldiradi), havola taqiqi,
      IP bo'yicha limit. Sharhlar baribir admin tasdig'idan keyin chiqadi.

**HTTP sarlavhalar** (`next.config.ts`)
- [ ] `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`,
      `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (faqat kerakli: kamera — faqat AR uchun).
- [ ] HTTPS va `www` → asosiy domen yo'naltirish Vercel darajasida; eski `*.vercel.app` → asosiy domen (308).

**Integratsiyalar**
- [ ] Cron endpoint'lar `Authorization: Bearer CRON_SECRET` ni talab qiladi.
- [ ] Telegram webhook — maxfiy sarlavha bilan; chat faqat admin yaratgan **imzolangan 15 daqiqalik havola** orqali
      bog'lanadi ("botga kim yozsa, o'sha admin" — xavfli, olib tashlangan).
- [ ] Email obunadan chiqish havolalari, sovg'a sertifikati havolalari — imzolangan.
- [ ] Admin xabarnomasi yuborilmasa ham mijozning so'rovi muvaffaqiyatli saqlanadi (best-effort, lekin `await` bilan).

**Maxfiylik (privacy)**
- [ ] O'zimizning tashriflar statistikasi: **cookie yo'q, IP saqlanmaydi** — har kuni o'zgaradigan anonim hash
      (bir kishi bir kunda bitta hisoblanadi, boshqa kuni tanilmaydi). Botlar user-agent bo'yicha chiqarib tashlanadi.
- [ ] Google Analytics: **Yevropa/UK/Shveytsariya mehmonlari uchun rozilik so'ralmaguncha cookie yo'q** (Consent Mode,
      mintaqaga bog'langan). Footer'da "Cookie sozlamalari" havolasi.
- [ ] Foydalanuvchi o'z akkauntini o'zi o'chira oladi (email + parolni qayta yozib); so'rovlari galereya hujjati
      sifatida qoladi, lekin unga bog'lanishi uziladi.
- [ ] Maxfiylik siyosatida haqiqiy ishlatilgan barcha xizmatlar sanab o'tilgan (hosting, baza, email, rasm, AI, analitika,
      Sentry, Telegram) — yangi xizmat qo'shilsa siyosat ham yangilanadi.
- [ ] Sentry'ga shaxsiy ma'lumot (IP va h.k.) yuborilmaydi.
- [ ] **Hech qachon o'ylab topilgan aloqa ma'lumotlari** (email, telefon, manzil) saytga qo'yilmaydi — faqat egasi
      Sozlamalarda kiritgan haqiqiy qiymatlar. Bazadagi "namuna" telefon (`+998 66 233 44 55` kabi) hech qachon chiqmaydi.

---

## 8. Tezlik (performance) qoidalari

1. **Ommaviy sahifalar keshlanadi (ISR)**: `export const revalidate = …`. Art Qala'da kesh 1 kun, lekin admin
   biror narsani saqlasa (Prisma hook orqali) **butun sayt keshi darhol yangilanadi** — tezlik ham, yangilik ham.
2. **Dinamik segmentli sahifalar** (`/gallery/[id]`) uchun **`generateStaticParams() { return [] }`** yoz — aks holda
   `revalidate` ishlamaydi va har tashrifda baza so'raladi.
3. **Statik sahifada `useSearchParams()` ishlatma** — u ostidagi butun qismni server render'dan chiqarib yuboradi
   (Art Qala'da galereya HTML'ida birorta asar yo'q edi). URL parametrlarini mount'dan keyin `window.location.search`dan o'qi.
4. **Bir xil so'rovlarni bir render ichida takrorlama**: React `cache()` (masalan, `generateMetadata` va sahifa ikkalasi
   bitta asarni so'raydi).
5. **Ro'yxat sahifalariga faqat kerakli maydonlarni yubor** (3 tildagi uzun tavsiflar va rassom bio'sini emas).
6. **Rasmlar**: har bir `fill` rasmga **`sizes`** yoz (bo'lmasa telefon 40px'lik ikonka uchun 3840px rasm yuklaydi);
   `priority` faqat ekranning yuqorisidagi 1–2 rasmga (logo, bosh slayd, asosiy rasm); ustma-ust turgan karusel
   slaydlarini birdaniga render qilma — keyingisini o'z navbati yaqinlashganda qo'sh; `images.minimumCacheTTL` uzun
   (yuklangan fayl nomi o'zgarmaydi).
7. **Bepul tariflar chegarasi**: Vercel Hobby tarifi CPU limitida saytni to'xtatib qo'ydi → Pro'ga o'tildi va
   "ko'rinmas" yozuvlar (ko'rishlar hisoblagichi, kurslar, tarjimalar) butun sayt keshini o'chirmaydigan qilindi.
   Har bir yangi fon yozuvida shuni hisobga ol. Middleware ommaviy API va statik fayllarda ishlamaydi.
8. **Sentry'dagi "p95 12 soniya"** odatda brauzerdagi to'liq yuklanish vaqti (rasmlar) — server javobi emas.
   Avval o'lcha: `curl -w "%{time_starttransfer}"`, `x-vercel-cache` sarlavhasi (HIT/STALE/MISS).

---

## 9. Ko'p tillilik va SEO

**Tillar**
- Har bir til — haqiqiy, server tayyorlagan, indekslanadigan sahifa: `app/[lang]/...`. Ingliz tili prefikssiz (`/gallery`),
  boshqalari `/ru/...`, `/uz/...` (Art Qala'da 8 til). Middleware prefikssiz manzilni ichkarida `/en/...`ga yo'naltiradi;
  `/en/...` → prefikssiz (308); tanlangan til cookie'da eslab qolinadi.
- **`<html lang>` har bir tilda to'g'ri**: buning uchun `app/layout.tsx` yo'q — ikkita root layout:
  `app/[lang]/layout.tsx` (sayt) va `app/admin/layout.tsx` (admin), umumiy `SiteDocument` komponenti bilan.
  Bu sahifalarni statik qoldiradi (middleware orqali tilni o'tkazish butun saytni dinamik qilib qo'yardi).
  Noma'lum manzillar uchun `app/[lang]/[...rest]/page.tsx` → `notFound()`.
- Til almashtirish o'sha sahifaning boshqa tildagi versiyasiga o'tadi va **scroll joyida qoladi** (`router.push(url, { scroll: false })`).
- Admin formalarida UZ maydon to'ldirilganda EN/RU **avtomatik tarjima** (Gemini; admin o'zi yozgan maydonni
  hech qachon ustidan yozmaydi). Tarjima ishlamasa admin ko'radigan xabar chiqadi (jim yutib yuborilmaydi).
  Tarjima kalitiga maydon konteksti beriladi ("bu kartina nomi", "bu texnika") — sifat ancha yaxshilanadi.
  Natija 30 kun keshlanadi.

**SEO**
- Bitta joydan sayt manzili: `src/lib/siteUrl.ts` (`NEXT_PUBLIC_SITE_URL` → `NEXTAUTH_URL` → standart domen).
- Har sahifada: o'ziga ishora qiluvchi **canonical**, barcha tillar uchun **hreflang** + `x-default`, `og:url`.
- `sitemap.xml`: faqat yakuniy (yo'naltirilmaydigan) manzillar, har biri boshqa til versiyalari bilan, haqiqiy
  `lastmod` (har doim "hozir" emas), soatiga bir marta yangilanadi.
- `robots.txt`: admin va shaxsiy sahifalar yopiq; AI crawler'lar nomma-nom ruxsat etilgan.
- JSON-LD: `ArtGallery` (manzil, ish vaqti, koordinatalar, narx oralig'i, ijtimoiy tarmoqlar — **faqat haqiqiy
  qiymat bo'lsa**), `Product` + `VisualArtwork` (asar sahifasi), `BreadcrumbList` va `ItemList` (har tilning o'z
  manzillari bilan), `FAQPage` (yetkazib berish).
- Bosh sahifa H1'ida kalit so'z ("Art Gallery in Tashkent") — kichik yozuv sifatida, bitta `<h1>` qoladi.
- `/llms.txt` va `/llms-full.txt` — AI qidiruvlar (ChatGPT, Claude, Perplexity) uchun saytning Markdown xulosasi,
  bazadan quriladi.
- IndexNow — admin saqlaganda Bing/ChatGPT qidiruviga darhol xabar.
- Google Search Console (DNS TXT orqali tasdiqlash + sitemap yuborish), Google Business Profile.
- Search Console'dagi **"Page with redirect"** — odatda to'g'ri yo'naltirishlar (http, www, /en/, eski domen); xato emas.

---

## 10. Integratsiyalar — sozlash bo'yicha saboqlar

**Resend (email)**
- `onboarding@resend.dev` faqat Resend akkaunt egasiga xat yubora oladi — haqiqiy mijozlarga yuborish uchun
  **o'z domeningni tasdiqla** (DNS: SPF, DKIM, DMARC yozuvlari), keyin `RESEND_FROM_EMAIL`.
- Jo'natuvchi nomi: "noreply" emas, galereya nomi; `reply_to` — galereya pochtasi (mijoz "Javob berish"ni bossa
  egasiga boradi).
- Spamga tushmaslik uchun: tasdiqlangan domen, DMARC, ochiq-oydin matn, tracking'ni o'chirish.
- Domen pochtasi (`gallery@domen.com`) uchun yo'naltirish (forwarding) va Gmail'dan "shu manzil nomidan yuborish" (SMTP).

**Gemini (AI)**
- **Bepul tarif juda kichik: modelga kuniga ~20 so'rov.** Haqiqiy foydalanish uchun billing yoqish shart
  (oyiga bir necha dollar). Bepul tarifda Google ma'lumotdan o'qitish uchun foydalanishi mumkin.
- Tarjima uchun bir nechta zaxira modellar; 429/503 bergan model vaqtincha chetlab o'tiladi.
- Saytdagi AI chat uchun **alohida kalit** — tarjimalar bilan kvota talashmasin. Kalit yo'q bo'lsa chat tugmasi
  umuman ko'rinmaydi (buzilgan chat ko'rsatilmaydi).
- AI chat faqat bazadagi faktlardan javob beradi; narx kelishmaydi, bron qilmaydi (so'rov/WhatsApp'ga yo'naltiradi),
  shaxsiy ma'lumot so'ramaydi, qoidani o'zgartiruvchi ko'rsatmalarni e'tiborsiz qoldiradi; suhbatlar admin panelda ko'rinadi.
- Gemini 3 bilan "tool calling"da modelning javobini **o'zgartirmasdan** qaytarib yuborish kerak (`thought_signature`
  yo'qolsa 400 xato).

**Telegram** — 6.5 va 7-bo'limlarga qara. Token faqat env'da.

**Google OAuth** — "Authorized redirect URI" aniq mos bo'lishi kerak; consent screen'ni "Production"ga chiqarish.

**Sentry** — `withSentryConfig` `@sentry/nextjs/config`dan import qilinadi; reklama bloklovchilar to'smasligi uchun
`tunnelRoute: "/monitoring"`; EU mintaqasi; source map'lar uchun `SENTRY_AUTH_TOKEN` (ixtiyoriy).

**Google Analytics** — Consent Mode mintaqaga bog'langan; lead (so'rov) voqeasi `generate_lead` — birinchi
so'rovdan keyin "Key event" deb belgilash.

**Vercel Cron** — `vercel.json`'da jadval; har kuni: sharh eslatmalari, narx tushganda xabar, tarjimalarni to'ldirish,
dushanba — haftalik hisobot.

**Zaxira (GitHub Actions)** — 5-bo'lim. Birinchi marta qo'lda "Run workflow" bilan sinab ko'r.

---

## 11. UI va kod qoidalari

- Native `<select>` / date / time input'lar yo'q — `FilterSelect`, `DatePicker`, `TimePicker`.
- Logotip fayliga **hech qachon** tegilmaydi (rangini o'zgartirish, qayta chizish) — kerak bo'lsa egasidan so'raladi.
- Admin panel telefonda ishlashi kerak: menyu yashirin "drawer", ☰ tugmasi; chiqish tugmasi doim ko'rinadi.
- Admin tilini almashtirish butun admin panelda ishlashi kerak (Art Qala'da ko'p admin sahifalari faqat o'zbekcha
  yozilgan edi — yangi loyihada boshidan tarjima kalitlari bilan yoz).
- Sonlar va sanalarni ko'rsatishda: kategoriya daraxtida ota-kategoriya soni bolalarniki bilan qo'shib ko'rsatiladi;
  dashboard'da ota va bola alohida.
- Ro'yxatlar (manzillar, telefonlar, ijtimoiy tarmoqlar) — qat'iy maydonlar emas, **ochiq ro'yxat** (admin istagancha
  qo'shadi/o'chiradi); eski qat'iy maydonlarga zaxira (fallback) bilan.
- Har bir yangi sahifada: loading holati, bo'sh holat ("Hali ma'lumot yo'q"), xato xabari.
- Narxlarni yaxlitlashda — yuqoriga, chiroyli songa.
- Hech qachon klient tomonda maxfiy narsa yoki sirli hisob-kitob yo'q.

---

## 12. AI bilan ishlash tartibi (workflow)

1. Har bir o'zgarish — alohida commit, tushunarli xabar bilan.
2. **Bazani o'zgartiradigan ish → alohida branch**, egasiga SQL, u "done" deydi → merge.
3. Bazani o'zgartirmaydigan kichik tuzatishlar → to'g'ridan-to'g'ri `main` (auto-deploy).
4. Har o'zgarishdan keyin: `npx tsc --noEmit`, `npm run build`, deploy'dan keyin **jonli saytda tekshirish**
   (`curl`, brauzer). Tekshirib bo'lmagan narsani "tekshirildi" dema — aniq ayt.
5. AI egasining nomidan **formalarni yubormaydi, xat jo'natmaydi, pul bilan bog'liq ish qilmaydi** — ruxsatsiz.
6. AI egasining parolini kiritmaydi; egasi kalit/parolni chatga yozmaydi — to'g'ridan-to'g'ri Vercel/GitHub'ga.
7. Katta ishni bulutdagi (cloud) sessiyaga berish mumkin — lekin u boshqa sessiyaga javob yoza olmaydi; natijani
   o'sha sessiyaning o'zida ko'rish kerak.
8. Egasining doimiy ko'rsatmalarini AI xotirasiga (memory) yoz — keyingi sessiyada qayta aytish shart bo'lmasin.

---

## 13. Xatolar va saboqlar (haqiqatda yuz bergan)

| Muammo | Sabab | Yechim |
|---|---|---|
| Galereya HTML'ida birorta asar yo'q, sekin ochiladi | Statik sahifada `useSearchParams()` → server render'dan chiqib ketgan | URL'ni mount'dan keyin o'qish |
| Asar sahifalari har safar bazadan | Dinamik segmentda `generateStaticParams` yo'q | `return []` qo'shish |
| Telefon kichik rasm uchun 3840px yuklaydi | `fill` rasmda `sizes` yo'q | Har biriga `sizes` |
| Bosh sahifada 5 slayd birdan yuklanadi | Ustma-ust slaydlar — hammasi "ekranda" | Faqat joriy + keyingisini render qilish |
| Rassom rasmi saytda chiqmaydi | Karta komponenti `photo`ni umuman ishlatmagan, faqat bosh harflar | Rasm bo'lsa — rasm |
| Ota kategoriyada "0 asar" | Asarlar bola-kategoriyaga bog'langan | Yig'indini ko'rsatish |
| `/ru` sahifalar Google uchun "ingliz" | Yagona root layout'da `lang="en"` | Har til uchun root layout |
| JSON-LD'da telefon `["+998…","+998…"]` | Telefonlar JSON ro'yxat, to'g'ridan-to'g'ri chiqarilgan | `parsePhones()[0]`; namuna raqamni chiqarmaslik |
| Til almashtirganda sahifa tepaga sakraydi | `router.push` standart scroll | `{ scroll: false }` |
| AI chat "kechirasiz" deydi | Gemini bepul kvota (20/kun) tugagan | Billing; alohida kalit |
| AI tool calling 400 | Gemini 3 `thought_signature` yo'qolgan | Model javobini o'zgartirmay qaytarish |
| Tarjima sifati yomon | Google Translate, kontekstsiz | Gemini birinchi, maydon konteksti, kesh |
| Admin ochiq havola orqali ko'rinadi | `/admin/login` hammaga ochiq | `ADMIN_ACCESS_KEY` + 2FA + sessiyalar |
| Chiqib ketgan admin cookie'si ishlayveradi | Faqat imzoga tayangan token | Bazadagi `AdminSession` + `sid` |
| Middleware'da bazaga ulanib bo'lmaydi | Edge runtime | Ichki `/api/auth/session-check` |
| `'use client'` fayldan eksport qilingan konstanta serverda ishlamaydi | Klient moduli reference bo'lib keladi | Umumiy konstantani alohida faylga |
| `db push` rad etadi | Majburiy ustun + mavjud qatorlar | Avval ixtiyoriy → to'ldirish → majburiy |
| Neon'ga ulanib bo'lmaydi | `-pooler` manzil | Direct manzil |
| Zaxira ishlamaydi | Secret noto'g'ri nusxalangan / pooler / pg_dump versiyasi | Tekshiruv qadami, direct manzil, versiyani moslash |
| Email spamga tushadi / mijozga bormaydi | `onboarding@resend.dev`, domen tasdiqlanmagan | Domen + SPF/DKIM/DMARC |
| Env qo'shildi, lekin ishlamayapti | Build paytida o'qiladi | Redeploy |
| Vercel saytni to'xtatdi | Hobby CPU limiti, har yozuv keshni o'chirgan | Pro + "ko'rinmas" yozuvlar keshga tegmaydi |
| Kesilgan/burilgan rasm noto'g'ri | Kesish oynasida o'lcham/burilish hisobi | Canvas'da transformatsiya, EXIF |
| Telegram'ga istalgan odam ulanishi mumkin edi | "Kim yozsa — o'sha" | Imzolangan 15 daqiqalik havola |
| Sharhlarga spam | CAPTCHA yo'q | Forma tokeni + honeypot + limit + tasdiq |
| Bitta mijozning 4 ta asari 4 ta so'rov bo'lib keladi | Har asar — alohida qator | Bitta `Inquiry` + `InquiryItem`lar |
| Mijoz kartinaga "futlyar" tanlaydi | Aksessuar turga bog'lanmagan | `product_types` + server tekshiruvi + admin olib tashlay oladi |

---

## 14. Yangi loyihani boshlash — qadamlar

1. GitHub repo; `CLAUDE.md` va shu fayl (`docs/LOYIHA_RETSEPTI.md`) ni qo'y.
2. Next.js + TypeScript + Tailwind + Prisma; `schema.prisma`; mahalliy SQLite/Postgres; seed.
3. `src/lib/siteUrl.ts`, `auth.ts` (imzolangan sessiya), `rateLimit.ts`, `email.ts` (escapeHtml), `validation.ts`,
   `safeRedirect.ts`, middleware (til + admin himoyasi).
4. `[lang]` marshrutlash va ikkita root layout (sayt + admin) — boshidan.
5. Ro'yxatdan o'tish + email OTP + parol tiklash + (kerak bo'lsa) Google OAuth.
6. Admin: rol, `AdminSession`, birinchi kirishda parol almashtirish, 2FA, (ixtiyoriy) yashirin panel, telefon versiyasi.
7. Neon baza, Vercel loyiha, domen (www → asosiy), env'lar, Upstash, Resend (domen tasdiqlash), Blob.
8. Sentry, GA4 + cookie roziligi, maxfiylik siyosati (haqiqiy xizmatlar bilan), shartlar sahifasi.
9. SEO: canonical/hreflang/sitemap/robots/JSON-LD/llms.txt, Search Console, Google Business Profile.
10. Kechki shifrlangan zaxira (GitHub Actions) — birinchi kunidan.
11. Tezlik: ISR, `generateStaticParams`, `sizes`, `priority` faqat yuqoriga.
12. Har bosqichdan keyin: build, jonli tekshiruv, egasiga o'zbekcha qisqa hisobot.

---

## 15. `.env.example` namunasi (faqat nomlar)

```
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
NEXT_PUBLIC_SITE_URL=
ADMIN_PASSWORD=
ADMIN_ACCESS_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
GEMINI_API_KEY=
GEMINI_TEXT_MODEL=
GEMINI_IMAGE_MODEL=
GEMINI_TRANSLATE_FALLBACK_MODELS=
GEMINI_ASSISTANT_API_KEY=
GEMINI_ASSISTANT_MODEL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_PLACES_API_KEY=
GOOGLE_PLACE_ID=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
BLOB_READ_WRITE_TOKEN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
SENTRY_ORG=
SENTRY_PROJECT=
NEXT_PUBLIC_GA_MEASUREMENT_ID=
TELEGRAM_BOT_TOKEN=
CRON_SECRET=
INDEXNOW_KEY=
```

*Oxirgi yangilanish: 2026-yil noyabr. Art Qala loyihasidagi haqiqiy kod va tajribaga asoslangan.*
