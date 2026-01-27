# Phase 7: Admin Dashboard - Implementation Plan

> **Version**: 1.0
> **Created**: 2026-01-26
> **Tasks**: ADMIN-001 to ADMIN-019

---

## Executive Summary

Phase 7 implements a separate Admin Dashboard module with the following key features:

- Separate admin authentication system (isolated from user auth)
- Admin dashboard with system overview, cost monitoring, and user management
- Background worker health monitoring
- User quota adjustment capabilities

---

## Architecture Overview

### 1. Database Schema

The existing Prisma schema already includes all necessary models:

**Admin Model**:

```prisma
model Admin {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String    @map("password_hash")
  role         AdminRole @default(ADMIN)
  createdAt    DateTime  @default(now()) @map("created_at")
  disabledAt   DateTime? @map("disabled_at")
  auditLogs AuditLog[]
  @@map("admins")
}
```

**Supporting Models**:

- `AuditLog` - For tracking admin actions
- `AccessLog` - For user access statistics
- `AIUsageLog` - For AI cost tracking
- `MathpixUsage` - For Mathpix cost tracking
- `Quota` / `QuotaLog` - For quota management

**Enums**:

- `AdminRole`: SUPER_ADMIN, ADMIN
- `AccessActionType`: LOGIN, VIEW_FILE, USE_QA, USE_EXPLAIN
- `AIActionType`: QA, EXPLAIN, STRUCTURE_EXTRACT, TEST_GENERATE

### 2. Security Architecture

**Session Isolation**:

- Different cookie name: `luma-admin-session` (vs `luma-session` for users)
- Different session validation middleware
- Different API route protection

**Super Admin Creation**:
Via environment variables:

```typescript
SUPER_ADMIN_EMAIL: z.string().email().optional(),
SUPER_ADMIN_PASSWORD: z.string().optional(),
```

---

## File Structure

```
src/
├── app/
│   ├── (admin)/
│   │   ├── layout.tsx              # Minimal auth layout
│   │   ├── login/
│   │   │   └── page.tsx            # ADMIN-003
│   │   └── admin/
│   │       ├── layout.tsx          # ADMIN-004 Dashboard layout
│   │       ├── page.tsx            # ADMIN-006 Overview
│   │       ├── cost/
│   │       │   └── page.tsx        # ADMIN-011
│   │       ├── workers/
│   │       │   └── page.tsx        # ADMIN-013
│   │       └── users/
│   │           ├── page.tsx        # ADMIN-017
│   │           └── [id]/
│   │               ├── quota/
│   │               │   └── page.tsx # ADMIN-015
│   │               └── files/
│   │                   └── page.tsx # ADMIN-019
│   └── api/
│       └── admin/
│           ├── login/
│           │   └── route.ts        # ADMIN-001
│           ├── logout/
│           │   └── route.ts        # ADMIN-001
│           ├── auth/
│           │   └── route.ts        # ADMIN-001
│           ├── stats/
│           │   └── route.ts        # ADMIN-005
│           ├── access-stats/
│           │   └── route.ts        # ADMIN-007
│           ├── cost/
│           │   ├── route.ts        # ADMIN-009
│           │   └── mathpix/
│           │       └── route.ts    # ADMIN-010
│           ├── workers/
│           │   ├── route.ts        # ADMIN-012
│           │   └── [fileId]/
│           │       ├── retry/route.ts
│           │       └── fail/route.ts
│           └── users/
│               ├── route.ts        # ADMIN-016
│               └── [id]/
│                   ├── quota/
│                   │   └── route.ts # ADMIN-014
│                   └── files/
│                       └── route.ts # ADMIN-018
├── components/
│   └── admin/
│       ├── admin-login-form.tsx    # ADMIN-003
│       ├── admin-sidebar.tsx       # ADMIN-004
│       ├── admin-header.tsx        # ADMIN-004
│       ├── system-overview.tsx     # ADMIN-006
│       ├── stat-card.tsx           # ADMIN-006
│       ├── access-stats-charts.tsx # ADMIN-008
│       ├── cost-dashboard.tsx      # ADMIN-011
│       ├── worker-health-dashboard.tsx # ADMIN-013
│       ├── job-actions.tsx         # ADMIN-013
│       ├── user-list-table.tsx     # ADMIN-017
│       ├── user-quota-management.tsx # ADMIN-015
│       ├── quota-adjustment-form.tsx # ADMIN-015
│       └── user-file-stats.tsx     # ADMIN-019
├── hooks/
│   ├── use-admin.ts
│   ├── use-admin-users.ts
│   ├── use-access-stats.ts
│   ├── use-cost-stats.ts
│   └── use-worker-stats.ts
└── lib/
    └── admin-auth.ts               # ADMIN-001, ADMIN-002
```

---

## Implementation Details

### Task Group 1: Admin Authentication (ADMIN-001, ADMIN-002, ADMIN-003)

#### ADMIN-001: Admin Authentication System

