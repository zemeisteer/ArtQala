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
`GEMINI_API_KEY`/`GEMINI_TEXT_MODEL`/`GEMINI_IMAGE_MODEL`, `GOOGLE_CLIENT_ID/SECRET`) live in
Vercel's env vars, not `.env`. See `DEPLOYMENT.md` for the full first-time setup walkthrough.
