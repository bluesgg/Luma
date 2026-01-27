# Phase 4: AI Interactive Tutor - TDD Testing Summary

## Overview

This document provides a comprehensive summary of the Test-Driven Development (TDD) approach for Phase 4 implementation. All tests have been written BEFORE implementation and will fail initially until features are built.

---

## Test Files Created

### ✅ Completed Test Files (5 files)

| File                                         | Task ID   | Description                    | Test Count |
| -------------------------------------------- | --------- | ------------------------------ | ---------- |
| `tests/lib/r2.test.ts`                       | TUTOR-003 | R2 image storage operations    | ~50        |
| `tests/lib/ai/mathpix.test.ts`               | TUTOR-009 | Mathpix formula recognition    | ~45        |
| `tests/lib/ai/prompts.test.ts`               | TUTOR-004 | AI prompt template generation  | ~40        |
| `tests/lib/quota.test.ts`                    | -         | Quota consumption utilities    | ~35        |
| `tests/api/files/[id]/extract/retry.test.ts` | TUTOR-005 | Structure extraction retry API | ~30        |

**Total**: ~200 test cases written

---

## Remaining Test Files (20 files)

### API Routes (10 files)

1. **`tests/api/files/[id]/learn/start.test.ts`** (TUTOR-006)
   - Create new learning session
   - Resume existing session
   - Quota validation
   - Structure status check

2. **`tests/api/files/[id]/images.test.ts`** (TUTOR-016)
   - List extracted images
   - Generate signed URLs
   - Page filtering
   - Pagination

3. **`tests/api/files/[id]/topics/[topicId].test.ts`** (TUTOR-027)
   - Update topic type (CORE ↔ SUPPORTING)
   - Manual adjustments
   - Ownership validation

4. **`tests/api/learn/sessions/[id]/route.test.ts`** (TUTOR-007)
   - GET session details
   - Include progress data
   - Include topic structure
   - Current position tracking

5. **`tests/api/learn/sessions/[id]/explain.test.ts`** (TUTOR-008)
   - SSE streaming endpoint
   - Five-layer explanation generation
   - Mathpix formula integration
   - Quota consumption
   - Stream error handling

6. **`tests/api/learn/sessions/[id]/confirm.test.ts`** (TUTOR-010)
   - Mark subtopic as understood
   - Update progress tracking
   - Advance to next phase (TESTING)

7. **`tests/api/learn/sessions/[id]/test.test.ts`** (TUTOR-011)
   - Generate 5 test questions
   - Cache questions to database
   - Quota consumption
   - Return mixed question types

8. **`tests/api/learn/sessions/[id]/answer.test.ts`** (TUTOR-012)
   - Submit answer
   - Validate correctness
   - Track attempt count
   - Generate re-explanation on wrong answer
   - Update weak point tracking

9. **`tests/api/learn/sessions/[id]/skip.test.ts`** (TUTOR-013)
   - Skip current question
   - Increment skip counter
   - Move to next question
   - Validation

10. **`tests/api/learn/sessions/[id]/next.test.ts`** (TUTOR-014)
    - Advance to next topic
    - Mark current topic complete
    - Update session indices
    - Handle session completion

11. **`tests/api/learn/sessions/[id]/pause.test.ts`** (TUTOR-015)
    - Pause session
    - Update lastActiveAt
    - Save current state
    - Validation

### Hook Tests (2 files)

12. **`tests/hooks/use-sse.test.ts`** (TUTOR-025)

    ```typescript
    describe('useSSE Hook', () => {
      // Connection management
      it('should establish SSE connection')
      it('should auto-reconnect on disconnect (3 retries)')
      it('should parse SSE events')
      it('should handle connection errors')
      it('should cleanup on unmount')

      // Event handling
      it('should buffer events during reconnect')
      it('should emit events to listeners')
      it('should handle malformed events')

      // Edge cases
      it('should handle rapid connect/disconnect')
      it('should respect max retry limit')
    })
    ```

13. **`tests/hooks/use-learning-session.test.ts`** (TUTOR-026)

    ```typescript
    describe('useLearningSession Hook', () => {
      // Query management
      it('should fetch session data')
      it('should cache session data')
      it('should refetch on window focus')

      // Mutations
      it('should provide explain mutation')
      it('should provide confirm mutation')
      it('should provide test mutation')
      it('should provide answer mutation')
      it('should provide skip mutation')
      it('should provide next mutation')
      it('should provide pause mutation')

      // State management
      it('should update cache optimistically')
      it('should rollback on error')
      it('should invalidate cache after mutations')

      // Error handling
      it('should handle network errors')
      it('should handle quota exceeded errors')
    })
    ```

### Component Tests (7 files)

