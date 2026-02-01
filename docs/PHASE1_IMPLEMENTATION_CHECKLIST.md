# Phase 1 Authentication - Implementation Checklist

## Prerequisites

- [x] Test files written (TDD approach)
- [ ] Dependencies installed: `pnpm install`
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Supabase project set up

## Implementation Order

Follow this order to implement Phase 1 Authentication features:

### 1. Library Functions (Foundation)

#### 1.1 Password Utilities (`src/lib/password.ts`)
- [ ] Implement `hashPassword(password: string): Promise<string>`
- [ ] Implement `verifyPassword(password: string, hash: string): Promise<boolean>`
- [ ] Use bcrypt with cost factor 10
- [ ] Run tests: `pnpm test tests/unit/lib/password.test.ts`

#### 1.2 Token Utilities (`src/lib/token.ts`)
- [ ] Implement `generateToken(bytes?: number): string`
- [ ] Implement `isTokenExpired(expiresAt: Date): boolean`
- [ ] Use `crypto.randomBytes()` for generation
- [ ] Run tests: `pnpm test tests/unit/lib/token.test.ts`

#### 1.3 Validation Schemas (`src/lib/validation.ts`)
- [ ] Define `emailSchema` (Zod)
- [ ] Define `passwordSchema` with complexity rules
- [ ] Define `registerSchema`
- [ ] Define `loginSchema`
- [ ] Define `resetPasswordSchema`
- [ ] Define `confirmResetSchema`
- [ ] Define `verifyTokenSchema`
- [ ] Run tests: `pnpm test tests/unit/lib/validation.test.ts`

#### 1.4 Rate Limiting (`src/lib/rate-limit.ts`)
- [ ] Implement `RateLimiter` class or functions
- [ ] Support auth limits (10/15min)
- [ ] Support API limits (100/min)
- [ ] Support AI limits (20/min)
- [ ] Track by IP, email, or composite key
- [ ] Implement cleanup for expired entries
- [ ] Run tests: `pnpm test tests/unit/lib/rate-limit.test.ts`

### 2. API Routes

#### 2.1 User Registration (`src/app/api/auth/register/route.ts`)
- [ ] Create POST handler
- [ ] Validate request with `registerSchema`
- [ ] Check for duplicate email (case-insensitive)
- [ ] Hash password with bcrypt
- [ ] Create user in database
- [ ] Create verification token (24h expiration)
- [ ] Create initial quota (500 AI interactions)
- [ ] Create user preferences (default locale)
- [ ] Send verification email
- [ ] Return 201 with user data
- [ ] Handle errors appropriately
- [ ] Apply rate limiting
- [ ] Run tests: `pnpm test tests/api/auth/register.test.ts`

#### 2.2 User Login (`src/app/api/auth/login/route.ts`)
- [ ] Create POST handler
- [ ] Validate request with `loginSchema`
- [ ] Find user by email (case-insensitive)
- [ ] Check if account is locked
- [ ] Verify password
- [ ] Reset failed login count on success
- [ ] Increment failed login count on failure
- [ ] Lock account after 5 failed attempts (30 min)
- [ ] Create Supabase session
- [ ] Set httpOnly session cookie
- [ ] Set expiration (7 days or 30 days with rememberMe)
- [ ] Return user data
- [ ] Apply rate limiting
- [ ] Run tests: `pnpm test tests/api/auth/login.test.ts`

#### 2.3 User Logout (`src/app/api/auth/logout/route.ts`)
- [ ] Create POST handler
- [ ] Verify CSRF token
- [ ] Invalidate Supabase session
- [ ] Clear session cookie (Max-Age=0)
- [ ] Return success message
- [ ] Run tests: `pnpm test tests/api/auth/logout.test.ts`

#### 2.4 Email Verification (`src/app/api/auth/verify/route.ts`)
- [ ] Create POST handler
- [ ] Validate token
- [ ] Find verification token
- [ ] Check if expired
- [ ] Verify token type (EMAIL_VERIFICATION)
- [ ] Update user.emailVerified = true
- [ ] Delete verification token
- [ ] Return success message
- [ ] Run tests: `pnpm test tests/api/auth/verify.test.ts`

