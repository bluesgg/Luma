# Phase 8: PDF Reader - Testing Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate Prisma Client
```bash
npm run db:generate
```

### 3. Run Tests

#### Run All Tests
```bash
npm test
```

#### Run Specific Test Suites
```bash
# API tests
npm test tests/api/files/[id]/progress.test.ts

# Hook tests
npm test tests/hooks/use-reading-progress.test.ts

# Component tests
npm test tests/components/reader/pdf-viewer.test.tsx

# E2E tests
npm run test:e2e tests/e2e/reader.spec.ts
```

#### Run Tests with UI
```bash
npm run test:ui
```

## Test Coverage Overview

### API Tests (progress.test.ts)

**Total Test Cases**: ~80

**Categories**:
- ✅ GET /api/files/[id]/progress
  - Happy path (existing progress, default page 1)
  - Authentication (401, 403)
  - Authorization (file ownership)
  - Validation (invalid IDs)
  - Response format
  - Edge cases

- ✅ PATCH /api/files/[id]/progress
  - Happy path (create, update)
  - Upsert behavior
  - Authentication & authorization
  - Validation (range, type, missing fields)
  - Response format
  - Concurrent updates
  - Malformed requests

### Hook Tests (use-reading-progress.test.ts)

**Total Test Cases**: ~60

**Categories**:
- ✅ Initial fetch (loading, enabled conditions)
- ✅ Set page (immediate local update)
- ✅ Debounced server update (300ms)
- ✅ Saving state (isSaving flag)
- ✅ Error handling (fetch errors, save failures)
- ✅ Loading states (separate from saving)
- ✅ Query caching (30s stale time)
- ✅ FileId changes (reset state, cancel saves)
- ✅ Edge cases (undefined/null fileId, unmount cleanup)
- ✅ TypeScript types

### Component Tests (pdf-viewer.test.tsx)

**Total Test Cases**: ~50

**Categories**:
- ✅ Loading state (skeleton, spinner)
- ✅ PDF rendering (onLoadSuccess callback)
- ✅ Error handling (invalid PDF, password-protected, network errors)
- ✅ Page navigation (prev/next, direct input, keyboard)
- ✅ Zoom controls (in/out, preset levels, limits)
- ✅ Keyboard navigation (arrows, Page Up/Down, +/-)
- ✅ Rotation controls (persistence)
- ✅ Fullscreen mode
- ✅ Performance (virtualized rendering)
- ✅ Accessibility (ARIA labels, screen reader)
- ✅ Edge cases (empty URL, large PDFs, URL changes)
- ✅ Props validation

### E2E Tests (reader.spec.ts)

**Total Test Cases**: ~70

**Categories**:
- ✅ Reader page loading (authentication, 404, 403)
- ✅ PDF display (loading states, error handling)
- ✅ Page navigation (buttons, input, keyboard)
- ✅ Zoom controls (buttons, keyboard, limits, persistence)
- ✅ Progress persistence (save, load, cross-session)
- ✅ Sidebar toggle (desktop, mobile, persistence)
- ✅ Toolbar (all controls visible and functional)
- ✅ Responsive behavior (desktop, tablet, mobile)
- ✅ Rotation (clockwise, persistence)
- ✅ Fullscreen mode
- ✅ Download (button, URL generation)
- ✅ Start learning (navigation, status check)
- ✅ Accessibility (keyboard, ARIA, announcements)

## Manual Testing Checklist

### Prerequisites
- [ ] Dependencies installed (`npm install`)
- [ ] Database migrated and seeded
- [ ] Development server running (`npm run dev`)
- [ ] At least one test user with files

### Basic Functionality
- [ ] Navigate to `/reader/[fileId]` with valid file ID
- [ ] PDF loads and displays correctly
- [ ] Current page shows correct number (from saved progress or page 1)
- [ ] File name displays in header

### Page Navigation
- [ ] Click "Next" button advances to next page
- [ ] Click "Previous" button goes to previous page
- [ ] "Previous" disabled on page 1
- [ ] "Next" disabled on last page
- [ ] Type page number and press Enter navigates to that page
- [ ] Invalid page number resets to current page
- [ ] Arrow Right key advances page
- [ ] Arrow Left key goes back
- [ ] Page Up/Down keys work

### Zoom Controls
- [ ] Click "Zoom In" increases zoom level
- [ ] Click "Zoom Out" decreases zoom level
- [ ] Zoom selector shows current percentage
- [ ] Select zoom level from dropdown changes view
- [ ] Zoom limited to 50% minimum
- [ ] Zoom limited to 200% maximum
- [ ] + key zooms in
- [ ] - key zooms out
- [ ] Zoom persists across page changes

### Additional Controls
- [ ] Rotate button rotates PDF 90 degrees clockwise
- [ ] Rotation persists across page changes
- [ ] Fullscreen button shows notification (placeholder)

### Progress Persistence
- [ ] Navigate to page 5, wait 1 second
- [ ] Refresh page - should load at page 5
- [ ] Navigate to page 10, close tab
- [ ] Open reader again - should load at page 10

### Sidebar
- [ ] Sidebar visible by default on desktop
- [ ] Sidebar hidden by default on mobile
- [ ] Toggle button shows/hides sidebar
- [ ] Sidebar shows current page information
- [ ] Mobile sidebar appears as overlay sheet

### Header Actions
- [ ] Download button downloads the PDF
- [ ] Start Learning button navigates to learning page
- [ ] Start Learning disabled if structure not ready
- [ ] Back button returns to files list

