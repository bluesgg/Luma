'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useFiles, useDeleteFile, useUploadFile } from '@/hooks/use-files'
import { FilesBreadcrumb } from '@/components/file/files-breadcrumb'
import { FileTable } from '@/components/file/file-table'
import { FileTableSkeleton } from '@/components/file/file-table-skeleton'
import { EmptyFiles } from '@/components/file/empty-files'
import { FileUploadZone } from '@/components/file/file-upload-zone'
import { DeleteFileDialog } from '@/components/file/delete-file-dialog'
import { QuotaPreview } from '@/components/file/quota-preview'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { STORAGE } from '@/lib/constants'
import type { FileResponse } from '@/lib/api/files'

interface FilesContentProps {
  courseId: string
  initialCourseName?: string
}

export function FilesContent({ courseId, initialCourseName }: FilesContentProps) {
  const router = useRouter()

  // File data
  const { files, course, isLoading, error, fileCount, canUploadFile } = useFiles(courseId)
  const deleteFileMutation = useDeleteFile(courseId)
  const { requestUpload, confirmUpload, isLoading: isUploading } = useUploadFile(courseId)

  // Local state
  const [showUploadZone, setShowUploadZone] = React.useState(false)
  const [uploadProgress, setUploadProgress] = React.useState(0)
  const [uploadingFileName, setUploadingFileName] = React.useState<string>()
  const [uploadError, setUploadError] = React.useState<string>()
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [fileToDelete, setFileToDelete] = React.useState<FileResponse | null>(null)

  // Ref for focus management after deletion
  const uploadButtonRef = React.useRef<HTMLButtonElement>(null)

  // Handlers
  const handleOpenFile = (fileId: string) => {
    router.push(`/reader/${fileId}`)
  }

  const handleDeleteClick = (fileId: string) => {
    const file = files.find((f) => f.id === fileId)
    if (file) {
      setFileToDelete(file)
      setDeleteDialogOpen(true)
    }
  }

  const handleConfirmDelete = async () => {
    if (!fileToDelete) return

    try {
      await deleteFileMutation.mutateAsync(fileToDelete.id)
      toast.success('File deleted successfully')
      setDeleteDialogOpen(false)
      setFileToDelete(null)

      // Focus management: return focus to upload button after deletion
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        uploadButtonRef.current?.focus()
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete file')
    }
  }

  /**
   * Upload file to storage with real progress tracking using XMLHttpRequest
   */
  const uploadFileToStorage = React.useCallback(
    (uploadUrl: string, file: File): Promise<void> => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            // Map upload progress to 10-80% range (10% for getting URL, 80% for upload, 20% for confirm)
            const uploadPercent = Math.round((event.loaded / event.total) * 70) + 10
            setUploadProgress(uploadPercent)
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`))
          }
        })

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'))
        })

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload was cancelled'))
        })

        xhr.open('PUT', uploadUrl, true)
        xhr.setRequestHeader('Content-Type', 'application/pdf')
        xhr.send(file)
      })
    },
    []
  )

  const handleFileSelect = async (file: File) => {
    setUploadError(undefined)
    setUploadingFileName(file.name)
    setUploadProgress(0)

    try {
      // Request upload URL (0-10%)
      setUploadProgress(5)
      const { fileId, uploadUrl } = await requestUpload(file.name, file.size)
      setUploadProgress(10)

      // Upload to storage with real progress tracking (10-80%)
      await uploadFileToStorage(uploadUrl, file)

      // Confirm upload (80-100%)
      setUploadProgress(85)
      await confirmUpload(fileId)

      setUploadProgress(100)
      toast.success('File uploaded successfully')
      setShowUploadZone(false)
      setUploadingFileName(undefined)
      setUploadProgress(0)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload file'
      setUploadError(errorMessage)
      toast.error(errorMessage)
    }
  }

  const handleUploadError = (error: { message: string }) => {
    setUploadError(error.message)
    toast.error(error.message)
  }

  const handleRetryUpload = () => {
    setUploadError(undefined)
  }

  // Course name to display
  const courseName = course?.name || initialCourseName || 'Course'

  // Render
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <FilesBreadcrumb
        courseId={courseId}
        courseName={courseName}
        isLoading={isLoading && !initialCourseName}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Course Files</h1>
          <p className="text-slate-600 mt-1">
            Manage PDF files for {courseName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!showUploadZone && (
            <Button
              ref={uploadButtonRef}
              onClick={() => setShowUploadZone(true)}
              disabled={!canUploadFile}
              className="cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-2" />
              Upload File
            </Button>
          )}
        </div>
      </div>

      {/* Quota Preview */}
      <QuotaPreview
        currentFileCount={fileCount}
        maxFiles={STORAGE.MAX_FILES_PER_COURSE}
        showRemaining
      />

      {/* Upload Zone */}
      {showUploadZone && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">
              Upload New File
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowUploadZone(false)
                setUploadError(undefined)
              }}
              className="cursor-pointer"
            >
              Cancel
            </Button>
          </div>
          <FileUploadZone
            onFileSelect={handleFileSelect}
            onUploadError={handleUploadError}
            onRetry={handleRetryUpload}
            isUploading={isUploading}
            progress={uploadProgress}
            uploadingFileName={uploadingFileName}
            error={uploadError}
            currentFileCount={fileCount}
            maxFiles={STORAGE.MAX_FILES_PER_COURSE}
            disabled={!canUploadFile}
          />
        </div>
      )}

      {/* Loading State */}
      {isLoading && <FileTableSkeleton />}

      {/* Error State */}
      {error && !isLoading && (
        <div className="text-center py-12">
          <p className="text-red-600">
            {error instanceof Error ? error.message : 'Failed to load files'}
          </p>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="mt-4 cursor-pointer"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && files.length === 0 && (
        <EmptyFiles
          onUploadClick={() => setShowUploadZone(true)}
          disabled={!canUploadFile}
          disabledReason={!canUploadFile ? 'limit' : undefined}
        />
      )}

      {/* File Table */}
      {!isLoading && !error && files.length > 0 && (
        <ErrorBoundary
          onReset={() => window.location.reload()}
          onError={(error) => {
            console.error('FileTable error:', error)
          }}
        >
          <FileTable
            files={files}
            onOpen={handleOpenFile}
            onDelete={handleDeleteClick}
          />
        </ErrorBoundary>
      )}

      {/* Delete Dialog */}
      <DeleteFileDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        fileName={fileToDelete?.name || ''}
        onConfirm={handleConfirmDelete}
        isLoading={deleteFileMutation.isPending}
        fileSize={fileToDelete?.fileSize ?? undefined}
        pageCount={fileToDelete?.pageCount ?? undefined}
      />
    </div>
  )
}
