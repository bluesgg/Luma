# Phase 1: User Authentication - TDD Test Suite Summary

> **Created**: 2026-01-26
> **Status**: Tests Written (RED Phase - All tests will fail until implementation)
> **Total Test Files**: 17
> **Coverage**: Unit Tests, API Integration Tests, Component Tests, Hook Tests

---

## Overview

This document provides a comprehensive summary of all TDD tests written for Phase 1: User Authentication. Following TDD principles, these tests are written BEFORE implementation and will guide the development process.

## Test Structure

```
tests/
├── unit/lib/                   # Unit Tests (3 files)
│   ├── password.test.ts        # Password hashing & verification
│   ├── token.test.ts           # Token generation & validation
│   └── email.test.ts           # Email service integration
├── api/auth/                   # API Integration Tests (8 files)
│   ├── register.test.ts        # POST /api/auth/register
│   ├── login.test.ts           # POST /api/auth/login
│   ├── logout.test.ts          # POST /api/auth/logout
│   ├── verify.test.ts          # GET /api/auth/verify
│   ├── resend-verification.test.ts  # POST /api/auth/resend-verification
│   ├── reset-password.test.ts  # POST /api/auth/reset-password
│   ├── confirm-reset.test.ts   # POST /api/auth/confirm-reset
│   └── session.test.ts         # GET /api/auth/session
├── components/auth/            # Component Tests (5 files)
│   ├── login-form.test.tsx
│   ├── register-form.test.tsx
│   ├── forgot-password-form.test.tsx
│   ├── reset-password-form.test.tsx
│   └── password-strength-indicator.test.tsx
└── hooks/                      # Hook Tests (1 file)
    └── use-user.test.ts
```

---

## 1. Unit Tests (3 files)

### 1.1 Password Utilities (`tests/unit/lib/password.test.ts`)

**Purpose**: Test password hashing, verification, and strength validation.

**Test Coverage** (74 tests):

- ✅ Password hashing with bcrypt
- ✅ Hash uniqueness (salting)
- ✅ Password verification (correct/incorrect)
- ✅ Password strength checking (weak/medium/strong)
- ✅ Special character handling
- ✅ Unicode password support
- ✅ Edge cases (empty, null, very long passwords)
- ✅ Concurrent operations
- ✅ Timing attack prevention

**Key Functions to Implement**:

```typescript
interface PasswordUtils {
  hashPassword(password: string): Promise<string>
  verifyPassword(password: string, hash: string): Promise<boolean>
  isStrongPassword(password: string): boolean
  getPasswordStrength(password: string): 'weak' | 'medium' | 'strong'
}
```

**Critical Tests**:

- Password hash should never equal plaintext
- Same password should generate different hashes (due to salt)
- Minimum 8 character requirement
- Bcrypt cost factor validation
- Timing consistency for security

---

### 1.2 Token Utilities (`tests/unit/lib/token.test.ts`)

**Purpose**: Test verification token generation, validation, and lifecycle.

**Test Coverage** (58 tests):

- ✅ Token generation (cryptographically secure)
- ✅ Token uniqueness
- ✅ Database token creation (EMAIL_VERIFY, PASSWORD_RESET)
- ✅ 24-hour expiry validation
- ✅ Token validation (valid/expired/used)
- ✅ Mark token as used
- ✅ Invalidate user tokens by type
- ✅ Security considerations (SQL injection, malformed tokens)
- ✅ Concurrent token operations

**Key Functions to Implement**:

```typescript
interface TokenUtils {
  generateToken(): string
  generateVerificationToken(
    userId: string,
    type: TokenType
  ): Promise<{
    token: string
    expiresAt: Date
  }>
  validateToken(token: string): Promise<{
    isValid: boolean
    token?: TokenRecord
  }>
  markTokenAsUsed(tokenId: string): Promise<void>
  invalidateUserTokens(userId: string, type: TokenType): Promise<void>
}
```

**Critical Tests**:

- URL-safe token generation
- 24-hour expiry enforcement
- Used tokens cannot be reused
- Type-specific token invalidation
- Race condition handling

---

### 1.3 Email Service (`tests/unit/lib/email.test.ts`)

**Purpose**: Test email sending functionality and template generation.

**Test Coverage** (68 tests):

- ✅ Verification email sending
- ✅ Password reset email sending
- ✅ Welcome email sending
- ✅ Password changed notification
- ✅ Template generation (HTML + plain text)
- ✅ Email validation
- ✅ Personalization with user names
- ✅ Link generation (absolute URLs)
- ✅ Error handling (network, rate limiting)
- ✅ Concurrent email sending

**Key Functions to Implement**:

```typescript
interface EmailService {
  sendVerificationEmail(
    email: string,
    token: string,
    userName?: string
  ): Promise<void>
  sendPasswordResetEmail(
    email: string,
    token: string,
    userName?: string
  ): Promise<void>
  sendWelcomeEmail(email: string, userName: string): Promise<void>
  sendPasswordChangedEmail(email: string, userName?: string): Promise<void>
}

interface EmailTemplateBuilder {
  buildVerificationEmail(token: string, userName?: string): EmailTemplate
  buildPasswordResetEmail(token: string, userName?: string): EmailTemplate
  buildWelcomeEmail(userName: string): EmailTemplate
  buildPasswordChangedEmail(userName?: string): EmailTemplate
}
```

**Critical Tests**:

- Email format validation (RFC 5322)
- Both HTML and plain text versions
- Absolute URL generation
- Error handling without throwing
- Security warnings in templates

---

## 2. API Integration Tests (8 files)

### 2.1 Registration Endpoint (`tests/api/auth/register.test.ts`)

**Endpoint**: `POST /api/auth/register`

**Test Coverage** (100+ tests):

- ✅ **Happy Path**: Successful registration with email verification
- ✅ **Email Validation**: Format, empty, missing, normalization
- ✅ **Password Validation**: Length (min 8), empty, special characters
- ✅ **Duplicate Prevention**: Case-insensitive email uniqueness
- ✅ **Security**: Password hashing, no sensitive data in response
- ✅ **Token Creation**: 24-hour verification token
- ✅ **Email Sending**: Verification email dispatch
- ✅ **Rate Limiting**: Protection against abuse
- ✅ **Error Handling**: Database errors, email service failures
- ✅ **Concurrent Operations**: Race condition handling
- ✅ **Edge Cases**: Unicode, null values, extra fields

**Request Schema**:

```typescript
{
  email: string (valid email, required)
  password: string (min 8 chars, required)
}
```

**Success Response** (201):

```typescript
{
  success: true,
  data: {
    user: {
      id: string
      email: string
      role: "STUDENT"
      emailConfirmedAt: null
      createdAt: Date
    },
    message: "Please check your email for verification"
  }
}
```

**Critical Tests**:

- Password hash must never equal plaintext
- email_confirmed_at must be null initially
- Duplicate email returns 400
- Rate limiting triggers after 10-15 requests

---

### 2.2 Login Endpoint (`tests/api/auth/login.test.ts`)

**Endpoint**: `POST /api/auth/login`

**Test Coverage** (90+ tests):

- ✅ **Happy Path**: Successful login with session creation
- ✅ **Email Verification Check**: 403 for unverified emails
- ✅ **Credential Validation**: Wrong password, non-existent email
- ✅ **Account Lockout**: 5 failed attempts → 30-minute lockout
- ✅ **Session Management**: httpOnly cookie, 7-day/30-day expiry
- ✅ **Remember Me**: Extended session duration
- ✅ **Last Login Update**: Timestamp update on success
- ✅ **Failed Attempts**: Counter increment and reset
- ✅ **Security**: No sensitive data, timing attack prevention
- ✅ **Rate Limiting**: Protection against brute force

**Request Schema**:

```typescript
{
  email: string (required)
  password: string (required)
  rememberMe?: boolean (default: false)
}
```