#### 2.5 Resend Verification (`src/app/api/auth/resend-verification/route.ts`)
- [ ] Create POST handler
- [ ] Validate email
- [ ] Find user by email
- [ ] Check if already verified
- [ ] Delete old verification tokens
- [ ] Create new verification token
- [ ] Send verification email
- [ ] Return success (even if user not found - prevent enumeration)
- [ ] Apply rate limiting
- [ ] Run tests: `pnpm test tests/api/auth/resend-verification.test.ts`

#### 2.6 Password Reset Request (`src/app/api/auth/reset-password/route.ts`)
- [ ] Create POST handler
- [ ] Validate email
- [ ] Find user by email
- [ ] Delete old password reset tokens
- [ ] Create reset token (1h expiration)
- [ ] Send password reset email
- [ ] Return success (even if user not found - prevent enumeration)
- [ ] Apply rate limiting
- [ ] Run tests: `pnpm test tests/api/auth/reset-password.test.ts`

#### 2.7 Password Reset Confirmation (`src/app/api/auth/confirm-reset/route.ts`)
- [ ] Create POST handler
- [ ] Validate request with `confirmResetSchema`
- [ ] Verify passwords match
- [ ] Find reset token
- [ ] Check if expired
- [ ] Verify token type (PASSWORD_RESET)
- [ ] Hash new password
- [ ] Update user password
- [ ] Reset failedLoginCount to 0
- [ ] Clear lockedUntil
- [ ] Delete reset token
- [ ] Return success message
- [ ] Run tests: `pnpm test tests/api/auth/confirm-reset.test.ts`

### 3. UI Components

#### 3.1 Login Form (`src/components/auth/login-form.tsx`)
- [ ] Create LoginForm component
- [ ] Use react-hook-form + Zod
- [ ] Email input field
- [ ] Password input field (type="password")
- [ ] Remember me checkbox
- [ ] Submit button with loading state
- [ ] Error message display
- [ ] Link to forgot password page
- [ ] Link to register page
- [ ] Handle form submission
- [ ] Call login API
- [ ] Redirect on success
- [ ] Show validation errors
- [ ] Run tests: `pnpm test tests/components/auth/login-form.test.tsx`

#### 3.2 Register Form (`src/components/auth/register-form.tsx`)
- [ ] Create RegisterForm component
- [ ] Use react-hook-form + Zod
- [ ] Email input field
- [ ] Password input field
- [ ] Confirm password field
- [ ] Password strength indicator
- [ ] Submit button with loading state
- [ ] Error message display
- [ ] Link to login page
- [ ] Handle form submission
- [ ] Call register API
- [ ] Show success message
- [ ] Redirect to verification notice
- [ ] Run tests: `pnpm test tests/components/auth/register-form.test.tsx`

#### 3.3 Password Strength Indicator (`src/components/auth/password-strength-indicator.tsx`)
- [ ] Create PasswordStrengthIndicator component
- [ ] Calculate strength (weak/medium/strong)
- [ ] Show visual bar (red/yellow/green)
- [ ] Show strength label
- [ ] Update in real-time
- [ ] Check for uppercase, lowercase, number, special char
- [ ] Run tests: `pnpm test tests/components/auth/password-strength-indicator.test.tsx`

#### 3.4 Forgot Password Form (`src/components/auth/forgot-password-form.tsx`)
- [ ] Create ForgotPasswordForm component
- [ ] Email input field
- [ ] Submit button
- [ ] Call reset-password API
- [ ] Show success message
- [ ] Link back to login

#### 3.5 Reset Password Form (`src/components/auth/reset-password-form.tsx`)
- [ ] Create ResetPasswordForm component
- [ ] Get token from URL params
- [ ] Password input field
- [ ] Confirm password field
- [ ] Password strength indicator
- [ ] Submit button
- [ ] Call confirm-reset API
- [ ] Show success message
- [ ] Redirect to login

### 4. Pages

#### 4.1 Login Page (`src/app/(auth)/login/page.tsx`)
- [ ] Create login page layout
- [ ] Render LoginForm component
- [ ] Add page metadata
- [ ] Redirect if already logged in

#### 4.2 Register Page (`src/app/(auth)/register/page.tsx`)
- [ ] Create register page layout
- [ ] Render RegisterForm component
- [ ] Add page metadata
- [ ] Redirect if already logged in

