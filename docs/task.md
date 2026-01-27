# Luma Web - Implementation Task Breakdown

> **Version**: 1.0 MVP
> **Total Tasks**: 129 (119 MVP, 10 Future)
> **Last Updated**: 2026-01-26

---

## Task Summary

| Phase                | Task Count | MVP Tasks | Future Tasks |
| -------------------- | ---------- | --------- | ------------ |
| Foundation           | 8          | 8         | 0            |
| Authentication       | 15         | 15        | 0            |
| Course Management    | 9          | 9         | 0            |
| File Management      | 14         | 14        | 0            |
| AI Interactive Tutor | 27         | 27        | 0            |
| Quota Management     | 7          | 7         | 0            |
| User Settings        | 5          | 5         | 0            |
| Admin Dashboard      | 19         | 19        | 0            |
| PDF Reader           | 4          | 4         | 0            |
| Testing              | 7          | 7         | 0            |
| Deployment           | 4          | 4         | 0            |
| Future               | 10         | 0         | 10           |

---

## Critical Path

The minimum viable path to launch:

1. **Foundation** (FND-001 to FND-008)
2. **Authentication** (AUTH-001 to AUTH-015)
3. **Course Management** (CRS-001 to CRS-009)
4. **File Management** (FILE-001 to FILE-014)
5. **AI Interactive Tutor** (TUTOR-001 to TUTOR-027)
6. **Quota Management** (QUOTA-001 to QUOTA-007)
7. **Basic Testing** (TEST-001, TEST-002, TEST-006)
8. **Deployment** (DEPLOY-001 to DEPLOY-003)

---

## Phase 0: Project Foundation

### [FND-001] Project Setup and Configuration

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: None
- **Description**: Initialize Next.js 14+ project with App Router, TypeScript, ESLint, Prettier, and configure essential tools.
- **Acceptance Criteria**:
  - [ ] Next.js 14+ with App Router initialized
  - [ ] TypeScript configured with strict mode
  - [ ] ESLint + Prettier configured
  - [ ] Path aliases configured (`@/` for `src/`)
  - [ ] Environment variables structure defined (`.env.example`)
  - [ ] Git hooks with Husky for pre-commit checks

### [FND-002] Tailwind CSS and Design System Setup

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: FND-001
- **Description**: Configure Tailwind CSS with custom theme (fonts, colors, spacing).
- **Acceptance Criteria**:
  - [ ] Tailwind CSS configured with custom font families
  - [ ] Color palette in `tailwind.config.ts`
  - [ ] CSS variables defined in `globals.css`
  - [ ] Base components follow design system spacing (4px base unit)

### [FND-003] shadcn/ui Component Library Setup

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: FND-002
- **Description**: Install and configure shadcn/ui with theme customizations.
- **Acceptance Criteria**:
  - [ ] shadcn/ui initialized with `components.json`
  - [ ] Base components installed (Button, Input, Card, Dialog, etc.)
  - [ ] Components styled to match design system
  - [ ] Lucide React icons integrated

### [FND-004] Database Setup with Prisma

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: FND-001
- **Description**: Set up Prisma ORM with PostgreSQL (Supabase), generate client, and create initial migration.
- **Acceptance Criteria**:
  - [ ] Prisma schema file with all models from PRD
  - [ ] Database connection via Supabase (DATABASE_URL, DIRECT_URL)
  - [ ] Initial migration generated and applied
  - [ ] Prisma client generated with singleton pattern
  - [ ] All enums defined

### [FND-005] Supabase Integration

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: FND-004
- **Description**: Configure Supabase for authentication helpers and storage client.
- **Acceptance Criteria**:
  - [ ] Supabase client for browser configured
  - [ ] Supabase server client for Server Components
  - [ ] Supabase middleware for session handling
  - [ ] Storage bucket configured for PDF files
  - [ ] Environment variables for Supabase keys

### [FND-006] TanStack Query Setup

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: FND-001
- **Description**: Configure TanStack Query (React Query) for server state management.
- **Acceptance Criteria**:
  - [ ] QueryClient configured with default options
  - [ ] QueryClientProvider in root layout
  - [ ] DevTools enabled in development
  - [ ] Default stale time and cache time configured

### [FND-007] Zustand Store Setup

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: FND-001
- **Description**: Set up Zustand for client state management with persistence.
- **Acceptance Criteria**:
  - [ ] Base store structure created
  - [ ] Persist middleware configured for relevant stores
  - [ ] DevTools integration in development
  - [ ] Type-safe store with TypeScript

### [FND-008] API Route Utilities

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: FND-004, FND-005
- **Description**: Create shared utilities for API routes including error handling, response formatting, and authentication helpers.
- **Acceptance Criteria**:
  - [ ] Standard API response format (ApiResponse type)
  - [ ] Error code constants defined
  - [ ] Authentication middleware helper
  - [ ] Rate limiting utility
  - [ ] CSRF protection utility
  - [ ] Request validation helpers (Zod schemas)

---

## Phase 1: User Authentication (Module 1)

### [AUTH-001] User Registration API

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: FND-004, FND-008
- **Description**: Create API endpoint for user registration with email/password, password hashing, and verification token generation.
- **Acceptance Criteria**:
  - [ ] POST `/api/auth/register` endpoint
  - [ ] Email format validation (RFC 5322)
  - [ ] Password minimum 8 characters validation
  - [ ] Password hashing with bcrypt
  - [ ] VerificationToken created (24h expiry)
  - [ ] Prevent duplicate email registration
  - [ ] User created with `email_confirmed_at = null`

### [AUTH-002] Email Verification API

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: AUTH-001
- **Description**: Create API endpoint to verify email via token and mark user as confirmed.
- **Acceptance Criteria**:
  - [ ] GET `/api/auth/verify` endpoint with token query param
  - [ ] Token validation (exists, not expired, not used)
  - [ ] User `email_confirmed_at` updated on success
  - [ ] Token marked as used (`used_at` set)
  - [ ] Appropriate error messages for invalid/expired tokens

### [AUTH-003] Email Service Integration

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: AUTH-001
- **Description**: Integrate email service (Resend or similar) for sending verification and password reset emails.
- **Acceptance Criteria**:
  - [ ] Email service client configured
  - [ ] Verification email template created
  - [ ] Password reset email template created
  - [ ] Email sending utility with error handling
  - [ ] Environment variables for email service

