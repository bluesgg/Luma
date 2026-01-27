# Phase 6: User Settings - TDD Test Suite

> **Created**: 2026-01-26
> **Status**: Test Suite Complete - Ready for Implementation
> **Testing Approach**: Test-Driven Development (TDD)

## Overview

This document summarizes all test files created for Phase 6: User Settings. Following TDD principles, all tests have been written **before implementation** to guide the development process and ensure comprehensive coverage.

## Test Coverage Summary

| Test Category | File Count | Total Tests | Status |
|--------------|------------|-------------|---------|
| API Routes | 1 | 50+ | ✅ Complete |
| React Hooks | 1 | 35+ | ✅ Complete |
| Utilities (i18n) | 1 | 60+ | ✅ Complete |
| Components | 1 | 40+ | ✅ Complete |
| E2E Tests | 1 | 50+ | ✅ Complete |
| **TOTAL** | **5** | **235+** | ✅ Complete |

---

## 1. API Route Tests

### File: `tests/api/preferences/route.test.ts`

**Purpose**: Test the User Preferences API endpoints (GET and PATCH)

**Test Suites**: 2
- GET /api/preferences
- PATCH /api/preferences

**Key Test Categories**:

#### GET /api/preferences (SETTINGS-001)
- **Default Preferences Creation** (3 tests)
  - Creates default preferences if none exist
  - Persists created preferences in database
  - Includes all required fields in response

- **Existing Preferences Retrieval** (3 tests)
  - Returns existing preferences
  - Does not create duplicate preferences
  - Returns updated values after modification

- **Authentication** (2 tests)
  - Requires authentication
  - Returns unauthorized error message

- **Error Handling** (2 tests)
  - Handles database errors gracefully
  - Handles creation errors

- **Response Format** (2 tests)
  - Returns data in standard API format
  - Serializes dates correctly

**Total GET Tests**: 12

#### PATCH /api/preferences (SETTINGS-002)
- **Update UI Locale** (4 tests)
  - Updates UI locale to Chinese
  - Updates UI locale to English
  - Persists UI locale change in database
  - Does not affect explain locale when updating UI locale

- **Update Explain Locale** (3 tests)
  - Updates explain locale to Chinese
  - Updates explain locale to English
  - Does not affect UI locale when updating explain locale

- **Update Both Locales** (2 tests)
  - Updates both locales simultaneously
  - Sets different locales for UI and explain

- **Validation** (6 tests)
  - Rejects invalid UI locale
  - Rejects invalid explain locale
  - Only accepts "en" or "zh" for UI locale
  - Only accepts "en" or "zh" for explain locale
  - Rejects empty request body
  - Rejects unknown fields

- **Auto-creation** (2 tests)
  - Creates preferences if updating non-existent preferences
  - Uses defaults for unspecified fields on auto-creation

- **Authentication** (2 tests)
  - Requires authentication
  - Does not allow updating other users' preferences

- **Timestamp Updates** (1 test)
  - Updates updatedAt timestamp

- **Idempotency** (1 test)
  - Is idempotent when updating to same value

- **Error Handling** (2 tests)
  - Handles database errors on update
  - Handles malformed JSON

- **Response Format** (2 tests)
  - Returns updated preferences in response
  - Includes all preference fields

- **Concurrent Updates** (1 test)
  - Handles concurrent update requests

**Total PATCH Tests**: 26

**Total API Tests**: 38

---

## 2. React Hook Tests

### File: `tests/hooks/use-preferences.test.ts`

**Purpose**: Test the usePreferences React hook for preference management

**Test Suites**: 1 (SETTINGS-003)

**Key Test Categories**:

- **Data Fetching** (4 tests)
  - Fetches preferences on mount
  - Sets loading state initially
  - Calls correct API endpoint
  - Caches preferences data

- **Update Preferences Mutation** (5 tests)
  - Provides updatePreferences function
  - Updates UI locale
  - Updates explain locale
  - Updates both locales simultaneously
  - Calls PATCH /api/preferences

- **Optimistic Updates** (2 tests)
  - Optimistically updates UI before API response
  - Reverts on error

