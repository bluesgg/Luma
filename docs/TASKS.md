# StudentAid Web - Task Breakdown

> **Generated from**: PRD v1.1 MVP
> **Last Updated**: 2026-01-19

## Priority Legend
- **P0 (Critical)**: Must have for MVP launch, blocks other work
- **P1 (Important)**: Core MVP functionality
- **P2 (Nice-to-have)**: Can be deferred post-MVP

---

## Database

### P0 - Foundation Tables

#### User Authentication
- [x] **DB-001**: Create `User` table
  - Fields: id, email, password_hash, role, created_at, updated_at, email_confirmed_at, last_login_at, failed_login_attempts, locked_until
  - Index: email (unique)
- [x] **DB-002**: Create `VerificationToken` table
  - Fields: id, user_id, token, type (email_verify | password_reset), expires_at, created_at
  - Index: token (unique), user_id

#### Course & File Management
- [x] **DB-003**: Create `Course` table
  - Fields: id, user_id, name, school, term, created_at, updated_at
  - Index: user_id
- [x] **DB-004**: Create `File` table
  - Fields: id, course_id, name, type, page_count, file_size, is_scanned, status (uploading | processing | ready | failed), storage_path, created_at
  - Index: course_id, status

#### PDF Learning (Core)
- [x] **DB-005**: Create `Explanation` table
  - Fields: id, file_id, page_number, content, created_at
  - Index: (file_id, page_number) - composite unique
- [x] **DB-006**: Create `ImageRegion` table
  - Fields: id, file_id, page_number, bbox (JSON), explanation, created_at
  - Index: (file_id, page_number)
- [x] **DB-007**: Create `QA` table
  - Fields: id, file_id, question, answer, page_refs (JSON), created_at
  - Index: file_id
- [x] **DB-008**: Create `ReadingProgress` table
  - Fields: id, user_id, file_id, page_number, updated_at
  - Index: (user_id, file_id) - composite unique

#### Quota Management
- [x] **DB-009**: Create `Quota` table
  - Fields: id, user_id, bucket (learningInteractions | autoExplain), used, limit, reset_at
  - Index: (user_id, bucket) - composite unique
- [x] **DB-010**: Create `QuotaLog` table
  - Fields: id, user_id, bucket, change, reason (system_reset | admin_adjust | consume | refund), created_at
  - Index: user_id, created_at

#### User Settings
- [x] **DB-011**: Create `UserPreference` table
  - Fields: id, user_id, ui_locale, explain_locale, updated_at
  - Index: user_id (unique)

#### Admin Dashboard
- [x] **DB-012**: Create `Admin` table
  - Fields: id, email, password_hash, role (super_admin | admin), created_at, disabled_at
  - Index: email (unique)
- [x] **DB-013**: Create `AccessLog` table
  - Fields: id, user_id, action_type (login | view_file | use_qa | use_explain), timestamp
  - Index: user_id, timestamp
- [x] **DB-014**: Create `AIUsageLog` table
  - Fields: id, user_id, action_type (qa | explain), input_tokens, output_tokens, model, created_at
  - Index: user_id, created_at
- [x] **DB-015**: Create `AuditLog` table
  - Fields: id, admin_id, action, target_user_id, details (JSON), created_at
  - Index: admin_id, created_at

---

## Backend

### P0 - Authentication APIs

- [ ] **BE-001**: POST `/api/auth/register` - User registration
  - Validate email format (RFC 5322), password min 8 chars
  - Hash password, create user with unverified status
  - Generate verification token, trigger verification email
  - Return 201 on success
- [ ] **BE-002**: POST `/api/auth/login` - User login
  - Validate credentials, check email verification status
  - Implement login failure tracking (5 attempts → 30 min lockout)
  - Set httpOnly cookie (7 days default, 30 days with "remember me")
  - Return 200 with user info, or 403 for unverified/locked accounts
- [ ] **BE-003**: POST `/api/auth/verify-email` - Email verification
  - Validate token, check expiration (24h)
  - Mark user as verified, delete token
  - Return 200 on success
- [ ] **BE-004**: POST `/api/auth/resend-verification` - Resend verification email
  - Rate limit: 5 requests per 15 minutes
  - Generate new token, send email
- [ ] **BE-005**: POST `/api/auth/forgot-password` - Request password reset
  - Rate limit: 5 requests per 15 minutes
  - Generate reset token (24h expiry), send email
- [ ] **BE-006**: POST `/api/auth/reset-password` - Reset password
  - Validate token, update password hash, delete token
- [ ] **BE-007**: POST `/api/auth/logout` - User logout
  - Clear session cookie
- [ ] **BE-008**: Implement auth middleware
  - Verify session cookie, attach user to request context
  - Return 401 for unauthenticated, 403 for unauthorized

### P0 - Course APIs

