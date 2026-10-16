import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

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

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
