# Luma Tests

This directory contains the test suite for the Luma project using Vitest.

## Directory Structure

```
tests/
├── setup.ts                          # Global test setup and mocks
├── lib/                              # Library/utility tests
│   ├── api-response.test.ts         # API response helpers
│   ├── csrf.test.ts                 # CSRF token generation/validation
│   ├── logger.test.ts               # Logger utility
│   ├── query-client.test.ts         # TanStack Query configuration
│   ├── rate-limit.test.ts           # Rate limiting utility
│   └── validation.test.ts           # Zod validation schemas
└── stores/                           # Zustand store tests
    ├── learning-store.test.ts       # Learning state management
    └── reader-store.test.ts         # PDF reader state management
```

## Running Tests

### Run all tests

```bash
npm test
```

### Run tests in watch mode

```bash
npm test -- --watch
```

### Run tests with coverage

```bash
npm test -- --coverage
```

### Run specific test file

```bash
npm test tests/lib/query-client.test.ts
```

### Run tests matching pattern

```bash
npm test -- --grep "API response"
```

## Writing Tests

### Test File Template

```typescript
import { describe, it, expect, beforeEach } from 'vitest'

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
  })

  describe('Sub-feature', () => {
    it('should do something', () => {
      // Arrange
      const input = 'test'

      // Act
      const result = functionToTest(input)

      // Assert
      expect(result).toBe('expected')
    })
  })
})
```

### Testing Conventions

1. **File Naming**: `*.test.ts` or `*.test.tsx`
2. **Test Naming**: Use descriptive `it('should ...')` statements
3. **Organization**: Group related tests in `describe` blocks
4. **Isolation**: Each test should be independent
5. **Mocking**: Use mocks from `setup.ts` or create local mocks

### Mock Data

Use pre-defined mock data from `setup.ts`:

```typescript
import { mockUser, mockCourse, mockFile } from './setup'

it('should use mock data', () => {
  expect(mockUser.email).toBe('test@example.com')
})
```

## Test Coverage

View coverage report:

```bash
npm test -- --coverage
```

Coverage reports are generated in:

- Terminal: Text format
- `coverage/index.html`: Interactive HTML report

## Debugging Tests

### Enable verbose output

```bash
npm test -- --reporter=verbose
```

### Run single test

Add `.only` to focus on one test:

```typescript
it.only('should test this specific case', () => {
  // ...
})
```

### Skip test temporarily

Add `.skip` to skip a test:

```typescript
it.skip('should be fixed later', () => {
  // ...
})
```

## CI/CD Integration

Tests run automatically on:

- Pull requests
- Commits to main branch
- Pre-commit hooks (via Husky)

## Best Practices

1. **Test Behavior, Not Implementation**
   - Focus on what the function does, not how it does it
   - Tests should survive refactoring

2. **Keep Tests Simple**
   - One assertion per test when possible
   - Clear setup and expectations

3. **Use Descriptive Names**
   - Test names should explain what is being tested
   - Include expected behavior in the name

4. **Mock External Dependencies**
   - Don't rely on external services
   - Use mocks for database, API calls, etc.

5. **Test Edge Cases**
   - Empty inputs
   - Null/undefined values
   - Boundary conditions
   - Error scenarios

## Common Issues

### Tests Fail After Clean Install

```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Mocks Not Working

- Check `tests/setup.ts` for proper mock setup
- Ensure mocks are imported before the modules being tested
- Use `vi.clearAllMocks()` in `beforeEach`

### Timeout Errors

Increase timeout for slow tests:

```typescript
it('slow test', async () => {
  // ...
}, 10000) // 10 second timeout
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [TDD Best Practices](https://martinfowler.com/bliki/TestDrivenDevelopment.html)

## Support

For questions or issues with tests:

1. Check this README
2. Review existing test files for examples
3. Consult the team's testing guidelines