**Success Response** (200):

```typescript
{
  success: true,
  data: {
    user: {
      id: string
      email: string
      role: "STUDENT" | "ADMIN"
      emailConfirmedAt: Date
      lastLoginAt: Date
    }
  }
}
```

**Error Responses**:

- 401: Invalid credentials
- 403: Email not verified OR Account locked
- 400: Validation error

**Critical Tests**:

- Unverified email returns 403 (not 401)
- 5 failed attempts lock account for exactly 30 minutes
- Remember me extends cookie to 30 days
- Timing attack prevention (consistent response times)

---

### 2.3 Logout Endpoint (`tests/api/auth/logout.test.ts`)

**Endpoint**: `POST /api/auth/logout`

**Test Coverage** (15+ tests):

- ✅ **Happy Path**: Successful logout with cookie clearing
- ✅ **Session Destruction**: Database/cache session removal
- ✅ **Cookie Clearing**: Set max-age=0
- ✅ **Idempotency**: Success even without valid session
- ✅ **CSRF Protection**: Token validation
- ✅ **Method Validation**: POST only

**Success Response** (200):

```typescript
{
  success: true,
  data: {
    message: "Logged out successfully"
  }
}
```

**Critical Tests**:

- Should succeed even with no session (idempotent)
- Should clear httpOnly cookie
- Should destroy session in Supabase

---

### 2.4 Email Verification (`tests/api/auth/verify.test.ts`)

**Endpoint**: `GET /api/auth/verify?token={token}`

**Test Coverage** (35+ tests):

- ✅ **Happy Path**: Valid token verification
- ✅ **Token Validation**: Non-existent, expired, already used
- ✅ **Type Check**: Only EMAIL_VERIFY tokens accepted
- ✅ **Timestamp Update**: email_confirmed_at set to current time
- ✅ **Token Marking**: usedAt timestamp set
- ✅ **Already Verified**: Graceful handling
- ✅ **Security**: SQL injection protection, rate limiting

**Success Response** (200):

```typescript
{
  success: true,
  data: {
    message: "Email verified successfully"
  }
}
```

**Error Responses**:

- 400: Invalid token, expired token, already used
- 429: Too many verification attempts

**Critical Tests**:

- Token can only be used once
- Expired tokens (>24h) are rejected
- email_confirmed_at must be set to current time
- PASSWORD_RESET tokens are rejected

---

### 2.5 Resend Verification (`tests/api/auth/resend-verification.test.ts`)

**Endpoint**: `POST /api/auth/resend-verification`

**Test Coverage** (25+ tests):

- ✅ **Happy Path**: New token generation and email sending
- ✅ **Token Invalidation**: Old tokens marked as used
- ✅ **Already Verified**: Rejection with appropriate message
- ✅ **Rate Limiting**: 5 requests per 15 minutes
- ✅ **Email Validation**: Format and existence checks

**Request Schema**:

```typescript
{
  email: string(required)
}
```

**Success Response** (200):

```typescript
{
  success: true,
  data: {
    message: "Verification email sent"
  }
}
```

**Critical Tests**:

- Rate limit enforced (5 requests per 15 minutes)
- Old tokens invalidated before creating new one
- Already verified users get 400 error

---

### 2.6 Password Reset Request (`tests/api/auth/reset-password.test.ts`)

**Endpoint**: `POST /api/auth/reset-password`

**Test Coverage** (30+ tests):

- ✅ **Happy Path**: Token creation and email sending
- ✅ **Security**: Success response for non-existent emails
- ✅ **Token Expiry**: 24-hour expiration
- ✅ **Rate Limiting**: 5 requests per 15 minutes
- ✅ **Timing Consistency**: Same response time for existing/non-existing emails

**Request Schema**:

```typescript
{
  email: string(required)
}
```

**Success Response** (200):

```typescript
{
  success: true,
  data: {
    message: "If the email exists, a reset link has been sent"
  }
}
```

**Critical Tests**:

- Always return 200 (don't reveal if email exists)
- Consistent response timing
- 24-hour token expiry
- Rate limiting per IP/email

---

### 2.7 Password Reset Confirmation (`tests/api/auth/confirm-reset.test.ts`)

**Endpoint**: `POST /api/auth/confirm-reset`

**Test Coverage** (35+ tests):

- ✅ **Happy Path**: Password update and token marking
- ✅ **Token Validation**: Invalid, expired, already used, wrong type
- ✅ **Password Validation**: Minimum 8 characters
- ✅ **Session Invalidation**: All existing sessions destroyed
- ✅ **Email Notification**: Password changed confirmation
- ✅ **Security**: Bcrypt hashing

**Request Schema**:

```typescript
{
  token: string (required)
  password: string (min 8 chars, required)
}
```

**Success Response** (200):

```typescript
{
  success: true,
  data: {
    message: "Password reset successfully"
  }
}
```

**Critical Tests**:

- Token can only be used once
- All sessions must be invalidated
- New password must be hashed with bcrypt
- PASSWORD_RESET tokens only (not EMAIL_VERIFY)

---

### 2.8 Session Check (`tests/api/auth/session.test.ts`)

**Endpoint**: `GET /api/auth/session`

**Test Coverage** (25+ tests):

- ✅ **Authenticated**: Return user data
- ✅ **Unauthenticated**: Return 401
- ✅ **Session Refresh**: Extend expiry on each check
- ✅ **Data Filtering**: No sensitive fields in response
- ✅ **Security**: Signature validation

**Success Response** (200):

```typescript
{
  success: true,
  data: {
    user: {
      id: string
      email: string
      role: "STUDENT" | "ADMIN"
      emailConfirmedAt: Date | null
    }
  }
}
```

**Error Response** (401):

```typescript
{
  success: false,
  error: {
    code: "AUTH_UNAUTHORIZED",
    message: "Not authenticated"
  }
}
```

**Critical Tests**:

- Session refresh on each check
- No passwordHash in response
- 401 for missing/invalid session
- Proper cookie validation

---

## 3. Component Tests (5 files)

### 3.1 Login Form (`tests/components/auth/login-form.test.tsx`)

**Test Coverage** (60+ tests):

- ✅ **Rendering**: Email, password, remember me, links
- ✅ **User Interactions**: Typing, checkbox toggle, password visibility
- ✅ **Validation**: Email format, required fields, error clearing
- ✅ **Form Submission**: Data structure, loading states, prevent multiple submits
- ✅ **Error Handling**: Invalid credentials, unverified email, locked account
- ✅ **Accessibility**: Labels, ARIA attributes, keyboard navigation

**Component Props**:

```typescript
interface LoginFormProps {
  onSubmit: (data: {
    email: string
    password: string
    rememberMe: boolean
  }) => Promise<void>
  onForgotPassword?: () => void
  onRegister?: () => void
}
```

**Critical Tests**:

- Password show/hide toggle
- Remember me checkbox affects submission
- Form disabled during submission
- Error messages displayed with role="alert"
- Keyboard navigation (Tab order)
- Enter key submits form

---

### 3.2 Register Form (`tests/components/auth/register-form.test.tsx`)

**Test Coverage** (45+ tests):

- ✅ **Rendering**: Email, password, confirm password, strength indicator
- ✅ **Password Validation**: Length, strength levels
- ✅ **Password Confirmation**: Match validation
- ✅ **Form Submission**: Success redirect, loading states
- ✅ **Error Handling**: Duplicate email, validation errors
- ✅ **Accessibility**: ARIA labels, error announcements

**Component Props**:

```typescript
interface RegisterFormProps {
  onSubmit: (data: { email: string; password: string }) => Promise<void>
  onLogin?: () => void
}
```

**Critical Tests**:

- Password strength indicator updates in real-time
- Confirm password must match
- Success shows "check your email" message
- Duplicate email error handling

---

### 3.3 Forgot Password Form (`tests/components/auth/forgot-password-form.test.tsx`)

**Test Coverage** (20+ tests):

- ✅ **Email Validation**: Format checking
- ✅ **Submission**: Success message, loading state
- ✅ **Rate Limiting**: Error display
- ✅ **Navigation**: Back to login link

**Critical Tests**:

- Success shows "check your email"
- Rate limit error displayed
- Form disabled during submission

---

### 3.4 Reset Password Form (`tests/components/auth/reset-password-form.test.tsx`)

**Test Coverage** (30+ tests):

- ✅ **Token Validation**: On mount
- ✅ **Password Strength**: Real-time indicator
- ✅ **Password Confirmation**: Match validation
- ✅ **Submission**: Success redirect to login
- ✅ **Error Handling**: Expired token, invalid token

**Component Props**:

```typescript
interface ResetPasswordFormProps {
  token: string
  onSubmit: (data: { token: string; password: string }) => Promise<void>
}
```

**Critical Tests**:

- Token validation on component mount
- Expired token shows error with "request new link"
- Success redirects to login page

---

### 3.5 Password Strength Indicator (`tests/components/auth/password-strength-indicator.test.tsx`)

**Test Coverage** (20+ tests):

- ✅ **Strength Levels**: Weak, medium, strong
- ✅ **Visual Indicator**: Progress bar with color coding
- ✅ **Criteria Checklist**: Length, uppercase, lowercase, number, special
- ✅ **Dynamic Updates**: Real-time feedback
- ✅ **Empty State**: Hidden when password is empty

**Component Props**:

```typescript
interface PasswordStrengthIndicatorProps {
  password: string
  showCriteria?: boolean
}
```

**Strength Criteria**:

- **Weak**: < 8 chars OR only lowercase OR only numbers
- **Medium**: >= 8 chars + letters + numbers
- **Strong**: >= 8 chars + uppercase + lowercase + numbers + special characters

**Critical Tests**:

- Color changes: red (weak), yellow (medium), green (strong)
- Criteria checklist updates in real-time
- Hidden when password is empty

---

## 4. Hook Tests (1 file)

### 4.1 useUser Hook (`tests/hooks/use-user.test.ts`)

**Test Coverage** (30+ tests):

- ✅ **Data Fetching**: Initial loading, authenticated/unauthenticated states
- ✅ **Auto-refetch**: Window focus, query caching
- ✅ **Logout Mutation**: API call, cache invalidation
- ✅ **Error Handling**: Network errors, 401 responses
- ✅ **Type Safety**: TypeScript type inference

**Hook Interface**:

```typescript
interface UseUserReturn {
  user: User | null
  isLoading: boolean
  error: Error | null
  logout: () => Promise<void>
}
```

**Critical Tests**:

- Initial loading state is true
- Auto-refetch on window focus
- Logout clears user data
- Query cache reused across hook instances
- 401 errors don't throw (expected for logged out users)

---

## Test Execution

### Running Tests

```bash
# Run all Phase 1 auth tests
npm test tests/unit/lib/password.test.ts
npm test tests/unit/lib/token.test.ts
npm test tests/unit/lib/email.test.ts
npm test tests/api/auth/
npm test tests/components/auth/
npm test tests/hooks/use-user.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode during development
npm test -- --watch
```

### Expected Initial State

🔴 **RED PHASE**: All tests will FAIL initially because:

- Functions are not yet implemented
- API endpoints don't exist
- Components haven't been built
- Database schema may not be complete

This is correct TDD practice! Tests guide implementation.

---

## Implementation Checklist

Use these tests to guide implementation in this order:

### 1. Foundation (Week 1)

- [ ] Implement password utilities (`src/lib/auth/password.ts`)
- [ ] Implement token utilities (`src/lib/auth/token.ts`)
- [ ] Integrate email service (`src/lib/email/service.ts`)
- [ ] Create email templates (`src/lib/email/templates.ts`)

### 2. API Routes (Week 1-2)

- [ ] POST `/api/auth/register`
- [ ] POST `/api/auth/login`
- [ ] POST `/api/auth/logout`
- [ ] GET `/api/auth/verify`
- [ ] POST `/api/auth/resend-verification`
- [ ] POST `/api/auth/reset-password`
- [ ] POST `/api/auth/confirm-reset`
- [ ] GET `/api/auth/session`

### 3. Components (Week 2)

- [ ] `LoginForm` component
- [ ] `RegisterForm` component
- [ ] `ForgotPasswordForm` component
- [ ] `ResetPasswordForm` component
- [ ] `PasswordStrengthIndicator` component

### 4. Hooks & Pages (Week 2)

- [ ] `useUser` hook
- [ ] `/login` page
- [ ] `/register` page
- [ ] `/forgot-password` page
- [ ] `/reset-password` page

### 5. Middleware (Week 2)

- [ ] Auth middleware for route protection
- [ ] Session refresh logic
- [ ] CSRF protection

---

## Key Acceptance Criteria from PRD

All tests align with these requirements from `docs/task.md`:

### AUTH-001: User Registration API

✅ Email format validation (RFC 5322)
✅ Password minimum 8 characters
✅ Password hashing with bcrypt
✅ VerificationToken created (24h expiry)
✅ Prevent duplicate email registration
✅ User created with `email_confirmed_at = null`

### AUTH-002: Email Verification API

✅ Token validation (exists, not expired, not used)
✅ User `email_confirmed_at` updated on success
✅ Token marked as used
✅ Appropriate error messages

### AUTH-005: User Login API

✅ Email verified check (403 if not verified)
✅ Password verification with bcrypt
✅ Failed login counter increment
✅ Account lockout after 5 failed attempts (30 min)
✅ Session creation via Supabase Auth
✅ httpOnly cookie (7 days default, 30 days with remember me)
✅ `last_login_at` updated

### AUTH-006/007: Password Reset

✅ Rate limiting: 5 requests per 15 minutes
✅ VerificationToken created (PASSWORD_RESET, 24h expiry)
✅ Success response even for non-existent emails
✅ New password validation
✅ All existing sessions invalidated

---

## Coverage Goals

| Test Type  | Target Coverage |
| ---------- | --------------- |
| Unit Tests | 90%+            |
| API Routes | 85%+            |
| Components | 80%+            |
| Hooks      | 85%+            |

---

## Security Checklist

All tests verify these security requirements:

✅ Passwords never stored in plaintext
✅ Bcrypt hashing with appropriate cost factor
✅ Timing attack prevention (constant-time comparisons)
✅ Rate limiting on all auth endpoints
✅ CSRF protection
✅ HttpOnly, Secure, SameSite cookies
✅ No sensitive data in API responses
✅ SQL injection protection
✅ Token expiration enforcement
✅ Session invalidation on password change
✅ Account lockout after failed attempts

---

## Next Steps

1. **GREEN PHASE**: Implement each function/endpoint to make tests pass
2. **REFACTOR PHASE**: Improve code quality while keeping tests green
3. **Integration**: Test full auth flow end-to-end
4. **Documentation**: Update API documentation with actual implementations
5. **Security Review**: Audit implementation against OWASP guidelines

---

## Notes

- All test files use `null as any` for unimplemented functions - this is intentional for TDD
- Tests are designed to fail with clear error messages
- Mock implementations will need to be replaced with actual API calls
- Database setup/teardown handled in `beforeEach`/`afterEach`
- Tests follow existing patterns from `tests/lib/validation.test.ts`

---

## Questions & Clarifications

If you encounter any test failures or need clarification:

1. Check the test description for expected behavior
2. Verify against PRD requirements in `docs/task.md`
3. Review error messages for guidance
4. Consult `docs/PRD.md` for business rules

---

**Status**: ✅ All TDD tests written and ready for implementation
**Next Action**: Begin GREEN phase by implementing functions/endpoints to pass tests
