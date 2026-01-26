/**
 * Test Page for FileUploader Component
 *
 * This page is used for E2E testing of the FileUploader component
 * It provides a simple environment to test all component functionality
 */

'use client'

import { useState } from 'react'
import { FileUploader } from '@/components/file/file-uploader'

export default function TestFileUploaderPage() {
  const [csrfToken] = useState(() => {
    // For testing, we'll just use a dummy token
    return 'test-csrf-token-' + Date.now()
  })

  const [fileCount, setFileCount] = useState(0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            FileUploader Component Test
          </h1>
          <p className="text-lg text-slate-600">
            This page is for E2E testing the FileUploader component
          </p>
        </div>

        {/* Test Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Test Information
          </h2>
          <div className="space-y-2 text-slate-600">
            <p>
              <strong>Course ID:</strong> test-course-e2e
            </p>
            <p>
              <strong>Current Files:</strong> {fileCount}
            </p>
            <p>
              <strong>Maximum Files:</strong> 30
            </p>
            <p>
              <strong>Max File Size:</strong> 200 MB
            </p>
            <p>
              <strong>Allowed Types:</strong> PDF files only
            </p>
          </div>
        </div>

        {/* FileUploader Component */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">
            Upload Files
          </h2>

          <FileUploader
            courseId="test-course-e2e"
            csrfToken={csrfToken}
            currentFileCount={fileCount}
            onUploadComplete={() => {
              // In a real scenario, this would fetch updated file count
              setFileCount((prev) => prev + 1)
            }}
          />
        </div>

        {/* Test Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">
            Test Instructions
          </h2>
          <ul className="space-y-2 text-blue-800 list-disc list-inside">
            <li>Use the file picker button to select PDF files</li>
            <li>Drag and drop PDF files onto the drop zone</li>
            <li>Try uploading multiple files at once</li>
            <li>Observe the upload progress and status changes</li>
            <li>Test error handling with non-PDF files</li>
            <li>Test file size validation with large files</li>
            <li>Verify retry and cancel functionality</li>
            <li>Check accessibility features (keyboard navigation, ARIA labels)</li>
          </ul>
        </div>

        {/* Notes */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-amber-900 mb-3">
            Testing Notes
          </h2>
          <ul className="space-y-2 text-amber-800 text-sm list-disc list-inside">
            <li>API calls are sent to the real backend</li>
            <li>Ensure backend services are running (R2, database, etc.)</li>
            <li>CSRF token is auto-generated for testing</li>
            <li>Upload progress is tracked in real-time</li>
            <li>Failed uploads can be retried automatically</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
