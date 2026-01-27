import { PrismaClient, QuotaBucket } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create super admin if not exists
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD

  // Validate required environment variables
  if (!superAdminEmail || !superAdminPassword) {
    console.error('❌ Error: SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set')
    console.error('   Please set these environment variables before running seed script')
    process.exit(1)
  }

  const existingSuperAdmin = await prisma.admin.findUnique({
    where: { email: superAdminEmail },
  })

  if (!existingSuperAdmin) {
    const passwordHash = await bcrypt.hash(superAdminPassword, 10)

    await prisma.admin.create({
      data: {
        email: superAdminEmail,
        passwordHash,
        role: 'SUPER_ADMIN',
      },
    })

    console.log(`✅ Super admin created: ${superAdminEmail}`)
  } else {
    console.log(`ℹ️  Super admin already exists: ${superAdminEmail}`)
  }

  // Create test student user in development
  if (process.env.NODE_ENV === 'development') {
    const testEmail = 'student@test.com'
    const testPassword = process.env.TEST_STUDENT_PASSWORD || 'TestStudent123!'

    const existingStudent = await prisma.user.findUnique({
      where: { email: testEmail },
    })

    if (!existingStudent) {
      const passwordHash = await bcrypt.hash(testPassword, 10)

      const user = await prisma.user.create({
        data: {
          email: testEmail,
          passwordHash,
          role: 'STUDENT',
          emailConfirmedAt: new Date(),
        },
      })

      // Create default quotas
      const resetAt = new Date()
      resetAt.setMonth(resetAt.getMonth() + 1)

      await prisma.quota.createMany({
        data: [
          {
            userId: user.id,
            bucket: QuotaBucket.LEARNING_INTERACTIONS,
            used: 0,
            limit: 150,
            resetAt,
          },
          {
            userId: user.id,
            bucket: QuotaBucket.AUTO_EXPLAIN,
            used: 0,
            limit: 300,
            resetAt,
          },
        ],
      })

      // Create user preferences
      await prisma.userPreference.create({
        data: {
          userId: user.id,
          uiLocale: 'en',
          explainLocale: 'en',
        },
      })

      console.log(`✅ Test student created: ${testEmail}`)
    } else {
      console.log(`ℹ️  Test student already exists: ${testEmail}`)
    }
  }

  console.log('✅ Database seeding completed!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error during seeding:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