### [AUTH-004] Resend Verification Email API

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: AUTH-001, AUTH-003
- **Description**: Create API endpoint to resend verification email with rate limiting.
- **Acceptance Criteria**:
  - [ ] POST `/api/auth/resend-verification` endpoint
  - [ ] Rate limiting: 5 requests per 15 minutes
  - [ ] Old tokens invalidated before creating new one
  - [ ] Only for unverified users
  - [ ] Email sent via email service

### [AUTH-005] User Login API

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: AUTH-001, FND-005
- **Description**: Create login API with credential validation, session creation, and account lockout.
- **Acceptance Criteria**:
  - [ ] POST `/api/auth/login` endpoint
  - [ ] Email verified check (403 if not verified)
  - [ ] Password verification with bcrypt
  - [ ] Failed login counter increment
  - [ ] Account lockout after 5 failed attempts (30 min)
  - [ ] Session creation via Supabase Auth
  - [ ] httpOnly cookie set (7 days default, 30 days with "remember me")
  - [ ] `last_login_at` updated on success

### [AUTH-006] Password Reset Request API

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: AUTH-003, FND-008
- **Description**: Create API endpoint to request password reset with email delivery.
- **Acceptance Criteria**:
  - [ ] POST `/api/auth/reset-password` endpoint
  - [ ] Rate limiting: 5 requests per 15 minutes
  - [ ] VerificationToken created (type: PASSWORD_RESET, 24h expiry)
  - [ ] Reset email sent
  - [ ] Success response even for non-existent emails (security)

### [AUTH-007] Password Reset Confirm API

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: AUTH-006
- **Description**: Create API endpoint to confirm password reset with new password.
- **Acceptance Criteria**:
  - [ ] POST `/api/auth/confirm-reset` endpoint
  - [ ] Token validation (exists, not expired, not used)
  - [ ] New password validation (min 8 chars)
  - [ ] Password hash updated
  - [ ] Token marked as used
  - [ ] All existing sessions invalidated

### [AUTH-008] Logout API

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: AUTH-005
- **Description**: Create logout API to clear session and cookies.
- **Acceptance Criteria**:
  - [ ] POST `/api/auth/logout` endpoint
  - [ ] Session destroyed via Supabase
  - [ ] httpOnly cookie cleared
  - [ ] Success response

### [AUTH-009] Auth Session Check API

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: AUTH-005
- **Description**: Create API endpoint to check current authentication status.
- **Acceptance Criteria**:
  - [ ] GET `/api/auth` endpoint
  - [ ] Returns user info if authenticated
  - [ ] Returns 401 if not authenticated
  - [ ] Includes user role and email verification status

### [AUTH-010] Registration Page UI

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: AUTH-001, FND-002, FND-003
- **Description**: Create registration page with form validation and submission.
- **Acceptance Criteria**:
  - [ ] `/register` page with responsive layout
  - [ ] Email input with validation
  - [ ] Password input with strength indicator
  - [ ] Confirm password field
  - [ ] Form submission with loading state
  - [ ] Error messages displayed inline
  - [ ] Redirect to verification notice on success
  - [ ] Link to login page

### [AUTH-011] Login Page UI

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: AUTH-005, FND-002, FND-003
- **Description**: Create login page with form validation and "remember me" option.
- **Acceptance Criteria**:
  - [ ] `/login` page with responsive layout
  - [ ] Email input with validation
  - [ ] Password input with show/hide toggle
  - [ ] "Remember me" checkbox
  - [ ] Form submission with loading state
  - [ ] Error messages for invalid credentials/locked account
  - [ ] Redirect to dashboard on success
  - [ ] Links to registration and forgot password

### [AUTH-012] Forgot Password Page UI

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: AUTH-006, FND-002
- **Description**: Create forgot password page with email input.
- **Acceptance Criteria**:
  - [ ] `/forgot-password` page
  - [ ] Email input with validation
  - [ ] Form submission with loading state
  - [ ] Success message shown (check email)
  - [ ] Rate limit error handling
  - [ ] Link back to login

### [AUTH-013] Reset Password Page UI

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: AUTH-007, FND-002
- **Description**: Create reset password page with token handling.
- **Acceptance Criteria**:
  - [ ] `/reset-password` page with token query param
  - [ ] New password input with strength indicator
  - [ ] Confirm password field
  - [ ] Token validation on page load
  - [ ] Error state for invalid/expired token
  - [ ] Success redirect to login

### [AUTH-014] Auth Middleware

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: AUTH-005, FND-005
- **Description**: Create Next.js middleware for route protection and session refresh.
- **Acceptance Criteria**:
  - [ ] Middleware.ts with route matching
  - [ ] Protected routes redirect to login if unauthenticated
  - [ ] Auth routes redirect to dashboard if authenticated
  - [ ] Session refresh on each request
  - [ ] Public routes accessible without auth

### [AUTH-015] useUser Hook

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: AUTH-009, FND-006
- **Description**: Create React hook for accessing current user with TanStack Query.
- **Acceptance Criteria**:
  - [ ] `useUser` hook with query caching
  - [ ] Returns user data, loading state, error
  - [ ] Auto-refetch on window focus
  - [ ] Logout mutation included

---

## Phase 2: Course Management (Module 2)

### [CRS-001] Course CRUD API - Create

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: FND-004, AUTH-014
- **Description**: Create API endpoint to create a new course with validation.
- **Acceptance Criteria**:
  - [ ] POST `/api/courses` endpoint
  - [ ] Authentication required
  - [ ] Course limit check (max 6 per user)
  - [ ] Name validation (max 50 chars)
  - [ ] School/term optional fields
  - [ ] Returns created course

### [CRS-002] Course CRUD API - Read

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: FND-004, AUTH-014
- **Description**: Create API endpoints to list and get courses.
- **Acceptance Criteria**:
  - [ ] GET `/api/courses` - list user's courses (newest first)
  - [ ] GET `/api/courses/:id` - get single course
  - [ ] Authentication required
  - [ ] Only returns user's own courses
  - [ ] Includes file count in list response

### [CRS-003] Course CRUD API - Update

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: CRS-002
- **Description**: Create API endpoint to update course details.
- **Acceptance Criteria**:
  - [ ] PATCH `/api/courses/:id` endpoint
  - [ ] Authentication required
  - [ ] Ownership validation
  - [ ] Name validation (max 50 chars)
  - [ ] Returns updated course

### [CRS-004] Course CRUD API - Delete

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: CRS-002
- **Description**: Create API endpoint to delete course with cascade deletion.
- **Acceptance Criteria**:
  - [ ] DELETE `/api/courses/:id` endpoint
  - [ ] Authentication required
  - [ ] Ownership validation
  - [ ] Cascade delete all files and related data
  - [ ] Delete files from Supabase Storage
  - [ ] Returns success confirmation

