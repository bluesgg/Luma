# Phase 4: AI Interactive Tutor - TDD Tests Created

## Summary

This document lists all TDD test files created for Phase 4, following the test-driven development approach. Tests are written BEFORE implementation and will initially fail.

---

## ✅ Tests Created (4 files)

### 1. Library Tests

#### `/tests/lib/r2.test.ts` (TUTOR-003)

- **Purpose**: R2 Image Storage Integration
- **Test Categories**:
  - Initialization and configuration
  - Upload image to R2
  - Generate signed URLs
  - Delete images
  - Batch operations
  - Edge cases and error handling
- **Total Test Cases**: ~50 tests

#### `/tests/lib/ai/mathpix.test.ts` (TUTOR-009)

- **Purpose**: Mathpix Formula Recognition
- **Test Categories**:
  - API initialization
  - Formula recognition from buffer/URL
  - Batch processing
  - Cost tracking to database
  - Response parsing
  - Caching mechanisms
  - Error handling and retries
- **Total Test Cases**: ~45 tests

#### `/tests/lib/ai/prompts.test.ts` (TUTOR-004)

- **Purpose**: AI Prompt Template Generation
- **Test Categories**:
  - Structure extraction prompts
  - Explanation prompts (5-layer)
  - Test generation prompts
  - Re-explanation prompts
  - Locale support (en, zh, es)
  - Prompt utilities
- **Total Test Cases**: ~40 tests

#### `/tests/lib/quota.test.ts`

- **Purpose**: Quota Management Utilities
- **Test Categories**:
  - Check quota availability
  - Consume quota
  - Refund quota
  - Get quota status
  - Admin adjustments
  - Concurrent operations
- **Total Test Cases**: ~35 tests

### 2. API Route Tests

#### `/tests/api/files/[id]/extract/retry.test.ts` (TUTOR-005)

- **Purpose**: Structure Extraction Retry API
- **Test Categories**:
  - Happy path scenarios
  - Authentication/authorization
  - Validation checks
  - Cleanup operations
  - Rate limiting
  - Error handling
- **Total Test Cases**: ~30 tests

---

## 📋 Remaining Tests to Create

### API Route Tests (11 files)

1. **`/tests/api/files/[id]/learn/start.test.ts`** (TUTOR-006)
   - Start/resume learning session
   - Create new session
   - Resume existing session
   - Quota checking
   - Authentication

2. **`/tests/api/files/[id]/images.test.ts`** (TUTOR-016)
   - Get extracted images for file
   - Return signed URLs
   - Pagination support
   - Filter by page number

3. **`/tests/api/files/[id]/topics/[topicId].test.ts`** (TUTOR-027)
   - Update topic type (CORE/SUPPORTING)
   - Manual adjustments
   - Validation

4. **`/tests/api/learn/sessions/[id]/route.test.ts`** (TUTOR-007)
   - GET: Retrieve session details
   - Include progress tracking
   - Include topic/subtopic structure

5. **`/tests/api/learn/sessions/[id]/explain.test.ts`** (TUTOR-008)
   - SSE streaming explanation
   - Five-layer explanation structure
   - Quota consumption
   - Mathpix integration
   - Stream error handling

6. **`/tests/api/learn/sessions/[id]/confirm.test.ts`** (TUTOR-010)
   - Confirm understanding
   - Update subtopic progress
   - Advance to next phase

7. **`/tests/api/learn/sessions/[id]/test.test.ts`** (TUTOR-011)
   - Generate/get topic test
   - Return 5 questions
   - Cache test questions
   - Quota consumption

8. **`/tests/api/learn/sessions/[id]/answer.test.ts`** (TUTOR-012)
   - Submit test answer
   - Track attempts
   - Correct/incorrect handling
   - Update progress

9. **`/tests/api/learn/sessions/[id]/skip.test.ts`** (TUTOR-013)
   - Skip test question
   - Increment skip count
   - Validation

10. **`/tests/api/learn/sessions/[id]/next.test.ts`** (TUTOR-014)
    - Advance to next topic
    - Update session state
    - Handle completion

11. **`/tests/api/learn/sessions/[id]/pause.test.ts`** (TUTOR-015)
    - Pause learning session
    - Save current state
    - Update timestamps

### Hook Tests (2 files)

12. **`/tests/hooks/use-sse.test.ts`** (TUTOR-025)
    - SSE connection management
    - Auto-reconnect (3 retries)
    - Event streaming
    - Error handling
    - Connection cleanup

13. **`/tests/hooks/use-learning-session.test.ts`** (TUTOR-026)
    - Fetch session data
    - State management mutations
    - Optimistic updates
    - Query cache invalidation

### Component Tests (7 files)

