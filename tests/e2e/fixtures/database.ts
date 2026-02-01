/**
 * E2E Test Fixtures - Database Helpers
 *
 * Provides database setup/teardown helpers for E2E tests
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Clean all test data from database
 */
export async function cleanDatabase(): Promise<void> {
  // Delete in order of dependencies
  await prisma.aIUsageLog.deleteMany()
  await prisma.quotaLog.deleteMany()
  await prisma.quota.deleteMany()
  await prisma.subTopicProgress.deleteMany()
  await prisma.topicProgress.deleteMany()
  await prisma.topicTest.deleteMany()
  await prisma.learningSession.deleteMany()
  await prisma.qA.deleteMany()
  await prisma.imageRegion.deleteMany()
  await prisma.explanation.deleteMany()
  await prisma.extractedImage.deleteMany()
  await prisma.subTopic.deleteMany()
  await prisma.topicGroup.deleteMany()
  await prisma.file.deleteMany()
  await prisma.course.deleteMany()
  await prisma.user.deleteMany()
  await prisma.admin.deleteMany()
}

/**
 * Seed test data
 */
export async function seedTestData(): Promise<{
  user: any
  course: any
  file: any
}> {
  const user = await prisma.user.create({
    data: {
      email: 'testuser@example.com',
      passwordHash: '$2b$10$hashedpassword',
      emailConfirmedAt: new Date(),
      role: 'STUDENT',
    },
  })

  const course = await prisma.course.create({
    data: {
      userId: user.id,
      name: 'Test Course',
      school: 'Test University',
      term: 'Fall 2024',
    },
  })

  const file = await prisma.file.create({
    data: {
      courseId: course.id,
      name: 'test-lecture.pdf',
      type: 'LECTURE',
      fileSize: BigInt(1000000),
      pageCount: 10,
      status: 'READY',
      storagePath: 'files/test.pdf',
      structureStatus: 'READY',
    },
  })

  return { user, course, file }
}

/**
 * Create test user
 */
export async function createTestUser(
  email: string,
  password: string
): Promise<any> {
  return await prisma.user.create({
    data: {
      email,
      passwordHash: password, // Should be hashed
      emailConfirmedAt: new Date(),
      role: 'STUDENT',
    },
  })
}

/**
 * Create test admin user
 */
export async function createTestAdmin(
  email: string,
  password: string
): Promise<any> {
  return await prisma.admin.create({
    data: {
      email,
      passwordHash: password, // Should be hashed
      role: 'ADMIN',
    },
  })
}

/**
 * Create test course for user
 */
export async function createTestCourse(
  userId: string,
  name: string
): Promise<any> {
  return await prisma.course.create({
    data: {
      userId,
      name,
      school: 'Test School',
      term: 'Fall 2024',
    },
  })
}

/**
 * Create test file for course
 */
export async function createTestFile(
  courseId: string,
  name: string = 'test.pdf'
): Promise<any> {
  return await prisma.file.create({
    data: {
      courseId,
      name,
      type: 'LECTURE',
      fileSize: BigInt(1000000),
      pageCount: 10,
      status: 'READY',
      storagePath: `files/${name}`,
      structureStatus: 'READY',
    },
  })
}

/**
 * Create topic structure for file
 */
export async function createTopicStructure(fileId: string): Promise<any> {
  const topicGroup = await prisma.topicGroup.create({
    data: {
      fileId,
      index: 0,
      title: 'Introduction',
      type: 'CORE',
      pageStart: 1,
      pageEnd: 5,
    },
  })

  const subTopic = await prisma.subTopic.create({
    data: {
      topicGroupId: topicGroup.id,
      index: 0,
      title: 'Basic Concepts',
      metadata: {
        summary: 'Introduction to basic concepts',
        keywords: ['intro', 'basics'],
        relatedPages: [1, 2, 3],
      },
    },
  })

  return { topicGroup, subTopic }
}

/**
 * Create learning session for file
 */
export async function createLearningSession(
  userId: string,
  fileId: string
): Promise<any> {
  return await prisma.learningSession.create({
    data: {
      userId,
      fileId,
      status: 'IN_PROGRESS',
      currentTopicIndex: 0,
      currentSubIndex: 0,
      currentPhase: 'EXPLAINING',
    },
  })
}

/**
 * Setup quota for user
 */
export async function setupUserQuota(userId: string): Promise<void> {
  await prisma.quota.create({
    data: {
      userId,
      bucket: 'LEARNING_INTERACTIONS',
      used: 0,
      limit: 150,
      resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  await prisma.quota.create({
    data: {
      userId,
      bucket: 'AUTO_EXPLAIN',
      used: 0,
      limit: 300,
      resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<any> {
  return await prisma.user.findUnique({
    where: { email },
  })
}

/**
 * Delete user by email
 */
export async function deleteUserByEmail(email: string): Promise<void> {
  const user = await getUserByEmail(email)
  if (user) {
    await prisma.user.delete({
      where: { id: user.id },
    })
  }
}

/**
 * Verify user email
 */
export async function verifyUserEmail(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { emailConfirmedAt: new Date() },
  })
}

/**
 * Close database connection
 */
export async function closeDatabaseConnection(): Promise<void> {
  await prisma.$disconnect()
}

/**
 * Reset database to clean state
 */
export async function resetDatabase(): Promise<void> {
  await cleanDatabase()
  await seedTestData()
}

/**
 * Count records in table
 */
export async function countRecords(table: string): Promise<number> {
  const result = await (prisma as any)[table].count()
  return result
}

/**
 * Check if database is accessible
 */
export async function isDatabaseAccessible(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}
