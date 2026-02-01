# Phase 0: Foundation - Implementation Plan

> **Version**: 1.0
> **Date**: 2026-02-01
> **Status**: Planning Complete

---

## Executive Summary

Phase 0 establishes the foundational infrastructure for Luma Web. This includes project initialization, database setup, UI framework configuration, and project structure. All subsequent phases depend on these foundations.

**Estimated Completion**: 1 week
**Priority Tasks**: FND-001, FND-002, FND-003, FND-007 (P0)

---

## Implementation Sequence

```
FND-001 (项目初始化)
   ↓
FND-007 (环境变量配置)
   ↓
FND-002 (数据库配置)
   ↓
FND-003 (数据库 Schema 设计)
   ↓
FND-004 (Supabase Storage 配置)
   ↓
FND-008 (项目目录结构)
   ↓
FND-005 (UI 组件库安装)
   ↓
FND-006 (状态管理配置)
```

**Rationale**:
- Project init must come first
- Environment variables needed before database setup
- Database config before schema design
- Directory structure before component installation
- State management last (depends on React being set up)

---

## Task Breakdown

### FND-001: 项目初始化

**Objective**: Initialize Next.js 14+ project with TypeScript and development tooling

**Actions**:
1. Initialize Next.js project with App Router
2. Configure TypeScript 5.7+
3. Setup ESLint + Prettier
4. Configure Husky pre-commit hooks
5. Setup git ignore patterns

**Files to Create/Modify**:
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `.eslintrc.json` - ESLint rules
- `.prettierrc` - Prettier configuration
- `.prettierignore` - Prettier ignore patterns
- `.husky/pre-commit` - Pre-commit hooks
- `.lintstagedrc.json` - Lint-staged configuration
- `next.config.mjs` - Next.js configuration
- `.gitignore` - Git ignore patterns

**Commands**:
```bash
npx create-next-app@latest luma-web \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-eslint

cd luma-web
pnpm add -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
pnpm add -D prettier eslint-config-prettier eslint-plugin-prettier
pnpm add -D husky lint-staged
pnpm exec husky init
```

**Acceptance Criteria**:
- ✓ Next.js 14.2+ running on dev server
- ✓ TypeScript compilation working
- ✓ ESLint + Prettier configured
- ✓ Pre-commit hooks running lint checks

---

### FND-002: 数据库配置

**Objective**: Setup Supabase PostgreSQL and configure Prisma ORM

**Actions**:
1. Install Prisma dependencies
2. Initialize Prisma with PostgreSQL provider
3. Configure connection strings (pooled + direct)
4. Test database connection

**Files to Create/Modify**:
- `prisma/schema.prisma` - Prisma schema file (basic setup)
- `.env` - Environment variables (local)
- `.env.example` - Environment variable template

**Commands**:
```bash
pnpm add prisma @prisma/client
pnpm add -D prisma
pnpm exec prisma init --datasource-provider postgresql
```

**Environment Variables**:
```env
# Pooled connection for serverless (Supabase)
DATABASE_URL="postgresql://user:password@host:5432/database?pgbouncer=true&connection_limit=1"

# Direct connection for migrations
DIRECT_URL="postgresql://user:password@host:5432/database"
```

**Acceptance Criteria**:
- ✓ Prisma initialized with PostgreSQL
- ✓ DATABASE_URL and DIRECT_URL configured
- ✓ `prisma db push` works (even with empty schema)

---

### FND-003: 数据库 Schema 设计

**Objective**: Create complete Prisma schema with all entities

**Entities to Define**:

1. **User Authentication**:
   - `User` - User accounts with email/password
   - `VerificationToken` - Email verification and password reset tokens

2. **Course & File Management**:
   - `Course` - Course organization (max 6 per user)
   - `File` - PDF files with status tracking

3. **AI Interactive Tutor**:
   - `TopicGroup` - Top-level knowledge structure
   - `SubTopic` - Individual concepts
   - `LearningSession` - User learning state
   - `SubTopicProgress` - Progress per subtopic
   - `SubTopicCache` - Cached explanations + quizzes
   - `QAMessage` - Q&A conversation history

4. **Quota Management**:
   - `Quota` - Usage limits (500 AI interactions/month)
   - `QuotaLog` - Quota adjustment history
   - `AIUsageLog` - AI API call tracking

