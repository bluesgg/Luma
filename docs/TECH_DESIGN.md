# Luma Web - Technical Design Document

> **Version**: 1.0 MVP
> **Last Updated**: 2026-01-26
> **Status**: Draft

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Project Structure](#4-project-structure)
5. [Database Design](#5-database-design)
6. [API Design](#6-api-design)
7. [Core Feature: AI Interactive Tutor](#7-core-feature-ai-interactive-tutor)
8. [Authentication & Security](#8-authentication--security)
9. [State Management](#9-state-management)
10. [Background Jobs](#10-background-jobs)
11. [Integration Points](#11-integration-points)
12. [Performance Considerations](#12-performance-considerations)
13. [Deployment Strategy](#13-deployment-strategy)
14. [Implementation Phases](#14-implementation-phases)

---

## 1. Executive Summary

### 1.1 Product Overview

Luma Web is an AI-powered learning management system designed for university students. The platform enables students to:

- Organize courses and upload PDF learning materials
- Receive AI-guided interactive tutoring on PDF content
- Track learning progress with knowledge structure visualization
- Test understanding through AI-generated assessments

### 1.2 Key Features

| Module               | Description                                            | Priority   |
| -------------------- | ------------------------------------------------------ | ---------- |
| User Authentication  | Email/password auth with verification                  | MVP        |
| Course Management    | CRUD operations for courses (max 6/user)               | MVP        |
| File Management      | PDF upload with validation (max 200MB, 500 pages)      | MVP        |
| AI Interactive Tutor | Two-layer knowledge structure, five-layer explanations | MVP (Core) |
| Quota Management     | Usage limits (150 interactions/month)                  | MVP        |
| User Settings        | Language preferences (en/zh)                           | MVP        |
| Admin Dashboard      | System stats, cost monitoring                          | MVP        |

### 1.3 Technical Goals

- **Performance**: First byte < 2s for AI explanations (SSE)
- **Scalability**: Support 10,000+ concurrent users
- **Reliability**: 99.9% uptime target
- **Security**: OWASP Top 10 compliance
- **Maintainability**: 80%+ test coverage for core modules

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Client Layer                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Browser   │  │   Mobile    │  │   PWA       │  │   Desktop   │        │
│  │   (React)   │  │   (Future)  │  │   (Future)  │  │   (Future)  │        │
│  └──────┬──────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────┼───────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Application Layer                                 │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    Next.js 14+ (App Router)                          │  │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐            │  │
│  │  │  Server       │  │   API         │  │   Middleware  │            │  │
│  │  │  Components   │  │   Routes      │  │   (Auth/CSRF) │            │  │
│  │  └───────────────┘  └───────────────┘  └───────────────┘            │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────┬─────────────────────────────┬─────────────────────────────────────┘
          │                             │
          ▼                             ▼
┌─────────────────────────┐  ┌─────────────────────────────────────────────────┐
│     Data Layer          │  │              External Services                   │
│  ┌──────────────────┐   │  │  ┌─────────────┐  ┌─────────────┐              │
│  │   PostgreSQL     │   │  │  │  OpenRouter │  │   Mathpix   │              │
│  │   (Supabase)     │   │  │  │  (AI)       │  │  (Formula)  │              │
│  │   + Prisma ORM   │   │  │  └─────────────┘  └─────────────┘              │
│  └──────────────────┘   │  │  ┌─────────────┐  ┌─────────────┐              │
│  ┌──────────────────┐   │  │  │  Supabase   │  │ Cloudflare  │              │
│  │   Supabase       │   │  │  │  Auth       │  │    R2       │              │
│  │   Storage        │   │  │  └─────────────┘  └─────────────┘              │
│  └──────────────────┘   │  │  ┌─────────────┐                               │
└─────────────────────────┘  │  │ Trigger.dev │                               │
                             │  │  (Jobs)     │                               │
                             │  └─────────────┘                               │
                             └─────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
User Action → Next.js API Route → Auth Middleware → Business Logic → Database
                                                          │
                                                          ├── AI Service (async)
                                                          │
                                                          └── Background Job (async)
```

---

## 3. Technology Stack

### 3.1 Core Technologies

| Layer           | Technology       | Version | Purpose                    |
| --------------- | ---------------- | ------- | -------------------------- |
| Framework       | Next.js          | 14.2+   | Full-stack React framework |
| Language        | TypeScript       | 5.7+    | Type safety                |
| Database        | PostgreSQL       | 15+     | Primary data store         |
| ORM             | Prisma           | 5.22+   | Database access            |
| Auth            | Supabase Auth    | Latest  | Authentication             |
| Storage         | Supabase Storage | Latest  | PDF file storage           |
| Image Storage   | Cloudflare R2    | Latest  | Extracted images           |
| Background Jobs | Trigger.dev      | v3      | Async processing           |
| AI              | OpenRouter       | Latest  | LLM API gateway            |
| Formula OCR     | Mathpix          | Latest  | LaTeX recognition          |

### 3.2 Frontend Technologies

| Category       | Technology            | Purpose                 |
| -------------- | --------------------- | ----------------------- |
| UI Framework   | React 18              | Component library       |
| Styling        | Tailwind CSS          | Utility-first CSS       |
| Components     | shadcn/ui + Radix     | Accessible components   |
| Icons          | Lucide React          | Icon library            |
| State (Server) | TanStack Query        | Server state caching    |
| State (Client) | Zustand               | Client state management |
| Forms          | React Hook Form + Zod | Form validation         |
| PDF Viewer     | react-pdf             | PDF rendering           |
| LaTeX          | KaTeX                 | Formula rendering       |
| Charts         | Recharts              | Data visualization      |

### 3.3 Development Tools

| Tool       | Purpose         |
| ---------- | --------------- |
| ESLint     | Code linting    |
| Prettier   | Code formatting |
| Vitest     | Unit testing    |
| Playwright | E2E testing     |
| Husky      | Git hooks       |

---

## 4. Project Structure

```
/luma-web
├── .claude/                    # Claude AI configuration
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── migrations/             # Database migrations
│   └── seed.ts                 # Database seeding
│
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (admin)/            # Admin route group
│   │   │   └── admin/
│   │   │       ├── page.tsx
│   │   │       ├── login/page.tsx
│   │   │       ├── users/page.tsx
│   │   │       └── cost/page.tsx
│   │   │
│   │   ├── (auth)/             # Auth route group
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── reset-password/page.tsx
│   │   │
│   │   ├── (main)/             # Main app route group
│   │   │   ├── courses/page.tsx
│   │   │   ├── files/[courseId]/page.tsx
│   │   │   ├── reader/[fileId]/page.tsx
│   │   │   ├── learn/[sessionId]/page.tsx
│   │   │   └── settings/page.tsx
│   │   │
│   │   ├── api/
│   │   │   ├── auth/           # Auth endpoints
│   │   │   ├── courses/        # Course CRUD
│   │   │   ├── files/          # File management
│   │   │   ├── learn/          # AI tutor endpoints
│   │   │   ├── quota/          # Quota endpoints
│   │   │   ├── preferences/    # User preferences
│   │   │   ├── admin/          # Admin endpoints
│   │   │   └── webhooks/       # External webhooks
│   │   │
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── providers.tsx
│   │
│   ├── components/
│   │   ├── ui/                 # Base UI components (shadcn/ui)
│   │   ├── auth/               # Auth components
│   │   ├── course/             # Course components
│   │   ├── file/               # File components
│   │   ├── reader/             # PDF reader components
│   │   ├── learn/              # AI tutor components
│   │   └── admin/              # Admin components
│   │
│   ├── hooks/
│   │   ├── use-user.ts
│   │   ├── use-courses.ts
│   │   ├── use-files.ts
│   │   ├── use-learning-session.ts
│   │   ├── use-quota.ts
│   │   ├── use-preferences.ts
│   │   └── use-sse.ts
│   │
│   ├── stores/
│   │   ├── reader-store.ts
│   │   └── learning-store.ts
│   │
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── index.ts        # AI client
│   │   │   ├── mathpix.ts      # Mathpix integration
│   │   │   └── prompts/        # Prompt templates
│   │   ├── api/                # API client functions
│   │   ├── supabase/           # Supabase clients
│   │   ├── middleware/         # Route middleware helpers
│   │   ├── auth.ts
│   │   ├── constants.ts
│   │   ├── csrf.ts
│   │   ├── prisma.ts
│   │   ├── rate-limit.ts
│   │   ├── storage.ts
│   │   └── utils.ts
│   │
│   └── types/
│       ├── index.ts
│       └── database.ts
│
├── trigger/                    # Trigger.dev jobs
│   ├── jobs/
│   │   ├── extract-structure.ts
│   │   ├── extract-images.ts
│   │   └── quota-reset.ts
│   └── client.ts
│
├── scripts/
│   └── extract_images.py       # PyMuPDF image extraction
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── setup.ts
│
├── docs/
│   ├── PRD.md
│   ├── tech_design.md
│   └── task.md
│
└── config files...
```

---

## 5. Database Design

### 5.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER AUTHENTICATION                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐         ┌─────────────────────┐                           │
│  │    User     │ 1 ─── N │ VerificationToken   │                           │
│  │             │         │                     │                           │
│  │  - id       │         │  - id               │                           │
│  │  - email    │         │  - user_id          │                           │
│  │  - password │         │  - token            │                           │
│  │  - role     │         │  - type             │                           │
│  └──────┬──────┘         │  - expires_at       │                           │
│         │                └─────────────────────┘                           │
└─────────┼───────────────────────────────────────────────────────────────────┘
          │
          │ 1:N
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           COURSE & FILE MANAGEMENT                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐         ┌─────────────────────┐                           │
│  │   Course    │ 1 ─── N │       File          │                           │
│  │             │         │                     │                           │
│  │  - id       │         │  - id               │                           │
│  │  - user_id  │         │  - course_id        │                           │
│  │  - name     │         │  - name             │                           │
│  │  - school   │         │  - status           │                           │
│  │  - term     │         │  - structure_status │                           │
│  └─────────────┘         └──────────┬──────────┘                           │
│                                     │                                       │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │ 1:N
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AI INTERACTIVE TUTOR                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐      │
│  │   TopicGroup    │ 1:N │    SubTopic     │     │   TopicTest     │      │
│  │                 ├────►│                 │     │                 │      │
│  │  - id           │     │  - id           │     │  - id           │      │
│  │  - file_id      │     │  - topic_id     │     │  - topic_id     │      │
│  │  - index        │     │  - index        │     │  - question     │      │
│  │  - title        │     │  - title        │     │  - options      │      │
│  │  - type (CORE/  │     │  - metadata     │     │  - answer       │      │
│  │    SUPPORTING)  │     └─────────────────┘     └─────────────────┘      │
│  └────────┬────────┘                                                       │
│           │ 1:N                                                             │
│           ▼                                                                 │
│  ┌─────────────────┐     ┌─────────────────┐                               │
│  │ LearningSession │ 1:N │  TopicProgress  │                               │
│  │                 ├────►│                 │                               │
│  │  - id           │     │  - id           │                               │
│  │  - user_id      │     │  - session_id   │                               │
│  │  - file_id      │     │  - topic_id     │                               │
│  │  - status       │     │  - status       │                               │
│  │  - current_pos  │     │  - is_weak_point│                               │
│  └─────────────────┘     │  - wrong_count  │                               │
│                          └─────────────────┘                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Key Database Tables

| Table                | Purpose                       | Key Relationships                  |
| -------------------- | ----------------------------- | ---------------------------------- |
| `users`              | User accounts                 | 1:N with courses, sessions, quotas |
| `courses`            | Course organization           | 1:N with files                     |
| `files`              | PDF files                     | 1:N with topics, sessions          |
| `topic_groups`       | Knowledge structure (level 1) | 1:N with sub_topics, tests         |
| `sub_topics`         | Knowledge structure (level 2) | 1:N with sub_topic_progress        |
| `topic_tests`        | Cached test questions         | N:1 with topic_groups              |
| `learning_sessions`  | User learning state           | 1:N with progress records          |
| `topic_progress`     | Topic completion status       | N:1 with sessions                  |
| `sub_topic_progress` | Sub-topic confirmation        | N:1 with sessions                  |
| `quotas`             | Usage limits                  | N:1 with users                     |
| `admins`             | Admin accounts (separate)     | Independent                        |

### 5.3 Indexes

**Performance-Critical Indexes:**

```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);

-- Course listing
CREATE INDEX idx_courses_user_created ON courses(user_id, created_at DESC);

-- File listing
CREATE INDEX idx_files_course_created ON files(course_id, created_at DESC);
CREATE INDEX idx_files_status ON files(status);
CREATE INDEX idx_files_structure_status ON files(structure_status);

-- Learning session lookups
CREATE UNIQUE INDEX idx_sessions_user_file ON learning_sessions(user_id, file_id);
CREATE INDEX idx_sessions_user_status ON learning_sessions(user_id, status);

-- Progress queries
CREATE INDEX idx_topic_progress_session ON topic_progress(session_id, status);

-- Quota management
CREATE INDEX idx_quotas_reset ON quotas(reset_at);
```

### 5.4 Cascade Delete Strategy

```
User DELETE
  └─► Course DELETE
        └─► File DELETE
              ├─► TopicGroup DELETE
              │     ├─► SubTopic DELETE
              │     │     └─► SubTopicProgress DELETE
              │     ├─► TopicTest DELETE
              │     └─► TopicProgress DELETE
              ├─► ExtractedImage DELETE
              └─► LearningSession DELETE
                    ├─► TopicProgress DELETE
                    └─► SubTopicProgress DELETE
```

---

## 6. API Design

### 6.1 API Response Format

```typescript
// Success Response
interface ApiSuccessResponse<T> {
  success: true
  data: T
}

// Error Response
interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
  }
}
```

### 6.2 API Endpoints Summary

#### Authentication (`/api/auth/*`)

| Method | Endpoint                        | Description               |
| ------ | ------------------------------- | ------------------------- |
| POST   | `/api/auth/register`            | Register new user         |
| POST   | `/api/auth/login`               | Login with credentials    |
| POST   | `/api/auth/logout`              | Logout and clear session  |
| GET    | `/api/auth/verify`              | Verify email token        |
| POST   | `/api/auth/reset-password`      | Request password reset    |
| POST   | `/api/auth/confirm-reset`       | Confirm password reset    |
| POST   | `/api/auth/resend-verification` | Resend verification email |

#### Courses (`/api/courses/*`)

| Method | Endpoint                 | Description         |
| ------ | ------------------------ | ------------------- |
| GET    | `/api/courses`           | List user's courses |
| POST   | `/api/courses`           | Create new course   |
| GET    | `/api/courses/:id`       | Get course details  |
| PATCH  | `/api/courses/:id`       | Update course       |
| DELETE | `/api/courses/:id`       | Delete course       |
| GET    | `/api/courses/:id/files` | List course files   |

#### Files (`/api/files/*`)

| Method | Endpoint                       | Description                |
| ------ | ------------------------------ | -------------------------- |
| POST   | `/api/files/upload-url`        | Get presigned upload URL   |
| POST   | `/api/files/confirm`           | Confirm upload completion  |
| GET    | `/api/files/:id`               | Get file details           |
| DELETE | `/api/files/:id`               | Delete file                |
| GET    | `/api/files/:id/download-url`  | Get download URL           |
| GET    | `/api/files/:id/images`        | Get extracted images       |
| POST   | `/api/files/:id/extract/retry` | Retry structure extraction |

#### AI Interactive Tutor (`/api/learn/*`)

| Method | Endpoint                          | Description                   |
| ------ | --------------------------------- | ----------------------------- |
| POST   | `/api/files/:id/learn/start`      | Start/resume learning session |
| GET    | `/api/learn/sessions/:id`         | Get session details           |
| POST   | `/api/learn/sessions/:id/explain` | Get explanation (SSE)         |
| POST   | `/api/learn/sessions/:id/confirm` | Confirm understanding         |
| POST   | `/api/learn/sessions/:id/test`    | Start/get test                |
| POST   | `/api/learn/sessions/:id/answer`  | Submit test answer            |
| POST   | `/api/learn/sessions/:id/skip`    | Skip question                 |
| POST   | `/api/learn/sessions/:id/next`    | Advance to next topic         |
| POST   | `/api/learn/sessions/:id/pause`   | Pause session                 |

#### Quota (`/api/quota/*`)

| Method | Endpoint     | Description              |
| ------ | ------------ | ------------------------ |
| GET    | `/api/quota` | Get current quota status |

#### Admin (`/api/admin/*`)

| Method | Endpoint                     | Description             |
| ------ | ---------------------------- | ----------------------- |
| POST   | `/api/admin/login`           | Admin login             |
| GET    | `/api/admin/stats`           | System statistics       |
| GET    | `/api/admin/users`           | List users              |
| GET    | `/api/admin/cost`            | AI cost statistics      |
| GET    | `/api/admin/cost/mathpix`    | Mathpix cost statistics |
| GET    | `/api/admin/workers`         | Worker health status    |
| POST   | `/api/admin/users/:id/quota` | Adjust user quota       |

### 6.3 Error Codes

| Code                        | HTTP Status | Description                          |
| --------------------------- | ----------- | ------------------------------------ |
| `AUTH_INVALID_CREDENTIALS`  | 401         | Invalid email or password            |
| `AUTH_EMAIL_NOT_VERIFIED`   | 403         | Email not verified                   |
| `AUTH_ACCOUNT_LOCKED`       | 403         | Account locked after failed attempts |
| `COURSE_LIMIT_REACHED`      | 400         | Max 6 courses reached                |
| `FILE_TOO_LARGE`            | 400         | File exceeds 200MB                   |
| `FILE_TOO_MANY_PAGES`       | 400         | File exceeds 500 pages               |
| `FILE_DUPLICATE_NAME`       | 400         | File name already exists             |
| `STORAGE_LIMIT_REACHED`     | 400         | 5GB storage limit reached            |
| `TUTOR_STRUCTURE_NOT_READY` | 400         | Knowledge structure not extracted    |
| `TUTOR_STRUCTURE_FAILED`    | 400         | Structure extraction failed          |
| `TUTOR_QUOTA_EXCEEDED`      | 400         | Monthly quota exhausted              |

---

## 7. Core Feature: AI Interactive Tutor

### 7.1 Knowledge Structure Extraction

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PDF Structure Extraction Pipeline                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │   Upload    │    │   Trigger   │    │   Extract   │    │   Store     │ │
│  │   Confirm   │───►│   Job       │───►│   Content   │───►│   Results   │ │
│  └─────────────┘    └─────────────┘    └──────┬──────┘    └─────────────┘ │
│                                               │                            │
│                           ┌───────────────────┼───────────────────┐        │
│                           │                   │                   │        │
│                           ▼                   ▼                   ▼        │
│                    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│                    │  PyMuPDF    │    │  PDF Text   │    │   AI        │  │
│                    │  (Images)   │    │  Extraction │    │  Analysis   │  │
│                    └─────────────┘    └─────────────┘    └─────────────┘  │
│                           │                                    │           │
│                           ▼                                    ▼           │
│                    ┌─────────────┐                     ┌─────────────────┐ │
│                    │ R2 Storage  │                     │ TopicGroup +    │ │
│                    │ (Images)    │                     │ SubTopic        │ │
│                    └─────────────┘                     └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Two-Layer Knowledge Structure

```
TopicGroup (总知识点)
├── type: CORE | SUPPORTING
├── pageStart: number
├── pageEnd: number
│
└── SubTopic[] (子知识点)
    ├── title: string
    └── metadata: {
          summary: string
          keywords: string[]
          relatedPages: number[]
        }
```

### 7.3 Five-Layer Explanation Model

```typescript
interface SubTopicExplanation {
  explanation: {
    motivation: string // 为什么要学这个
    intuition: string // 通俗解释
    mathematics: string // 公式推导 (LaTeX)
    theory: string // 严谨定义
    application: string // 实际例子
  }
}
```

### 7.4 Learning Session Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Learning Session Flow                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐                                                            │
│  │ Start/Resume│                                                            │
│  │   Session   │                                                            │
│  └──────┬──────┘                                                            │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │                    For Each TopicGroup                       │           │
│  │  ┌─────────────────────────────────────────────────────┐    │           │
│  │  │              For Each SubTopic                      │    │           │
│  │  │  ┌───────────┐    ┌───────────┐    ┌───────────┐   │    │           │
│  │  │  │ EXPLAINING│───►│ Show      │───►│ CONFIRMING│   │    │           │
│  │  │  │           │    │ 5 Layers  │    │           │   │    │           │
│  │  │  └───────────┘    └───────────┘    └─────┬─────┘   │    │           │
│  │  │                                          │         │    │           │
│  │  │                                 Click "I Understand"    │           │
│  │  │                                          │         │    │           │
│  │  │                                          ▼         │    │           │
│  │  │                                   [Next SubTopic]  │    │           │
│  │  └─────────────────────────────────────────────────────┘    │           │
│  │                                                              │           │
│  │  All SubTopics confirmed                                     │           │
│  │         │                                                    │           │
│  │         ▼                                                    │           │
│  │  ┌───────────┐    ┌───────────┐    ┌───────────┐            │           │
│  │  │  TESTING  │───►│ Show Test │───►│  Submit   │            │           │
│  │  │           │    │ Questions │    │  Answers  │            │           │
│  │  └───────────┘    └───────────┘    └─────┬─────┘            │           │
│  │                                          │                   │           │
│  │                   Test Complete (CORE: 2/3, SUPPORTING: 1/1) │           │
│  │                                          │                   │           │
│  │                                          ▼                   │           │
│  │                                   [Next TopicGroup]          │           │
│  └──────────────────────────────────────────────────────────────┘           │
│                                                                             │
│  All TopicGroups Complete                                                   │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────┐                                                            │
│  │  Session    │                                                            │
│  │  COMPLETED  │                                                            │
│  └─────────────┘                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.5 Test Pass Conditions

| Topic Type | Questions | Pass Condition |
| ---------- | --------- | -------------- |
| CORE       | 3         | ≥ 2 correct    |
| SUPPORTING | 1         | 1 correct      |

**Additional Rules:**

- Single question skip: After 3 wrong attempts, can skip (counts as wrong)
- Weak point marking: ≥ 3 wrong answers in a TopicGroup

---

## 8. Authentication & Security

### 8.1 Authentication Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │    │  Next.js    │    │  Supabase   │    │  Database   │
│             │    │  API        │    │  Auth       │    │             │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │                  │
       │  Login Request   │                  │                  │
       │─────────────────►│                  │                  │
       │                  │  Validate        │                  │
       │                  │─────────────────►│                  │
       │                  │                  │  Create Session  │
       │                  │                  │─────────────────►│
       │                  │  Session Token   │                  │
       │                  │◄─────────────────│                  │
       │  Set httpOnly    │                  │                  │
       │  Cookie          │                  │                  │
       │◄─────────────────│                  │                  │
       │                  │                  │                  │
```

### 8.2 Security Measures

| Measure          | Implementation                                                |
| ---------------- | ------------------------------------------------------------- |
| Password Hashing | bcrypt with salt                                              |
| Session Storage  | httpOnly cookies (7 days default, 30 days with "remember me") |
| CSRF Protection  | Token-based validation on all mutations                       |
| Rate Limiting    | Auth: 10 req/15min, API: 100 req/min, AI: 20 req/min          |
| Input Validation | Zod schemas on all endpoints                                  |
| SQL Injection    | Prisma parameterized queries                                  |
| XSS Prevention   | React auto-escaping + Content Security Policy                 |
| Account Lockout  | 5 failed attempts → 30 min lock                               |

### 8.3 Rate Limiting Strategy

```typescript
// Rate limiters configuration
const rateLimiters = {
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 10 },
  api: { windowMs: 60 * 1000, maxRequests: 100 },
  ai: { windowMs: 60 * 1000, maxRequests: 20 },
}
```

**Production Note:** Current in-memory rate limiting must be migrated to Upstash Redis for serverless compatibility.

---

## 9. State Management

### 9.1 State Categories

| State Type   | Tool                 | Use Cases                           |
| ------------ | -------------------- | ----------------------------------- |
| Server State | TanStack Query       | Courses, files, sessions, user data |
| Client State | Zustand              | UI state, learning view preferences |
| Form State   | React Hook Form      | All forms with validation           |
| URL State    | Next.js searchParams | Topic index, filters, pagination    |

### 9.2 TanStack Query Configuration

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

### 9.3 Key Hooks

```typescript
// Server state hooks
useUser() // Current user data
useCourses() // Course list with mutations
useFiles(courseId) // File list with upload mutations
useLearningSession(id) // Session state with actions
useQuota() // Quota status

// Client state (Zustand)
interface LearningStore {
  currentLayer: ExplanationLayer
  isStreaming: boolean
  streamContent: string
  testMode: boolean
  // ...
}
```

---

## 10. Background Jobs

### 10.1 Trigger.dev Jobs

| Job                     | Trigger               | Timeout | Purpose                              |
| ----------------------- | --------------------- | ------- | ------------------------------------ |
| `extract-pdf-structure` | File upload confirmed | 5 min   | Extract knowledge structure + images |
| `quota-reset`           | Daily cron            | 1 min   | Reset monthly quotas                 |

### 10.2 Structure Extraction Job Flow

```typescript
export const extractPdfStructure = task({
  id: 'extract-pdf-structure',
  run: async (payload: { fileId: string }) => {
    // 1. Update status to PROCESSING
    // 2. Download PDF from Supabase Storage
    // 3. Extract images (PyMuPDF) → Upload to R2
    // 4. Extract text content
    // 5. Batch AI analysis (120 pages/batch)
    // 6. Create TopicGroup + SubTopic records
    // 7. Update status to READY
  },
})
```

### 10.3 Error Handling

- **Timeout:** After 5 minutes, mark as FAILED
- **Retry:** Manual retry only (from head)
- **Error Storage:** `structure_error` field stores error message

---

## 11. Integration Points

### 11.1 Supabase Integration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Supabase                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │      Auth       │  │     Storage     │  │    Database     │            │
│  │                 │  │                 │  │  (via Prisma)   │            │
│  │  - Login/Logout │  │  - PDF uploads  │  │                 │            │
│  │  - Sessions     │  │  - Signed URLs  │  │  - All tables   │            │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.2 AI Services

```typescript
// OpenRouter client configuration
const aiClient = {
  baseURL: 'https://openrouter.ai/api/v1',
  model: 'anthropic/claude-3.5-sonnet',
  maxTokens: 4096,
}

// Mathpix client configuration
const mathpixClient = {
  baseURL: 'https://api.mathpix.com/v3',
  formats: ['latex_simplified'],
  costPerRequest: 0.004, // USD
}
```

### 11.3 Cloudflare R2

```typescript
// Image storage paths
const imagePath = `images/${fileId}/${pageNumber}_${imageIndex}.png`

// Signed URL generation (1 hour expiry)
const signedUrl = await r2Client.getSignedUrl(imagePath, { expiresIn: 3600 })
```

---

## 12. Performance Considerations

### 12.1 Optimization Strategies

| Area            | Strategy                     | Target          |
| --------------- | ---------------------------- | --------------- |
| AI Explanations | SSE streaming                | First byte < 2s |
| PDF Loading     | Lazy loading + pagination    | < 1s per page   |
| Image Loading   | Lazy loading + signed URLs   | < 500ms         |
| Database        | Indexed queries + pagination | < 100ms         |
| Static Assets   | CDN + caching                | Cache hit > 95% |

### 12.2 Caching Strategy

```typescript
// Query cache times
const cacheTimes = {
  user: Infinity, // Until mutation
  courses: 5 * 60 * 1000, // 5 minutes
  files: 5 * 60 * 1000, // 5 minutes
  session: Infinity, // Until mutation
  quota: 60 * 1000, // 1 minute
}
```

### 12.3 Database Optimization

- **Batch Processing:** PDF structure extraction in 120-page batches
- **Eager Loading:** Session queries include progress relations
- **Pagination:** Cursor-based for large lists
- **Aggregation:** Admin stats use raw SQL for efficiency

---

## 13. Deployment Strategy

### 13.1 Infrastructure

| Service         | Platform         | Purpose          |
| --------------- | ---------------- | ---------------- |
| Frontend + API  | Vercel           | Next.js hosting  |
| Database        | Supabase         | PostgreSQL       |
| File Storage    | Supabase Storage | PDF files        |
| Image Storage   | Cloudflare R2    | Extracted images |
| Background Jobs | Trigger.dev      | Async processing |
| Monitoring      | Sentry           | Error tracking   |

### 13.2 Environment Variables

```bash
# Database
DATABASE_URL=
DIRECT_URL=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Services
OPENROUTER_API_KEY=
MATHPIX_APP_ID=
MATHPIX_APP_KEY=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# Trigger.dev
TRIGGER_API_KEY=
TRIGGER_API_URL=

# Admin
SUPER_ADMIN_EMAIL=
SUPER_ADMIN_PASSWORD_HASH=
```

### 13.3 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm test
      - run: pnpm lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm prisma migrate deploy
      - uses: vercel/actions/deploy@v1
```

---

## 14. Implementation Phases

### Phase Overview

| Phase | Focus                | Tasks | Duration  |
| ----- | -------------------- | ----- | --------- |
| 0     | Foundation           | 8     | 1 week    |
| 1     | Authentication       | 15    | 1 week    |
| 2     | Course Management    | 9     | 0.5 week  |
| 3     | File Management      | 14    | 1 week    |
| 4     | AI Interactive Tutor | 27    | 2-3 weeks |
| 5     | Quota Management     | 7     | 0.5 week  |
| 6     | User Settings        | 5     | 0.5 week  |
| 7     | Admin Dashboard      | 19    | 1 week    |
| 8     | PDF Reader           | 4     | 0.5 week  |
| 9     | Testing              | 7     | 1 week    |
| 10    | Deployment           | 4     | 0.5 week  |

### Critical Path

```
FND-001 → AUTH-001 → CRS-001 → FILE-001 → TUTOR-001 → DEPLOY-001
   │         │          │          │           │
   └─────────┴──────────┴──────────┴───────────┘
                    Sequential Dependencies
```

### Parallel Development Opportunities

- **User Settings (Phase 6)** can run parallel with **Phase 4**
- **Admin Dashboard (Phase 7)** can run parallel with **Phase 4-5**
- **Testing (Phase 9)** can start after each phase completion

---

## Appendix A: TypeScript Type Definitions

See [src/types/database.ts](../src/types/database.ts) for complete type definitions.

## Appendix B: Prisma Schema

See [prisma/schema.prisma](../prisma/schema.prisma) for complete database schema.

## Appendix C: Task Breakdown

See [docs/task.md](task.md) for detailed implementation tasks.

---

_Document maintained by the Luma Web development team._