- [ ] **BE-009**: GET `/api/courses` - List user courses
  - Return courses sorted by created_at DESC
- [ ] **BE-010**: POST `/api/courses` - Create course
  - Validate name (max 50 chars), check course limit (max 6)
  - Return 400 with message "已达课程数量上限 (6门)，请删除后再创建" if limit reached
- [ ] **BE-011**: PATCH `/api/courses/:id` - Update course
  - Validate ownership, update name/school/term
- [ ] **BE-012**: DELETE `/api/courses/:id` - Delete course
  - Validate ownership, cascade delete all files and AI data
  - Require confirmation token in request body

### P0 - File APIs

- [ ] **BE-013**: GET `/api/courses/:courseId/files` - List course files
  - Return files with status and metadata
- [ ] **BE-014**: POST `/api/courses/:courseId/files` - Upload file
  - Validate: PDF only, ≤200MB, ≤500 pages, ≤30 files per course, ≤5GB total storage
  - Check for duplicate filename, return 400 if exists
  - Set status to "uploading", trigger async processing
- [ ] **BE-015**: DELETE `/api/files/:id` - Delete file
  - Validate ownership, cascade delete AI data
  - Remove file from storage
- [ ] **BE-016**: GET `/api/files/:id/content` - Get file content
  - Stream PDF content for viewer

### P1 - PDF Processing

- [ ] **BE-017**: Implement PDF processing worker
  - Extract page count, detect if scanned
  - Update file status: processing → ready/failed
- [ ] **BE-018**: Implement scanned PDF detection
  - Analyze text extraction ratio per page
  - Set is_scanned flag if detected
- [ ] **BE-019**: Implement image region extraction
  - Detect and store image bounding boxes per page
  - Store in ImageRegion table for ready files

### P0 - AI Integration (Core)

- [ ] **BE-020**: POST `/api/files/:id/explain` - Auto-explain page
  - Validate: file not scanned, quota available
  - Extract page content + image regions
  - Call AI service with page context
  - Deduct autoExplain quota
  - Store and return explanation
- [ ] **BE-021**: POST `/api/courses/:courseId/qa` - Q&A
  - Validate quota available
  - Build context from all course documents
  - Call AI service with question + context
  - Deduct learningInteractions quota
  - Store and return answer with page refs
- [ ] **BE-022**: Implement AI service client
  - Handle timeout (30s), retry with exponential backoff
  - Log token usage to AIUsageLog
  - Refund quota on failure
- [ ] **BE-023**: GET `/api/files/:id/explanations` - Get cached explanations
  - Return existing explanations for file

### P1 - Quota Management

- [ ] **BE-024**: GET `/api/quota` - Get user quota
  - Return quota buckets with used/limit/reset_at
- [ ] **BE-025**: Implement quota consumption middleware
  - Check bucket availability before AI calls
  - Return 429 with message "本月配额已用尽" if exhausted
- [ ] **BE-026**: Implement quota reset scheduler
  - Run daily, reset quotas on user's registration anniversary
  - Handle month-end edge cases (e.g., 31st → last day of month)
- [ ] **BE-027**: Implement quota refund logic
  - Refund on AI service failure, log as "refund"

### P1 - Reading Progress

- [ ] **BE-028**: GET `/api/files/:id/progress` - Get reading progress
  - Return last page number for file
- [ ] **BE-029**: PUT `/api/files/:id/progress` - Update reading progress
  - Upsert page number for user+file

### P1 - User Settings

- [ ] **BE-030**: GET `/api/settings` - Get user preferences
  - Return ui_locale, explain_locale
- [ ] **BE-031**: PATCH `/api/settings` - Update preferences
  - Validate locale values (en | zh)
  - Update UserPreference

### P0 - Admin Authentication

- [ ] **BE-032**: POST `/api/admin/auth/login` - Admin login
  - Separate from user auth, validate against Admin table
  - Set admin session cookie
- [ ] **BE-033**: Implement admin auth middleware
  - Verify admin session, check role for super_admin routes
- [ ] **BE-034**: Implement super admin initialization
  - Create super admin on startup from SUPER_ADMIN_EMAIL env var

### P1 - Admin APIs

- [ ] **BE-035**: GET `/api/admin/stats/overview` - System overview
  - Return: total users, courses, files, storage used
- [ ] **BE-036**: GET `/api/admin/stats/access` - Access statistics
  - Return: monthly/weekly page views, AI usage counts
  - Group by action_type
- [ ] **BE-037**: GET `/api/admin/stats/cost` - Cost monitoring
  - Calculate cost from AIUsageLog (tokens × price)
  - Return trends and distribution by model/action
- [ ] **BE-038**: GET `/api/admin/workers/health` - Worker health
  - Return active jobs, failed jobs, zombie tasks (>10 min)