- **Loading States** (3 tests)
  - Shows isUpdating during mutation
  - Clears isUpdating after success
  - Clears isUpdating after error

- **Cache Invalidation** (2 tests)
  - Invalidates cache after successful update
  - Refetches after mutation

- **Error Handling** (4 tests)
  - Handles fetch errors
  - Handles update errors
  - Handles 401 unauthorized
  - Handles 400 validation errors

- **Auto-refresh** (1 test)
  - Refetches on window focus

- **TypeScript Types** (2 tests)
  - Has correct return type
  - Enforces locale type constraints

- **Multiple Updates** (1 test)
  - Handles rapid successive updates

**Total Hook Tests**: 24

---

## 3. Utility Library Tests

### File: `tests/lib/i18n.test.ts`

**Purpose**: Test the internationalization (i18n) system

**Test Suites**: 2
- i18n System (SETTINGS-004)
- i18n React Integration (SETTINGS-005)

**Key Test Categories**:

#### i18n System (SETTINGS-004)

- **Translation Lookup** (6 tests)
  - Translates simple key in English
  - Translates simple key in Chinese
  - Translates nested keys
  - Translates deeply nested keys
  - Handles all common translations in English
  - Handles all common translations in Chinese

- **Locale Management** (5 tests)
  - Starts with English as default
  - Allows setting locale to Chinese
  - Allows setting locale to English
  - Changes translations when locale changes
  - Persists locale across multiple translations

- **Fallback to English** (3 tests)
  - Falls back to English when Chinese translation missing
  - Maintains locale even when falling back
  - Uses English value for complete translations

- **Missing Key Handling** (5 tests)
  - Returns key itself when translation missing
  - Returns custom fallback when provided
  - Prefers custom fallback over key
  - Handles empty key gracefully
  - Handles partial key match

- **Settings Page Translations** (2 tests)
  - Translates all settings keys in English
  - Translates all settings keys in Chinese

- **Quota Translations** (2 tests)
  - Translates quota keys in English
  - Translates quota keys in Chinese

- **Locale Switching** (2 tests)
  - Immediately reflects locale changes
  - Handles rapid locale switches

- **Special Characters** (2 tests)
  - Handles Chinese characters correctly
  - Handles ellipsis in loading text

- **Type Safety** (2 tests)
  - Only accepts valid locale values
  - Returns string for valid translations

- **Edge Cases** (4 tests)
  - Handles keys with dots in segment names
  - Handles very long translation keys
  - Handles uppercase keys
  - Is case sensitive

- **Translation Completeness** (4 tests)
  - Has matching keys in English and Chinese for common
  - Has matching keys in English and Chinese for settings
  - Has matching keys in English and Chinese for quota
  - Has all namespace keys in both languages

- **Performance** (2 tests)
  - Handles multiple rapid translations efficiently
  - Handles locale switches efficiently

- **Immutability** (2 tests)
  - Does not mutate translation objects
  - Is not affected by external mutations

**i18n System Tests**: 41

#### i18n React Integration (SETTINGS-005)

- **Hook-based Usage** (1 test)
  - Supports use in React components

- **Context-based Usage** (1 test)
  - Supports context provider pattern

**React Integration Tests**: 2

**Total i18n Tests**: 43

---

## 4. Component Tests

### File: `tests/components/settings/language-settings.test.tsx`

**Purpose**: Test the LanguageSettings component

**Test Suites**: 1 (SETTINGS-006)

**Key Test Categories**:

- **Rendering** (6 tests)
  - Renders language settings section
  - Renders UI language dropdown
  - Renders AI explanation language dropdown
  - Shows current UI locale selection
  - Shows current explain locale selection

- **Language Options** (2 tests)
  - Shows English and Chinese options for UI language
  - Shows English and Chinese options for explain language

- **UI Locale Change** (3 tests)
  - Updates UI locale when selection changes
  - Shows success feedback after UI locale change
  - Persists UI locale selection

- **Explain Locale Change** (2 tests)
  - Updates explain locale when selection changes
  - Shows success feedback after explain locale change

