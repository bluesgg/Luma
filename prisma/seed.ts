/**
 * Database Seeding Script
 *
 * Creates initial data:
 * - Super admin account (from SUPER_ADMIN_EMAIL env var)
 */

import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Get super admin credentials from env
  const email = process.env.SUPER_ADMIN_EMAIL
  const passwordHash = process.env.SUPER_ADMIN_PASSWORD_HASH

  if (!email || !passwordHash) {
    throw new Error(
      'SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD_HASH must be set in .env file'
    )
  }

  // Create or update super admin
  const superAdmin = await prisma.admin.upsert({
    where: { email },
    update: {
      passwordHash,
      role: 'SUPER_ADMIN',
    },
    create: {
      email,
      passwordHash,
      role: 'SUPER_ADMIN',
    },
  })

  console.log('✅ Super admin created:', superAdmin.email)
  console.log('🎉 Seeding completed!')
}

main()
  .catch(e => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
