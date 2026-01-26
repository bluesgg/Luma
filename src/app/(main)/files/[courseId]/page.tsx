import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { FilesContent } from './files-content'

interface FileListPageProps {
  params: Promise<{ courseId: string }>
}

export default async function FileListPage({ params }: FileListPageProps) {
  const { courseId } = await params

  // Get current user
  const user = await getCurrentUser()

  if (!user) {
    notFound()
  }

  // Validate course exists and belongs to user
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      userId: user.id,
    },
    select: {
      id: true,
      name: true,
    },
  })

  if (!course) {
    notFound()
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <FilesContent courseId={courseId} initialCourseName={course.name} />
    </div>
  )
}