### Error Handling
- [ ] Navigate to invalid file ID shows 404 error
- [ ] Navigate to file owned by another user shows 403
- [ ] Corrupted PDF shows error with retry button
- [ ] Network error shows error message

### Responsive Design
- [ ] Desktop (>1024px): Two-panel layout, sidebar visible
- [ ] Tablet (768-1024px): Two-panel, sidebar hidden
- [ ] Mobile (<768px): Single column, sidebar as sheet
- [ ] Orientation change adjusts layout
- [ ] Window resize adjusts PDF size

### Keyboard Accessibility
- [ ] Tab through all controls
- [ ] All buttons reachable by keyboard
- [ ] Enter key activates buttons
- [ ] Space key activates buttons
- [ ] Keyboard shortcuts work globally
- [ ] Shortcuts disabled when input focused

### Screen Reader
- [ ] Page changes announced
- [ ] All buttons have labels
- [ ] Current page/total pages announced
- [ ] Error messages announced

## Common Issues & Solutions

### Issue: PDF doesn't load
**Solutions**:
- Check that file exists in database
- Verify download URL is valid (not expired)
- Check browser console for errors
- Ensure PDF.js worker loads from CDN

### Issue: Progress not saving
**Solutions**:
- Check authentication (session cookie)
- Verify file ownership
- Check browser console for API errors
- Ensure 300ms debounce delay has passed

### Issue: Zoom not working
**Solutions**:
- Check that scale is within 0.5-2.0 range
- Verify Zustand store is properly initialized
- Check that PDF has loaded successfully

### Issue: Keyboard shortcuts not working
**Solutions**:
- Ensure no input element is focused
- Check that event listeners are attached
- Verify PDF has loaded (numPages > 0)

### Issue: Tests failing
**Solutions**:
- Run `npm install` to ensure dependencies are installed
- Check that mocks are properly configured
- Verify Prisma schema is up to date (`npm run db:generate`)
- Clear test cache: `npm test -- --clearCache`

## Performance Testing

### Load Time
- [ ] PDF loads in under 3 seconds (for typical file)
- [ ] First page renders immediately after load
- [ ] Subsequent page changes are instant

### Memory Usage
- [ ] Only current page rendered (not all pages)
- [ ] PDF.js worker doesn't leak memory
- [ ] Component cleanup on unmount

### Network Usage
- [ ] Progress updates debounced (not on every page change)
- [ ] Download URL fetched once per session
- [ ] No unnecessary API calls

## Browser Testing

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Browsers
- [ ] Mobile Safari (iOS)
- [ ] Chrome (Android)
- [ ] Firefox (Android)

## Accessibility Testing

### Tools
- [ ] Screen reader (NVDA, JAWS, VoiceOver)
- [ ] Keyboard-only navigation
- [ ] Browser zoom (200%)
- [ ] High contrast mode
- [ ] Reduced motion

### WCAG 2.1 Compliance
- [ ] Level A requirements met
- [ ] Level AA requirements met
- [ ] Color contrast ratios sufficient
- [ ] Focus indicators visible
- [ ] Alternative text provided

## Security Testing

### Authentication
- [ ] Unauthenticated users redirected to login
- [ ] Unverified email users get 403 error

### Authorization
- [ ] Users cannot access other users' files
- [ ] File ownership validated through course

### Input Validation
- [ ] Invalid page numbers rejected
- [ ] Invalid file IDs rejected
- [ ] SQL injection attempts fail
- [ ] XSS attempts sanitized

## Integration Testing

### With File Management
- [ ] Reader opens files from files list
- [ ] Downloaded files match uploaded files
- [ ] Deleted files no longer accessible in reader

### With Learning System
- [ ] Start Learning button navigates correctly
- [ ] Structure status checked before enabling
- [ ] Learning session receives correct file ID

## Regression Testing

After any changes, verify:
- [ ] All existing tests still pass
- [ ] No new console errors or warnings
- [ ] No visual regressions in UI
- [ ] Performance not degraded
- [ ] Accessibility not compromised

## Test Data Setup

### Create Test User
```sql
-- Already handled by seed script
-- User: test@example.com
```

### Create Test File
```sql
-- Upload a PDF file through the UI
-- Or use the API to create a file record
```

### Create Test Progress
```sql
INSERT INTO "ReadingProgress" (id, userId, fileId, currentPage, createdAt, updatedAt)
VALUES ('test-progress-1', 'user-id', 'file-id', 10, NOW(), NOW());
```

## Debugging Tips

### Enable Debug Logging
```typescript
// Add to reader page
console.log('Current page:', currentPage)
console.log('Reading progress:', { currentPage, isLoading, isSaving })
console.log('Reader store:', useReaderStore.getState())
```

### Inspect Network Requests
1. Open browser DevTools
2. Go to Network tab
3. Filter by "progress" to see progress API calls
4. Check timing (should be debounced)

### Check React Query DevTools
```bash
# Install devtools (already included)
# Open app and look for React Query icon in bottom corner
# Inspect queries: ['reading-progress', fileId]
```

### Inspect Zustand Store
```typescript
// Add to browser console
window.useReaderStore = useReaderStore
useReaderStore.getState()
```

## CI/CD Considerations

### Pipeline Stages
1. Install dependencies
2. Run linting
3. Run type checking
4. Run unit tests
5. Run integration tests
6. Run E2E tests
7. Build application
8. Deploy to staging

### Environment Variables Needed
- Database URL
- Supabase URL and keys
- OpenRouter API key (for AI features)

## Conclusion

This testing guide covers all aspects of Phase 8 PDF Reader testing. Follow the manual checklist for comprehensive verification, and ensure all automated tests pass before deployment.
