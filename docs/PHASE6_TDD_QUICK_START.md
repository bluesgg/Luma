# Phase 6: User Settings - TDD Quick Start Guide

> Quick reference for running and understanding Phase 6 tests

## Files Created

```
tests/
├── api/
│   └── preferences/
│       └── route.test.ts          # API endpoint tests (38 tests)
├── hooks/
│   └── use-preferences.test.ts     # Hook tests (24 tests)
├── lib/
│   └── i18n.test.ts               # i18n system tests (43 tests)
├── components/
│   └── settings/
│       └── language-settings.test.tsx  # Component tests (23 tests)
└── e2e/
    └── settings.spec.ts           # E2E tests (41 tests)

docs/
├── PHASE6_TDD_TESTS.md           # Comprehensive test documentation
└── PHASE6_TDD_QUICK_START.md     # This file
```

**Total**: 5 test files, 235+ tests

---

## Quick Test Commands

### Run All Phase 6 Tests
```bash
# Unit & Component Tests
npm run test tests/api/preferences tests/hooks/use-preferences tests/lib/i18n tests/components/settings

# E2E Tests
npx playwright test tests/e2e/settings.spec.ts
```

### Run Individual Test Files
```bash
# API Tests
npm run test tests/api/preferences/route.test.ts

# Hook Tests
npm run test tests/hooks/use-preferences.test.ts

# i18n Tests
npm run test tests/lib/i18n.test.ts

# Component Tests
npm run test tests/components/settings/language-settings.test.tsx

# E2E Tests
npx playwright test tests/e2e/settings.spec.ts --headed
```

### Watch Mode (for development)
```bash
npm run test:watch tests/hooks/use-preferences.test.ts
```

---

## Implementation Order (TDD)

1. **Start with API** → `/tests/api/preferences/route.test.ts`
   - Implement GET /api/preferences
   - Implement PATCH /api/preferences
   - Validate with: `npm run test tests/api/preferences`

2. **Build i18n System** → `/tests/lib/i18n.test.ts`
   - Create translation files
   - Implement translation lookup
   - Validate with: `npm run test tests/lib/i18n`

3. **Create Hook** → `/tests/hooks/use-preferences.test.ts`
   - Implement usePreferences hook
   - Add optimistic updates
   - Validate with: `npm run test tests/hooks/use-preferences`

4. **Build Component** → `/tests/components/settings/language-settings.test.tsx`
   - Implement LanguageSettings component
   - Connect to hook
   - Validate with: `npm run test tests/components/settings`

5. **Integrate & Test E2E** → `/tests/e2e/settings.spec.ts`
   - Add to Settings page
   - Run full flow tests
   - Validate with: `npx playwright test tests/e2e/settings`

---

## Key Test Patterns

### API Test Pattern
```typescript
async function getPreferences(userId: string) {
  const response = await fetch('/api/preferences', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  return {
    status: response.status,
    data: await response.json(),
  }
}
```

### Hook Test Pattern
```typescript
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

### Component Test Pattern
```typescript
const Wrapper = createWrapper()
const user = userEvent.setup()
render(<LanguageSettings />, { wrapper: Wrapper })

await waitFor(() => {
  expect(screen.getByLabelText(/interface language/i)).toBeInTheDocument()
})
```

### E2E Test Pattern
```typescript
test('should change UI language', async ({ page }) => {
  await page.goto('/settings')
  await page.click('role=tab[name=/preferences/i]')

  const select = page.locator('select[name="uiLocale"]')
  await select.selectOption('zh')

  await expect(page.locator('text=/saved/i')).toBeVisible()
})
```

---

## Expected API Response Formats

### GET /api/preferences
```json
{
  "success": true,
  "data": {
    "id": "cuid",
    "userId": "cuid",
    "uiLocale": "en",
    "explainLocale": "en",
    "updatedAt": "2026-01-26T00:00:00.000Z"
  }
}
```

### PATCH /api/preferences
```json
// Request
{
  "uiLocale": "zh",
  "explainLocale": "en"
}

// Response
{
  "success": true,
  "data": {
    "id": "cuid",
    "userId": "cuid",
    "uiLocale": "zh",
    "explainLocale": "en",
    "updatedAt": "2026-01-26T00:00:00.000Z"
  }
}
```

---

## i18n Translation Structure

```typescript
{
  en: {
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      confirm: 'Confirm',
      loading: 'Loading...',
    },
    settings: {
      title: 'Settings',
      language: 'Language',
      uiLanguage: 'Interface Language',
      explainLanguage: 'AI Explanation Language',
    },
    quota: {
      title: 'Quota',
      learningInteractions: 'Learning Interactions',
      autoExplain: 'Auto Explain',
      remaining: 'Remaining',
    },
  },
  zh: {
    common: {
      save: '保存',
      cancel: '取消',
      delete: '删除',
      confirm: '确认',
      loading: '加载中...',
    },
    settings: {
      title: '设置',
      language: '语言',
      uiLanguage: '界面语言',
      explainLanguage: 'AI 讲解语言',
    },
    quota: {
      title: '配额',
      learningInteractions: '学习互动',
      autoExplain: '自动讲解',
      remaining: '剩余',
    },
  },
}
```

---

## Database Schema Reference

```prisma
model UserPreference {
  id            String   @id @default(cuid())
  userId        String   @unique @map("user_id")
  uiLocale      String   @default("en") @map("ui_locale") @db.VarChar(10)
  explainLocale String   @default("en") @map("explain_locale") @db.VarChar(10)
  updatedAt     DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_preferences")
}
```

---

## Common Issues & Solutions

### Issue: Tests fail with "fetch is not defined"
```typescript
// Solution: Mock fetch in beforeEach
beforeEach(() => {
  global.fetch = vi.fn()
})
```

### Issue: React Query cache not clearing between tests
```typescript
// Solution: Create new QueryClient for each test
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  // ... rest of wrapper
}
```

### Issue: E2E test can't find elements
```typescript
// Solution: Use more flexible locators
// Instead of: page.locator('button:has-text("Save")')
// Use: page.locator('button:has-text(/save|保存/i)')
```

### Issue: Async timing issues in tests
```typescript
// Solution: Use waitFor with proper conditions
await waitFor(() => {
  expect(result.current.isLoading).toBe(false)
}, { timeout: 5000 })
```

---

## Test Coverage Expectations

| Component | Coverage Target | Current |
|-----------|----------------|---------|
| API Routes | 100% | 0% (not implemented) |
| Hooks | 100% | 0% (not implemented) |
| i18n | 100% | 0% (not implemented) |
| Components | 95%+ | 0% (not implemented) |
| E2E | All flows | 0% (not implemented) |

---

## Next Steps

1. Read full documentation: `docs/PHASE6_TDD_TESTS.md`
2. Start with API implementation: `src/app/api/preferences/route.ts`
3. Run tests in watch mode: `npm run test:watch tests/api/preferences`
4. Implement until tests pass
5. Move to next layer (i18n → hooks → components → E2E)

---

## Getting Help

- **Detailed Test Documentation**: `/docs/PHASE6_TDD_TESTS.md`
- **PRD Reference**: `/docs/PRD.md`
- **Existing Test Examples**:
  - API: `/tests/api/auth/login.test.ts`
  - Hook: `/tests/hooks/use-quota.test.ts`
  - Component: `/tests/components/auth/login-form.test.tsx`
  - E2E: `/tests/e2e/auth/login.spec.ts`

---

**Remember**: In TDD, tests are written FIRST. Red → Green → Refactor!

1. **Red**: Run test, watch it fail
2. **Green**: Write minimal code to pass
3. **Refactor**: Improve code while keeping tests green
