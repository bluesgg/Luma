# Luma Web - Test Suite

## Quick Start

```bash
# Install dependencies
pnpm install

# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run with UI
pnpm test:ui

# Run in watch mode
pnpm test --watch
```

## Test Structure

```
tests/
├── setup.ts                    # Global test configuration
├── helpers/                    # Test utilities
│   └── auth.ts                # Auth helper functions
├── unit/                       # Unit tests
│   └── lib/                   # Library function tests
├── api/                        # API endpoint tests
│   └── auth/                  # Auth API tests
├── components/                 # Component tests
│   └── auth/                  # Auth component tests
├── integration/                # Integration tests
└── e2e/                        # End-to-end tests (Playwright)
```

## Running Specific Tests

```bash
# Run single file
pnpm test tests/api/auth/login.test.ts

# Run all auth API tests
pnpm test tests/api/auth/

# Run all component tests
pnpm test tests/components/

# Run tests matching pattern
pnpm test -t "login"
pnpm test -t "password"

# Run tests in specific file matching pattern
pnpm test tests/api/auth/login.test.ts -t "should login"
```

## Test Coverage

```bash
# Generate coverage report
pnpm test:coverage

# View coverage in browser
# Opens ./coverage/index.html
```

## Test Guidelines

### Writing Tests

1. **Follow AAA Pattern**: Arrange, Act, Assert
2. **Use Descriptive Names**: `it('should reject invalid email format', ...)`
3. **One Assertion Per Test**: Focus on single behavior
4. **Mock External Dependencies**: Database, API calls, etc.
5. **Clean Up After Tests**: Use `beforeEach` and `afterEach`

### Test Structure

```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup after each test
  });

  describe('Success Cases', () => {
    it('should handle happy path', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = myFunction(input);

      // Assert
      expect(result).toBe('expected');
    });
  });

  describe('Error Cases', () => {
    it('should handle errors', () => {
      // Test error scenarios
    });
  });
});
```

## Mocking

### Mock Prisma

```typescript
import { vi } from 'vitest';
import { prisma } from '@/lib/prisma';

vi.mocked(prisma.user.create).mockResolvedValue({
  id: 'user-123',
  email: 'test@example.com',
  // ...
});
```

### Mock Next.js

```typescript
// Already mocked in tests/setup.ts
// useRouter, usePathname, useSearchParams, cookies, headers
```

### Mock API Calls

```typescript
const mockFetch = vi.fn();
global.fetch = mockFetch;

mockFetch.mockResolvedValue({
  ok: true,
  json: async () => ({ success: true }),
});
```

## Test Helpers

### Create Test User

```typescript
import { createTestUser, deleteTestUser } from '@/tests/helpers/auth';

const { user, password } = await createTestUser({
  email: 'test@example.com',
  emailVerified: true,
});

// Use in tests...

await deleteTestUser(user.id);
```

### Create Mock Request

```typescript
import { createMockRequest } from '@/tests/helpers/auth';

const request = createMockRequest('POST', {
  email: 'test@example.com',
  password: 'Test123!@#',
});
```

## Common Test Patterns

### Testing API Routes

```typescript
import { POST } from '@/app/api/auth/login/route';

it('should login with valid credentials', async () => {
  // Mock database
  vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

  // Create request
  const request = new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  // Call handler
  const response = await POST(request);
  const data = await response.json();

  // Assert
  expect(response.status).toBe(200);
  expect(data.success).toBe(true);
});
```

### Testing React Components

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('should update input value', async () => {
  render(<LoginForm />);

  const input = screen.getByTestId('email-input');
  await userEvent.type(input, 'test@example.com');

  expect(input).toHaveValue('test@example.com');
});
```

### Testing Async Functions

```typescript
it('should hash password', async () => {
  const password = 'Test123!@#';
  const hash = await hashPassword(password);

  expect(hash).toBeDefined();
  expect(hash).not.toBe(password);
});
```

## Debugging Tests

### Using console.log

```typescript
it('should debug test', () => {
  console.log('Debug info:', someVariable);
  expect(someVariable).toBe('expected');
});
```

### Using Vitest UI

```bash
pnpm test:ui
# Opens browser with interactive test runner
```

### Running Single Test

```typescript
// Use .only to run single test
it.only('should run only this test', () => {
  // Test code
});

// Or describe.only for single suite
describe.only('Feature', () => {
  it('should test', () => {});
});
```

### Skip Tests

```typescript
// Skip single test
it.skip('should skip this test', () => {
  // Test code
});

// Skip suite
describe.skip('Feature', () => {
  it('should skip all', () => {});
});
```

## Continuous Integration

Tests run automatically on:
- `git commit` (pre-commit hook via Husky)
- `git push` (GitHub Actions)
- Pull requests

## Troubleshooting

### Tests not found
- Check file naming: `*.test.ts` or `*.test.tsx`
- Check vitest.config.ts include pattern

### Mocks not working
- Ensure `vi.clearAllMocks()` in `beforeEach`
- Check mock path matches import path
- Use `vi.mocked()` for type safety

### Timeout errors
- Check for missing `await` on promises
- Increase timeout: `it('test', async () => {}, 10000)`
- Check for infinite loops

### Type errors
- Ensure proper TypeScript types
- Use type assertions when needed: `as HTMLInputElement`
- Check @types packages are installed

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Testing Library User Events](https://testing-library.com/docs/user-event/intro)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)

## Phase 1 Test Summary

See [PHASE1_TEST_SUMMARY.md](./PHASE1_TEST_SUMMARY.md) for detailed test coverage.

## Implementation Checklist

See [../docs/PHASE1_IMPLEMENTATION_CHECKLIST.md](../docs/PHASE1_IMPLEMENTATION_CHECKLIST.md) for implementation guide.