5. **User Preferences**:
   - `UserPreference` - Language and UI preferences

6. **Admin**:
   - `Admin` - Admin accounts (separate from User)

**Key Relationships**:
- User 1:N Course 1:N File 1:N TopicGroup 1:N SubTopic
- User 1:N LearningSession 1:N SubTopicProgress
- SubTopic 1:1 SubTopicCache
- SubTopic 1:N QAMessage

**Indexes**:
```prisma
@@index([user_id, created_at(sort: Desc)])  // Listing queries
@@index([status])  // Status filtering
@@unique([user_id, file_id])  // Session uniqueness
```

**Cascade Deletes**:
- User DELETE → Cascade to Course, LearningSession, Quota
- Course DELETE → Cascade to File
- File DELETE → Cascade to TopicGroup, LearningSession
- TopicGroup DELETE → Cascade to SubTopic
- SubTopic DELETE → Cascade to SubTopicCache, QAMessage

**Files to Modify**:
- `prisma/schema.prisma` - Complete schema definition
- `src/types/database.ts` - Generated TypeScript types

**Commands**:
```bash
pnpm exec prisma generate
pnpm exec prisma db push
pnpm exec prisma studio  # Verify schema
```

**Acceptance Criteria**:
- ✓ All 14 tables defined
- ✓ Relationships with cascade deletes
- ✓ Indexes for performance-critical queries
- ✓ Migration applied successfully

---

### FND-004: Supabase Storage 配置

**Objective**: Configure Supabase Storage for PDF file uploads

**Actions**:
1. Install Supabase client libraries
2. Configure storage bucket policies
3. Implement signed URL generation helpers
4. Test file upload/download flow

**Files to Create**:
- `src/lib/supabase/client.ts` - Browser client
- `src/lib/supabase/server.ts` - Server client
- `src/lib/supabase/middleware.ts` - Auth middleware
- `src/lib/storage.ts` - Storage helpers

**Bucket Configuration**:
```javascript
// Bucket: "pdfs"
// Policies:
// 1. Users can upload to their own folder
// 2. Users can read their own files
// 3. Max file size: 500MB
// 4. Allowed MIME types: application/pdf
```

**Storage Structure**:
```
pdfs/
  ├── {user_id}/
  │   ├── {file_id}.pdf
  │   └── {file_id}.pdf
```

**Environment Variables**:
```env
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="xxx"
SUPABASE_SERVICE_ROLE_KEY="xxx"
```

