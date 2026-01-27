# Phase 0: Project Foundation - Implementation Plan

> **Version**: 1.0
> **Status**: In Progress
> **Duration**: 1 week
> **Dependencies**: None

---

## Overview

Phase 0 establishes the foundational infrastructure for the Luma Web project. This includes project configuration, build tools, UI framework setup, database configuration, and core utilities.

---

## Task List

### FND-001: Project Setup and Configuration

**Priority**: P0 (Blocking)
**Estimated Time**: 4 hours

#### Files to Create:

- `/package.json` - Project dependencies and scripts
- `/tsconfig.json` - TypeScript configuration with strict mode
- `/next.config.mjs` - Next.js configuration
- `/.eslintrc.json` - ESLint rules
- `/.prettierrc` - Code formatting rules
- `/.prettierignore` - Files to exclude from formatting
- `/.env.example` - Environment variable template
- `/.husky/pre-commit` - Git pre-commit hook
- `/.lintstagedrc.json` - Lint-staged configuration
- `/src/app/layout.tsx` - Root layout component
- `/src/app/page.tsx` - Home page

#### Acceptance Criteria:

- [x] All dependencies installed without conflicts
- [x] TypeScript compiles without errors
- [x] Next.js dev server runs successfully
- [x] ESLint and Prettier configured and working

---

### FND-002: Tailwind CSS and Design System Setup

**Priority**: P0 (Blocking)
**Estimated Time**: 2 hours

#### Files to Create:

- `/tailwind.config.ts` - Tailwind configuration with custom tokens
- `/postcss.config.mjs` - PostCSS configuration
- `/src/app/globals.css` - Global styles and CSS variables

#### Design System Tokens:

```typescript
colors: {
  primary: {...},
  secondary: {...},
  accent: {...},
  neutral: {...}
}
fonts: {
  sans: ['Inter', 'system-ui', ...],
  mono: ['JetBrains Mono', 'monospace', ...]
}
```

#### Acceptance Criteria:

- [x] Tailwind utilities work correctly
- [x] Custom colors and fonts applied
- [x] Dark mode support configured

---

### FND-003: shadcn/ui Component Library Setup

**Priority**: P0 (Blocking)
**Estimated Time**: 3 hours

#### Files to Create:

- `/components.json` - shadcn/ui configuration
- `/src/lib/utils.ts` - cn() utility function
- `/src/components/ui/*.tsx` - 20 base UI components

#### Components:

1. Button
2. Input
3. Label
4. Card
5. Dialog
6. Toast/Toaster
7. Separator
8. Badge
9. Progress
10. Avatar
11. Tabs
12. Checkbox
13. Skeleton
14. Table
15. Form
16. Alert
17. Sheet
18. Dropdown Menu

#### Acceptance Criteria:

- [x] All components render correctly
- [x] Components follow shadcn/ui patterns
- [x] TypeScript types properly defined

---

### FND-004: Database Setup with Prisma

**Priority**: P0 (Blocking)
**Estimated Time**: 2 hours

#### Files to Create/Update:

- `/prisma/schema.prisma` - Already exists, verify
- `/src/lib/prisma.ts` - Prisma client singleton
- `/prisma/seed.ts` - Database seeding script

#### Acceptance Criteria:

- [x] Prisma client instantiated correctly
- [x] Database connection successful
- [x] Seed script executable

---

### FND-005: Supabase Integration

**Priority**: P0 (Blocking)
**Estimated Time**: 3 hours

#### Files to Create:

- `/src/lib/supabase/client.ts` - Client-side Supabase client
- `/src/lib/supabase/server.ts` - Server-side Supabase client
- `/src/lib/supabase/middleware.ts` - Auth middleware helper
- `/middleware.ts` - Next.js middleware
- `/src/lib/storage.ts` - File storage utilities

#### Acceptance Criteria:

- [x] Client and server Supabase instances work
- [x] Auth middleware protects routes
- [x] Storage utilities functional

---

### FND-006: TanStack Query Setup

**Priority**: P0 (Blocking)
**Estimated Time**: 2 hours

#### Files to Create:

- `/src/lib/query-client.ts` - Query client configuration
- `/src/app/providers.tsx` - React Query provider
- `/src/lib/api/client.ts` - API client helper

#### Acceptance Criteria:

- [x] QueryClientProvider wraps app
- [x] API client helper functional
- [x] Cache configuration correct

---

### FND-007: Zustand Store Setup

**Priority**: P0 (Blocking)
**Estimated Time**: 2 hours

#### Files to Create:

- `/src/stores/index.ts` - Store exports
- `/src/stores/reader-store.ts` - PDF reader state
- `/src/stores/learning-store.ts` - Learning session state

#### Acceptance Criteria:

- [x] Stores follow Zustand patterns
- [x] TypeScript types defined
- [x] State persistence configured (if needed)

---

### FND-008: API Route Utilities

**Priority**: P0 (Blocking)
**Estimated Time**: 4 hours

#### Files to Create:

- `/src/lib/constants.ts` - Error codes, limits, configs
- `/src/lib/api-response.ts` - Response helpers
- `/src/lib/auth.ts` - Auth utilities
- `/src/lib/rate-limit.ts` - Rate limiting
- `/src/lib/csrf.ts` - CSRF protection
- `/src/lib/validation.ts` - Zod schemas
- `/src/lib/logger.ts` - Logging utilities
- `/src/lib/env.ts` - Environment validation
- `/src/hooks/index.ts` - Hook exports
- `/src/types/index.ts` - Type definitions

#### Acceptance Criteria:

- [x] All utilities functional
- [x] Error codes defined
- [x] Validation schemas created
- [x] Rate limiting works

---

## Dependencies Between Tasks

```
FND-001 (Project Setup)
  └─► FND-002 (Tailwind)
       └─► FND-003 (shadcn/ui)
            └─► FND-006 (TanStack Query)
                 └─► FND-008 (API Utils)

FND-001 (Project Setup)
  └─► FND-004 (Prisma)
  └─► FND-005 (Supabase)
  └─► FND-007 (Zustand)
```

**Critical Path**: FND-001 → FND-002 → FND-003 → FND-006 → FND-008

---

## Environment Variables Required

```bash
# Database
DATABASE_URL=
DIRECT_URL=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Services (for later phases)
OPENROUTER_API_KEY=
MATHPIX_APP_ID=
MATHPIX_APP_KEY=

# Cloudflare R2 (for later phases)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# Trigger.dev (for later phases)
TRIGGER_API_KEY=
TRIGGER_API_URL=

# Admin
SUPER_ADMIN_EMAIL=
SUPER_ADMIN_PASSWORD_HASH=

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## Testing Checklist

- [ ] `npm install` runs without errors
- [ ] `npm run dev` starts development server
- [ ] `npm run build` compiles successfully
- [ ] `npm run lint` passes
- [ ] `npm run type-check` passes
- [ ] All components render in Storybook (if applicable)
- [ ] Prisma migrations apply successfully
- [ ] Environment variables validated on startup

---

## Success Criteria

Phase 0 is complete when:

1. All configuration files are created and functional
2. Development server runs without errors
3. All base UI components render correctly
4. Database connection is established
5. Supabase integration is working
6. TanStack Query provider is set up
7. Zustand stores are created
8. All utility libraries are functional
9. TypeScript compilation succeeds
10. Linting and formatting work correctly

---

## Next Phase

After completing Phase 0, proceed to:

- **Phase 1: User Authentication** - See `docs/PHASE1_PLAN.md`

---

_Last Updated: 2026-01-26_