### [CRS-005] Courses List Page UI

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: CRS-002, FND-002
- **Description**: Create courses list page with grid layout and empty state.
- **Acceptance Criteria**:
  - [ ] `/courses` page with responsive grid
  - [ ] Course cards showing name, school, term, file count
  - [ ] Empty state with CTA to create course
  - [ ] Loading skeleton during fetch
  - [ ] Course limit indicator (X/6)
  - [ ] Create course button (disabled at limit)

### [CRS-006] Create Course Dialog

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: CRS-001, FND-003
- **Description**: Create modal dialog for creating new course.
- **Acceptance Criteria**:
  - [ ] Modal with name, school, term inputs
  - [ ] Form validation with error messages
  - [ ] Submit with loading state
  - [ ] Close on success with toast notification
  - [ ] Refresh course list on success

### [CRS-007] Edit Course Dialog

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: CRS-003, FND-003
- **Description**: Create modal dialog for editing course details.
- **Acceptance Criteria**:
  - [ ] Modal pre-populated with course data
  - [ ] Form validation with error messages
  - [ ] Submit with loading state
  - [ ] Close on success with toast notification
  - [ ] Refresh course list on success

### [CRS-008] Delete Course Dialog

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: CRS-004, FND-003
- **Description**: Create confirmation dialog for course deletion with name input.
- **Acceptance Criteria**:
  - [ ] Modal with warning message
  - [ ] Requires typing course name to confirm
  - [ ] Delete button disabled until name matches
  - [ ] Submit with loading state
  - [ ] Redirect to courses list on success

### [CRS-009] useCourses Hook

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: CRS-001, CRS-002, CRS-003, CRS-004, FND-006
- **Description**: Create React hook for courses data with mutations.
- **Acceptance Criteria**:
  - [ ] `useCourses` hook with query caching
  - [ ] Create, update, delete mutations
  - [ ] Optimistic updates for better UX
  - [ ] Cache invalidation on mutations

---

## Phase 3: File Management (Module 3)

### [FILE-001] File Upload URL API

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: FND-005, AUTH-014
- **Description**: Create API endpoint to generate presigned upload URL for Supabase Storage.
- **Acceptance Criteria**:
  - [ ] POST `/api/files/upload-url` endpoint
  - [ ] Authentication required
  - [ ] File size validation (max 200MB)
  - [ ] PDF type validation
  - [ ] Course ownership validation
  - [ ] Duplicate filename check
  - [ ] File count limit check (max 30 per course)
  - [ ] Storage quota check (max 5GB per user)
  - [ ] Returns presigned URL and file metadata

### [FILE-002] File Upload Confirm API

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: FILE-001, FND-004
- **Description**: Create API endpoint to confirm upload completion and create file record.
- **Acceptance Criteria**:
  - [ ] POST `/api/files/confirm` endpoint
  - [ ] Verify file exists in storage
  - [ ] Create File record with status PROCESSING
  - [ ] Extract page count from PDF
  - [ ] Page count validation (max 500 pages)
  - [ ] Trigger scanned PDF detection
  - [ ] Trigger background structure extraction (TUTOR-001)
  - [ ] Returns file record

### [FILE-003] File List API

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: FND-004, AUTH-014
- **Description**: Create API endpoint to list files for a course.
- **Acceptance Criteria**:
  - [ ] GET `/api/courses/:id/files` endpoint
  - [ ] Authentication required
  - [ ] Course ownership validation
  - [ ] Returns files with status, size, page count
  - [ ] Sorted by creation date (newest first)

### [FILE-004] File Detail API

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: FND-004, AUTH-014
- **Description**: Create API endpoint to get single file details.
- **Acceptance Criteria**:
  - [ ] GET `/api/files/:id` endpoint
  - [ ] Authentication required
  - [ ] File ownership validation (via course)
  - [ ] Returns full file details including structure status

### [FILE-005] File Delete API

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: FND-004, FND-005, AUTH-014
- **Description**: Create API endpoint to delete file with cascade deletion.
- **Acceptance Criteria**:
  - [ ] DELETE `/api/files/:id` endpoint
  - [ ] Authentication required
  - [ ] File ownership validation
  - [ ] Delete from Supabase Storage
  - [ ] Delete extracted images from R2
  - [ ] Cascade delete all related data
  - [ ] Returns success confirmation

### [FILE-006] File Download URL API

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: FND-005, AUTH-014
- **Description**: Create API endpoint to generate presigned download URL.
- **Acceptance Criteria**:
  - [ ] GET `/api/files/:id/download-url` endpoint
  - [ ] Authentication required
  - [ ] File ownership validation
  - [ ] Returns presigned URL (1 hour expiry)

### [FILE-007] Scanned PDF Detection

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: FILE-002
- **Description**: Implement scanned PDF detection logic to identify non-text PDFs.
- **Acceptance Criteria**:
  - [ ] Utility function to detect scanned PDFs
  - [ ] Check text layer presence
  - [ ] Update file `is_scanned` flag
  - [ ] Scanned files marked appropriately for UI warning

### [FILE-008] Files List Page UI

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: FILE-003, FND-002
- **Description**: Create files list page for a course with table/grid view.
- **Acceptance Criteria**:
  - [ ] `/files/:courseId` page
  - [ ] Breadcrumb navigation
  - [ ] File table with name, size, pages, status columns
  - [ ] Status badges (uploading, processing, ready, failed)
  - [ ] Scanned file warning indicator
  - [ ] Loading skeleton during fetch
  - [ ] Empty state with upload CTA

### [FILE-009] File Upload Zone Component

- **Complexity**: L
- **Phase**: MVP
- **Dependencies**: FILE-001, FILE-002
- **Description**: Create drag-and-drop file upload zone with multi-file support.
- **Acceptance Criteria**:
  - [ ] Drag and drop area with visual feedback
  - [ ] Click to select files
  - [ ] Multi-file selection support
  - [ ] File type validation (PDF only)
  - [ ] File size validation with error message
  - [ ] Upload progress for each file
  - [ ] Cancel upload functionality
  - [ ] Success/error state per file

### [FILE-010] File Upload Item Component

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: FILE-009
- **Description**: Create individual file upload item showing progress and status.
- **Acceptance Criteria**:
  - [ ] File name and size display
  - [ ] Upload progress bar
  - [ ] Status indicator
  - [ ] Cancel/retry button
  - [ ] Error message display