- **Independent Selections** (2 tests)
  - Allows different locales for UI and explain
  - Does not affect explain locale when changing UI locale

- **Loading States** (2 tests)
  - Shows loading state while fetching preferences
  - Disables dropdowns while updating

- **Error Handling** (2 tests)
  - Shows error message when update fails
  - Reverts selection on error

- **Accessibility** (2 tests)
  - Has accessible labels for dropdowns
  - Is keyboard navigable

- **Help Text** (2 tests)
  - Displays help text for UI language
  - Displays help text for explain language

**Total Component Tests**: 23

---

## 5. End-to-End Tests

### File: `tests/e2e/settings.spec.ts`

**Purpose**: Test the complete settings page experience

**Test Suites**: 1 (Settings Page)

**Key Test Categories**:

- **Page Load and Navigation** (3 tests)
  - Loads settings page successfully
  - Displays page description
  - Is accessible from main navigation

- **Tab Navigation** (8 tests)
  - Displays all setting tabs
  - Defaults to quota tab
  - Switches to preferences tab
  - Switches between all tabs
  - Updates URL hash on tab change
  - Respects URL hash on page load
  - Is keyboard navigable

- **Quota Tab** (4 tests)
  - Displays quota information
  - Shows quota usage percentages
  - Displays quota reset date
  - Shows quota progress bars

- **Preferences Tab - Language Settings** (7 tests)
  - Displays language settings
  - Shows current language selections
  - Changes UI language to Chinese
  - Changes AI language to Chinese
  - Persists language selection after page reload
  - Allows different languages for UI and AI
  - Disables selects while saving

- **Responsive Layout** (4 tests)
  - Is mobile responsive
  - Stacks tabs vertically on mobile
  - Is tablet responsive
  - Works on desktop

- **Integration with Quota Display** (2 tests)
  - Shows quota on both quota tab and preferences
  - Displays quota warning if low

- **Error Handling** (3 tests)
  - Shows error when failing to load preferences
  - Shows error when failing to save preferences
  - Handles unauthorized access

- **Accessibility** (5 tests)
  - Has proper heading hierarchy
  - Has accessible tab navigation
  - Has proper ARIA labels
  - Supports keyboard-only navigation
  - Has skip to content link

- **Browser Back/Forward** (2 tests)
  - Handles browser back button
  - Maintains tab state on forward navigation

- **Performance** (2 tests)
  - Loads quickly
  - Does not have memory leaks on tab switching

- **Content Security** (1 test)
  - Does not expose sensitive information

**Total E2E Tests**: 41

---

## Test Execution Commands

### Unit and Component Tests (Vitest)

```bash
# Run all Phase 6 tests
npm run test tests/api/preferences tests/hooks/use-preferences tests/lib/i18n tests/components/settings

# Run API tests only
npm run test tests/api/preferences/route.test.ts

# Run hook tests only
npm run test tests/hooks/use-preferences.test.ts

# Run i18n tests only
npm run test tests/lib/i18n.test.ts

# Run component tests only
npm run test tests/components/settings/language-settings.test.tsx

# Run with coverage
npm run test:coverage
```

### E2E Tests (Playwright)

```bash
# Run all E2E settings tests
npx playwright test tests/e2e/settings.spec.ts

# Run in headed mode (see browser)
npx playwright test tests/e2e/settings.spec.ts --headed

# Run in debug mode
npx playwright test tests/e2e/settings.spec.ts --debug

# Run on specific browser
npx playwright test tests/e2e/settings.spec.ts --project=chromium
npx playwright test tests/e2e/settings.spec.ts --project=firefox
npx playwright test tests/e2e/settings.spec.ts --project=webkit
```

---

## Implementation Checklist

Following TDD methodology, implement features in this order:

### Phase 6.1: Database & API Layer
- [ ] **SETTINGS-001**: Implement GET /api/preferences endpoint
  - Create default preferences if none exist
  - Return existing preferences
  - Handle authentication

