# File Upload Feature - Quick Start Guide

## For Developers

This guide helps you quickly understand and work with the multi-file upload feature.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    FileUploader                         │
│  (Main component with drag-and-drop)                    │
│                                                          │
│  ┌────────────────────────────────────────────┐        │
│  │    useMultiFileUpload Hook                 │        │
│  │  - Queue management                        │        │
│  │  - Concurrent upload control (max 3)       │        │
│  │  - Retry logic (max 3 attempts)            │        │
│  │  - Progress tracking                       │        │
│  └────────────────────────────────────────────┘        │
│                                                          │
│  ┌────────────────────────────────────────────┐        │
│  │    FileUploadItem (repeated)               │        │
│  │  - Status display                          │        │
│  │  - Progress bar                            │        │
│  │  - Action buttons                          │        │
│  └────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │    Upload Flow                 │
         │  1. Get signed URL             │
         │  2. Upload to R2               │
         │  3. Confirm upload             │
         │  4. Trigger processing         │
         └────────────────────────────────┘
```

## Quick Usage

### Basic Implementation

```typescript
import { FileUploader } from '@/components/file/file-uploader'

export function CoursePage({ courseId }: { courseId: string }) {
  const [csrfToken, setCsrfToken] = useState('')
  const [fileCount, setFileCount] = useState(0)

  useEffect(() => {
    // Get CSRF token
    fetch('/api/auth/csrf')
      .then(res => res.json())
      .then(data => setCsrfToken(data.token))

    // Get current file count
    fetch(`/api/courses/${courseId}/files`)
      .then(res => res.json())
      .then(data => setFileCount(data.data.length))
  }, [courseId])

  return (
    <FileUploader
      courseId={courseId}
      csrfToken={csrfToken}
      currentFileCount={fileCount}
      onUploadComplete={() => setFileCount(prev => prev + 1)}
    />
  )
}
```

### Using the Hook Directly

```typescript
import { useMultiFileUpload } from '@/hooks/use-multi-file-upload'

export function CustomUploader({ courseId, csrfToken }) {
  const { queue, stats, addFiles, cancel, retry, remove } = useMultiFileUpload(
    courseId,
    csrfToken,
    currentFileCount
  )

  return (
    <div>
      <input
        type="file"
        multiple
        accept=".pdf"
        onChange={(e) => addFiles(Array.from(e.target.files || []))}
      />

      {queue.map((item) => (
        <div key={item.id}>
          <p>{item.file.name}</p>
          <p>{item.status}</p>
          {item.status === 'uploading' && <progress value={item.progress} max={100} />}
          {item.status === 'failed' && <button onClick={() => retry(item.id)}>Retry</button>}
        </div>
      ))}

      <p>
        {stats.completed} of {stats.total} completed
      </p>
    </div>
  )
}
```

## Upload States

| State | Description | User Actions | Visual |
|-------|-------------|--------------|--------|
| `pending` | Waiting in queue | Cancel | Grey border |
| `uploading` | Currently uploading | Cancel | Blue border, progress bar |
| `processing` | Server processing | None | Blue border, spinner |
| `completed` | Upload successful | Remove | Green border, checkmark |
| `failed` | Upload failed | Retry, Remove | Red border, error icon |

## Business Rules

### File Validation
```typescript
// Automatic validation happens in the hook
const rules = {
  fileType: 'PDF only',           // .pdf files
  maxSize: 200 * 1024 * 1024,     // 200MB
  maxFiles: 30,                   // per course
  concurrent: 3,                  // max simultaneous uploads
  retries: 3,                     // max retry attempts
}
```

### Upload Flow
```typescript
// 1. Get signed upload URL
POST /api/files/upload-url
{
  courseId: string
  fileName: string
  fileSize: number
}
→ { fileId, uploadUrl, token }

// 2. Upload to R2
PUT <uploadUrl>
Headers: { "X-Custom-Auth-Key": token }
Body: <file binary>

// 3. Confirm upload
POST /api/files/confirm-upload
{ fileId: string }
→ { success: true }

// 4. Processing happens async (webhook/job)
```

## Testing

### Run Tests
```bash
# All upload tests
npm test -- tests/hooks/use-multi-file-upload.test.ts
npm test -- tests/components/file/

# Specific test
npm test -- -t "uploads single file"

# Watch mode
npm test -- --watch tests/hooks/use-multi-file-upload.test.ts

# Coverage
npm run test:coverage -- tests/hooks/use-multi-file-upload.test.ts
```

### Write New Tests
```typescript
import { renderHook, act } from '@testing-library/react'
import { useMultiFileUpload } from '@/hooks/use-multi-file-upload'

describe('useMultiFileUpload', () => {
  it('validates file size', () => {
    const { result } = renderHook(() =>
      useMultiFileUpload(courseId, token)
    )

    const largeFile = createFile(300 * 1024 * 1024) // 300MB

    act(() => {
      result.current.addFiles([largeFile])
    })

    expect(result.current.queue[0].status).toBe('failed')
    expect(result.current.queue[0].error).toContain('200 MB')
  })
})
```

## Common Tasks

### Add File Type Support
```typescript
// src/hooks/use-multi-file-upload.ts
const validateFile = useCallback((file: File) => {
  // Change this to support more types
  const isPdf = file.type === 'application/pdf' ||
                file.name.toLowerCase().endsWith('.pdf')

  // Add more types
  const allowedTypes = ['.pdf', '.docx', '.txt']
  const isAllowed = allowedTypes.some(ext =>
    file.name.toLowerCase().endsWith(ext)
  )

  if (!isAllowed) {
    return { valid: false, error: 'Invalid file type' }
  }
  // ...
}, [])
```

### Change Upload Limit
```typescript
// src/lib/constants.ts
export const STORAGE = {
  MAX_FILE_SIZE: 500 * 1024 * 1024, // Change to 500MB
  MAX_FILES_PER_COURSE: 50,         // Change to 50 files
}