### [FILE-011] Quota Preview Component

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: QUOTA-002
- **Description**: Create component to preview storage and AI quota usage.
- **Acceptance Criteria**:
  - [ ] Storage usage bar (X GB / 5 GB)
  - [ ] AI quota usage display
  - [ ] Color coding (<70% green, 70-90% yellow, >90% red)
  - [ ] Tooltip with details

### [FILE-012] Delete File Dialog

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: FILE-005, FND-003
- **Description**: Create confirmation dialog for file deletion.
- **Acceptance Criteria**:
  - [ ] Modal with warning message
  - [ ] Warning about cascade deletion
  - [ ] Confirm/cancel buttons
  - [ ] Submit with loading state
  - [ ] Refresh file list on success

### [FILE-013] useFiles Hook

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: FILE-001 to FILE-006, FND-006
- **Description**: Create React hook for files data with upload mutations.
- **Acceptance Criteria**:
  - [ ] `useFiles(courseId)` hook with query caching
  - [ ] Upload, delete mutations
  - [ ] Upload progress tracking
  - [ ] Cache invalidation on mutations

### [FILE-014] useMultiFileUpload Hook

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: FILE-009, FILE-013
- **Description**: Create React hook for managing multiple concurrent file uploads.
- **Acceptance Criteria**:
  - [ ] Queue management for multiple files
  - [ ] Concurrent upload limit (3 files)
  - [ ] Individual file progress tracking
  - [ ] Cancel individual/all uploads
  - [ ] Retry failed uploads

---

## Phase 4: AI Interactive Tutor (Module 4 - Core Feature)

### [TUTOR-001] PDF Structure Extraction Background Job

- **Complexity**: XL
- **Phase**: MVP
- **Dependencies**: FILE-002, FND-004
- **Description**: Create Trigger.dev background job for PDF structure extraction with image extraction.
- **Acceptance Criteria**:
  - [ ] `extract-pdf-structure` Trigger.dev task
  - [ ] Download PDF from Supabase Storage
  - [ ] Call Python script for image extraction (PyMuPDF)
  - [ ] Upload extracted images to Cloudflare R2
  - [ ] Extract text content from PDF
  - [ ] Batch processing (120 pages per batch)
  - [ ] AI analysis for knowledge structure (two layers)
  - [ ] Create TopicGroup and SubTopic records
  - [ ] Update File `structure_status`
  - [ ] 5 minute timeout
  - [ ] Error handling with `structure_error` update

### [TUTOR-002] Python Image Extraction Script

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: None
- **Description**: Create Python script using PyMuPDF to extract embedded images from PDF.
- **Acceptance Criteria**:
  - [ ] `scripts/extract_images.py` script
  - [ ] Extract all embedded images per page
  - [ ] Output image data and metadata
  - [ ] Support various image formats
  - [ ] Efficient memory usage for large PDFs

### [TUTOR-003] R2 Image Storage Integration

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: TUTOR-002
- **Description**: Configure Cloudflare R2 for extracted image storage.
- **Acceptance Criteria**:
  - [ ] R2 bucket configured
  - [ ] Upload utility function
  - [ ] Path structure: `images/{fileId}/{pageNumber}_{imageIndex}.png`
  - [ ] Generate signed URLs for image access
  - [ ] Delete images on file deletion

### [TUTOR-004] AI Knowledge Structure Extraction Prompt

- **Complexity**: L
- **Phase**: MVP
- **Dependencies**: TUTOR-001
- **Description**: Create and refine AI prompts for knowledge structure extraction.
- **Acceptance Criteria**:
  - [ ] Prompt template for TopicGroup extraction
  - [ ] Prompt template for SubTopic extraction
  - [ ] CORE/SUPPORTING type classification logic
  - [ ] JSON output parsing
  - [ ] Handle various academic content types

### [TUTOR-005] Structure Extraction Retry API

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: TUTOR-001
- **Description**: Create API endpoint to retry failed structure extraction.
- **Acceptance Criteria**:
  - [ ] POST `/api/files/:id/extract/retry` endpoint
  - [ ] Authentication required
  - [ ] File ownership validation
  - [ ] Only for files with FAILED status
  - [ ] Delete existing structure data
  - [ ] Re-trigger extraction job
  - [ ] Returns job status

### [TUTOR-006] Start/Resume Learning Session API

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: TUTOR-001, FND-004, AUTH-014
- **Description**: Create API endpoint to start or resume a learning session.
- **Acceptance Criteria**:
  - [ ] POST `/api/files/:id/learn/start` endpoint
  - [ ] Authentication required
  - [ ] File ownership validation
  - [ ] Check structure_status is READY
  - [ ] Check file is not scanned
  - [ ] Check email is verified
  - [ ] Create or retrieve existing LearningSession
  - [ ] Return session with full outline and progress

### [TUTOR-007] Get Learning Session API

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: TUTOR-006
- **Description**: Create API endpoint to get learning session details.
- **Acceptance Criteria**:
  - [ ] GET `/api/learn/sessions/:id` endpoint
  - [ ] Authentication required
  - [ ] Session ownership validation
  - [ ] Return full session state with progress

### [TUTOR-008] SubTopic Explanation API (SSE)

- **Complexity**: L
- **Phase**: MVP
- **Dependencies**: TUTOR-006, QUOTA-003
- **Description**: Create SSE API endpoint to stream sub-topic explanations.
- **Acceptance Criteria**:
  - [ ] POST `/api/learn/sessions/:id/explain` endpoint (SSE)
  - [ ] Authentication required
  - [ ] Session ownership validation
  - [ ] Quota check and consumption
  - [ ] AI generates 5-layer explanation
  - [ ] Stream response chunks via SSE
  - [ ] Include related images with page markers
  - [ ] Log AI usage (tokens, model)

### [TUTOR-009] Mathpix Formula Recognition Integration

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: TUTOR-008
- **Description**: Integrate Mathpix API for formula recognition in explanations.
- **Acceptance Criteria**:
  - [ ] Mathpix client utility (`src/lib/mathpix.ts`)
  - [ ] API call with image base64 input
  - [ ] Return LaTeX formatted formula
  - [ ] Log usage to MathpixUsage table
  - [ ] Error handling for API failures

### [TUTOR-010] Confirm Understanding API

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: TUTOR-008
- **Description**: Create API endpoint to confirm understanding of current sub-topic.
- **Acceptance Criteria**:
  - [ ] POST `/api/learn/sessions/:id/confirm` endpoint
  - [ ] Authentication required
  - [ ] Session ownership validation
  - [ ] Update SubTopicProgress (confirmed=true)
  - [ ] Advance session to next sub-topic or testing phase
  - [ ] Return next action