**Commands**:
```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

**Acceptance Criteria**:
- ✓ Storage bucket created with proper policies
- ✓ 5GB per user limit configured (via RLS)
- ✓ Signed URL generation working
- ✓ File upload/download tested

---

### FND-005: UI 组件库安装

**Objective**: Setup shadcn/ui with Tailwind CSS and base components

**Actions**:
1. Initialize shadcn/ui
2. Install base components (Button, Card, Dialog, Input, etc.)
3. Configure Tailwind CSS theme
4. Setup dark mode (optional for MVP)

**Files to Create/Modify**:
- `components.json` - shadcn/ui configuration
- `tailwind.config.ts` - Tailwind configuration
- `postcss.config.mjs` - PostCSS configuration
- `src/app/globals.css` - Global styles
- `src/components/ui/*` - Base UI components
- `src/lib/utils.ts` - Utility functions (cn, etc.)

**Components to Install**:
- button, card, dialog, input, label
- form, select, checkbox
- table, tabs
- alert, badge, progress
- dropdown-menu, tooltip
- skeleton, toast

**Commands**:
```bash
pnpm dlx shadcn-ui@latest init
pnpm dlx shadcn-ui@latest add button card dialog input label
pnpm dlx shadcn-ui@latest add form select checkbox
pnpm dlx shadcn-ui@latest add table tabs
pnpm dlx shadcn-ui@latest add alert badge progress
pnpm dlx shadcn-ui@latest add dropdown-menu tooltip
pnpm dlx shadcn-ui@latest add skeleton toast
```

**Acceptance Criteria**:
- ✓ Tailwind CSS configured
- ✓ shadcn/ui initialized
- ✓ Base components installed and working
- ✓ Dark mode support (optional)

---

### FND-006: 状态管理配置

**Objective**: Configure TanStack Query and Zustand

**Actions**:
1. Install state management libraries
2. Setup TanStack Query Provider
3. Configure default query options
4. Create base Zustand stores structure

**Files to Create**:
- `src/app/providers.tsx` - Query Provider wrapper
- `src/lib/query-client.ts` - QueryClient configuration
- `src/stores/reader-store.ts` - PDF reader state
- `src/stores/learning-store.ts` - Learning session state

**Dependencies**:
```bash
pnpm add @tanstack/react-query zustand
pnpm add -D @tanstack/react-query-devtools
```

**QueryClient Configuration**:
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
})
```

**Acceptance Criteria**:
- ✓ TanStack Query Provider setup in app layout
- ✓ Default query options configured
- ✓ Zustand stores structure defined
- ✓ React Query Devtools available in dev mode

---

### FND-007: 环境变量配置

**Objective**: Setup all required environment variables with type-safe access

**Actions**:
1. Create `.env.example` with all variables
2. Implement type-safe environment variable access
3. Document all variables
4. Validate environment on startup

**Files to Create**:
- `.env.example` - Template for all env vars
- `src/lib/env.ts` - Type-safe env access

**Environment Variables**:
```env
# Database
DATABASE_URL=
DIRECT_URL=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Services
ANTHROPIC_API_KEY=
TUTOR_SKILL_ID=

# Background Jobs
TRIGGER_API_KEY=
TRIGGER_API_URL=

# Admin
SUPER_ADMIN_EMAIL=
SUPER_ADMIN_PASSWORD_HASH=

# Application
NEXT_PUBLIC_APP_URL=
NODE_ENV=
```

**Type-Safe Access**:
```typescript
// src/lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  // ... all env vars
})

export const env = envSchema.parse(process.env)
```

**Acceptance Criteria**:
- ✓ `.env.example` file with all variables
- ✓ Type-safe env access via `lib/env.ts`
- ✓ Environment validation on startup
- ✓ Vercel environment variables documented

---

### FND-008: 项目目录结构

**Objective**: Create complete project directory structure

**Actions**:
1. Create all directories as per TECH_DESIGN.md
2. Add index files for clean exports
3. Add README files for major directories

**Directory Structure**:
```
src/
├── app/
│   ├── (admin)/
│   │   └── admin/
│   │       ├── page.tsx
│   │       ├── layout.tsx
│   │       ├── login/page.tsx
│   │       ├── users/page.tsx
│   │       └── cost/page.tsx
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (main)/
│   │   ├── layout.tsx
│   │   ├── courses/page.tsx
│   │   ├── files/[courseId]/page.tsx
│   │   ├── reader/[fileId]/page.tsx
│   │   ├── learn/[sessionId]/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── auth/
│   │   ├── courses/
│   │   ├── files/
│   │   ├── learn/
│   │   ├── quota/
│   │   ├── preferences/
│   │   └── admin/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   └── providers.tsx
├── components/
│   ├── ui/
│   ├── auth/
│   ├── course/
│   ├── file/
│   ├── reader/
│   ├── learn/
│   ├── admin/
│   └── layout/
├── hooks/
│   ├── index.ts
│   ├── use-user.ts
│   ├── use-courses.ts
│   ├── use-files.ts
│   ├── use-learning-session.ts
│   ├── use-quota.ts
│   └── use-preferences.ts
├── stores/
│   ├── reader-store.ts
│   └── learning-store.ts
├── lib/
│   ├── ai/
│   │   ├── claude.ts
│   │   ├── skill.ts
│   │   └── prompts/
│   ├── api/
│   ├── supabase/
│   ├── middleware/
│   ├── auth.ts
│   ├── constants.ts
│   ├── csrf.ts
│   ├── prisma.ts
│   ├── rate-limit.ts
│   ├── storage.ts
│   └── utils.ts
└── types/
    ├── index.ts
    └── database.ts

trigger/
├── jobs/
│   ├── extract-structure.ts
│   └── quota-reset.ts
└── client.ts

tests/
├── unit/
├── integration/
├── e2e/
└── setup.ts
```

**Index Files** (for clean imports):
- `src/components/ui/index.ts`
- `src/components/auth/index.ts`
- `src/components/course/index.ts`
- `src/hooks/index.ts`

**README Files**:
- `src/app/README.md`
- `src/components/README.md`
- `trigger/README.md`
- `tests/README.md`

**Acceptance Criteria**:
- ✓ All directories created as per tech_design.md
- ✓ Index files for clean exports
- ✓ README for each major directory
- ✓ Proper separation of concerns

---

## Configuration Specifications

### TypeScript (tsconfig.json)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"]
    },
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### ESLint (.eslintrc.json)
```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```

### Prettier (.prettierrc)
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "avoid"
}
```

### Husky (.husky/pre-commit)
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm lint-staged
```

### Lint-Staged (.lintstagedrc.json)
```json
{
  "*.{js,jsx,ts,tsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,md}": [
    "prettier --write"
  ]
}
```

### Next.js (next.config.mjs)
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  images: {
    domains: ['xxx.supabase.co'],
  },
}

export default nextConfig
```

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Supabase connection issues | High | Low | Test connection early, provide clear error messages |
| Prisma migration conflicts | Medium | Medium | Use `db push` for dev, migrations for production |
| shadcn/ui installation errors | Low | Low | Use exact version numbers, clear cache if needed |
| Environment variable leaks | High | Low | Use `.env.example`, document clearly, validate on startup |
| TypeScript compilation errors | Medium | Medium | Start with strict mode, fix errors incrementally |
| Husky hooks failing | Low | Medium | Test hooks thoroughly, provide clear error messages |

---

## File Inventory

### New Files (to create)
1. `package.json`
2. `tsconfig.json`
3. `.eslintrc.json`
4. `.prettierrc`
5. `.prettierignore`
6. `.husky/pre-commit`
7. `.lintstagedrc.json`
8. `next.config.mjs`
9. `.gitignore`
10. `.env.example`
11. `prisma/schema.prisma`
12. `src/lib/env.ts`
13. `src/lib/prisma.ts`
14. `src/lib/supabase/client.ts`
15. `src/lib/supabase/server.ts`
16. `src/lib/supabase/middleware.ts`
17. `src/lib/storage.ts`
18. `src/lib/utils.ts`
19. `src/lib/query-client.ts`
20. `src/app/providers.tsx`
21. `src/stores/reader-store.ts`
22. `src/stores/learning-store.ts`
23. `src/types/index.ts`
24. `src/types/database.ts`
25. `components.json`
26. `tailwind.config.ts`
27. `postcss.config.mjs`
28. All directory structure (100+ folders)

### Modified Files
- `src/app/layout.tsx` (wrap with providers)
- `src/app/globals.css` (Tailwind + shadcn styles)

---

## Testing Strategy (for Phase 0)

**Note**: Phase 0 does NOT require E2E tests, but we should write unit tests for core modules.

### Unit Tests:
1. **src/lib/env.ts**: Test environment variable validation
2. **src/lib/prisma.ts**: Test Prisma client initialization
3. **src/lib/storage.ts**: Test storage helper functions
4. **src/lib/query-client.ts**: Test QueryClient configuration

### Integration Tests:
1. Database connection test
2. Supabase Storage upload/download test

### Test Files to Create:
- `tests/setup.ts`
- `tests/unit/lib/env.test.ts`
- `tests/unit/lib/prisma.test.ts`
- `tests/unit/lib/storage.test.ts`
- `tests/integration/database.test.ts`
- `vitest.config.ts`

---

## Success Criteria

Phase 0 is complete when:

- ✓ All 8 tasks (FND-001 to FND-008) implemented
- ✓ `pnpm dev` starts development server successfully
- ✓ `pnpm lint` passes without errors
- ✓ `pnpm prisma db push` applies schema successfully
- ✓ `pnpm test` runs unit tests successfully
- ✓ All directories created and properly structured
- ✓ Type-safe environment variable access working
- ✓ Supabase Storage upload/download working
- ✓ shadcn/ui components rendering correctly
- ✓ TanStack Query Provider working

---

## Next Steps

After Phase 0 completion:
1. Code review by Code Reviewer Agent
2. Security review by Security Review Agent
3. Proceed to Phase 1: Authentication

---

*Plan created by Planner Agent - Ready for TDD Guide Agent*