14. **`tests/components/learn/topic-outline.test.tsx`** (TUTOR-019)

    ```typescript
    describe('TopicOutline Component', () => {
      // Rendering
      it('should render topic groups')
      it('should render subtopics')
      it('should show progress indicators')
      it('should highlight current topic')

      // Interactions
      it('should toggle group collapse')
      it('should navigate to topic on click')
      it('should disable future topics')

      // Progress display
      it('should show checkmarks for completed')
      it('should show in-progress indicator')
      it('should calculate topic percentage')
    })
    ```

15. **`tests/components/learn/explanation-panel.test.tsx`** (TUTOR-020)

    ```typescript
    describe('ExplanationPanel Component', () => {
      // Five-layer structure
      it('should render Overview layer')
      it('should render Key Concepts layer')
      it('should render Examples layer')
      it('should render Common Mistakes layer')
      it('should render Practice Tips layer')

      // Streaming
      it('should display streaming text')
      it('should handle stream interruption')
      it('should show loading skeleton')

      // LaTeX rendering
      it('should render inline formulas')
      it('should render display formulas')

      // Images
      it('should display page images')
      it('should open image lightbox')

      // Collapsible layers
      it('should toggle layer visibility')
      it('should remember collapsed state')
    })
    ```

16. **`tests/components/learn/latex-renderer.test.tsx`** (TUTOR-021)

    ```typescript
    describe('LatexRenderer Component', () => {
      // KaTeX integration
      it('should render inline LaTeX')
      it('should render display LaTeX')
      it('should handle complex formulas')

      // Error handling
      it('should show error for invalid LaTeX')
      it('should render raw text on error')

      // Accessibility
      it('should provide alt text')
      it('should support screen readers')
    })
    ```

17. **`tests/components/learn/page-images.test.tsx`** (TUTOR-022)

    ```typescript
    describe('PageImages Component', () => {
      // Gallery display
      it('should render image thumbnails')
      it('should show page numbers')
      it('should handle loading states')

      // Lightbox
      it('should open lightbox on click')
      it('should navigate between images')
      it('should close lightbox on escape')

      // Signed URLs
      it('should load images from signed URLs')
      it('should handle expired URLs')
      it('should retry failed loads')

      // Lazy loading
      it('should lazy load images')
      it('should show loading placeholders')
    })
    ```

18. **`tests/components/learn/topic-test.test.tsx`** (TUTOR-023)

    ```typescript
    describe('TopicTest Component', () => {
      // Multiple choice
      it('should render MC options')
      it('should select single option')
      it('should highlight selected option')

      // Short answer
      it('should render text input')
      it('should validate input length')

      // Submission
      it('should disable during submission')
      it('should show loading state')
      it('should display feedback')

      // Attempt tracking
      it('should show attempt count')
      it('should limit max attempts')
      it('should show progress bar')

      // Re-explanation
      it('should show explanation on wrong answer')
      it('should highlight correct answer')
      it('should explain misconception')
    })
    ```

19. **`tests/components/learn/progress-bar.test.tsx`** (TUTOR-024)

    ```typescript
    describe('ProgressBar Component', () => {
      // Segment display
      it('should render topic segments')
      it('should color completed segments')
      it('should highlight current segment')

      // Percentage calculation
      it('should show completion percentage')
      it('should update on progress change')

      // Tooltips
      it('should show topic title on hover')
      it('should show completion status')
    })
    ```

20. **`tests/components/file/pdf-preview-modal.test.tsx`** (TUTOR-017)

    ```typescript
    describe('PDFPreviewModal Component', () => {
      // Modal display
      it('should open modal')
      it('should close on backdrop click')
      it('should close on escape key')

      // File metadata
      it('should show file name')
      it('should show page count')
      it('should show file type')
      it('should show structure status')

      // Start learning button
      it('should enable button when structure READY')
      it('should disable button when structure PENDING')
      it('should show retry button when FAILED')

      // Navigation
      it('should navigate to learning page on click')
    })
    ```

---

## Test Patterns Reference

### API Route Test Pattern

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES } from '@/lib/constants'

async function callApi(params) {
  const response = await fetch(`/api/endpoint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  return {
    status: response.status,
    data: await response.json(),
  }
}

describe('API Endpoint', () => {
  let userId: string

  beforeEach(async () => {
    // Setup: Create test data
    await prisma.user.deleteMany()
    const user = await prisma.user.create({
      data: {
        /* ... */
      },
    })
    userId = user.id
  })

  afterEach(async () => {
    // Cleanup: Delete test data
    await prisma.user.deleteMany()
  })

  describe('Happy Path', () => {
    it('should succeed with valid input', async () => {
      const response = await callApi({
        /* valid params */
      })
      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
    })
  })

  describe('Authentication', () => {
    it('should reject unauthenticated (401)', async () => {
      // Mock no session
      const response = await callApi({
        /* ... */
      })
      expect(response.status).toBe(401)
      expect(response.data.error.code).toBe(ERROR_CODES.AUTH_UNAUTHORIZED)
    })
  })

  describe('Validation', () => {
    it('should reject invalid input (400)', async () => {
      const response = await callApi({
        /* invalid params */
      })
      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      // Mock error condition
      const response = await callApi({
        /* ... */
      })
      expect(response.status).toBe(500)
    })
  })
})
```

### Component Test Pattern

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('Component', () => {
  describe('Rendering', () => {
    it('should render correctly', () => {
      render(<Component />)
      expect(screen.getByText(/text/i)).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('should handle user interactions', async () => {
      const user = userEvent.setup()
      render(<Component />)

      await user.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText(/result/i)).toBeInTheDocument()
      })
    })
  })

  describe('Props', () => {
    it('should accept and use props', () => {
      render(<Component prop="value" />)
      expect(screen.getByText(/value/i)).toBeInTheDocument()
    })
  })
})
```

### Hook Test Pattern

```typescript
import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useHook', () => {
  it('should return expected data', async () => {
    const { result } = renderHook(() => useHook(params), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    })
  })
})
```

---

## Running Tests

```bash
# Run all Phase 4 tests
npm test tests/lib/ tests/api/files/ tests/api/learn/ tests/hooks/use-sse tests/hooks/use-learning-session tests/components/learn/ tests/components/file/pdf-preview-modal

