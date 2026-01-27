'use client'

/**
 * READER-002: Reader Page
 *
 * Main PDF reader page with:
 * - Two-panel layout (PDF viewer + explanation sidebar)
 * - Reading progress tracking
 * - Zoom and navigation controls
 * - Responsive design
 */

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, PanelRightOpen, PanelRightClose } from 'lucide-react'
import { useFile, useDownloadUrl, downloadFileFromUrl } from '@/hooks/use-files'
import { useReadingProgress } from '@/hooks/use-reading-progress'
import { useReaderStore } from '@/stores/reader-store'
import { PdfViewer } from '@/components/reader/pdf-viewer'
import { PdfToolbar } from '@/components/reader/pdf-toolbar'
import { ReaderHeader } from '@/components/reader/reader-header'
import { ExplanationSidebar } from '@/components/reader/explanation-sidebar'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ErrorBoundary } from '@/components/ui/error-boundary'

interface ReaderPageProps {
  params: Promise<{
    fileId: string
  }>
}

export default function ReaderPage({ params }: ReaderPageProps) {
  const { fileId } = use(params)
  const router = useRouter()
  const { toast } = useToast()

  // State
  const [isMobile, setIsMobile] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<Error | null>(null)
  const [isFetchingUrl, setIsFetchingUrl] = useState(false)

  // Hooks
  const {
    data: file,
    isLoading: isLoadingFile,
    error: fileError,
  } = useFile(fileId)
  const {
    currentPage,
    setPage,
    isLoading: isLoadingProgress,
  } = useReadingProgress(fileId)
  const downloadMutation = useDownloadUrl()

  // Reader store
  const {
    scale,
    rotation,
    isSidebarOpen,
    setScale,
    setRotation,
    toggleSidebar,
    setCurrentFile,
  } = useReaderStore()

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Initialize reader store when file loads
  useEffect(() => {
    if (file) {
      setCurrentFile(fileId, file.pageCount || 0)
    }
  }, [file, fileId, setCurrentFile])

  // Get download URL when file loads
  useEffect(() => {
    // Prevent concurrent fetches or re-fetching when URL already exists
    if (!file || pdfUrl || isFetchingUrl) return

    let cancelled = false
    let abortController: AbortController | null = null

    async function fetchDownloadUrl() {
      abortController = new AbortController()

      try {
        setIsFetchingUrl(true)
        setDownloadError(null)
        const url = await downloadMutation.mutateAsync(fileId)
        if (!cancelled && !abortController.signal.aborted) {
          setPdfUrl(url)
        }
      } catch (error) {
        // Don't show error if request was aborted
        if (!cancelled && !abortController?.signal.aborted) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
          setDownloadError(new Error(errorMessage))
          toast({
            variant: 'destructive',
            title: 'Failed to load PDF',
            description: 'Unable to get download URL. Please try again.',
          })
        }
      } finally {
        if (!cancelled && !abortController?.signal.aborted) {
          setIsFetchingUrl(false)
        }
      }
    }

    fetchDownloadUrl()

    return () => {
      cancelled = true
      if (abortController) {
        abortController.abort()
      }
    }
    // Only re-run when file or fileId changes
    // pdfUrl and isFetchingUrl are checked in the guard clause above
    // downloadMutation.mutateAsync is stable from React Query
    // toast is stable from the hook
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, fileId])

  // Handle page change
  const handlePageChange = (page: number) => {
    setPage(page)
  }

  // Handle zoom in
  const handleZoomIn = () => {
    const newScale = Math.min(scale + 0.25, 2.0)
    setScale(newScale)
  }

  // Handle zoom out
  const handleZoomOut = () => {
    const newScale = Math.max(scale - 0.25, 0.5)
    setScale(newScale)
  }

  // Handle scale change
  const handleScaleChange = (newScale: number) => {
    setScale(newScale)
  }

  // Handle rotation
  const handleRotate = () => {
    setRotation((rotation + 90) % 360)
  }

  // Handle fullscreen (placeholder - would use Fullscreen API in production)
  const handleToggleFullscreen = () => {
    toast({
      title: 'Fullscreen',
      description: 'Fullscreen mode is not yet implemented.',
    })
  }

  // Handle download
  const handleDownload = async () => {
    if (!file || !pdfUrl) return

    try {
      await downloadFileFromUrl(pdfUrl, file.name)
      toast({
        title: 'Download started',
        description: 'Your file is being downloaded.',
      })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Download failed',
        description: 'Failed to download file. Please try again.',
      })
    }
  }

  // Handle PDF load success
  const handleLoadSuccess = (numPages: number) => {
    setCurrentFile(fileId, numPages)
  }

  // Handle PDF load error
  const handleLoadError = (error: Error) => {
    toast({
      variant: 'destructive',
      title: 'Failed to load PDF',
      description: error.message,
    })
  }

  // Loading state
  if (isLoadingFile || isLoadingProgress) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading file...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (fileError || !file) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="mb-2 font-semibold">File not found</p>
            <p className="text-sm">
              {fileError?.message ||
                'The file you are looking for does not exist.'}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push('/')}
            >
              Go to Home
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Loading or error for PDF URL
  if (!pdfUrl) {
    if (downloadError) {
      return (
        <div className="flex h-screen items-center justify-center p-4">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="mb-2 font-semibold">Failed to load PDF URL</p>
              <p className="text-sm">{downloadError.message}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setDownloadError(null)
                  setPdfUrl(null)
                  setIsFetchingUrl(false)
                }}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )
    }

    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading PDF...</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen flex-col">
        {/* Header */}
        <ReaderHeader
          fileName={file.name}
          courseId={file.courseId}
          fileId={file.id}
          structureStatus={file.structureStatus}
          onDownload={handleDownload}
        />

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* PDF Viewer Area */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Viewer */}
            <div className="flex-1 overflow-auto bg-muted/30 p-4">
              <PdfViewer
                url={pdfUrl}
                initialPage={currentPage}
                onPageChange={handlePageChange}
                onLoadSuccess={handleLoadSuccess}
                onLoadError={handleLoadError}
                scale={scale}
                rotation={rotation}
              />
            </div>

            {/* Toolbar */}
            <PdfToolbar
              currentPage={currentPage}
              totalPages={file.pageCount || 0}
              scale={scale}
              isFullscreen={false}
              onPageChange={handlePageChange}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onScaleChange={handleScaleChange}
              onRotate={handleRotate}
              onToggleFullscreen={handleToggleFullscreen}
            />
          </div>

          {/* Sidebar Toggle Button (Mobile) */}
          {isMobile && (
            <Button
              variant="outline"
              size="icon"
              onClick={toggleSidebar}
              className="fixed bottom-20 right-4 z-10 shadow-lg"
              aria-label="Toggle sidebar"
            >
              {isSidebarOpen ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelRightOpen className="h-4 w-4" />
              )}
            </Button>
          )}

          {/* Sidebar Toggle Button (Desktop) */}
          {!isMobile && !isSidebarOpen && (
            <Button
              variant="outline"
              size="icon"
              onClick={toggleSidebar}
              className="absolute right-4 top-1/2 z-10 -translate-y-1/2 shadow-lg"
              aria-label="Open sidebar"
            >
              <PanelRightOpen className="h-4 w-4" />
            </Button>
          )}

          {/* Explanation Sidebar */}
          <ExplanationSidebar
            isOpen={isSidebarOpen}
            onClose={toggleSidebar}
            currentPage={currentPage}
            isMobile={isMobile}
          />
        </div>
      </div>
    </ErrorBoundary>
  )
}