### [TUTOR-011] Generate Topic Test API

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: TUTOR-010, QUOTA-003
- **Description**: Create API endpoint to generate/retrieve topic tests.
- **Acceptance Criteria**:
  - [ ] POST `/api/learn/sessions/:id/test` endpoint
  - [ ] Authentication required
  - [ ] Session ownership validation
  - [ ] Generate tests only once, then cache in TopicTest
  - [ ] CORE topics: 3 questions, SUPPORTING: 1 question
  - [ ] Quota consumed only on first generation
  - [ ] Return current question with progress

### [TUTOR-012] Submit Test Answer API

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: TUTOR-011
- **Description**: Create API endpoint to submit and validate test answers.
- **Acceptance Criteria**:
  - [ ] POST `/api/learn/sessions/:id/answer` endpoint
  - [ ] Authentication required
  - [ ] Session ownership validation
  - [ ] Validate answer against correct_answer
  - [ ] Update TopicProgress
  - [ ] Mark weak point if wrong_count >= 3
  - [ ] Generate re-explanation for wrong answers
  - [ ] Return feedback and next action

### [TUTOR-013] Skip Test Question API

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: TUTOR-011
- **Description**: Create API endpoint to skip a test question after 3 wrong attempts.
- **Acceptance Criteria**:
  - [ ] POST `/api/learn/sessions/:id/skip` endpoint
  - [ ] Authentication required
  - [ ] Session ownership validation
  - [ ] Only allowed after 3 attempts
  - [ ] Mark question as skipped
  - [ ] Advance to next question
  - [ ] Return next question or test completion

### [TUTOR-014] Advance to Next Topic API

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: TUTOR-012
- **Description**: Create API endpoint to advance to next topic after test completion.
- **Acceptance Criteria**:
  - [ ] POST `/api/learn/sessions/:id/next` endpoint
  - [ ] Authentication required
  - [ ] Session ownership validation
  - [ ] Validate current topic test is complete
  - [ ] Check pass condition (CORE: 2/3, SUPPORTING: 1/1)
  - [ ] Update session currentTopicIndex
  - [ ] Return next topic or session completion

### [TUTOR-015] Pause Learning Session API

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: TUTOR-006
- **Description**: Create API endpoint to pause learning session.
- **Acceptance Criteria**:
  - [ ] POST `/api/learn/sessions/:id/pause` endpoint
  - [ ] Authentication required
  - [ ] Session ownership validation
  - [ ] Update session status to PAUSED
  - [ ] Save current position

### [TUTOR-016] Get File Images API

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: TUTOR-003
- **Description**: Create API endpoint to get extracted images for a file.
- **Acceptance Criteria**:
  - [ ] GET `/api/files/:id/images` endpoint
  - [ ] Authentication required
  - [ ] File ownership validation
  - [ ] Optional page filter query param
  - [ ] Return signed URLs for images

### [TUTOR-017] PDF Preview Modal Component

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: FILE-004, FND-003
- **Description**: Create modal component for PDF preview with learning entry point.
- **Acceptance Criteria**:
  - [ ] Modal triggered from file card click
  - [ ] Display PDF overview (name, pages, status)
  - [ ] "Open Reader" button
  - [ ] "Start Learning" button
  - [ ] Structure status indicator
  - [ ] Warning for scanned PDFs

### [TUTOR-018] Learning Page Layout

- **Complexity**: L
- **Phase**: MVP
- **Dependencies**: TUTOR-006, FND-002
- **Description**: Create main learning page with three-panel layout.
- **Acceptance Criteria**:
  - [ ] `/files/:id/learn` page route
  - [ ] Left panel: knowledge outline navigation
  - [ ] Center panel: explanation content area
  - [ ] Right/bottom panel: confirmation and testing area
  - [ ] Top bar: progress indicator and controls
  - [ ] Responsive layout

### [TUTOR-019] Topic Outline Component

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: TUTOR-007
- **Description**: Create collapsible topic outline navigation component.
- **Acceptance Criteria**:
  - [ ] Two-level tree (TopicGroup > SubTopic)
  - [ ] Visual indicators: CORE (star), SUPPORTING (normal)
  - [ ] Status colors
  - [ ] Weak point marker
  - [ ] Current item highlight
  - [ ] Click to navigate
  - [ ] Progress summary

### [TUTOR-020] SubTopic Explanation Panel Component

- **Complexity**: L
- **Phase**: MVP
- **Dependencies**: TUTOR-008
- **Description**: Create explanation panel with five-layer content display.
- **Acceptance Criteria**:
  - [ ] Section headers for each layer
  - [ ] Collapsible sections
  - [ ] LaTeX formula rendering (KaTeX)
  - [ ] Streaming text display
  - [ ] Image gallery with page markers
  - [ ] "I Understand" button at bottom

### [TUTOR-021] LaTeX/Formula Renderer Component

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: TUTOR-020
- **Description**: Create component for rendering LaTeX formulas using KaTeX.
- **Acceptance Criteria**:
  - [ ] KaTeX integration
  - [ ] Inline and block formula support
  - [ ] Error fallback for invalid LaTeX
  - [ ] Copy to clipboard functionality
  - [ ] Proper sizing and scrolling

### [TUTOR-022] Page Images Component

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: TUTOR-016
- **Description**: Create component to display extracted images with labels.
- **Acceptance Criteria**:
  - [ ] Grid/list view of images
  - [ ] Page number labels
  - [ ] Click to enlarge (lightbox)
  - [ ] Loading states
  - [ ] Lazy loading

### [TUTOR-023] Topic Test Component

- **Complexity**: L
- **Phase**: MVP
- **Dependencies**: TUTOR-011, TUTOR-012, TUTOR-013
- **Description**: Create topic test UI with question display and answer submission.
- **Acceptance Criteria**:
  - [ ] Question display with options
  - [ ] Short answer input
  - [ ] Submit button with loading state
  - [ ] Feedback display
  - [ ] Re-explanation panel for wrong answers
  - [ ] Attempt counter
  - [ ] Skip button (after 3 attempts)
  - [ ] Progress indicator

### [TUTOR-024] Learning Progress Bar Component

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: TUTOR-007
- **Description**: Create progress bar showing overall learning completion.
- **Acceptance Criteria**:
  - [ ] Segmented progress bar (per topic)
  - [ ] Color coding
  - [ ] Percentage display
  - [ ] Tooltip with topic titles

