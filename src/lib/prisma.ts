/**
 * Prisma Client Singleton
 *
 * This ensures we don't create multiple Prisma Client instances during development
 * due to hot reloading, which can exhaust database connections.
 */

import { PrismaClient } from '@prisma/client'
import { isDev } from './env'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isDev ? ['query', 'error', 'warn'] : ['error'],
  })

if (isDev) {
  globalForPrisma.prisma = prisma
}

// Graceful shutdown
if (typeof window === 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}
