# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Next.js dev server (Turbopack)
npm run build             # prisma generate && next build
npm run lint               # eslint

# Database (declarative — no prisma/migrations folder; schema changes go live via db push)
npx prisma db push         # sync schema.prisma -> DATABASE_URL's database
npx prisma generate        # regenerate the Prisma client after editing schema.prisma
npm run seed                # prisma/seed.ts — admin/demo users, categories, artists, paintings

# Local DB provider switch (schema.prisma's datasource provider + DATABASE_URL)
npm run db:sqlite          # local dev via SQLite (prisma/dev.db)
npm run db:postgres        # local dev via a local Postgres instance
```

No test suite exists in this repo.

`npx prisma db push` targets whatever `DATABASE_URL` currently resolves to — set it inline
(`DATABASE_URL="..." npx prisma db push`) rather than editing `.env` when pointing at production,
and always run it against the **direct** (non-pooler) Neon connection string, not the `-pooler`
one — the pooler has repeatedly failed to reach from outside Vercel's network in this project.
When a schema change adds a required column to a table that already has rows, `db push` refuses
outright (no interactive prompt) and offers only `--force-reset` — never use that, it drops the
whole database. Instead: make the new column optional, push, backfill data with a manual
`UPDATE` (Neon's web SQL Editor works when a direct `psql`/Prisma connection can't reach the DB
from the current network), then tighten the column back to required and push again.

## Architecture

**Stack**: Next.js 16 (App Router) + React 19 + Tailwind v4, Prisma ORM, PostgreSQL (Neon in
production; SQLite or local Postgres for dev, see the `db:*` scripts). Custom auth — no
NextAuth: `src/lib/auth.ts` issues an HMAC-SHA256-signed session token (`base64(payload).signature`,
secret from `NEXTAUTH_SECRET`) stored in a cookie, and `src/middleware.ts` re-verifies that
signature (via Web Crypto, since middleware runs on the Edge runtime) to gate `/admin/*`.
Production refuses to boot without `NEXTAUTH_SECRET` set — the in-repo fallback secret is public.

**Category is a self-referencing tree, one level deep** (`parent_id` on `Category`). A top-level
category (`parent_id = null`) is a physical **product type** — Kartina, Kulolchilik, Somon
ishlari, Yog'och o'ymakorligi. A child category is a **subject/theme** under that type — Nature,
Portraits, Historical Monuments, Courtyards & Homes nest under Kartina; Handicrafts & Ceramics
nests under Yog'och o'ymakorligi. `Painting.category_id` always points at a *leaf* category (or
at a top-level one directly, for a product type with no subjects, e.g. Kulolchilik itself).
`src/lib/productType.ts#effectiveProductType()` resolves a painting's *physical product type* by
walking up to the parent (or using the category itself if it has none) — use this, not
`painting.category.slug` directly, anywhere that needs to know what kind of physical object a
painting is (accessory scoping, etc.), as opposed to what it depicts.

**Accessory pricing and scoping follow the same product-type split**: `Accessory.product_types`
holds either a *top-level* Category slug or one of the fixed Services codes (`MURAL`, `CERAMICS`,
`CUSTOM` — Services has no DB table of its own, `ServicesClient.tsx` sends these literal
strings). An empty `product_types` array means "applies everywhere". Pricing is size-tiered
(`price_small`/`price_medium`/`price_large`, the two larger tiers optional and falling back to
`price_small`) — `src/lib/paintingSize.ts` buckets a painting's parsed size string into
small/medium/large and resolves the right tier; `largestSizeBucket()` picks the largest painting
in a multi-item wishlist inquiry so a shared "add a case" checkbox doesn't undercharge. The price
actually charged is always re-resolved server-side from the DB in the inquiry/service-request
API routes — never trust a client-submitted accessory price.

**Accessory scoping is enforced server-side** via `src/lib/productType.ts#accessoryAppliesTo()` /
`paintingAccessoryTargets()` (shared by `AccessoryCheckboxes` and `src/lib/accessoryPricing.ts#resolveAccessories()`,
which every inquiry/service route uses) — an accessory not configured for the painting's product type or the
service type is dropped even if a client sends it.

**`Painting.included_accessories`** lists Accessory ids that physically come with the painting (e.g. its own
frame — "Kartina bilan birga keladi" in the Paintings form). They are never offered or charged for it:
`AccessoryCheckboxes` takes them as `included`, and `resolveAccessories()` takes them as `exclude`; the painting
page lists them as included.

**"View on a wall"** (`WallPreviewModal`): `src/lib/wallView.ts` has Gemini find the artwork in the main photo once
(frame edge if framed, else canvas edge; snapped to real pixel edges); stored as JSON in `Painting.wall_view`,
re-detected when the main photo changes. The size shown (room view and AR) is ALWAYS the size typed in the admin —
never re-computed. Computers get a QR code that opens the view on a phone (`?wall=1` on the painting page).
`/api/paintings/[id]/wall` (data; admin POST = re-detect), `/wall-image` (cropped JPEG) and `/ar/painting.glb` /
`/ar/painting.usdz` (real-size models, `src/lib/paintingGlb.ts` / `paintingUsdz.ts`, both dependency-free) serve it.
Phones open it in their own AR viewer — Android Scene Viewer via an `intent://` URL, iOS Quick Look via the server
USDZ's real URL (a blob URL only works in Safari; Chrome/Edge/Firefox on iOS need a real link). The USDZ is tipped
back 90° because Quick Look's wall anchor uses Y as the wall normal. The Google app on iOS (GSA) opens it like Chrome
does (real link) — the owner reports it worked there before it was routed to the in-app path.
Every phone browser also gets `CameraWallView` (in-page camera + draggable/pinchable artwork kept on its spot by the
gyroscope while the phone turns — `requestMotionPermission()` must run in the opening tap on iPhone; start size from the chosen
distance to the wall and a typical camera field of view, photo save/share) — the primary path where there is no AR
viewer (Telegram/Instagram in-app browsers) and a "didn't work?" fallback elsewhere. It needs
`Permissions-Policy: camera=(self)` in `next.config.ts`.

**AI assistants / search** (ChatGPT, Claude, Gemini, Perplexity answering "a gallery selling paintings in
Khiva/Tashkent?"): `/llms.txt` and `/llms-full.txt` (`src/lib/llmsTxt.ts`, Markdown built from Settings + catalogue —
never a static file in `public/`, which would go stale), `robots.ts` names the AI crawlers, the ArtGallery JSON-LD lists
every Settings address with its city (`src/lib/galleryFacts.ts#cityOf()` reads the city from the address text) and the
home title/description name those cities (`homeMetadata()`); painting pages are `Product` + `VisualArtwork`. Admin
painting/artist saves ping IndexNow (`src/lib/indexNow.ts`, Bing → ChatGPT search; key served at `/indexnow.txt`).

**Artist awards & certificates** live in `Artist.achievements` (JSON text, read/written only through
`src/lib/artistAchievements.ts`), edited in Admin → Artists and shown on the artist's page.

**Wishlist hearts carry `data-wishlist-id`**: `src/lib/earlyWishlist.ts` (inlined first in `<body>`) records taps
made before hydration into localStorage, so a tap on a slow phone is never lost; `AppContext` sets
`window.__aqWishReady` once React owns the list.

**A multi-painting inquiry is ONE `Inquiry` with an `InquiryItem` per painting** (each with its own price
snapshot and accessory snapshot); `Inquiry.painting_id` points at the first painting. Single-painting (and
older) inquiries have no items and keep accessories in `Inquiry.selected_accessories`. Read inquiries through
`src/lib/inquiryItems.ts` (`inquiryLines()`, `inquiryTotal()`, `withInquiryTotals()`, `inquiryItemsInclude`)
rather than `inquiry.painting` directly, so both shapes render the same.
The agreed sale price is per painting: `InquiryItem.final_price` (grouped) or `Inquiry.final_price` (single);
revenue stats read it through `src/lib/salePrices.ts#getAgreedPriceByPainting()` — a grouped inquiry's own
`final_price` is an order total and is never attributed to one painting.
A painting sold outside the website gets its price in the Paintings form (`Painting.sold_price`, required
when marking sold unless an inquiry already holds an agreed price; "Asl narxi" fills the listed price).
`getSalePriceByPainting()` = inquiry agreement, else `sold_price`. `sold_price` is internal: the Prisma
client omits it globally (`src/lib/prisma.ts`), so admin queries must ask for it with
`omit: { sold_price: false }` or an explicit select — the public site keeps showing the listed price.

**Wishlist** lives in localStorage for guests; for a signed-in user `AppContext` merges it with the
account's `WishlistItem` rows on sign-in and mirrors every add/remove (`/api/user/wishlist`). The daily cron
(`/api/cron/review-reminders`, which also runs `src/lib/priceAlerts.ts#runPriceAlerts()`) emails a user when
a saved, unsold painting's visible price drops below `WishlistItem.last_seen_price`; `User.price_alerts`
opts out (signed one-click unsubscribe link, or the toggle on the account's Saved Artworks tab).

**Admin notifications** go through `src/lib/adminNotify.ts#notifyAdmin()` (plus the contact route): an email to
`SiteSettings.email` and a Telegram message (`src/lib/telegram.ts`) to every `TelegramChat` row, carrying a `ref`
(inquiry/service/contact id) so the message gets status buttons and an `…/admin/…?open=<id>` link. The bot token
is the `TELEGRAM_BOT_TOKEN` env var (never stored in the DB). Telegram calls back through
`/api/telegram/webhook` (secret header = `webhookSecret()`); a chat is linked ONLY via `/start <code>` from the
signed 15-minute link made in Admin → Settings → Telegram (never "whoever wrote to the bot"). A linked chat's
Reply to a notification posts a curator reply via `src/lib/threads.ts` (shared with the site's own reply
routes); buttons call `setInquiryStatus`/`setServiceRequestStatus`; Mondays the daily cron sends
`src/lib/weeklyReport.ts` (also `/hisobot`). `TELEGRAM_API_URL` exists only to test against a mock.

**Contact clicks** (floating WhatsApp button + every WhatsApp/Telegram/phone/email/Instagram/map link, via
`ContactClickTracker` — always mounted, not only with GA) are recorded anonymously in `ContactClick` through
`/api/stats/click` (`src/lib/contactClicks.ts#recordContactClick()`, sendBeacon; same daily visitor hash as
`SiteVisit`, `src/lib/visitorId.ts`). The dashboard's Visitors section shows them and the AI assistant's
conversations/questions for the same period; `/admin/ai-chats?open=<id>` opens one conversation.

**Reviews are open to anyone** — of the gallery (`Review.painting_id = null`, form on `/reviews`) or of a work (its
page). Every review waits for curator approval. No CAPTCHA keys: `src/lib/reviewGuard.ts` (signed "form opened at"
token from `/api/reviews/token`, min fill time, honeypot `website` field, no links) + a per-IP rate limit; client half
in `src/components/ReviewGuard.tsx`. `user_id` is set only when the signed-in reviewer has an inquiry for that work;
show the badge via `src/lib/reviewVerified.ts#isVerifiedReview()` (older reviews all came from buyers).
`/reviews` also shows the gallery's **Google Maps reviews** (`src/lib/googleReviews.ts`, official Places API (New):
rating, count and at most 5 reviews — Google's limit — cached a day per language, never in our JSON-LD) when the
`GOOGLE_PLACES_API_KEY` env var is set; the place is `GOOGLE_PLACE_ID` (comma-separated) or found by text search per
Settings address (name must match). Without the key it shows links to each Settings address's Google Maps page.
`GOOGLE_PLACES_API_URL` exists only to test against a mock.

**Gallery wall labels**: Admin → Paintings → "QR yorliqlar" (`/admin/paintings/labels`, `?ids=` preselects) prints
A4 sheets of labels whose QR opens `/gallery/<id>?ref=qr`; `VisitTracker` records such a landing with referrer
`qr-label`, shown as its own source on the dashboard.

**Site languages**: EN/RU/UZ plus DE/FR/KO/JA/ZH (`LANGS` in `src/lib/i18n/routing.ts`; `/de/...` etc.). UI texts for
the extra languages are partial dictionaries in `src/lib/i18n/extra/<lang>.ts` (missing keys fall back to English),
merged on the server and handed to the client through `RouteLangProvider`'s `dict` — never import them in client code.
The admin stays EN/RU/UZ (`BaseLanguage`). Catalogue texts (Painting/Artist/Category/Workshop) get machine translations
in their `translations` JSON column (`src/lib/translateContent.ts`: after each admin save via `after()`, the daily cron,
and Admin → Settings "Saytning boshqa tillari"); server pages pass data through
`src/lib/contentTranslations.ts#localizeContent(data, lang)`, which copies the page language's translation over the
`*_en` fields and strips the column — so client code keeps its `lang === 'ru' ? x_ru : … : x_en` fallbacks. Legal pages
(Privacy/Terms) fall back to English; `DELIVERY` and SEO texts (`seoExtra.ts`) exist in all eight.

**Telegram channel**: `SiteSettings.telegram_channel` (Admin → Settings → Telegram; bot must be a channel admin). New
unsold works are posted on create (`src/lib/telegramChannel.ts`); any work can be re-posted from its edit page.

**Gift certificates** (`GiftCertificate`, `/gift-card`, Admin → Sovg'a sertifikatlari): request → curator arranges
payment → "To'landi" emails a signed link to the printable certificate (`/gift/<code>?s=`, `src/lib/giftCards.ts`).

**Masterclasses** (`Workshop`, Admin → Master-klasslar, public `/experiences`): a booking is a `ServiceRequest` with
`service_type = 'WORKSHOP'`, so it shares the service-request admin page, Telegram buttons and reply thread.

**"Find art for my room"** (`RoomMatch` on the gallery page, `/api/room-match`, `src/lib/roomMatch.ts`): the visitor's
room photo plus thumbnails of available wall pieces go to Gemini in one request; the photo is never stored.

The public forms (reviews, gift card, booking) share the bot checks in `src/lib/reviewGuard.ts` /
`src/components/ReviewGuard.tsx` (token from `/api/reviews/token`).

**Sales report**: `/api/admin/reports/sales?from&to` returns a real .xlsx built by the dependency-free
`src/lib/xlsx.ts`, using `getSaleDetailsByPainting()` for the price actually received.

**Payment & delivery terms** (100% prepayment, methods, currencies, free Tashkent delivery from $500, UzPost,
packaging, insurance, artwork passport + export permit, 7-day damage claim) live in ONE place,
`src/lib/deliveryInfo.ts` (EN/RU/UZ, as given by the owner) — used by the `/delivery` page (+ FAQPage JSON-LD), the
short block on every work's page, `/llms.txt` and the site AI assistant. Keep the Terms page consistent with it.

**Sizes** are a string "W × H unit", or "W × H × D unit" for 3D objects (chess board, box, vase — the optional
third field in the Paintings form). Always read them with `src/lib/paintingSize.ts#parseSizeCm()` (returns cm,
`depth` only for objects); `isWallPiece()` (no depth) decides whether "View on a wall" is offered, and shipping
weight uses the volume when there is a depth.

**`Painting.images[0]` is the main photo** (reordered in the Paintings form). Listings show only it — use
`src/lib/paintingImages.ts` (`mainImage()`, `withMainImageOnly()`); only the detail page shows every photo.

**Artist can carry a default product-type category** (`Artist.category_id`, a top-level
Category). Selecting that artist anywhere in the Paintings admin form auto-fills
ota-kategoriya (product type), leaving only bola-kategoriya (subject) for the admin to pick.

**Discount priority (highest to lowest)**: painting's own discount > artist-wide > category-wide
> site-wide (`Discount.scope`: `PAINTING` / `ARTIST` / `CATEGORY` / `SITE`).

**Gallery addresses are an open-ended list**, not a fixed field: `SiteSettings.locations` is a
JSON array of `{address, url}` edited freely at `/admin/settings` (add/remove any number of
addresses, each with its own Google Maps link — there is no separate multi-branch model, it's
all in Settings), falling back to the older fixed `address`/`location_map` columns via
`src/lib/settingsUtils.ts#parseLocations()` for sites that predate this field. Every place that
renders the address(es) (`Footer.tsx`, `ContactClient.tsx`, `layout.tsx`'s JSON-LD) goes through
that helper — never read `settings.address`/`settings.location_map` directly; the JSON-LD schema
uses only the first location as its single `PostalAddress`.

**Social/messenger links are an open-ended list**, not fixed fields: `SiteSettings.social_links`
is a JSON array of
`{label, url}` edited freely in the admin (add/remove any number of Telegram/Instagram/WhatsApp/
etc. links), falling back to the older fixed `telegram`/`instagram` columns via
`src/lib/settingsUtils.ts#parseSocialLinks()` for sites that predate this field. Every place that
renders social links (`Footer.tsx`, `ContactClient.tsx`, `layout.tsx`'s JSON-LD `sameAs`) goes
through that helper — never read `settings.telegram`/`settings.instagram` directly.

**"About Us" is entered only in Uzbek** in the admin (`SiteSettings.about_uz`) — EN/RU
(`about_en`/`about_ru`) are auto-translated on blur via `/api/admin/translate`, the same pattern
used elsewhere; there's no manual EN/RU input for this field.

**No native `<select>`, `<input type="date">`, or `<input type="time">` anywhere in this
codebase** — they render inconsistently across browsers/OSes. Use the shared components instead:
`src/components/FilterSelect.tsx` (dropdown — pass `searchable` for long lists like country
pickers, `dark` for the Services page's dark card, `allValue`/`allLabel` for an "All ..."/unset
row), `src/components/DatePicker.tsx` (calendar popup, value/onChange are still `YYYY-MM-DD`
strings), `src/components/TimePicker.tsx` (displays 12h AM/PM, but `value`/`onChange` are still
24h `HH:MM` strings — matching what the old native inputs produced, so no downstream code needs
to change).

**Auto-translate pattern**: admin forms with UZ/EN/RU fields (Paintings, Categories, Artists,
Accessories) call `/api/admin/translate` (Gemini) `onBlur` of the UZ field to fill EN/RU, and
never overwrite a field the admin already typed into. When adding a new trilingual field to an
admin form, follow this same pattern rather than leaving EN/RU to be filled by hand.

**Admin translate** (`/api/admin/translate`) tries `GEMINI_TEXT_MODEL`, then the comma-separated
`GEMINI_TRANSLATE_FALLBACK_MODELS` (each Gemini model has its own free-tier daily quota; a model that 429s/503s
is skipped for a while), then Google Translate's public endpoint (often 429 from cloud IPs). Failures surface
to the admin as a toast (`TranslateProblemToast` in `AdminShell`), never silently.

**Rate limiting** (`src/lib/rateLimit.ts`) uses Upstash Redis (`UPSTASH_REDIS_REST_URL` /
`UPSTASH_REDIS_REST_TOKEN`) when those env vars are set, so limits are shared correctly across
Vercel's serverless instances. Without them it falls back to an in-memory `Map`, which is fine
for local dev but does not synchronize across instances in production — always keep both env
vars set on Vercel.

**`AGENTS.md`** in the repo root has the original build brief (design reference files under
`/design/`, the TZ requirements doc, and one hard rule: never edit, re-color, or replace
`/assets/logo.png` — treat any request to "fix" the logo as a question to ask the user, not a
task to do).

## Deployment

Vercel, auto-deploys `main` from `github.com/zemeisteer/ArtQala`. The canonical domain is
`https://artqala.com` (`NEXTAUTH_URL` must match it — sitemap, robots, JSON-LD, canonical tags and
email links all derive from it); `www.artqala.com` 308-redirects to it at the Vercel domain level,
and `src/middleware.ts` 308-redirects the legacy `art-qala.vercel.app` host to it, which is why
its matcher covers every route, not just `/admin`. Database is Neon Postgres —
`DATABASE_URL` (plus `NEXTAUTH_SECRET`, `ADMIN_PASSWORD`, `RESEND_API_KEY`,
`GEMINI_API_KEY`/`GEMINI_TEXT_MODEL`/`GEMINI_IMAGE_MODEL`, `GOOGLE_CLIENT_ID/SECRET`, optional
`TELEGRAM_BOT_TOKEN`) live in
Vercel's env vars, not `.env`. See `DEPLOYMENT.md` for the full first-time setup walkthrough.
