import { PrismaClient } from '@prisma/client';

/**
 * Singleton PrismaClient.
 * В dev-режиме Next.js перезагружает модули при HMR — без глобального кэша
 * это приводит к утечке пула соединений PostgreSQL.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