- [ ] **BE-039**: POST `/api/admin/workers/:taskId/retry` - Retry failed task
- [ ] **BE-040**: GET `/api/admin/users` - List users with stats
  - Include quota usage, file counts
- [ ] **BE-041**: PATCH `/api/admin/users/:id/quota` - Adjust user quota
  - Update quota limit, log as "admin_adjust"
- [ ] **BE-042**: GET `/api/admin/users/:id/files` - User file statistics
  - Return file count, storage, upload timeline

### P2 - Admin Account Management (Future)

- [ ] **BE-043**: POST `/api/admin/admins` - Create admin (super_admin only)
- [ ] **BE-044**: PATCH `/api/admin/admins/:id/disable` - Disable admin (super_admin only)

---

## Frontend

### P0 - Authentication Pages

- [ ] **FE-001**: Create login page (`/login`)
  - Email/password form with "Remember me" checkbox
  - Error handling: invalid credentials, unverified account, locked account
  - Link to register and forgot password
- [ ] **FE-002**: Create registration page (`/register`)
  - Email/password form with validation feedback
  - Password requirements hint (min 8 chars)
  - Success state: "请检查邮箱完成验证"
- [ ] **FE-003**: Create email verification page (`/verify-email`)
  - Handle token from URL, show success/error state
  - Option to resend verification email
- [ ] **FE-004**: Create forgot password page (`/forgot-password`)
  - Email input, success state: "重置链接已发送"
- [ ] **FE-005**: Create reset password page (`/reset-password`)
  - Password input (with confirmation), handle token from URL
- [ ] **FE-006**: Implement auth state management
  - Global auth context/store
  - Redirect logic for protected routes
- [ ] **FE-007**: Implement logout functionality
  - Clear local state, redirect to login

### P0 - Course Management

- [ ] **FE-008**: Create course list page (`/courses`)
  - Grid/list view of courses
  - Create course button (disabled at 6 course limit)
  - Course cards with name, school, term, file count
- [ ] **FE-009**: Create course modal
  - Form: name (max 50 chars), school, term
  - Create/edit mode
- [ ] **FE-010**: Implement course deletion
  - Confirmation modal requiring course name input
  - Warning about cascade deletion

### P0 - File Management

- [ ] **FE-011**: Create file list page (`/courses/:id`)
  - File list with name, page count, status, upload date
  - Status indicators: uploading, processing, ready, failed
  - Scanned file warning badge
- [ ] **FE-012**: Implement file upload
  - Drag & drop zone + file picker
  - Multi-file upload support
  - Progress indicators
  - Validation feedback (size, type, duplicate name)
- [ ] **FE-013**: Implement file deletion
  - Confirmation modal
- [ ] **FE-014**: Create quota preview component
  - Show current AI quota usage
  - Color coding: green (<70%), yellow (70-90%), red (>90%)

### P0 - PDF Reader (Core)

- [ ] **FE-015**: Create PDF reader page (`/files/:id`)
  - PDF.js integration
  - Page navigation (prev/next, page input)
  - Zoom controls
- [ ] **FE-016**: Implement reading progress
  - Load last position on open
  - Auto-save position on page change
- [ ] **FE-017**: Implement auto-explain panel
  - Trigger button (disabled for scanned files)
  - Loading state during AI processing
  - Display explanation with markdown rendering
  - Show image explanations inline
- [ ] **FE-018**: Implement Q&A panel
  - Question input
  - Chat-like answer display
  - Page reference links
  - Quota indicator
- [ ] **FE-019**: Handle AI feature states
  - Disabled state for scanned files with warning message
  - Quota exhausted state with message "本月配额已用尽"
  - Loading/error states

### P1 - User Settings

- [ ] **FE-020**: Create settings page (`/settings`)
  - UI language selector (en/zh)
  - AI explanation language selector (en/zh)
- [ ] **FE-021**: Create quota details section
  - Show each bucket: learningInteractions, autoExplain
  - Used/limit display with progress bar
  - Reset date display

### P0 - Admin Login

- [ ] **FE-022**: Create admin login page (`/admin/login`)
  - Separate from user login
  - Redirect to admin dashboard on success

### P1 - Admin Dashboard

- [ ] **FE-023**: Create admin layout
  - Sidebar navigation
  - Role-based menu items
- [ ] **FE-024**: Create system overview page (`/admin`)
  - Stats cards: users, courses, files, storage
- [ ] **FE-025**: Create access statistics page (`/admin/access`)
  - Charts: monthly/weekly page views
  - AI usage breakdown (Q&A vs explain)
- [ ] **FE-026**: Create cost monitoring page (`/admin/cost`)
  - Cost trend chart
  - Token usage by model/action
- [ ] **FE-027**: Create worker health page (`/admin/workers`)
  - Active/failed/zombie task counts
  - Task list with retry button
