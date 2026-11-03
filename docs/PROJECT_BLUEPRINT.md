# Project Blueprint — lessons from Art Qala

> **What is this?** Everything used to build the Art Qala website (artqala.com): technologies, services,
> security measures, the login system, and the problems hit along the way together with their fixes.
> When starting a new project, give this file to the AI — it builds on this experience and avoids
> repeating the same mistakes.
>
> This file contains **no passwords, keys or secret values** — only names and rules. Real values live
> only in the Vercel / GitHub settings.

---

## 0. Instructions for the AI

If you (the AI) received this file for a new project:

1. **The rules in this file are the defaults.** If the new project's own requirements conflict with them,
   the project's requirements win. Adapt Art Qala–specific things (paintings, artists, accessories,
   certificates…) to the new project's domain — don't copy them blindly.
2. **Sections 5–8 (database, login, security, performance) are mandatory for every project.**
3. **Take the "Problems and lessons" table (section 13) into account from day one** — every row really
   happened and cost time.
4. **The owner is not a developer and writes in Uzbek.** Answer in Uzbek, in plain words, briefly. Whenever
   the owner has to do something (a Vercel setting, SQL in Neon, a DNS record), give exact steps.
5. Code comments and commit messages are in English.

---

## 1. Tech stack and why

| What | Why |
|---|---|
| **Next.js 16 (App Router) + React 19 + TypeScript** | Pages and the server API in one project. Pages are rendered on the server (important for SEO) and cached (ISR) so they open fast. |
| **Tailwind CSS v4** | Fast, consistent styling. |
| **Prisma ORM** | Type-safe database access; `schema.prisma` is the single description of the database. |
| **PostgreSQL — Neon** (serverless) | Free tier, works well with Vercel. SQLite or a local Postgres for local development. `@prisma/adapter-neon` connects over HTTP/WebSocket (some networks block port 5432). |
| **Vercel** (hosting) | Pushing to `main` deploys automatically. Cron jobs, Blob storage, domain management. |
| **GitHub** | Source code; nightly backups through GitHub Actions. |
| **Vercel Blob** (or Cloudinary) | Uploaded images and PDFs. |
| **sharp** | Normalizes every upload: fixes EXIF rotation, caps the size, re-encodes to WebP. |
| **next/image** | A correctly sized image for every screen, lazy loading. |
| **Resend** | Email (verification codes, replies, notifications). |
| **Upstash Redis** | Rate limiting shared across all serverless instances; translation cache. |
| **Google Gemini** (`@google/genai`) | Automatic translation (UZ → EN/RU and more), the on-site AI assistant, writing descriptions from a photo, "find art for my room". |
| **Sentry** (`@sentry/nextjs`) | Catches and reports site errors automatically (EU region). |
| **Google Analytics 4** + Consent Mode | Visit statistics; cookie consent for Europe. |
| **Telegram Bot API** | Admin notifications about new requests, action buttons, replying from Telegram, posting new works to a channel. |
| **bcryptjs** | Secure password hashing. |
| **jose** | Working with signed tokens. |
| **libphonenumber-js** | Validating and formatting phone numbers per country. |
| **framer-motion, lucide-react, recharts** | Animation, icons, admin charts. |
| **react-image-crop** | Cropping on upload (free-form for artworks, a circle for artist photos). |
| **qrcode** | QR codes (wall labels, "open on your phone"). |

**Deliberately not used, and why:**
- **No NextAuth** — a small, readable custom auth system instead (section 6). Every part is under our control.
- **No native `<select>`, `<input type="date">`, `<input type="time">`** — they look different in every browser/phone. Use the shared `FilterSelect`, `DatePicker`, `TimePicker` components.
- **No CAPTCHA keys** — bots are stopped another way (section 7).
- **No test suite** — instead, after every change: `tsc --noEmit`, `npm run build`, and a check on the live site.

---

## 2. External services and environment variables