// src/hooks/use-multi-file-upload.ts
const MAX_CONCURRENT_UPLOADS = 5 // Change to 5 concurrent
const MAX_RETRY_ATTEMPTS = 5     // Change to 5 retries
```

### Customize UI
```typescript
// src/components/file/file-upload-item.tsx
const borderColor = {
  pending: 'border-slate-200',      // Change colors
  uploading: 'border-indigo-300',   // Change colors
  processing: 'border-indigo-300',  // Change colors
  completed: 'border-green-200',    // Change colors
  failed: 'border-red-200',         // Change colors
}[status]
```

### Add Upload Analytics
```typescript
// src/hooks/use-multi-file-upload.ts
const uploadFile = useCallback(async (item: UploadItem) => {
  const startTime = Date.now()

  try {
    // ... upload logic ...

    // Track successful upload
    analytics.track('file_uploaded', {
      fileSize: item.file.size,
      duration: Date.now() - startTime,
      retries: item.retries,
    })
  } catch (error) {
    // Track failed upload
    analytics.track('file_upload_failed', {
      error: error.message,
      retries: item.retries,
    })
  }
}, [])
```

## Troubleshooting

### Upload Stuck at 0%
```typescript
// Check network tab for failed requests
// Verify CSRF token is valid
console.log('CSRF Token:', csrfToken)

// Verify API endpoint is accessible
fetch('/api/files/upload-url', {
  method: 'POST',
  headers: { 'x-csrf-token': csrfToken },
  body: JSON.stringify({ courseId, fileName: 'test.pdf', fileSize: 1024 })
})
```

### Too Many Concurrent Uploads
```typescript
// Check the hook state
const { stats } = useMultiFileUpload(courseId, token)
console.log('Uploading:', stats.uploading) // Should be ≤3

// If >3, check the upload limiter in hook
```

### Upload Failing Silently
```typescript
// Add error logging in hook
const uploadFile = useCallback(async (item: UploadItem) => {
  try {
    // ... upload logic ...
  } catch (error) {
    console.error('Upload error:', error) // Add this
    // ... error handling ...
  }
}, [])
```

### Memory Issues with Large Files
```typescript
// Use chunked upload for files >100MB
// Split file into chunks and upload sequentially
const CHUNK_SIZE = 10 * 1024 * 1024 // 10MB chunks

async function uploadInChunks(file: File, uploadUrl: string) {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE
    const end = Math.min(start + CHUNK_SIZE, file.size)
    const chunk = file.slice(start, end)

    await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Range': `bytes ${start}-${end - 1}/${file.size}`,
      },
      body: chunk,
    })

    // Update progress
    const progress = Math.round(((i + 1) / totalChunks) * 100)
    setQueue(prev => prev.map(item =>
      item.id === itemId ? { ...item, progress } : item
    ))
  }
}
```

## API Reference

### `useMultiFileUpload(courseId, csrfToken, currentFileCount?)`

**Returns**:
```typescript
{
  queue: UploadItem[]
  stats: {
    total: number
    pending: number
    uploading: number
    processing: number
    completed: number
    failed: number
  }
  addFiles: (files: File[]) => void
  cancel: (itemId: string) => void
  retry: (itemId: string) => void
  remove: (itemId: string) => void
  clearAll: () => void
}
```

### `FileUploader` Props
```typescript
{
  courseId: string              // Course ID
  csrfToken: string             // CSRF token for API calls
  currentFileCount?: number     // Current files in course
  onUploadComplete?: () => void // Called when upload completes
  className?: string            // Additional CSS classes
}
```

### `FileUploadItem` Props
```typescript
{
  item: UploadItem              // Upload item to display
  onCancel: (id: string) => void
  onRetry: (id: string) => void
  onRemove: (id: string) => void
}
```

## Performance Tips

1. **Limit Concurrent Uploads**: Max 3 concurrent to avoid overwhelming browser
2. **File Size Validation**: Validate size client-side before upload
3. **Progress Throttling**: Throttle progress updates to reduce re-renders
4. **Cleanup**: Remove completed items to avoid memory buildup
5. **Chunked Upload**: Use chunks for files >100MB

## Security Considerations

1. **CSRF Protection**: Always include CSRF token in API requests
2. **File Type Validation**: Validate on both client and server
3. **Size Limits**: Enforce limits on both client and server
4. **Signed URLs**: Use time-limited signed URLs for R2 uploads
5. **Path Traversal**: Sanitize file names to prevent path attacks

## Resources

- [Test Plan](./TEST_PLAN.md) - Comprehensive test documentation
- [TDD Summary](./TDD_FILE_UPLOAD_SUMMARY.md) - Implementation summary
- [API Documentation](./API.md) - API endpoints reference
- [PRD](./PRD.md) - Product requirements
- [Test Suite](../tests/README.md) - Testing guide

## Support

**Found a bug?** Create an issue with:
- Steps to reproduce
- Expected vs actual behavior
- Browser/environment info
- Console errors

**Need help?** Check:
1. Test files for examples
2. This quick start guide
3. Component source code
4. Team documentation