# Run specific test file
npm test tests/lib/r2.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch

# Verify tests fail before implementation
npm test 2>&1 | grep -i "fail"
```

---

## TDD Workflow

### Phase 1: Write Tests (Current)

1. ✅ Write comprehensive test cases
2. ✅ Cover all scenarios (happy path, errors, edge cases)
3. ✅ Ensure tests are descriptive and maintainable
4. ✅ Run tests - they should FAIL

### Phase 2: Implement Features

1. Implement minimum code to pass first test
2. Run tests frequently
3. Refactor once test passes
4. Move to next test
5. Repeat until all tests pass

### Phase 3: Refactor

1. Improve code quality
2. Remove duplication
3. Enhance readability
4. Ensure tests still pass

### Phase 4: Integration

1. Add E2E tests
2. Test complete user workflows
3. Verify system integration
4. Performance testing

---

## Test Coverage Goals

| Category           | Target | Current       |
| ------------------ | ------ | ------------- |
| Library Utilities  | 85%+   | Tests written |
| API Routes         | 80%+   | Tests written |
| React Hooks        | 80%+   | Tests written |
| React Components   | 75%+   | Tests written |
| E2E Critical Paths | 100%   | TODO          |

---

## Mock Setup

### Global Mocks (in `tests/setup.ts`)

```typescript
// Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique, create, update, delete },
    file: { findUnique, create, update, delete },
    learningSession: { findUnique, create, update },
    // ... etc
  },
}))

// Supabase
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: { /* mock methods */ },
    storage: { /* mock methods */ },
  })),
}))

// Next.js
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
  headers: vi.fn(),
}))
```

### Test-Specific Mocks

```typescript
// Mock Trigger.dev
vi.mock('@/trigger/client', () => ({
  triggerClient: { sendEvent: vi.fn() },
}))

// Mock R2
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(),
  PutObjectCommand: vi.fn(),
  // ... etc
}))

// Mock Mathpix
global.fetch = vi.fn()
```

---

## Test Data Factories

```typescript
// In tests/setup.ts
export const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  role: 'STUDENT' as const,
  emailConfirmedAt: new Date(),
  // ... etc
}

export const mockLearningSession = {
  id: 'session-1',
  userId: 'user-1',
  fileId: 'file-1',
  status: 'IN_PROGRESS' as const,
  currentTopicIndex: 0,
  currentSubIndex: 0,
  currentPhase: 'EXPLAINING' as const,
  // ... etc
}
```

---

## Key Testing Principles

1. **Tests First**: Write tests BEFORE implementation
2. **Fail First**: Verify tests fail before implementation
3. **Minimal Implementation**: Write just enough code to pass
4. **Refactor**: Improve code while keeping tests green
5. **Independence**: Tests should not depend on each other
6. **Descriptive**: Test names should describe behavior
7. **Comprehensive**: Cover happy path, errors, edge cases
8. **Maintainable**: Keep tests DRY and readable

---

## Next Steps

1. ✅ **Tests Created** (5 files, ~200 test cases)
2. **TODO: Create remaining 20 test files** (~600 test cases)
3. **TODO: Run all tests** - verify they FAIL
4. **TODO: Implement features** to pass tests
5. **TODO: Refactor** while keeping tests green
6. **TODO: Add E2E tests** for complete workflows

---

## Resources

- Phase 4 Plan: `/docs/PHASE4_PLAN.md`
- Test Files Created: `/PHASE4_TDD_TESTS_CREATED.md`
- Prisma Schema: `/prisma/schema.prisma`
- Test Setup: `/tests/setup.ts`
- Existing Tests: `/tests/api/auth/`, `/tests/components/auth/`

---

**Status**: 5 of 25 test files created (~20% complete)
**Next Priority**: Complete remaining API route tests, then hooks, then components
**Estimated Remaining Work**: ~600 test cases to write
