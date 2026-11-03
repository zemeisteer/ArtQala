import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PUBLIC_MODELS, refreshPublicSite } from './publicCache';

const databaseUrl = process.env.DATABASE_URL || '';
const isNeon = databaseUrl.includes('neon.tech');

// Neon's HTTP driver adapter connects over HTTPS instead of the raw Postgres
// wire protocol (port 5432), which some local networks block or mishandle
// for non-standard-port TLS. Only applies when DATABASE_URL is actually a
// Neon host — a local/other Postgres uses Prisma's normal TCP connection.
const adapter = isNeon ? new PrismaNeon({ connectionString: databaseUrl }) : undefined;

const createClient = () =>
  new PrismaClient({
    ...(adapter ? { adapter } : {}),
    // A painting's real sale price is internal (the site keeps showing the
    // listed price) — omitted from every query unless an admin query asks
    // for it with `omit: { sold_price: false }` or an explicit select.
    omit: { painting: { sold_price: true } },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

const WRITES = new Set([
  'create',
  'createMany',
  'createManyAndReturn',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'upsert',
  'delete',
  'deleteMany',
]);
// Columns whose writes must not drop the whole site's cache. Every drop
// makes each page re-render (8 languages) on its next visit, which is what
// used up Vercel's CPU: the view counter, the cached wall-view box, the
// Telegram channel mark and the exchange rates (prices are converted in the
// browser from /api/rates) aren't on the pages at all, and the machine
// translations refresh the site once per batch themselves
// (src/lib/translateContent.ts).
const INVISIBLE_FIELDS: Record<string, Set<string>> = {
  Painting: new Set(['views_count', 'wall_view', 'channel_posted_at', 'translations']),
  Artist: new Set(['translations']),
  Category: new Set(['translations']),
  Workshop: new Set(['translations']),
  Story: new Set(['translations']),
  SiteSettings: new Set(['rate_usd', 'rate_eur', 'rate_rub']),
};

function changesWhatThePublicSees(model: string, operation: string, args: unknown): boolean {
  const a = (args || {}) as { data?: unknown; update?: unknown };
  // A new review waits for approval — only approving it shows it.
  if (model === 'Review' && operation === 'create') {
    return (a.data as { is_approved?: unknown } | undefined)?.is_approved === true;
  }
  const data = operation === 'upsert' ? a.update : a.data;
  const fields = data && typeof data === 'object' && !Array.isArray(data) ? Object.keys(data) : null;
  const invisible = INVISIBLE_FIELDS[model];
  return !(invisible && fields?.length && fields.every((f) => invisible.has(f)));
}

// Any write to what the public site shows drops its caches (see
// src/lib/publicCache.ts), so pages can be cached for a day and still show
// an admin's edit immediately.
const withPublicRefresh = (client: ReturnType<typeof createClient>) =>
  client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const result = await query(args);
          if (WRITES.has(operation) && PUBLIC_MODELS.has(model) && changesWhatThePublicSees(model, operation, args)) {
            refreshPublicSite();
          }
          return result;
        },
      },
    },
  });

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof withPublicRefresh> | undefined;
};

export const prisma = globalForPrisma.prisma ?? withPublicRefresh(createClient());

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
