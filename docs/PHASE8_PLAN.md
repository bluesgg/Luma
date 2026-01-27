# Phase 8: PDF Reader - Implementation Plan

> **Version**: 1.0
> **Last Updated**: 2026-01-27

---

## Executive Summary

Phase 8 implements the PDF Reader module, enabling users to view PDF files with full navigation controls and persistent reading progress tracking. The module integrates with the existing file management system and follows established patterns for API routes, hooks, and components.

---

## READER-001: PDF Viewer Component

### Technical Decision: PDF Library Selection

**Recommendation: `react-pdf` (wrapping `pdfjs-dist`)**

Rationale:

- Already specified in the tech design document
- `pdfjs-dist` is already a transitive dependency in `package-lock.json`
- Better React integration compared to raw pdf.js
- Active maintenance and good TypeScript support

### Files to Create

1. **`src/components/reader/pdf-viewer.tsx`**
   - Main PDF viewer component
   - Uses `react-pdf` Document and Page components
   - Implements virtualized rendering for performance

2. **`src/components/reader/pdf-toolbar.tsx`**
   - Navigation controls (prev/next page, page input)
   - Zoom controls (zoom in/out, fit to width/height, percentage selector)
   - Rotation control
   - Fullscreen toggle

3. **`src/components/reader/pdf-page.tsx`**
   - Single page renderer with loading placeholder
   - Handles rotation and zoom transformations

4. **`src/components/reader/pdf-loading-skeleton.tsx`**
   - Loading state for PDF content
   - Follows existing Skeleton pattern

### Component Structure

```typescript
// pdf-viewer.tsx - Props interface
interface PdfViewerProps {
  url: string
  initialPage?: number
  onPageChange?: (page: number) => void
  onLoadSuccess?: (numPages: number) => void
  onLoadError?: (error: Error) => void
  className?: string
}
```

### Key Implementation Details

1. **PDF Worker Setup**: Configure pdf.js worker for better performance

   ```typescript
   import { pdfjs } from 'react-pdf'
   pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`
   ```

2. **Zoom Levels**: 50%, 75%, 100%, 125%, 150%, 200%, "Fit Width", "Fit Page"

3. **Page Navigation**:
   - Prev/Next buttons
   - Direct page input with validation
   - Keyboard shortcuts (Left/Right arrows, Page Up/Down)

4. **Error Handling States**:
   - File not found
   - Invalid PDF
   - Network error
   - PDF password protected (show message, not supported)

### Dependencies to Add

```json
{
  "react-pdf": "^9.0.0"
}
```

---

## READER-002: Reader Page Layout

### Files to Create

1. **`src/app/(main)/reader/[fileId]/page.tsx`**
   - Main reader page component
   - Two-panel layout: PDF viewer (main) + Explanation panel (collapsible right)

2. **`src/components/reader/reader-header.tsx`**
   - Back navigation
   - File name display
   - Action buttons (download, start learning)

3. **`src/components/reader/explanation-sidebar.tsx`**
   - Collapsible right sidebar
   - Displays AI explanations for current page
   - Reuses patterns from existing explanation panel

### Layout Structure

```
+------------------------------------------+
|  Header (back, file name, actions)        |
+------------------------------------------+
|                          |               |
|                          |  Explanation  |
|   PDF Viewer             |    Panel      |
|   (flex-grow)            |  (collapsible)|
|                          |  (320px)      |
|                          |               |
+------------------------------------------+
|  Toolbar (page nav, zoom, fullscreen)    |
+------------------------------------------+
```

### Page Component Implementation Pattern

```typescript
// page.tsx structure
interface PageProps {
  params: Promise<{ fileId: string }>
}