### [TUTOR-025] SSE Connection Handler Hook

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: TUTOR-008
- **Description**: Create React hook for managing SSE connections with reconnection.
- **Acceptance Criteria**:
  - [ ] `useSSE` hook for streaming responses
  - [ ] Auto-reconnect on disconnect
  - [ ] Retry limit (3 attempts)
  - [ ] "Reconnecting..." status display
  - [ ] Manual refresh prompt after max retries

### [TUTOR-026] useLearningSession Hook

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: TUTOR-006 to TUTOR-015, FND-006
- **Description**: Create React hook for learning session state management.
- **Acceptance Criteria**:
  - [ ] Session state from TanStack Query
  - [ ] Mutations for confirm, answer, skip, next
  - [ ] Optimistic updates where appropriate
  - [ ] Progress calculation helpers
  - [ ] Navigation helpers

### [TUTOR-027] Topic Type Manual Adjustment

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: TUTOR-001, TUTOR-019
- **Description**: Allow users to manually adjust CORE/SUPPORTING classification.
- **Acceptance Criteria**:
  - [ ] PATCH `/api/files/:id/topics/:topicId` endpoint
  - [ ] Toggle type in outline UI
  - [ ] Persist change to database
  - [ ] Recalculate test requirements

---

## Phase 5: Quota Management (Module 5)

### [QUOTA-001] User Quota Initialization

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: AUTH-001, FND-004
- **Description**: Create quota records for new users on registration.
- **Acceptance Criteria**:
  - [ ] Create Quota records on user creation
  - [ ] LEARNING_INTERACTIONS: 150/month
  - [ ] AUTO_EXPLAIN: 300/month
  - [ ] Set reset_at to user registration day + 1 month

### [QUOTA-002] Quota Status API

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: QUOTA-001, AUTH-014
- **Description**: Create API endpoint to get current quota status.
- **Acceptance Criteria**:
  - [ ] GET `/api/quota` endpoint
  - [ ] Authentication required
  - [ ] Return all quota buckets with used/limit
  - [ ] Include next reset date
  - [ ] Calculate percentage used

### [QUOTA-003] Quota Consumption Logic

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: QUOTA-001
- **Description**: Create utility functions for quota checking and consumption.
- **Acceptance Criteria**:
  - [ ] `checkQuota(userId, bucket, amount)` function
  - [ ] `consumeQuota(userId, bucket, amount)` function
  - [ ] `refundQuota(userId, bucket, amount)` function
  - [ ] Create QuotaLog entries for all changes
  - [ ] Transaction support for atomic operations

### [QUOTA-004] Monthly Quota Reset Job

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: QUOTA-001
- **Description**: Create scheduled job to reset quotas monthly.
- **Acceptance Criteria**:
  - [ ] Trigger.dev scheduled task (daily check)
  - [ ] Find users with reset_at <= now
  - [ ] Reset used to 0 for all buckets
  - [ ] Calculate next reset_at
  - [ ] Create QuotaLog with SYSTEM_RESET reason
  - [ ] Handle edge cases (31st -> 28th, etc.)

### [QUOTA-005] Quota Warning Component

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: QUOTA-002
- **Description**: Create component to display quota usage with color-coded warnings.
- **Acceptance Criteria**:
  - [ ] Progress bar with percentage
  - [ ] Green (<70%), Yellow (70-90%), Red (>90%)
  - [ ] 100% shows "Quota exhausted" message
  - [ ] Tooltip with exact numbers

### [QUOTA-006] Quota Details in Settings

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: QUOTA-002, SET-001
- **Description**: Display detailed quota information in settings page.
- **Acceptance Criteria**:
  - [ ] List all quota buckets
  - [ ] Usage bar for each bucket
  - [ ] Next reset date

### [QUOTA-007] useQuota Hook

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: QUOTA-002, FND-006
- **Description**: Create React hook for quota data.
- **Acceptance Criteria**:
  - [ ] `useQuota` hook with query caching
  - [ ] Helper functions for quota status
  - [ ] Auto-refresh on relevant mutations

---

## Phase 6: User Settings (Module 6)

### [SET-001] Settings Page Layout

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: FND-002, AUTH-014
- **Description**: Create settings page with tabbed navigation.
- **Acceptance Criteria**:
  - [ ] `/settings` page
  - [ ] Tabbed interface (Language, Quota, Account)
  - [ ] Responsive layout

### [SET-002] User Preferences API

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: FND-004, AUTH-014
- **Description**: Create API endpoints for user preferences CRUD.
- **Acceptance Criteria**:
  - [ ] GET `/api/preferences` - get current preferences
  - [ ] PATCH `/api/preferences` - update preferences
  - [ ] Create default preferences if not exist
  - [ ] Validate locale values (en, zh)

### [SET-003] Language Settings Component

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: SET-002
- **Description**: Create language settings UI with independent UI and AI language selection.
- **Acceptance Criteria**:
  - [ ] UI language dropdown (en/zh)
  - [ ] AI explanation language dropdown (en/zh)
  - [ ] Immediate effect on change
  - [ ] Persist to database
  - [ ] Browser language detection for default

### [SET-004] i18n Setup

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: SET-003
- **Description**: Implement internationalization for UI strings.
- **Acceptance Criteria**:
  - [ ] i18n library configured
  - [ ] English and Chinese translation files
  - [ ] Language switcher updates context
  - [ ] Persisted preference loaded on page load
  - [ ] All UI strings extracted to translation files

### [SET-005] usePreferences Hook

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: SET-002, FND-006
- **Description**: Create React hook for user preferences.
- **Acceptance Criteria**:
  - [ ] `usePreferences` hook with query caching
  - [ ] Update mutation with optimistic update
  - [ ] Locale context integration

---

## Phase 7: Admin Dashboard (Module 7)

### [ADMIN-001] Admin Authentication System

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: FND-004, FND-008
- **Description**: Create separate authentication system for admin accounts.
- **Acceptance Criteria**:
  - [ ] POST `/api/admin/login` endpoint
  - [ ] Separate Admin table from User
  - [ ] Password hashing
  - [ ] httpOnly cookie with admin session
  - [ ] Super admin creation via environment variable

### [ADMIN-002] Admin Auth Middleware

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: ADMIN-001
- **Description**: Create middleware for admin route protection.
- **Acceptance Criteria**:
  - [ ] Admin session validation
  - [ ] Role check (ADMIN vs SUPER_ADMIN)
  - [ ] 403 for non-admin access
  - [ ] AuditLog creation for admin actions

### [ADMIN-003] Admin Login Page

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: ADMIN-001, FND-002
- **Description**: Create admin login page UI.
- **Acceptance Criteria**:
  - [ ] `/admin/login` page
  - [ ] Email/password form
  - [ ] Error handling
  - [ ] Redirect to admin dashboard on success