#### 4.3 Verify Email Page (`src/app/(auth)/verify/page.tsx`)
- [ ] Create verify page
- [ ] Get token from URL params
- [ ] Call verify API on mount
- [ ] Show success/error message
- [ ] Link to login or resend

#### 4.4 Forgot Password Page (`src/app/(auth)/forgot-password/page.tsx`)
- [ ] Create forgot password page
- [ ] Render ForgotPasswordForm
- [ ] Add page metadata

#### 4.5 Reset Password Page (`src/app/(auth)/reset-password/page.tsx`)
- [ ] Create reset password page
- [ ] Render ResetPasswordForm
- [ ] Add page metadata

### 5. Supporting Files

#### 5.1 Email Service (`src/lib/email.ts`)
- [ ] Implement `sendVerificationEmail(email, token)`
- [ ] Implement `sendPasswordResetEmail(email, token)`
- [ ] Use email service provider (e.g., Resend, SendGrid)
- [ ] Create email templates

#### 5.2 Auth Utilities (`src/lib/auth.ts`)
- [ ] Implement `getCurrentUser()` - Get user from session
- [ ] Implement `requireAuth()` - Middleware helper
- [ ] Implement `getSession()` - Get Supabase session

#### 5.3 CSRF Protection (`src/lib/csrf.ts`)
- [ ] Implement CSRF token generation
- [ ] Implement CSRF token validation
- [ ] Add to mutation endpoints

#### 5.4 API Response Helper (`src/lib/api-response.ts`)
- [ ] Implement `successResponse(data)`
- [ ] Implement `errorResponse(code, message)`
- [ ] Standardize response format

### 6. Database

#### 6.1 Prisma Schema
- [x] User model (already defined)
- [x] VerificationToken model (already defined)
- [x] Quota model (already defined)
- [x] UserPreference model (already defined)

#### 6.2 Migrations
- [ ] Run: `pnpm db:migrate`
- [ ] Verify schema in database

### 7. Integration Testing

#### 7.1 Test Complete Flow
- [ ] Register new user
- [ ] Verify email
- [ ] Login
- [ ] Logout
- [ ] Request password reset
- [ ] Confirm password reset
- [ ] Login with new password

#### 7.2 Test Error Scenarios
- [ ] Duplicate registration
- [ ] Invalid credentials
- [ ] Account lockout
- [ ] Expired tokens
- [ ] Rate limiting

### 8. Final Checklist

- [ ] All unit tests passing
- [ ] All API tests passing
- [ ] All component tests passing
- [ ] Test coverage > 80%
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] API responses follow standard format
- [ ] Error messages are user-friendly
- [ ] Security best practices followed
- [ ] Rate limiting implemented
- [ ] CSRF protection on mutations
- [ ] Passwords never exposed
- [ ] Email enumeration prevented
- [ ] Account lockout works
- [ ] Session cookies are httpOnly
- [ ] Token expiration enforced

## Testing Commands

```bash
# Run all tests
pnpm test

# Run specific test suite
pnpm test tests/unit/lib/
pnpm test tests/api/auth/
pnpm test tests/components/auth/

# Run with coverage
pnpm test:coverage

# Run in watch mode
pnpm test --watch

# Run UI
pnpm test:ui
```

## Common Issues & Solutions

### Issue: bcrypt error
**Solution**: Ensure `bcryptjs` is installed: `pnpm add bcryptjs`

### Issue: Prisma client not generated
**Solution**: Run `pnpm db:generate`

### Issue: Supabase session error
**Solution**: Verify environment variables are set correctly

### Issue: Rate limiter memory leak
**Solution**: Implement cleanup for expired entries

### Issue: Tests timing out
**Solution**: Check for missing `await` in async tests

## Success Criteria

Phase 1 is complete when:
1. ✅ All tests pass
2. ✅ Coverage > 80%
3. ✅ No TypeScript/ESLint errors
4. ✅ Complete registration flow works end-to-end
5. ✅ Complete login flow works end-to-end
6. ✅ Email verification works
7. ✅ Password reset works
8. ✅ Account lockout works
9. ✅ Rate limiting works
10. ✅ Security measures in place

## Next Phase

After Phase 1 completion, proceed to:
- **Phase 2**: Course Management
- **Phase 3**: File Upload & Storage
- **Phase 4**: AI Interactive Tutor

Good luck with implementation! 🚀