- [ ] **FE-028**: Create user management page (`/admin/users`)
  - User list with quota/file stats
  - Quota adjustment modal
  - User detail view with file statistics

### P2 - Admin Account Management (Future)

- [ ] **FE-029**: Create admin management page (`/admin/admins`)
  - Super admin only
  - Create/disable admin accounts

### P1 - Internationalization

- [ ] **FE-030**: Set up i18n framework
  - Support en/zh locales
  - Detect browser language for default
- [ ] **FE-031**: Create translation files
  - All UI text strings
  - Error messages

---

## Infrastructure

### P0 - Email Service

- [ ] **INF-001**: Set up email service integration
  - Choose provider (SendGrid/SES/SMTP)
  - Configure templates for verification and password reset
- [ ] **INF-002**: Implement email sending service
  - Send verification email
  - Send password reset email
  - Handle delivery failures gracefully

### P0 - File Storage

- [ ] **INF-003**: Set up object storage (S3 or compatible)
  - Configure bucket with appropriate permissions
  - Set up CORS for direct upload if needed
- [ ] **INF-004**: Implement storage service
  - Upload/download/delete operations
  - Generate signed URLs for secure access
  - Track storage usage per user

### P0 - Background Job Processing

- [ ] **INF-005**: Set up job queue system
  - Choose: BullMQ/Celery/native queue
  - Configure retry policies
- [ ] **INF-006**: Implement PDF processing job
  - Page counting
  - Scanned detection
  - Image region extraction
- [ ] **INF-007**: Implement quota reset job
  - Daily scheduler
  - Process users with reset dates matching today
- [ ] **INF-008**: Implement zombie task detection
  - Flag tasks running >10 minutes
  - Provide retry mechanism

### P0 - Rate Limiting & Security

- [ ] **INF-009**: Implement rate limiting
  - Global API rate limits
  - Specific limits for auth endpoints (resend: 5/15min, reset: 5/15min)
  - Return 429 with retry-after header
- [ ] **INF-010**: Implement security middleware
  - CORS configuration
  - CSRF protection
  - Security headers (Helmet)
- [ ] **INF-011**: Implement input validation
  - Sanitize all user inputs
  - Validate file types server-side
- [ ] **INF-012**: Set up secure session management
  - httpOnly cookies
  - Secure flag in production
  - Session store (Redis)

### P1 - Logging & Monitoring

- [ ] **INF-013**: Set up structured logging
  - Request/response logging
  - Error logging with stack traces
- [ ] **INF-014**: Set up application monitoring
  - Health check endpoint
  - Performance metrics
- [ ] **INF-015**: Set up error tracking
  - Exception capturing (Sentry or similar)
  - Alert configuration

### P2 - DevOps (Future)

- [ ] **INF-016**: Set up CI/CD pipeline
  - Automated testing
  - Deployment automation
- [ ] **INF-017**: Set up staging environment
  - Mirror production configuration
- [ ] **INF-018**: Set up database backup strategy
  - Automated daily backups
  - Retention policy

---

## Implementation Order (Recommended)

### Phase 1: Foundation
1. Database tables (DB-001 to DB-015)
2. Infrastructure: Email, Storage, Job Queue (INF-001 to INF-008)
3. Security & Rate Limiting (INF-009 to INF-012)

### Phase 2: Core Auth
1. Backend Auth APIs (BE-001 to BE-008)
2. Frontend Auth Pages (FE-001 to FE-007)

### Phase 3: Course & File Management
1. Backend Course/File APIs (BE-009 to BE-016)
2. PDF Processing (BE-017 to BE-019)
3. Frontend Course/File UI (FE-008 to FE-014)

### Phase 4: Core AI Features
1. AI Integration Backend (BE-020 to BE-023)
2. Quota Management (BE-024 to BE-027)
3. PDF Reader Frontend (FE-015 to FE-019)

### Phase 5: Settings & Polish
1. User Settings (BE-030 to BE-031, FE-020 to FE-021)
2. Reading Progress (BE-028 to BE-029)
3. Internationalization (FE-030 to FE-031)

### Phase 6: Admin Dashboard
1. Admin Auth (BE-032 to BE-034, FE-022)
2. Admin APIs (BE-035 to BE-042)
3. Admin Frontend (FE-023 to FE-028)

---

## Task Summary

| Category       | P0 Tasks | P1 Tasks | P2 Tasks | Total |
|----------------|----------|----------|----------|-------|
| Database       | 15       | 0        | 0        | 15    |
| Backend        | 23       | 16       | 2        | 41    |
| Frontend       | 17       | 11       | 1        | 29    |
| Infrastructure | 12       | 3        | 3        | 18    |
| **Total**      | **67**   | **30**   | **6**    | **103** |