### [ADMIN-004] Admin Dashboard Layout

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: ADMIN-002, FND-002
- **Description**: Create admin dashboard layout with navigation.
- **Acceptance Criteria**:
  - [ ] `/admin` dashboard page
  - [ ] Sidebar navigation
  - [ ] Header with admin info and logout
  - [ ] Responsive layout

### [ADMIN-005] System Overview API

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: ADMIN-002, FND-004
- **Description**: Create API endpoint for system statistics.
- **Acceptance Criteria**:
  - [ ] GET `/api/admin/stats` endpoint
  - [ ] Total users count
  - [ ] Total courses count
  - [ ] Total files count
  - [ ] Storage used
  - [ ] Active users (last 7 days)

### [ADMIN-006] System Overview Component

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: ADMIN-005
- **Description**: Create dashboard cards for system statistics.
- **Acceptance Criteria**:
  - [ ] Stats cards with icons
  - [ ] Real-time data

### [ADMIN-007] User Access Statistics API

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: ADMIN-002, FND-004
- **Description**: Create API endpoint for user access analytics.
- **Acceptance Criteria**:
  - [ ] GET `/api/admin/access-stats` endpoint
  - [ ] Monthly/weekly page views
  - [ ] Q&A usage count
  - [ ] Auto-explain usage count
  - [ ] Data aggregated from AccessLog

### [ADMIN-008] Access Statistics Charts

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: ADMIN-007
- **Description**: Create charts for access statistics visualization.
- **Acceptance Criteria**:
  - [ ] Line chart for usage over time
  - [ ] Bar chart for feature usage comparison
  - [ ] Date range selector
  - [ ] Chart library integration (Recharts)

### [ADMIN-009] AI Cost Monitoring API

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: ADMIN-002, FND-004
- **Description**: Create API endpoint for AI usage cost tracking.
- **Acceptance Criteria**:
  - [ ] GET `/api/admin/cost` endpoint
  - [ ] Total tokens (input/output)
  - [ ] Calculated cost
  - [ ] Breakdown by model
  - [ ] Daily trend data
  - [ ] Data from AIUsageLog

### [ADMIN-010] Mathpix Cost API

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: ADMIN-002, TUTOR-009
- **Description**: Create API endpoint for Mathpix usage cost tracking.
- **Acceptance Criteria**:
  - [ ] GET `/api/admin/cost/mathpix` endpoint
  - [ ] Total requests count
  - [ ] Calculated cost ($0.004/request)
  - [ ] Top 10 users by usage
  - [ ] Daily breakdown

### [ADMIN-011] Cost Dashboard Component

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: ADMIN-009, ADMIN-010
- **Description**: Create cost monitoring dashboard with charts.
- **Acceptance Criteria**:
  - [ ] Total cost summary cards
  - [ ] Cost trend line chart
  - [ ] Cost breakdown pie chart
  - [ ] Model usage table
  - [ ] Mathpix section

### [ADMIN-012] Worker Health Check API

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: ADMIN-002, TUTOR-001
- **Description**: Create API endpoint for background job health monitoring.
- **Acceptance Criteria**:
  - [ ] GET `/api/admin/workers` endpoint
  - [ ] List active/pending/failed jobs
  - [ ] Zombie job detection (>10 min processing)
  - [ ] Job queue statistics

### [ADMIN-013] Worker Health Dashboard

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: ADMIN-012
- **Description**: Create worker monitoring dashboard.
- **Acceptance Criteria**:
  - [ ] Job status cards
  - [ ] Zombie jobs alert
  - [ ] Manual retry button for failed jobs
  - [ ] Mark as failed button
  - [ ] Auto-refresh

### [ADMIN-014] Quota Adjustment API

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: ADMIN-002, QUOTA-003
- **Description**: Create API endpoint for admin to adjust user quotas.
- **Acceptance Criteria**:
  - [ ] POST `/api/admin/users/:id/quota` endpoint
  - [ ] Super admin or admin access
  - [ ] Update quota limit or used
  - [ ] Create QuotaLog with ADMIN_ADJUST reason
  - [ ] Create AuditLog entry

### [ADMIN-015] User Quota Management Page

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: ADMIN-014
- **Description**: Create page for viewing and adjusting user quotas.
- **Acceptance Criteria**:
  - [ ] `/admin/users/:id/quota` page
  - [ ] Display all quota buckets
  - [ ] Adjustment form with reason input
  - [ ] History of quota changes
  - [ ] Confirmation dialog

### [ADMIN-016] User List API

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: ADMIN-002, FND-004
- **Description**: Create API endpoint to list users with filters.
- **Acceptance Criteria**:
  - [ ] GET `/api/admin/users` endpoint
  - [ ] Pagination support
  - [ ] Search by email
  - [ ] Sort by creation date
  - [ ] Include quota summary per user

### [ADMIN-017] User List Page

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: ADMIN-016
- **Description**: Create admin page to view and manage users.
- **Acceptance Criteria**:
  - [ ] `/admin/users` page
  - [ ] Data table with pagination
  - [ ] Search and filter
  - [ ] Link to quota management
  - [ ] Link to file statistics

### [ADMIN-018] User File Statistics API

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: ADMIN-002, FND-004
- **Description**: Create API endpoint for user file upload statistics.
- **Acceptance Criteria**:
  - [ ] GET `/api/admin/users/:id/files` endpoint
  - [ ] Total file count
  - [ ] Total storage used
  - [ ] Upload time distribution
  - [ ] By course breakdown

### [ADMIN-019] User File Statistics Page

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: ADMIN-018
- **Description**: Create page for viewing user file statistics.
- **Acceptance Criteria**:
  - [ ] `/admin/users/:id/files` page
  - [ ] Storage usage bar
  - [ ] File count by course
  - [ ] Upload timeline chart

---

## Phase 8: PDF Reader

### [READER-001] PDF Viewer Component

- **Complexity**: L
- **Phase**: MVP
- **Dependencies**: FILE-006, FND-002
- **Description**: Create PDF viewer component using pdf.js or react-pdf.
- **Acceptance Criteria**:
  - [ ] PDF rendering with page navigation
  - [ ] Zoom controls
  - [ ] Page number input
  - [ ] Loading states
  - [ ] Error handling

### [READER-002] Reader Page Layout

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: READER-001
- **Description**: Create reader page with PDF viewer and explanation panel.
- **Acceptance Criteria**:
  - [ ] `/reader/:fileId` page
  - [ ] PDF viewer (main area)
  - [ ] Explanation panel (collapsible right sidebar)
  - [ ] Reading progress persistence
  - [ ] Responsive layout