Values **never** go into code, chat or GitHub — only into Vercel → Settings → Environment Variables (and
GitHub → Settings → Secrets). The repository may be public, so this matters a lot.

| Variable | Purpose | Where it comes from |
|---|---|---|
| `DATABASE_URL` | Database | Neon → Connect |
| `NEXTAUTH_SECRET` | Master secret: session signatures, OTP hashing, TOTP encryption, other signed links. **Production refuses to start without it.** | Generate yourself (long random string) |
| `NEXTAUTH_URL` | The site's main address (`https://domain.com`) | — |
| `NEXT_PUBLIC_SITE_URL` | Address used for SEO URLs (canonical, sitemap); falls back to `NEXTAUTH_URL` | — |
| `ADMIN_PASSWORD` | First admin's password (for the seed) | Yourself |
| `ADMIN_ACCESS_KEY` | (optional) Hides the admin panel behind a secret link | Generate yourself |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Sending email; the sender must be on a verified domain | resend.com |
| `GEMINI_API_KEY`, `GEMINI_TEXT_MODEL`, `GEMINI_IMAGE_MODEL`, `GEMINI_TRANSLATE_FALLBACK_MODELS` | Translation and AI features; list of fallback models | aistudio.google.com |
| `GEMINI_ASSISTANT_API_KEY`, `GEMINI_ASSISTANT_MODEL` | The on-site AI chat (a separate key so it doesn't share quota with translation) | aistudio.google.com |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | "Sign in with Google" | Google Cloud Console → OAuth |
| `GOOGLE_PLACES_API_KEY`, `GOOGLE_PLACE_ID` | (optional) Show Google Maps reviews on the site | Google Cloud Console |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Rate limiting and cache | upstash.com |
| `BLOB_READ_WRITE_TOKEN` | Image/PDF storage | Vercel → Storage → Blob |
| `CLOUDINARY_*` | (alternative) image storage | cloudinary.com |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | Error tracking; the token is only for source maps | sentry.io |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics | analytics.google.com |
| `TELEGRAM_BOT_TOKEN` | Admin notifications | Telegram @BotFather |
| `CRON_SECRET` | Protects the Vercel Cron endpoints | Generate yourself |
| `INDEXNOW_KEY` | (optional) Tell Bing/ChatGPT search about changes immediately | Yourself |

**GitHub Secrets** (for backups): `DATABASE_URL` (Neon's **direct**, non-pooler connection string),
`BACKUP_PASSPHRASE`, `BLOB_READ_WRITE_TOKEN`.

**Important:** after adding or changing an env var in Vercel, **Redeploy** — some values are read at build time.

**Generate a random secret (Windows PowerShell):**
```powershell
$b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); ($b | % { $_.ToString('x2') }) -join ''
```

---

## 3. Project structure

```
prisma/schema.prisma        the single description of the database (no migrations folder — "db push" style)
prisma/seed.ts              initial data (admin, categories...)
src/middleware.ts           language routing, legacy-domain redirect, admin protection
src/app/[lang]/...          public pages, one per language (en unprefixed, /ru, /uz ...)
src/app/[lang]/layout.tsx   ROOT layout of the public site (<html lang> is set here)
src/app/admin/...           admin panel (with its own root layout)
src/app/api/...             server API (auth, inquiries, admin/*, cron, upload...)
src/components/             shared components (FilterSelect, DatePicker, PaintingCard...)
src/lib/                    business logic: auth, rateLimit, email, otp, totp, discounts, i18n...
src/lib/i18n/               languages: routing.ts, translations.ts, seo.ts
docs/                       documentation (including this file)
.github/workflows/          nightly backup
vercel.json                 cron schedule
CLAUDE.md                   project rules for the AI (create and keep updating it in every project)
```

**Create and maintain a `CLAUDE.md` in every new project** — commands, architecture, "never do this" rules.
Later AI sessions read it and don't undo earlier decisions.

---

## 4. Main features (Art Qala as the example)

**Public site:** home page (carousel of randomly picked works); gallery (filters: product type, subject, artist,
year, size, price; search; sorting; 60 per page; filters kept in the URL); artwork page (several photos, zoom,
"view on a wall" and AR, shipping cost calculator, inquiry form, reviews, related works); artists (pagination,
bio, awards, portfolio PDF); services (murals, ceramics, commissions); contact; reviews; privacy policy; terms;
payment & delivery; gift certificates; masterclasses; stories; certificate of authenticity (with QR); customer
account; wishlist; 8 languages; 4 currencies; WhatsApp button; AI chat assistant; cookie consent banner.

**Admin panel:** dashboard (revenue, visits, views, inquiries; visitors' countries/cities/sources/devices);
paintings (upload + crop, reordering, AI description writer, discounts, sold price, QR wall labels); artists
(round photo, PDF); categories (parent/child tree); discounts (4-level priority); accessories (size-tiered prices,
linked to product types); inquiries (one inquiry can hold several works); service requests; messages; AI chat
history; customers; review moderation; staff and sign-in history; settings (list of addresses, phones, social
links, opening hours, exchange rates, Telegram); sales report (.xlsx); mobile layout.

---

## 5. Database rules (MANDATORY)

1. **Never run `prisma db push --force-reset` against production** — it wipes the whole database.
2. **Adding a required column to a table that already has rows** makes `db push` refuse. The right way:
   make the column optional (`?`) → push → fill it with an `UPDATE` → make it required → push again.
3. **Connect to Neon from outside Vercel with the direct connection string, not the `-pooler` one** — the pooler
   repeatedly failed to connect from outside Vercel's network in this project.
4. **Working with the owner:** when the schema changes, generate the SQL with
   `npx prisma migrate diff --from-schema-datamodel old.prisma --to-schema-datamodel prisma/schema.prisma --script`,
   hand it to the owner, who runs it in **Neon → SQL Editor**. Until then the code stays **on a separate branch** —
   if code that needs a new column goes live before the database has it, the site breaks.
   Owner says "done" → merge to `main` → deploy → check the live site.
5. **Encrypted nightly backup** (GitHub Actions): `pg_dump` (its version must match the server's) plus every
   uploaded image → `tar.gz.gpg` (encrypted with `BACKUP_PASSPHRASE`) → kept 30 days. Encryption is required
   because the repository is public. Neon snapshots / point-in-time restore are enabled as well.
6. **Hide internal fields from the public site**: e.g. `sold_price` (the real sale price) is globally `omit`ted in
   the Prisma client — admin queries ask for it explicitly.
7. **Free Neon compute limit**: every query wakes the database. That's why public pages are cached for a long time
   and refreshed only when data changes (section 8).

---

## 6. Login system — how it's built

### 6.1. Session (all users)
- After sign-in a **signed token** is stored in a cookie: `base64url(payload).HMAC-SHA256(payload, NEXTAUTH_SECRET)`.
- Cookie: `httpOnly` (JavaScript can't read it), `secure` (HTTPS only), `sameSite: lax` (against requests sent
  from other sites), `path: /`.
- The token contains `iat` (issued at); expiry is checked **from the token itself** (the cookie's max-age is only a
  browser hint): **customers 30 days, admins 12 hours**.
- The signature is compared **in constant time** (`crypto.timingSafeEqual`; a hand-written constant-time compare on
  the Edge runtime) — otherwise the signature could be guessed byte by byte from response times.
- **Production refuses to start without `NEXTAUTH_SECRET`** (the code has a fallback secret, but it's public — anyone
  could forge an admin token with it).
- The middleware (Edge runtime) re-verifies the signature with Web Crypto and protects `/admin/*` and `/api/admin/*`.

### 6.2. Sign-up and email verification
- Email + password (the password is hashed with **bcrypt**, never stored in plain text).
- A **6-digit code** (OTP) is emailed: valid for **3 minutes**, only the newest code works.
- The code is stored **as an HMAC keyed with the server secret**, never in plain text — a stolen database can't be used
  to verify an account. A plain SHA-256 isn't enough: a 6-digit code has only a million possibilities.
- Resending codes: **at most 5 per email address per hour** (so the form can't be used to flood someone's inbox).
- Signing in with an unverified account sends a fresh code and redirects to the verification page.

### 6.3. Password reset
- Code by email → new password. Codes are HMAC-hashed, 3 minutes, attempts limited.
- When an admin resets their password, **all their sessions on other devices are ended**.

### 6.4. Sign in with Google (OAuth)
- OAuth client in Google Cloud Console; redirect URI: `<site>/api/auth/oauth/google/callback`.
- The post-login return address goes through `safeRedirectTarget()` — only a relative path on our own site
  (`/account`); `https://other-site` or `//other-site` are rejected (against open redirects / phishing).
- Sign in with Apple was removed (owner's decision).

### 6.5. Admin sign-in — extra layers of protection
1. **Role**: only a `role = ADMIN` user gets into the admin panel; a customer who signed in with Google is never an admin.
2. **Every admin sign-in is recorded in the database** (`AdminSession`: who, device/browser, IP, city/country, sign-in
   time, last activity). The admin token carries that row's `sid`; ending the row makes the token stop working at once.
   - Admin → Staff shows the list with **"Sign out"** and **"Sign out all others"** buttons.
   - Logging out ends the row — a copied cookie stops working too.
   - The middleware can't reach the database, so for admin pages it asks `/api/auth/session-check` (if that check
     itself fails, the verified signature stands and the admin API routes still enforce the check — so a hiccup
     can't lock every admin out).
3. **Two-step sign-in (2FA, TOTP)**: Google Authenticator and similar apps. The secret is stored **encrypted with
   AES-256-GCM** (key derived from `NEXTAUTH_SECRET`). An account with 2FA on can't enter the admin panel through
   Google, a password reset or an email code — only password + code. Lost phone:
   `UPDATE "User" SET "totp_secret" = NULL WHERE "email" = '…';`
4. **Hidden admin panel** (`ADMIN_ACCESS_KEY`): when set, `/admin` and its login page show a plain **404** to any device
   that hasn't opened the secret link (`/admin/login?key=…`) once. A device that opened it is remembered for 180 days
   (the cookie holds a signed hash, not the key). Without that cookie an admin can't sign in even with the right
   password (the answer looks like "wrong password"). Changing the key = every device must open the new link.
5. **Password change forced on first sign-in** (`must_change_password`) — a new staff member doesn't keep the temporary
   password the admin gave them. Changing a password ends that admin's sessions on other devices.
6. **The last admin can't be deleted.**
7. **Admin pages are hidden from search engines** (`noindex, nofollow` + `Disallow: /admin/` in robots.txt).

### 6.6. Rate limiting — with Upstash Redis
| Where | Limit |
|---|---|
| Sign-in | 3 layers: (IP+email) 5 / 15 min, IP 20 / 15 min, email 10 / 15 min. A successful sign-in does not reset the IP limit. |
| Sign-up, code verification, password reset | 5 / 15 min |
| Resending a code | 10 / 15 min per IP + 5 per hour per email |
| Contact form, inquiries | 5 / 15 min |
| Reviews | 3 / hour |
| AI chat | 30 / hour per IP, 40 messages per conversation, message ≤ 800 characters |
| Admin AI (translation, description, image) | 20–30 / 15 min per admin |

Without Upstash an in-memory `Map` is used — fine for local development, but on Vercel each instance counts on its own.
**Upstash is required in production.**

---

## 7. Security checklist (for every new project)

**Secrets**
- [ ] No key/password in code, in `.env.example` (names only), in chat or in a commit.
- [ ] A key that was visible on screen (e.g. in a screenshot) is replaced immediately.
- [ ] If the repository is public — backups are encrypted.

**Input validation**
- [ ] Email, phone and text lengths are validated on the server (never trust the client).
- [ ] **Prices are always recalculated on the server from the database** — never trust a price the client sends
      (accessory price, discount, total).
- [ ] Add-ons (accessories) the client sends are checked on the server against what is allowed for that product.
- [ ] User text placed in emails goes through `escapeHtml()` (otherwise a "name" field could put links into an email sent from our domain).
- [ ] Redirect targets stay on our own site.

**File uploads**
- [ ] Only admins can upload.
- [ ] MIME type from an allow-list; **SVG is forbidden** (it can carry a `<script>` and would be stored unchanged).
- [ ] Images are re-encoded with `sharp` (WebP, 1800px) — anything hidden in the file is dropped.
- [ ] PDF: checked to be a real PDF by its first bytes (`%PDF-`), ≤ 4 MB (Vercel rejects requests over 4.5 MB).

**SSRF (when the server fetches something from another site)**
- [ ] The server only fetches from allowed hosts (our own Blob/Cloudinary, Google Maps) — every redirect hop is
      re-checked. Otherwise an admin form could make the server request internal network addresses.

**Bots and spam (without CAPTCHA)**
- [ ] Public forms: a signed "form opened at" token (a script posting straight to the API has none; a human can't fill
      the form in 2–3 seconds), a hidden honeypot field (only bots fill it), a no-links rule, a per-IP limit. Reviews
      still appear only after admin approval.

**HTTP headers** (`next.config.ts`)
- [ ] `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`,
      `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (only what's needed: camera only for AR).
- [ ] HTTPS and `www` → main domain redirect at the Vercel level; the old `*.vercel.app` host → main domain (308).

**Integrations**
- [ ] Cron endpoints require `Authorization: Bearer CRON_SECRET`.
- [ ] Telegram webhook — secret header; a chat is linked only through a **signed 15-minute link** created by an admin
      ("whoever writes to the bot becomes the admin chat" is unsafe and was removed).
- [ ] Email unsubscribe links and gift certificate links are signed.
- [ ] If an admin notification fails, the customer's request is still saved (best-effort, but `await`ed).

**Privacy**
- [ ] Our own visit statistics: **no cookies, no IP stored** — an anonymous hash that changes daily (one person counts
      once per day, can't be recognized on another day). Bots are excluded by user agent.
- [ ] Google Analytics: **no cookies for visitors from the EU/UK/Switzerland until they consent** (Consent Mode, region-scoped).
      A "Cookie settings" link in the footer.
- [ ] Users can delete their own account (retype email + password); their inquiries stay as the business's records
      but are unlinked from them.
- [ ] The privacy policy lists every service actually used (hosting, database, email, images, AI, analytics, Sentry,
      Telegram) — add a new service, update the policy.
- [ ] No personal data (IPs etc.) sent to Sentry.
- [ ] **Never invent contact details** (email, phone, address) on the site — only real values the owner entered in
      Settings. A placeholder phone in the database (like `+998 66 233 44 55`) must never be shown.

---

## 8. Performance rules

1. **Public pages are cached (ISR)**: `export const revalidate = …`. At Art Qala the cache lasts a day, but whenever an
   admin saves something (via a Prisma hook) **the whole site's cache is dropped at once** — fast and up to date.
2. For pages under a **dynamic segment** (`/gallery/[id]`) add **`generateStaticParams() { return [] }`** — otherwise
   `revalidate` does nothing and every visit hits the database.
3. **Don't call `useSearchParams()` in a statically rendered page** — it opts everything below it out of server rendering
   (at Art Qala the gallery HTML contained no artworks at all). Read URL parameters from `window.location.search` after mount.
4. **Don't repeat the same query within one render**: React `cache()` (e.g. `generateMetadata` and the page both load the same artwork).
5. **Send listing pages only the fields they need** (not long descriptions in 3 languages and the artist's biography).
6. **Images**: every `fill` image gets **`sizes`** (otherwise a phone downloads a 3840px image for a 40px icon); `priority`
   only for the 1–2 images at the top of the screen (logo, first slide, main photo); don't render stacked carousel slides
   all at once — add the next one shortly before its turn; long `images.minimumCacheTTL` (uploaded file names never change).
7. **Free plan limits**: the Vercel Hobby plan paused the site for CPU usage → moved to Pro, and "invisible" writes (view
   counter, exchange rates, translations) no longer drop the whole site's cache. Keep this in mind for every new
   background write. The middleware skips public API routes and static files.
8. **"p95 of 12 seconds" in Sentry** is usually the browser's full page load (images), not the server's response.
   Measure first: `curl -w "%{time_starttransfer}"`, the `x-vercel-cache` header (HIT/STALE/MISS).

---

## 9. Multiple languages and SEO

**Languages**
- Every language is a real, server-rendered, indexable page: `app/[lang]/...`. English has no prefix (`/gallery`),
  the others use `/ru/...`, `/uz/...` (8 languages at Art Qala). The middleware rewrites unprefixed URLs to `/en/...`
  internally; `/en/...` → unprefixed (308); the chosen language is remembered in a cookie.
- **Correct `<html lang>` per language**: there is no `app/layout.tsx` — two root layouts instead,
  `app/[lang]/layout.tsx` (site) and `app/admin/layout.tsx` (admin), sharing a `SiteDocument` component. This keeps pages
  static (passing the language through the middleware would have made the whole site dynamic). Unknown URLs go through
  `app/[lang]/[...rest]/page.tsx` → `notFound()`.
- Switching language goes to the same page in the other language and **keeps the scroll position**
  (`router.push(url, { scroll: false })`).
- Admin forms **auto-translate** UZ → EN/RU when the UZ field is filled (Gemini; never overwrites a field the admin typed).
  If translation fails the admin sees a message (it's never swallowed silently). The translation request includes the
  field's context ("this is a painting title", "this is a technique") — quality improves a lot. Results are cached 30 days.

**SEO**
- One source for the site URL: `src/lib/siteUrl.ts` (`NEXT_PUBLIC_SITE_URL` → `NEXTAUTH_URL` → default domain).
- Every page: a self-referencing **canonical**, **hreflang** for every language + `x-default`, `og:url`.
- `sitemap.xml`: only final (non-redirecting) URLs, each with its other-language versions, a real `lastmod` (not always
  "now"), rebuilt at most hourly.
- `robots.txt`: admin and private pages closed; AI crawlers allowed by name.
- JSON-LD: `ArtGallery` (address, opening hours, coordinates, price range, social links — **only when a real value
  exists**), `Product` + `VisualArtwork` (artwork page), `BreadcrumbList` and `ItemList` (with each language's own URLs),
  `FAQPage` (delivery).
- The home page H1 contains the keyword ("Art Gallery in Tashkent") as a small label — still exactly one `<h1>`.
- `/llms.txt` and `/llms-full.txt` — a Markdown summary of the site for AI search (ChatGPT, Claude, Perplexity), built from the database.
- IndexNow — notifies Bing/ChatGPT search immediately when the admin saves.
- Google Search Console (verified with a DNS TXT record + sitemap submitted), Google Business Profile.
- **"Page with redirect"** in Search Console is usually the correct redirects (http, www, /en/, old domain) — not an error.

---

## 10. Integrations — setup lessons

**Resend (email)**
- `onboarding@resend.dev` can only send to the Resend account owner — to email real customers, **verify your own domain**
  (DNS: SPF, DKIM, DMARC records), then set `RESEND_FROM_EMAIL`.
- Sender name: the business name, not "noreply"; `reply_to` — the business inbox (when a customer hits Reply, it reaches the owner).
- To stay out of spam: verified domain, DMARC, plain clear text, tracking turned off.
- For the domain mailbox (`gallery@domain.com`): forwarding, plus Gmail "Send mail as" through SMTP.

**Gemini (AI)**
- **The free tier is tiny: about 20 requests per model per day.** Real use needs billing turned on (a few dollars a month).
  On the free tier Google may use the data for training.
- Several fallback models for translation; a model that returns 429/503 is skipped for a while.
- A **separate key** for the on-site AI chat — so it doesn't fight translations for quota. Without the key the chat button
  isn't shown at all (never show a broken chat).
- The AI chat answers only from database facts; it doesn't negotiate prices or make reservations (it points to the
  inquiry form / WhatsApp), doesn't ask for personal data, ignores instructions that try to change its rules;
  conversations are visible in the admin panel.
- With Gemini 3 tool calling, send the model's turn back **unchanged** (a lost `thought_signature` gives a 400 error).

**Telegram** — see sections 6.5 and 7. The token lives only in env.

**Google OAuth** — the "Authorized redirect URI" must match exactly; publish the consent screen to "Production".

**Sentry** — import `withSentryConfig` from `@sentry/nextjs/config`; `tunnelRoute: "/monitoring"` so ad blockers don't
drop reports; EU region; `SENTRY_AUTH_TOKEN` for source maps (optional).

**Google Analytics** — region-scoped Consent Mode; the lead event is `generate_lead` — mark it as a "Key event" after the first lead.

**Vercel Cron** — schedule in `vercel.json`; daily: review reminders, price-drop alerts, filling missing translations;
Mondays: weekly report.

**Backups (GitHub Actions)** — section 5. Test it once by hand with "Run workflow".

---

## 11. UI and code rules

- No native `<select>` / date / time inputs — `FilterSelect`, `DatePicker`, `TimePicker`.
- **Never** touch the logo file (re-color, redraw, replace) — if something seems wrong with it, ask the owner.
- The admin panel must work on a phone: the sidebar becomes a slide-out drawer with a ☰ button; the sign-out button is always visible.
- The admin language switch must work across the whole admin panel (at Art Qala many admin pages were written in
  Uzbek only — in a new project use translation keys from the start).
- Counts: in a category tree a parent's count includes its children's; on the dashboard parents and children are counted separately.
- Lists (addresses, phones, social links) are **open-ended lists** the admin can add to/remove from — not fixed fields;
  with a fallback to older fixed fields.
- Every new page: a loading state, an empty state ("No data yet"), an error message.
- Rounding prices — upward, to a clean number.
- Nothing secret and no sensitive calculation on the client side.

---

## 12. How to work with the AI (workflow)

1. Every change is its own commit with a clear message.
2. **Work that changes the database → a separate branch**, SQL to the owner, the owner says "done" → merge.
3. Small fixes that don't touch the database → straight to `main` (auto-deploy).
4. After every change: `npx tsc --noEmit`, `npm run build`, and after deploy **check the live site** (`curl`, browser).
   Don't say "tested" about something that wasn't — say exactly what was and wasn't checked.
5. The AI **does not submit forms, send emails or do anything involving money** on the owner's behalf without permission.
6. The AI never types the owner's passwords; the owner never posts keys/passwords in chat — they go straight into Vercel/GitHub.
7. Big jobs can be handed to a cloud session — but it can't message other sessions back; read its results in that session itself.
8. Save the owner's standing instructions to the AI's memory — so they don't have to be repeated next session.

---

## 13. Problems and lessons (these really happened)

| Problem | Cause | Fix |
|---|---|---|
| Gallery HTML had no artworks; slow to appear | `useSearchParams()` in a static page → opted out of server rendering | Read the URL after mount |
| Artwork pages hit the database on every visit | No `generateStaticParams` on a dynamic segment | Add `return []` |
| Phones download 3840px images for small thumbnails | `fill` images without `sizes` | `sizes` on every one |
| Home page loaded all 5 slides at once | Stacked slides are all "on screen" | Render only the current + next slide |
| Artist photo not shown on the site | The card component never used `photo`, only initials | Show the photo when there is one |
| Parent category showed "0 works" | Works are linked to child categories | Show the sum |
| `/ru` pages declared "English" to Google | Single root layout with `lang="en"` | A root layout per language |
| JSON-LD phone was `["+998…","+998…"]` | Phones are a JSON list, printed raw | `parsePhones()[0]`; never output the placeholder |
| Page jumped to the top when switching language | `router.push` default scroll | `{ scroll: false }` |
| AI chat said "sorry, I can't answer" | Gemini free quota (20/day) used up | Billing; separate key |
| AI tool calling returned 400 | Gemini 3 `thought_signature` lost | Send the model turn back unchanged |
| Poor translation quality | Google Translate, no context | Gemini first, field context, cache |
| Admin login reachable by anyone | `/admin/login` open to all | `ADMIN_ACCESS_KEY` + 2FA + sessions |
| A logged-out admin cookie kept working | Token relied on the signature only | `AdminSession` in the database + `sid` |
| Middleware can't query the database | Edge runtime | Internal `/api/auth/session-check` |
| Constant exported from a `'use client'` file didn't work on the server | Client modules arrive as references | Move shared constants to their own file |
| `db push` refused | Required column + existing rows | Optional first → fill → required |
| Couldn't connect to Neon | `-pooler` connection string | Direct connection string |
| Backup failed | Secret pasted wrong / pooler / pg_dump version | Validation step, direct URL, matching version |
| Emails went to spam / didn't reach customers | `onboarding@resend.dev`, domain not verified | Domain + SPF/DKIM/DMARC |
| Env var added but not working | Read at build time | Redeploy |
| Vercel paused the site | Hobby CPU limit; every write dropped the cache | Pro + "invisible" writes don't touch the cache |
| Cropped/rotated image came out wrong | Size/rotation maths in the crop dialog | Transform on the canvas, EXIF |
| Anyone could link a Telegram chat | "Whoever writes to the bot" | Signed 15-minute link |
| Review spam | No CAPTCHA | Form token + honeypot + limit + approval |
| One customer's 4 works arrived as 4 inquiries | One row per work | One `Inquiry` + `InquiryItem`s |
| Customer picked a "case" for a painting | Accessory not tied to product types | `product_types` + server check + admin can remove add-ons |

---

## 14. Starting a new project — steps

1. GitHub repository; add `CLAUDE.md` and this file (`docs/PROJECT_BLUEPRINT.md`).
2. Next.js + TypeScript + Tailwind + Prisma; `schema.prisma`; local SQLite/Postgres; seed.
3. `src/lib/siteUrl.ts`, `auth.ts` (signed session), `rateLimit.ts`, `email.ts` (escapeHtml), `validation.ts`,
   `safeRedirect.ts`, middleware (language + admin protection).
4. `[lang]` routing and two root layouts (site + admin) — from the start.
5. Sign-up + email OTP + password reset + (if needed) Google OAuth.
6. Admin: role, `AdminSession`, forced password change on first sign-in, 2FA, (optional) hidden panel, mobile layout.
7. Neon database, Vercel project, domain (www → main), env vars, Upstash, Resend (domain verification), Blob.
8. Sentry, GA4 + cookie consent, privacy policy (with the real services), terms page.
9. SEO: canonical/hreflang/sitemap/robots/JSON-LD/llms.txt, Search Console, Google Business Profile.
10. Encrypted nightly backup (GitHub Actions) — from day one.
11. Performance: ISR, `generateStaticParams`, `sizes`, `priority` only above the fold.
12. After every stage: build, live check, a short report to the owner in Uzbek.

---

## 15. `.env.example` template (names only)

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

*Last updated: November 2026. Based on the real code and experience of the Art Qala project.*