**Files to Create**:

1. **`src/lib/admin-auth.ts`**
   - Admin session management (separate from user auth)
   - Functions: `getAdminSession()`, `requireAdmin()`, `requireSuperAdmin()`
   - Admin cookie handling with `luma-admin-session`

2. **`src/app/api/admin/login/route.ts`**
   - POST `/api/admin/login`
   - Validate credentials against Admin table
   - Set httpOnly cookie for admin session
   - Rate limiting
   - Create AuditLog entry for login

3. **`src/app/api/admin/logout/route.ts`**
   - POST `/api/admin/logout`
   - Clear admin session cookie
   - Create AuditLog entry

4. **`src/app/api/admin/auth/route.ts`**
   - GET `/api/admin/auth`
   - Check admin session status
   - Return admin info or 401

**Constants to Add** (`src/lib/constants.ts`):

```typescript
export const ADMIN_SECURITY = {
  SESSION_COOKIE_NAME: 'luma-admin-session',
  SESSION_MAX_AGE_DAYS: 1, // 24 hours for admin sessions
} as const

export const ADMIN_ERROR_CODES = {
  ADMIN_UNAUTHORIZED: 'ADMIN_UNAUTHORIZED',
  ADMIN_FORBIDDEN: 'ADMIN_FORBIDDEN',
  ADMIN_DISABLED: 'ADMIN_DISABLED',
  ADMIN_INVALID_CREDENTIALS: 'ADMIN_INVALID_CREDENTIALS',
} as const
```

**Validation Schema** (`src/lib/validation.ts`):

```typescript
export const adminLoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})
```

#### ADMIN-002: Admin Auth Middleware

**Modify `middleware.ts`**:

- Add admin route detection (`/admin/*`, `/api/admin/*`)
- Admin session cookie validation
- Redirect unauthenticated to `/admin/login`

#### ADMIN-003: Admin Login Page

**Files to Create**:

1. `src/app/(admin)/login/page.tsx`
2. `src/app/(admin)/layout.tsx`
3. `src/components/admin/admin-login-form.tsx`

---

### Task Group 2: Admin Dashboard Layout (ADMIN-004)

**Files to Create**:

1. `src/app/(admin)/admin/layout.tsx` - Protected layout with sidebar
2. `src/components/admin/admin-sidebar.tsx` - Navigation
3. `src/components/admin/admin-header.tsx` - Header with logout
4. `src/hooks/use-admin.ts` - Hook for admin session data

---

### Task Group 3: System Overview (ADMIN-005, ADMIN-006)

#### ADMIN-005: System Overview API

**File**: `src/app/api/admin/stats/route.ts`

**GET `/api/admin/stats`** Response:

```typescript
{
  totalUsers: number,
  totalCourses: number,
  totalFiles: number,
  totalStorageUsed: bigint,
  activeUsers: number, // last 7 days
  newUsersThisMonth: number,
  filesProcessing: number,
}
```

#### ADMIN-006: System Overview Component

**Files to Create**:

1. `src/app/(admin)/admin/page.tsx`
2. `src/components/admin/system-overview.tsx`
3. `src/components/admin/stat-card.tsx`

---

### Task Group 4: Access Statistics (ADMIN-007, ADMIN-008)

#### ADMIN-007: User Access Statistics API

**File**: `src/app/api/admin/access-stats/route.ts`

**GET `/api/admin/access-stats`** with query params: `period`, `groupBy`

Response:

```typescript
{
  totalPageViews: number,
  totalQAUsage: number,
  totalExplainUsage: number,
  timeline: Array<{ date: string, pageViews: number, qaUsage: number, explainUsage: number }>,
  breakdown: { byAction: Record<AccessActionType, number> }
}
```

#### ADMIN-008: Access Statistics Charts

**Files to Create**:

1. `src/components/admin/access-stats-charts.tsx`
2. `src/hooks/use-access-stats.ts`

---

### Task Group 5: Cost Monitoring (ADMIN-009, ADMIN-010, ADMIN-011)

#### ADMIN-009: AI Cost Monitoring API

**File**: `src/app/api/admin/cost/route.ts`

Response:

```typescript
{
  totalInputTokens: number,
  totalOutputTokens: number,
  estimatedCost: number,
  byModel: Array<{ model: string, inputTokens: number, outputTokens: number, cost: number }>,
  dailyTrend: Array<{ date: string, inputTokens: number, outputTokens: number, cost: number }>
}
```

#### ADMIN-010: Mathpix Cost API

**File**: `src/app/api/admin/cost/mathpix/route.ts`

Response:

```typescript
{
  totalRequests: number,
  estimatedCost: number,
  topUsers: Array<{ userId: string, email: string, requestCount: number, cost: number }>,
  dailyTrend: Array<{ date: string, requests: number, cost: number }>
}
```

#### ADMIN-011: Cost Dashboard Component

**Files to Create**:

1. `src/app/(admin)/admin/cost/page.tsx`
2. `src/components/admin/cost-dashboard.tsx`
3. `src/hooks/use-cost-stats.ts`

---

### Task Group 6: Worker Health (ADMIN-012, ADMIN-013)

#### ADMIN-012: Worker Health Check API

**File**: `src/app/api/admin/workers/route.ts`

Response:

```typescript
{
  summary: { active: number, pending: number, failed: number, zombie: number },
  jobs: Array<{ fileId: string, fileName: string, status: StructureStatus, startedAt: string | null, duration: number | null, error: string | null, isZombie: boolean }>
}
```

#### ADMIN-013: Worker Health Dashboard

**Files to Create**:

1. `src/app/(admin)/admin/workers/page.tsx`
2. `src/components/admin/worker-health-dashboard.tsx`
3. `src/components/admin/job-actions.tsx`
4. `src/app/api/admin/workers/[fileId]/retry/route.ts`
5. `src/app/api/admin/workers/[fileId]/fail/route.ts`

---

### Task Group 7: User Management (ADMIN-014, ADMIN-015, ADMIN-016, ADMIN-017)

#### ADMIN-016: User List API

**File**: `src/app/api/admin/users/route.ts`

**GET `/api/admin/users`** with pagination

Response:

```typescript
{
  items: Array<{
    id: string, email: string, role: UserRole, createdAt: string,
    lastLoginAt: string | null, emailConfirmedAt: string | null, isLocked: boolean,
    quotaSummary: { learningInteractions: { used: number, limit: number }, autoExplain: { used: number, limit: number } },
    _count: { courses: number }
  }>,
  total: number, page: number, pageSize: number, totalPages: number
}
```

#### ADMIN-014: Quota Adjustment API

**File**: `src/app/api/admin/users/[id]/quota/route.ts`

**POST** body:

```typescript
{ bucket: 'LEARNING_INTERACTIONS' | 'AUTO_EXPLAIN', action: 'set_limit' | 'adjust_used' | 'reset', value: number, reason: string }
```

#### UI Pages:

1. `src/app/(admin)/admin/users/page.tsx` - User list (ADMIN-017)
2. `src/app/(admin)/admin/users/[id]/quota/page.tsx` - Quota management (ADMIN-015)
3. `src/components/admin/user-list-table.tsx`
4. `src/components/admin/user-quota-management.tsx`
5. `src/components/admin/quota-adjustment-form.tsx`
6. `src/hooks/use-admin-users.ts`

---

### Task Group 8: User File Statistics (ADMIN-018, ADMIN-019)

#### ADMIN-018: User File Statistics API

**File**: `src/app/api/admin/users/[id]/files/route.ts`

Response:

```typescript
{
  userId: string, email: string,
  summary: { totalFiles: number, totalStorage: bigint, totalPages: number, filesByStatus: Record<FileStatus, number> },
  byCourse: Array<{ courseId: string, courseName: string, fileCount: number, storageUsed: bigint }>,
  uploadTimeline: Array<{ date: string, count: number, size: bigint }>
}
```

#### ADMIN-019: User File Statistics Page

**Files to Create**:

1. `src/app/(admin)/admin/users/[id]/files/page.tsx`
2. `src/components/admin/user-file-stats.tsx`

---

## Implementation Order

**Phase 7.1: Core Auth**

1. ADMIN-001: Admin Authentication System
2. ADMIN-002: Admin Auth Middleware
3. ADMIN-003: Admin Login Page

**Phase 7.2: Dashboard Foundation** 4. ADMIN-004: Admin Dashboard Layout 5. ADMIN-005: System Overview API 6. ADMIN-006: System Overview Component

**Phase 7.3: Analytics** 7. ADMIN-007: User Access Statistics API 8. ADMIN-008: Access Statistics Charts 9. ADMIN-009: AI Cost Monitoring API 10. ADMIN-010: Mathpix Cost API 11. ADMIN-011: Cost Dashboard Component

**Phase 7.4: Operations** 12. ADMIN-012: Worker Health Check API 13. ADMIN-013: Worker Health Dashboard

**Phase 7.5: User Management** 14. ADMIN-016: User List API 15. ADMIN-017: User List Page 16. ADMIN-014: Quota Adjustment API 17. ADMIN-015: User Quota Management Page 18. ADMIN-018: User File Statistics API 19. ADMIN-019: User File Statistics Page

---

## Testing Strategy

**Unit Tests** (location: `tests/`):

- `tests/api/admin/login.test.ts`
- `tests/api/admin/stats.test.ts`
- `tests/api/admin/users.test.ts`
- `tests/components/admin/admin-login-form.test.tsx`
- `tests/lib/admin-auth.test.ts`

**E2E Tests** (location: `tests/e2e/`):

- `tests/e2e/admin-login.spec.ts`
- `tests/e2e/admin-dashboard.spec.ts`
- `tests/e2e/admin-users.spec.ts`