export default function ReaderPage({ params }: PageProps) {
  const { fileId } = use(params)
  // Use useFile hook for file data
  // Use useReadingProgress hook for progress
  // Use useReaderStore for UI state
}
```

### Responsive Behavior

- **Desktop (>1024px)**: Two-panel layout, sidebar visible by default
- **Tablet (768-1024px)**: Two-panel layout, sidebar hidden by default
- **Mobile (<768px)**: Single column, sidebar as slide-over sheet

---

## READER-003: Reading Progress API

### Files to Create

1. **`src/app/api/files/[id]/progress/route.ts`**
   - GET: Fetch current reading progress
   - PATCH: Update current page

### API Specification

**GET `/api/files/:id/progress`**

Request: None (authentication via session cookie)

Response (200):

```json
{
  "success": true,
  "data": {
    "currentPage": 1,
    "updatedAt": "2026-01-27T12:00:00Z"
  }
}
```

**PATCH `/api/files/:id/progress`**

Request:

```json
{
  "currentPage": 15
}
```

Response (200):

```json
{
  "success": true,
  "data": {
    "currentPage": 15,
    "updatedAt": "2026-01-27T12:00:00Z"
  }
}
```

### Zod Validation Schema

```typescript
const updateProgressSchema = z.object({
  currentPage: z.number().int().min(1).max(500),
})
```

### Database Operations

Using existing `ReadingProgress` model from Prisma schema:

```typescript
// Upsert pattern
await prisma.readingProgress.upsert({
  where: {
    userId_fileId: { userId: user.id, fileId },
  },
  update: { currentPage },
  create: { userId: user.id, fileId, currentPage },
})
```

---

## READER-004: useReadingProgress Hook

### Files to Create

1. **`src/hooks/use-reading-progress.ts`**
   - TanStack Query hook for reading progress
   - Debounced mutation for page updates

2. **`src/lib/api/progress.ts`**
   - API client functions for progress endpoints

### Hook Implementation

```typescript
// use-reading-progress.ts

// Query keys
export const progressKeys = {
  all: ['reading-progress'] as const,
  detail: (fileId: string) => [...progressKeys.all, fileId] as const,
}

// Main hook
export function useReadingProgress(fileId: string | undefined) {
  const queryClient = useQueryClient()
  const [localPage, setLocalPage] = useState<number | null>(null)

  // Debounced update function (300ms)
  const debouncedUpdate = useDebouncedCallback(async (page: number) => {
    await updateProgressMutation.mutateAsync({ fileId: fileId!, page })
  }, 300)

  // Query for initial progress
  const query = useQuery({
    queryKey: fileId ? progressKeys.detail(fileId) : [],
    queryFn: () => getProgress(fileId!),
    enabled: !!fileId,
    staleTime: 30000,
  })

  // Combined page (local state for immediate UI, server state as backup)
  const currentPage = localPage ?? query.data?.currentPage ?? 1

  // Update function that sets local state immediately and debounces server update
  const setPage = useCallback(
    (page: number) => {
      setLocalPage(page)
      debouncedUpdate(page)
    },
    [debouncedUpdate]
  )

  return {
    currentPage,
    setPage,
    isLoading: query.isLoading,
    isSaving: updateProgressMutation.isPending,
    error: query.error,
  }
}
```

---

## Test Files to Create

### Unit Tests

1. **`tests/hooks/use-reading-progress.test.ts`**
   - Test query fetching
   - Test debounced updates
   - Test local state management
   - Test error handling

2. **`tests/api/files/[id]/progress.test.ts`**
   - Test GET endpoint (auth, ownership, response format)
   - Test PATCH endpoint (validation, upsert behavior)

3. **`tests/components/reader/pdf-viewer.test.tsx`**
   - Test loading states
   - Test page navigation
   - Test zoom controls
   - Test error states

### E2E Tests

4. **`tests/e2e/reader.spec.ts`**
   - Test page load with file
   - Test page navigation
   - Test zoom controls
   - Test progress persistence
   - Test sidebar toggle
   - Test responsive behavior

---

## Implementation Sequence

### Phase 1: Foundation

1. Add `react-pdf` dependency
2. Create PDF viewer component with basic rendering
3. Create toolbar component

### Phase 2: API Layer

4. Create progress API route
5. Create API client functions
6. Write API tests (TDD)

### Phase 3: State Management

7. Create useReadingProgress hook
8. Integrate with useReaderStore
9. Write hook tests (TDD)

### Phase 4: Page Layout

10. Create reader page
11. Create explanation sidebar
12. Create reader header
13. Implement responsive behavior

### Phase 5: Polish & Testing

14. Write E2E tests
15. Add loading skeletons
16. Error boundary handling
17. Accessibility improvements (keyboard navigation)

---

## Dependencies Summary

### New NPM Packages

```json
{
  "react-pdf": "^9.0.0",
  "use-debounce": "^10.0.0"
}
```

### Files to Modify

1. `package.json` - Add dependencies
2. `src/hooks/index.ts` - Export new hooks
3. `src/lib/constants.ts` - Add error codes

---

## Critical Reference Files

1. **`src/app/api/files/[id]/route.ts`** - Pattern reference for API routes with file ownership validation
2. **`src/hooks/use-files.ts`** - Pattern reference for TanStack Query hooks with mutations
3. **`src/stores/reader-store.ts`** - Existing Zustand store to integrate with (already has scale, rotation, sidebar state)
4. **`prisma/schema.prisma`** - ReadingProgress model definition
5. **`src/app/(main)/learn/[sessionId]/page.tsx`** - Pattern reference for complex page layouts with multi-panel design
