import { PrismaClient } from '@prisma/client';

/**
 * Draait de site met of zonder database?
 *
 * Zonder `DATABASE_URL` staat Verblyf in demo-modus: zoeken, hotelpagina's,
 * fotobeheer en de hele boekingsflow werken op voorbeelddata, maar er wordt
 * niets opgeslagen en accounts zijn uitgeschakeld. Zo kan de site live staan
 * voordat de database er is, zonder foutpagina's.
 */
export const hasDatabase = Boolean(process.env.DATABASE_URL);

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