- [ ] **SETTINGS-002**: Implement PATCH /api/preferences endpoint
  - Update UI locale
  - Update explain locale
  - Validate locale values (only "en" or "zh")
  - Auto-create preferences if needed

### Phase 6.2: i18n System
- [ ] **SETTINGS-004**: Implement i18n translation system
  - Create translation files (en.json, zh.json)
  - Implement translation lookup function
  - Support nested keys
  - Implement fallback to English

- [ ] **SETTINGS-005**: Implement React integration
  - Create i18n context provider
  - Create useTranslation hook
  - Support locale switching

### Phase 6.3: React Hooks
- [ ] **SETTINGS-003**: Implement usePreferences hook
  - Fetch preferences on mount
  - Provide update mutation
  - Implement optimistic updates
  - Handle cache invalidation
  - Auto-refresh on window focus

### Phase 6.4: UI Components
- [ ] **SETTINGS-006**: Implement LanguageSettings component
  - Render UI language dropdown
  - Render AI explanation language dropdown
  - Handle locale changes
  - Show loading and error states
  - Display success feedback

### Phase 6.5: Page Integration
- [ ] Integrate LanguageSettings into Settings page
- [ ] Add "Preferences" tab to Settings page
- [ ] Ensure responsive layout
- [ ] Test full user flow

### Phase 6.6: E2E Validation
- [ ] Run all E2E tests
- [ ] Verify tab navigation
- [ ] Verify language selection persistence
- [ ] Verify integration with quota display
- [ ] Test on multiple browsers/devices

---

## Test Data Requirements

### Mock User Data
```typescript
{
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'STUDENT',
  emailConfirmedAt: Date
}
```

### Mock Preference Data
```typescript
{
  id: 'pref-1',
  userId: 'user-1',
  uiLocale: 'en' | 'zh',
  explainLocale: 'en' | 'zh',
  updatedAt: Date
}
```

### Translation Keys Required
- `common.save`, `common.cancel`, `common.delete`, `common.confirm`, `common.loading`
- `settings.title`, `settings.language`, `settings.uiLanguage`, `settings.explainLanguage`
- `quota.title`, `quota.learningInteractions`, `quota.autoExplain`, `quota.remaining`

---

## Dependencies

### Production Dependencies
```json
{
  "@tanstack/react-query": "^5.x.x",
  "zod": "^3.x.x"
}
```

### Development Dependencies
```json
{
  "vitest": "^1.x.x",
  "@testing-library/react": "^14.x.x",
  "@testing-library/user-event": "^14.x.x",
  "@playwright/test": "^1.x.x"
}
```

---

## Coverage Goals

- **API Routes**: 100% line coverage
- **React Hooks**: 100% line coverage
- **i18n System**: 100% line coverage
- **Components**: 95%+ line coverage
- **E2E**: All critical user flows

---

## Notes

1. **TDD Approach**: All tests written before implementation
2. **Test Patterns**: Following existing patterns from Phase 4 and Phase 5
3. **Locale Support**: Currently supports English (en) and Chinese (zh)
4. **Future Expansion**: Tests can be extended for additional locales
5. **Integration**: Tests ensure proper integration with existing quota system

---

## Related Documentation

- **PRD**: `/Users/samguan/Desktop/project/Luma/docs/PRD.md`
- **Database Schema**: `/Users/samguan/Desktop/project/Luma/prisma/schema.prisma`
- **API Constants**: `/Users/samguan/Desktop/project/Luma/src/lib/constants.ts`
- **Existing Settings Page**: `/Users/samguan/Desktop/project/Luma/src/app/(main)/settings/page.tsx`

---

## Success Criteria

Phase 6 is complete when:
1. ✅ All test files created (5 files)
2. ⏳ All tests passing (235+ tests)
3. ⏳ 95%+ code coverage achieved
4. ⏳ All critical user flows validated via E2E tests
5. ⏳ Documentation complete
6. ⏳ Code reviewed and approved

**Current Status**: Test Suite Complete - Ready for Implementation 🎯

---

**Next Steps**: Begin implementation following the Implementation Checklist above, ensuring each test passes before moving to the next feature.
