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
// Painting columns the public pages don't show — a view counter or the
// cached wall-view box must not drop the whole site's cache.
const INVISIBLE_PAINTING_FIELDS = new Set(['views_count', 'wall_view']);

// Any write to what the public site shows drops its caches (see
// src/lib/publicCache.ts), so pages can be cached for a day and still show
// an admin's edit immediately.
const withPublicRefresh = (client: ReturnType<typeof createClient>) =>
  client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const result = await query(args);
          if (WRITES.has(operation) && PUBLIC_MODELS.has(model)) {
            const data = (args as { data?: unknown }).data;
            const fields = data && typeof data === 'object' && !Array.isArray(data) ? Object.keys(data) : null;
            const invisible = model === 'Painting' && fields?.length && fields.every((f) => INVISIBLE_PAINTING_FIELDS.has(f));
            if (!invisible) refreshPublicSite();
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