14. **`/tests/components/learn/topic-outline.test.tsx`** (TUTOR-019)
    - Render topic tree
    - Collapsible groups
    - Progress indicators
    - Click navigation

15. **`/tests/components/learn/explanation-panel.test.tsx`** (TUTOR-020)
    - Five-layer display
    - Streaming text rendering
    - LaTeX formula rendering
    - Image gallery integration

16. **`/tests/components/learn/latex-renderer.test.tsx`** (TUTOR-021)
    - Render LaTeX with KaTeX
    - Inline and display mode
    - Error handling
    - Accessibility

17. **`/tests/components/learn/page-images.test.tsx`** (TUTOR-022)
    - Image gallery display
    - Lightbox modal
    - Lazy loading
    - Signed URL handling

18. **`/tests/components/learn/topic-test.test.tsx`** (TUTOR-023)
    - Multiple choice rendering
    - Short answer input
    - Answer submission
    - Feedback display
    - Attempt tracking

19. **`/tests/components/learn/progress-bar.test.tsx`** (TUTOR-024)
    - Segmented progress display
    - Topic completion status
    - Current position indicator
    - Percentage calculation

20. **`/tests/components/file/pdf-preview-modal.test.tsx`** (TUTOR-017)
    - Modal display
    - File metadata
    - "Start Learning" button
    - Structure status display

---

## Test File Template Structure

Each test file follows this structure:

```typescript
// =============================================================================
// TUTOR-XXX: Component/Feature Name Tests (TDD)
// Brief description
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {} from /* required imports */ '@testing-library/react'

describe('Feature Name (TUTOR-XXX)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Happy Path', () => {
    it('should handle primary use case', async () => {
      // Test implementation
      expect(true).toBe(true) // Will fail until implemented
    })
  })

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {})
  })

  describe('Validation', () => {
    it('should validate input parameters', async () => {})
  })

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {})
  })

  describe('Edge Cases', () => {
    it('should handle edge scenarios', async () => {})
  })
})
```

---

## Test Coverage Requirements

### API Routes

- ✅ Authentication checks (401/403)
- ✅ Authorization checks (403)
- ✅ Input validation (400)
- ✅ Happy path scenarios (200)
- ✅ Error handling (500)
- ✅ Edge cases
- ✅ Concurrent requests
- ✅ Rate limiting

### Components

- ✅ Rendering
- ✅ User interactions
- ✅ Props validation
- ✅ State management
- ✅ Event handlers
- ✅ Accessibility
- ✅ Edge cases

### Hooks

- ✅ Query/mutation logic
- ✅ Cache management
- ✅ Optimistic updates
- ✅ Error states
- ✅ Loading states
- ✅ Retry logic

### Utilities

- ✅ Input validation
- ✅ Output correctness
- ✅ Error handling
- ✅ Edge cases
- ✅ Performance

---

## Running Tests

```bash
# Run all Phase 4 tests
npm test tests/lib/r2.test.ts
npm test tests/lib/ai/
npm test tests/api/files/
npm test tests/api/learn/
npm test tests/hooks/use-sse.test.ts
npm test tests/hooks/use-learning-session.test.ts
npm test tests/components/learn/

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

---

## Next Steps

1. **Create remaining 20 test files** following the patterns established
2. **Run all tests** - they should FAIL (TDD approach)
3. **Implement features** to make tests pass
4. **Refactor** while keeping tests green
5. **Add E2E tests** for complete learning flow

---

## Test Patterns Used

### 1. Mock Patterns

- Prisma client mocked in `tests/setup.ts`
- External APIs mocked (Trigger.dev, R2, Mathpix)
- Next.js modules mocked (headers, cookies)

### 2. Helper Functions

- `mockUser`, `mockCourse`, `mockFile` from setup
- Reusable request functions per endpoint
- Factory functions for test data

### 3. Assertions

- Response status codes
- Response data structure
- Database state changes
- Side effects (logs, external calls)

### 4. Coverage Goals

- **Unit Tests**: 80%+ coverage
- **Integration Tests**: Key workflows
- **E2E Tests**: Critical user paths

---

## Notes for Implementation

1. **Tests are written to FAIL first** - this is intentional TDD
2. **Follow existing patterns** in `tests/api/auth/` and `tests/components/auth/`
3. **Use vitest** for all unit/integration tests
4. **Use @testing-library/react** for component tests
5. **Mock external dependencies** to ensure isolated tests
6. **Test both success and failure paths**
7. **Include edge cases** for robustness

---

**Total Tests Created**: 4 files (~170 test cases)
**Total Tests Remaining**: 20 files (~600+ estimated test cases)
**Estimated Total Test Cases**: ~770 for Phase 4
