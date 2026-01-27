# Phase 1 Auth Tests - Quick Start Guide

## Run All Tests

```bash
# Run all Phase 1 authentication tests
npm test tests/unit/lib/password.test.ts
npm test tests/unit/lib/token.test.ts
npm test tests/unit/lib/email.test.ts
npm test tests/api/auth/
npm test tests/components/auth/
npm test tests/hooks/use-user.test.ts

# Or run everything at once
npm test -- --run
```

## Run Specific Test Categories

```bash
# Unit tests only
npm test tests/unit/lib/

# API tests only
npm test tests/api/auth/

# Component tests only
npm test tests/components/auth/

# Hook tests only
npm test tests/hooks/use-user.test.ts
```

## Watch Mode (During Development)

```bash
# Watch all auth tests
npm test tests/api/auth/ -- --watch

# Watch specific file
npm test tests/api/auth/register.test.ts -- --watch
```

## Coverage Report

```bash
# Generate coverage for auth module
npm test tests/unit/lib/ tests/api/auth/ tests/components/auth/ tests/hooks/use-user.test.ts -- --coverage

# View HTML coverage report
open coverage/index.html
```

## Test File Locations

```
tests/
├── unit/lib/
│   ├── password.test.ts          ← Password hashing & verification
│   ├── token.test.ts             ← Token generation & validation
│   └── email.test.ts             ← Email service
├── api/auth/
│   ├── register.test.ts          ← POST /api/auth/register
│   ├── login.test.ts             ← POST /api/auth/login
│   ├── logout.test.ts            ← POST /api/auth/logout
│   ├── verify.test.ts            ← GET /api/auth/verify
│   ├── resend-verification.test.ts ← POST /api/auth/resend-verification
│   ├── reset-password.test.ts    ← POST /api/auth/reset-password
│   ├── confirm-reset.test.ts     ← POST /api/auth/confirm-reset
│   └── session.test.ts           ← GET /api/auth/session
├── components/auth/
│   ├── login-form.test.tsx
│   ├── register-form.test.tsx
│   ├── forgot-password-form.test.tsx
│   ├── reset-password-form.test.tsx
│   └── password-strength-indicator.test.tsx
└── hooks/
    └── use-user.test.ts
```

## Expected State

🔴 **All tests will FAIL initially** - this is correct!

These tests follow TDD (Test-Driven Development):

1. **RED**: Write tests first (they fail)
2. **GREEN**: Implement code to pass tests
3. **REFACTOR**: Improve code while keeping tests passing

## Test Implementation Order

Implement in this order for best results:

1. **Password Utils** → `tests/unit/lib/password.test.ts`
2. **Token Utils** → `tests/unit/lib/token.test.ts`
3. **Email Service** → `tests/unit/lib/email.test.ts`
4. **Register API** → `tests/api/auth/register.test.ts`
5. **Login API** → `tests/api/auth/login.test.ts`
6. **Verify API** → `tests/api/auth/verify.test.ts`
7. **Other APIs** → remaining test files
8. **Components** → `tests/components/auth/*.test.tsx`
9. **Hooks** → `tests/hooks/use-user.test.ts`

## Useful Commands

```bash
# Run single describe block
npm test tests/api/auth/login.test.ts -- -t "Happy Path"

# Run with verbose output
npm test -- --reporter=verbose

# Run in CI mode (no watch, exit after)
npm test -- --run --reporter=verbose

# Update snapshots (if any)
npm test -- -u

# Clear test cache
npm test -- --clearCache
```

## Debugging Failed Tests

1. **Read the test name and description**
   - Test names describe expected behavior

2. **Check error messages**
   - Tests are written with clear failure messages

3. **Look at the assertion**
   - The `expect()` line shows what's expected vs actual

4. **Verify implementation exists**
   - Many tests will fail because functions don't exist yet

5. **Check test setup**
   - `beforeEach` sets up test data
   - Make sure database is accessible

## Common Test Patterns

### Testing API Endpoints

```typescript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
})

expect(response.status).toBe(200)
const data = await response.json()
expect(data.success).toBe(true)
```

### Testing Components

```typescript
const user = userEvent.setup()
render(<LoginForm />)

await user.type(screen.getByLabelText(/email/i), 'user@example.com')
await user.click(screen.getByRole('button', { name: /log in/i }))

await waitFor(() => {
  expect(screen.getByText(/welcome/i)).toBeInTheDocument()
})
```

### Testing Hooks

```typescript
const { result } = renderHook(() => useUser(), { wrapper: QueryWrapper })

await waitFor(() => {
  expect(result.current.isLoading).toBe(false)
  expect(result.current.user).toBeDefined()
})
```

## Mocking Strategy

Tests use mocks for:

- **Database** (Prisma): Mocked in `tests/setup.ts`
- **Supabase**: Mocked auth and storage calls
- **Email Service**: Spy on email functions
- **Rate Limiting**: Time-based mocks

Mocks are reset in `beforeEach` hooks.

## Test Coverage Goals

- Unit Tests: 90%+
- API Routes: 85%+
- Components: 80%+
- Hooks: 85%+

Run `npm test -- --coverage` to check current coverage.

## Troubleshooting

### Tests timeout

- Increase timeout in `vitest.config.ts`
- Check for missing `await` keywords
- Verify database connection

### Database errors

- Ensure PostgreSQL is running
- Check `DATABASE_URL` in `.env.test`
- Run `npx prisma db push` to sync schema

### Mock not working

- Clear test cache: `npm test -- --clearCache`
- Check `tests/setup.ts` for mock configuration
- Verify import paths

### Component tests fail

- Install testing libraries: `npm install -D @testing-library/react @testing-library/user-event`
- Check React Testing Library queries
- Verify component is actually rendered

## CI/CD Integration

For GitHub Actions or similar:

```yaml
- name: Run Phase 1 Auth Tests
  run: npm test tests/unit/lib/ tests/api/auth/ tests/components/auth/ tests/hooks/use-user.test.ts -- --run --coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
```

## Next Steps

1. Run tests to see current state (all should fail)
2. Pick a test file from the implementation order
3. Implement the function/endpoint/component
4. Re-run tests until they pass (GREEN)
5. Refactor if needed while keeping tests green
6. Move to next test file
7. Repeat until all Phase 1 tests pass

---

**Remember**: Tests failing is GOOD at this stage! They define what needs to be built.