### [READER-003] Reading Progress API

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: FND-004, AUTH-014
- **Description**: Create API endpoints for reading progress tracking.
- **Acceptance Criteria**:
  - [ ] GET `/api/files/:id/progress` - get current page
  - [ ] PATCH `/api/files/:id/progress` - update current page
  - [ ] Create/update ReadingProgress record

### [READER-004] useReadingProgress Hook

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: READER-003, FND-006, FND-007
- **Description**: Create hook for reading progress with debounced updates.
- **Acceptance Criteria**:
  - [ ] `useReadingProgress(fileId)` hook
  - [ ] Debounced page update (300ms)
  - [ ] Local state for immediate UI update
  - [ ] Sync with server

---

## Phase 9: Testing and Quality

### [TEST-001] Unit Test Setup

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: FND-001
- **Description**: Configure Vitest for unit testing.
- **Acceptance Criteria**:
  - [ ] Vitest configured
  - [ ] Test utilities setup
  - [ ] Coverage thresholds defined
  - [ ] CI integration

### [TEST-002] Auth Module Unit Tests

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: TEST-001, Phase 1 complete
- **Description**: Write unit tests for authentication module.
- **Acceptance Criteria**:
  - [ ] Registration flow tests
  - [ ] Login flow tests
  - [ ] Password reset tests
  - [ ] Session validation tests
  - [ ] 80%+ coverage

### [TEST-003] Course Module Unit Tests

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: TEST-001, Phase 2 complete
- **Description**: Write unit tests for course management.
- **Acceptance Criteria**:
  - [ ] CRUD operation tests
  - [ ] Limit validation tests
  - [ ] Cascade deletion tests
  - [ ] 80%+ coverage

### [TEST-004] File Module Unit Tests

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: TEST-001, Phase 3 complete
- **Description**: Write unit tests for file management.
- **Acceptance Criteria**:
  - [ ] Upload flow tests
  - [ ] Validation tests
  - [ ] Storage integration tests
  - [ ] 80%+ coverage

### [TEST-005] AI Tutor Module Unit Tests

- **Complexity**: L
- **Phase**: MVP
- **Dependencies**: TEST-001, Phase 4 complete
- **Description**: Write unit tests for AI Interactive Tutor.
- **Acceptance Criteria**:
  - [ ] Session flow tests
  - [ ] Test generation tests
  - [ ] Progress tracking tests
  - [ ] Quota consumption tests
  - [ ] 70%+ coverage (AI responses mocked)

### [TEST-006] E2E Test Setup

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: FND-001
- **Description**: Configure Playwright for end-to-end testing.
- **Acceptance Criteria**:
  - [ ] Playwright configured
  - [ ] Test database setup
  - [ ] Authentication helpers
  - [ ] CI integration

### [TEST-007] Critical Path E2E Tests

- **Complexity**: L
- **Phase**: MVP
- **Dependencies**: TEST-006, All phases complete
- **Description**: Write E2E tests for critical user flows.
- **Acceptance Criteria**:
  - [ ] Registration to first course flow
  - [ ] File upload flow
  - [ ] Learning session flow
  - [ ] Admin dashboard access
  - [ ] Tests pass in CI

---

## Phase 10: Deployment and DevOps

### [DEPLOY-001] Vercel Deployment Setup

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: All previous phases
- **Description**: Configure Vercel deployment with environment variables.
- **Acceptance Criteria**:
  - [ ] Vercel project created
  - [ ] Environment variables configured
  - [ ] Preview deployments for PRs
  - [ ] Production deployment from main branch

### [DEPLOY-002] Database Migration Strategy

- **Complexity**: S
- **Phase**: MVP
- **Dependencies**: FND-004
- **Description**: Document and implement database migration process.
- **Acceptance Criteria**:
  - [ ] Migration commands documented
  - [ ] CI/CD migration step
  - [ ] Rollback procedure documented

### [DEPLOY-003] Trigger.dev Setup

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: TUTOR-001, QUOTA-004
- **Description**: Configure Trigger.dev for production.
- **Acceptance Criteria**:
  - [ ] Trigger.dev project configured
  - [ ] Tasks deployed
  - [ ] Environment variables set
  - [ ] Monitoring dashboard access

### [DEPLOY-004] Monitoring and Logging

- **Complexity**: M
- **Phase**: MVP
- **Dependencies**: DEPLOY-001
- **Description**: Set up error tracking and logging.
- **Acceptance Criteria**:
  - [ ] Sentry error tracking configured
  - [ ] Logging utility with levels
  - [ ] Alert notifications

---

## Future Phase: Enhancements

### [FUT-001] OAuth Authentication (Google/GitHub)

- **Complexity**: M
- **Phase**: Future
- **Dependencies**: AUTH complete
- **Description**: Add OAuth providers for social login.

### [FUT-002] Two-Factor Authentication

- **Complexity**: M
- **Phase**: Future
- **Dependencies**: AUTH complete
- **Description**: Add TOTP-based 2FA.

### [FUT-003] Course-Level Learning

- **Complexity**: XL
- **Phase**: Future
- **Dependencies**: TUTOR complete
- **Description**: Enable learning across all PDFs in a course.

### [FUT-004] Knowledge Graph

- **Complexity**: XL
- **Phase**: Future
- **Dependencies**: FUT-003
- **Description**: Build knowledge graph across courses.

### [FUT-005] Voice/TTS Explanations

- **Complexity**: L
- **Phase**: Future
- **Dependencies**: TUTOR complete
- **Description**: Add text-to-speech for explanations.

### [FUT-006] Spaced Repetition Review

- **Complexity**: L
- **Phase**: Future
- **Dependencies**: TUTOR complete
- **Description**: Implement spaced repetition for weak points.

### [FUT-007] Learning Reports

- **Complexity**: M
- **Phase**: Future
- **Dependencies**: TUTOR complete
- **Description**: Generate learning progress reports.

### [FUT-008] Admin Account Management

- **Complexity**: M
- **Phase**: Future
- **Dependencies**: ADMIN complete
- **Description**: Super admin can create/disable admin accounts.

### [FUT-009] Multi-File Type Support

- **Complexity**: L
- **Phase**: Future
- **Dependencies**: FILE complete
- **Description**: Support PPT, Word documents.

### [FUT-010] Additional Languages

- **Complexity**: M
- **Phase**: Future
- **Dependencies**: SET-004
- **Description**: Add Japanese, Korean, Spanish localization.
