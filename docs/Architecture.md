# Luma Web - System Architecture Document

> **Version**: 1.0
> **Last Updated**: 2026-02-01
> **Status**: Final

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Component Architecture](#2-component-architecture)
3. [Data Architecture](#3-data-architecture)
4. [Integration Architecture](#4-integration-architecture)
5. [Security Architecture](#5-security-architecture)
6. [Deployment Architecture](#6-deployment-architecture)
7. [Key Design Decisions](#7-key-design-decisions)

---

## 1. System Overview

### 1.1 Executive Summary

Luma Web is an AI-powered learning management system designed for university students. The platform leverages Claude AI with custom Skills to deliver interactive, personalized tutoring experiences based on uploaded PDF courseware.

### 1.2 High-Level Architecture Diagram

```
+==============================================================================+
|                                                                              |
|                              LUMA WEB SYSTEM                                 |
|                                                                              |
+==============================================================================+

                                  +---------------+
                                  |    Users      |
                                  | (Students/    |
                                  |  Admins)      |
                                  +-------+-------+
                                          |
                                          | HTTPS
                                          v
+------------------------------------------------------------------------------+
|                              CLIENT LAYER                                     |
|  +------------------------------------------------------------------------+  |
|  |                        Browser (React 18)                              |  |
|  |  +------------------+  +------------------+  +----------------------+  |  |
|  |  | TanStack Query   |  |     Zustand      |  | React Hook Form      |  |  |
|  |  | (Server State)   |  | (Client State)   |  | + Zod (Validation)   |  |  |
|  |  +------------------+  +------------------+  +----------------------+  |  |
|  |  +------------------+  +------------------+  +----------------------+  |  |
|  |  | shadcn/ui        |  |   react-pdf      |  |      KaTeX           |  |  |
|  |  | + Radix UI       |  | (PDF Viewer)     |  | (LaTeX Rendering)    |  |  |
|  |  +------------------+  +------------------+  +----------------------+  |  |
|  +------------------------------------------------------------------------+  |
+------------------------------------------------------------------------------+
                                          |
                                          | HTTP/SSE
                                          v
+------------------------------------------------------------------------------+
|                           APPLICATION LAYER                                   |
|  +------------------------------------------------------------------------+  |
|  |                     Next.js 14+ (App Router)                           |  |
|  |  +-------------------+  +-------------------+  +--------------------+  |  |
|  |  | Server Components |  |    API Routes     |  |    Middleware      |  |  |
|  |  | (RSC)             |  |    /api/*         |  | (Auth/CSRF/Rate)   |  |  |
|  |  +-------------------+  +-------------------+  +--------------------+  |  |
|  |  +-------------------+  +-------------------+  +--------------------+  |  |
|  |  | Business Logic    |  |   Prisma ORM      |  | AI Service Layer   |  |  |
|  |  | Services          |  |   (DB Access)     |  | (Claude Client)    |  |  |
|  |  +-------------------+  +-------------------+  +--------------------+  |  |
|  +------------------------------------------------------------------------+  |
+------------------------------------------------------------------------------+
          |                         |                         |
          v                         v                         v
+-----------------+     +-----------------------+     +---------------------+
|   DATA LAYER    |     |   EXTERNAL SERVICES   |     |  BACKGROUND JOBS    |
|  +-----------+  |     |  +-----------------+  |     |  +---------------+  |
|  | PostgreSQL|  |     |  |   Claude API    |  |     |  | Trigger.dev  |  |
|  | (Supabase)|  |     |  |   + Skills      |  |     |  | v3 Runtime   |  |
|  +-----------+  |     |  |   + File API    |  |     |  +---------------+  |
|  +-----------+  |     |  +-----------------+  |     |  | extract-pdf  |  |
|  | Supabase  |  |     |  +-----------------+  |     |  | quota-reset  |  |
|  | Storage   |  |     |  |  Supabase Auth  |  |     |  +---------------+  |
|  +-----------+  |     |  +-----------------+  |     +---------------------+
+-----------------+     +-----------------------+
```

### 1.3 System Characteristics

| Attribute       | Target                                    |
|-----------------|-------------------------------------------|
| Scalability     | 10,000+ concurrent users                  |
| Availability    | 99.9% uptime                              |
| Performance     | AI first byte < 2s (SSE streaming)        |
| Security        | OWASP Top 10 compliance                   |
| Maintainability | 80%+ test coverage for core modules       |

### 1.4 Request Flow

```
+--------+     +----------+     +------------+     +----------+     +--------+
| Client | --> | Next.js  | --> | Middleware | --> | Business | --> |  Data  |
|        |     | Router   |     | Stack      |     | Logic    |     | Layer  |
+--------+     +----------+     +------------+     +----------+     +--------+
                                      |                  |
                                      |                  +------> AI Service
                                      |                  |        (Async/SSE)
                                      v                  |
                               +------------+            +------> Background
                               | Auth Check |                     Job (Async)
                               | CSRF Valid |
                               | Rate Limit |
                               +------------+
```

---

## 2. Component Architecture

### 2.1 Layer Overview

```
+==============================================================================+
|                           COMPONENT LAYERS                                    |
+==============================================================================+

Layer 1: CLIENT LAYER
+------------------------------------------------------------------------------+
|  Presentation    |  State Management  |  Form Handling  |  Specialized       |
|  - React 18      |  - TanStack Query  |  - RHF + Zod    |  - react-pdf       |
|  - Tailwind CSS  |  - Zustand         |                 |  - KaTeX           |
|  - shadcn/ui     |                    |                 |  - Recharts        |
+------------------------------------------------------------------------------+

Layer 2: APPLICATION LAYER
+------------------------------------------------------------------------------+
|  Routing         |  API Endpoints     |  Middleware     |  Services          |
|  - App Router    |  - REST APIs       |  - Auth         |  - AI Service      |
|  - Route Groups  |  - SSE Streams     |  - CSRF         |  - File Service    |
|  - Layouts       |                    |  - Rate Limit   |  - Quota Service   |
+------------------------------------------------------------------------------+

Layer 3: DATA LAYER
+------------------------------------------------------------------------------+
|  Primary Storage    |  File Storage       |  Caching                         |
|  - PostgreSQL       |  - Supabase Storage |  - SubTopicCache (DB)            |
|  - Prisma ORM       |  - Claude File API  |  - TanStack Query Cache          |
+------------------------------------------------------------------------------+

Layer 4: EXTERNAL SERVICES
+------------------------------------------------------------------------------+
|  AI Services        |  Authentication     |  Background Processing           |
|  - Claude API       |  - Supabase Auth    |  - Trigger.dev                   |
|  - Claude Skills    |                     |                                  |
|  - Claude File API  |                     |                                  |
+------------------------------------------------------------------------------+
```

### 2.2 Client Layer Components

```
+==============================================================================+
|                         CLIENT LAYER DETAIL                                   |
+==============================================================================+

src/components/
+-----------------------------------------------------------------------+
|  ui/              Base UI Components (shadcn/ui)                       |
|  +- Button, Card, Dialog, Input, Select, Tabs, Toast, etc.            |
+-----------------------------------------------------------------------+
|  auth/            Authentication Components                            |
|  +- LoginForm, RegisterForm, ResetPasswordForm, VerifyEmail           |
+-----------------------------------------------------------------------+
|  course/          Course Management Components                         |
|  +- CourseCard, CourseList, CourseForm, CourseDeleteDialog            |
+-----------------------------------------------------------------------+
|  file/            File Management Components                           |
|  +- FileCard, FileList, FileUploader, FilePreviewModal                |
+-----------------------------------------------------------------------+
|  reader/          PDF Reader Components                                |
|  +- PDFViewer, PageNavigator, ZoomControls, SearchPanel               |
+-----------------------------------------------------------------------+
|  learn/           AI Tutor Components                                  |
|  +- LearningSession, ExplanationPanel, QuizUI, QAPanel,               |
|  +- ProgressTracker, TopicNavigator, SubTopicCard                     |
+-----------------------------------------------------------------------+
|  admin/           Admin Dashboard Components                           |
|  +- StatsCards, UserTable, CostChart, WorkerStatus                    |
+-----------------------------------------------------------------------+

src/hooks/
+-----------------------------------------------------------------------+
|  use-user.ts              Current user data and mutations              |
|  use-courses.ts           Course CRUD operations                       |
|  use-files.ts             File operations with upload                  |
|  use-learning-session.ts  Session state and actions                    |
|  use-quota.ts             Quota status and alerts                      |
|  use-preferences.ts       User preference management                   |
|  use-sse.ts               Server-Sent Events handling                  |
+-----------------------------------------------------------------------+

src/stores/
+-----------------------------------------------------------------------+
|  reader-store.ts          PDF viewer state (zoom, page, scroll)        |
|  learning-store.ts        Learning UI state (streaming, mode)          |
+-----------------------------------------------------------------------+
```

### 2.3 Application Layer Components

```
+==============================================================================+
|                       APPLICATION LAYER DETAIL                                |
+==============================================================================+

src/app/ (Next.js App Router)
+-----------------------------------------------------------------------+
|  (auth)/                  Authentication Route Group                   |
|  +- login/                Login page                                   |
|  +- register/             Registration page                            |
|  +- forgot-password/      Password reset request                       |
|  +- reset-password/       Password reset confirmation                  |
+-----------------------------------------------------------------------+
|  (main)/                  Main Application Route Group                 |
|  +- courses/              Course list page                             |
|  +- files/[courseId]/     File list for a course                       |
|  +- reader/[fileId]/      PDF reader page                              |
|  +- learn/[sessionId]/    AI tutoring session page                     |
|  +- settings/             User settings page                           |
+-----------------------------------------------------------------------+
|  (admin)/                 Admin Route Group                            |
|  +- admin/                Admin dashboard                              |
|  +- admin/login/          Admin login                                  |
|  +- admin/users/          User management                              |
|  +- admin/cost/           Cost monitoring                              |
+-----------------------------------------------------------------------+
|  api/                     API Routes                                   |
|  +- auth/*                Authentication endpoints                     |
|  +- courses/*             Course CRUD                                  |
|  +- files/*               File management                              |
|  +- learn/*               AI tutor endpoints (SSE)                     |
|  +- quota/*               Quota status                                 |
|  +- preferences/*         User preferences                             |
|  +- admin/*               Admin endpoints                              |
|  +- webhooks/*            External webhooks                            |
+-----------------------------------------------------------------------+

src/lib/
+-----------------------------------------------------------------------+
|  ai/                                                                   |
|  +- claude.ts             Claude API client configuration              |
|  +- skill.ts              Skill management utilities                   |
|  +- prompts/              Prompt templates for AI features             |
+-----------------------------------------------------------------------+
|  supabase/                                                             |
|  +- client.ts             Browser Supabase client                      |
|  +- server.ts             Server-side Supabase client                  |
+-----------------------------------------------------------------------+
|  middleware/                                                           |
|  +- auth.ts               Authentication checks                        |
|  +- csrf.ts               CSRF token validation                        |
|  +- rate-limit.ts         Rate limiting logic                          |
+-----------------------------------------------------------------------+
|  Core Utilities                                                        |
|  +- prisma.ts             Prisma client singleton                      |
|  +- storage.ts            File storage helpers                         |
|  +- utils.ts              General utilities                            |
|  +- constants.ts          Application constants                        |
+-----------------------------------------------------------------------+
```

### 2.4 Background Jobs Architecture

```
+==============================================================================+
|                        TRIGGER.DEV JOBS                                       |
+==============================================================================+

trigger/
+-----------------------------------------------------------------------+
|  client.ts                Trigger.dev client configuration             |
+-----------------------------------------------------------------------+
|  jobs/                                                                 |
|  +- extract-structure.ts                                               |
|  |   Purpose: Extract knowledge structure from PDF                     |
|  |   Trigger: File upload confirmation                                 |
|  |   Timeout: 5 minutes                                                |
|  |   Flow:                                                             |
|  |     1. Update file status to PROCESSING                             |
|  |     2. Download PDF from Supabase Storage                           |
|  |     3. Upload to Claude File API                                    |
|  |     4. Analyze structure via Claude API                             |
|  |     5. Create TopicGroup + SubTopic records                         |
|  |     6. Update status to READY or FAILED                             |
|  +---------------------------------------------------------------------+
|  +- quota-reset.ts                                                     |
|  |   Purpose: Reset monthly quotas                                     |
|  |   Trigger: Daily cron job                                           |
|  |   Timeout: 1 minute                                                 |
|  |   Flow:                                                             |
|  |     1. Query users with reset_at <= now                             |
|  |     2. Reset quota counters                                         |
|  |     3. Update reset_at to next month                                |
+-----------------------------------------------------------------------+
```

---

## 3. Data Architecture

### 3.1 Database Schema Overview

```
+==============================================================================+
|                         DATABASE SCHEMA                                       |
+==============================================================================+

+------------------+     +------------------+     +------------------+
|      users       |     |  verification    |     |     quotas       |
+------------------+     |    _tokens       |     +------------------+
| id (PK)          |<-+  +------------------+  +->| id (PK)          |
| email            |  |  | id (PK)          |  |  | user_id (FK)     |
| password_hash    |  +--| user_id (FK)     |  |  | ai_interactions  |
| email_verified   |     | token            |  |  | reset_at         |
| role             |     | type             |  |  +------------------+
| created_at       |     | expires_at       |  |
+--------+---------+     +------------------+  |  +------------------+
         |                                     |  |   quota_logs     |
         | 1:N                                 |  +------------------+
         v                                     +--| id (PK)          |
+------------------+                              | user_id (FK)     |
|     courses      |                              | change_amount    |
+------------------+                              | reason           |
| id (PK)          |                              +------------------+
| user_id (FK)     |
| name             |                           +------------------+
| school           |                           |  ai_usage_logs   |
| term             |                           +------------------+
| created_at       |                           | id (PK)          |
+--------+---------+                           | user_id (FK)     |
         |                                     | feature_type     |
         | 1:N                                 | tokens_used      |
         v                                     | created_at       |
+------------------+                           +------------------+
|      files       |
+------------------+                           +------------------+
| id (PK)          |                           |      admins      |
| course_id (FK)   |                           +------------------+
| name             |                           | id (PK)          |
| storage_path     |                           | email            |
| claude_file_id   |                           | password_hash    |
| status           |                           | role             |
| structure_status |                           | is_active        |
| is_scanned       |                           +------------------+
| page_count       |
| file_size        |                           +------------------+
+--------+---------+                           | user_preferences |
         |                                     +------------------+
         | 1:N                                 | id (PK)          |
         v                                     | user_id (FK)     |
+------------------+                           | ui_locale        |
|   topic_groups   |                           | explain_locale   |
+------------------+                           +------------------+
| id (PK)          |
| file_id (FK)     |
| index            |
| title            |
| type             |
| page_start       |
| page_end         |
+--------+---------+
         |
         | 1:N
         v
+------------------+     +------------------+
|    sub_topics    |---->| sub_topic_cache  |
+------------------+     +------------------+
| id (PK)          |     | id (PK)          |
| topic_id (FK)    |     | sub_topic_id(FK) |
| index            |     | explanation      |
| title            |     | quiz_json        |
| summary          |     | created_at       |
| keywords         |     +------------------+
| page_start       |
| page_end         |     +------------------+
+--------+---------+     |   qa_messages    |
         |               +------------------+
         +-------------->| id (PK)          |
                         | session_id (FK)  |
                         | sub_topic_id(FK) |
+------------------+     | role             |
| learning_sessions|     | content          |
+------------------+     | created_at       |
| id (PK)          |     +------------------+
| user_id (FK)     |
| file_id (FK)     |
| container_id     |
| status           |
| current_topic_idx|
| current_sub_idx  |
| created_at       |
+--------+---------+
         |
         | 1:N
         v
+------------------+
|subtopic_progress |
+------------------+
| id (PK)          |
| session_id (FK)  |
| sub_topic_id(FK) |
| status           |
| wrong_count      |
| completed_at     |
+------------------+
```

### 3.2 Entity Relationships Summary

```
+==============================================================================+
|                       ENTITY RELATIONSHIPS                                    |
+==============================================================================+

User Domain:
  User 1:N Course
  User 1:N LearningSession
  User 1:N Quota
  User 1:1 UserPreference
  User 1:N VerificationToken
  User 1:N QuotaLog
  User 1:N AIUsageLog

Content Domain:
  Course 1:N File
  File 1:N TopicGroup
  TopicGroup 1:N SubTopic
  SubTopic 1:1 SubTopicCache
  SubTopic 1:N QAMessage

Learning Domain:
  LearningSession N:1 User
  LearningSession N:1 File
  LearningSession 1:N SubTopicProgress
  LearningSession 1:N QAMessage
  SubTopicProgress N:1 SubTopic

Admin Domain:
  Admin (Independent - no foreign keys to User)
```

### 3.3 Data Flow Diagram

```
+==============================================================================+
|                           DATA FLOW                                           |
+==============================================================================+

[PDF Upload Flow]
+--------+     +----------+     +----------+     +-----------+     +--------+
| Client |---->| API      |---->| Supabase |---->| Trigger   |---->| Claude |
| Upload |     | /files   |     | Storage  |     | Job       |     | File   |
+--------+     +----------+     +----------+     +-----------+     | API    |
                                                       |           +--------+
                                                       v
                                                 +----------+
                                                 | Database |
                                                 | (Topics) |
                                                 +----------+

[Learning Session Flow]
+--------+     +----------+     +----------+     +----------+     +--------+
| Client |---->| API      |---->| Check    |---->| Claude   |---->| Stream |
| Start  |     | /learn   |     | Cache    |     | API +    |     | SSE    |
+--------+     +----------+     +----------+     | Skill    |     +--------+
                                    |            +----------+         |
                                    v                 |               v
                              [Cache Hit]             v          +---------+
                                    |           +----------+     | Client  |
                                    +---------->| Save to  |     | Render  |
                                                | Cache    |     +---------+
                                                +----------+

[Quiz Flow]
+--------+     +----------+     +----------+
| Client |---->| Local    |---->| API      |
| Answer |     | Validate |     | /pass    |
+--------+     +----------+     | /fail    |
                    |           +----------+
                    |                |
              [Correct]              v
                    |           +----------+
                    +---------->| Update   |
                                | Progress |
                                +----------+
```

### 3.4 Key Database Indexes

| Table               | Index                           | Purpose                          |
|---------------------|---------------------------------|----------------------------------|
| users               | idx_users_email                 | Fast email lookup for auth       |
| courses             | idx_courses_user_created        | User's course list (sorted)      |
| files               | idx_files_course_created        | Course's file list (sorted)      |
| files               | idx_files_status                | Processing status queries        |
| files               | idx_files_structure_status      | Structure extraction status      |
| learning_sessions   | idx_sessions_user_file (unique) | One session per user per file    |
| learning_sessions   | idx_sessions_container          | Container lookup                 |
| sub_topic_progress  | idx_progress_session            | Session progress queries         |
| sub_topic_cache     | idx_cache_sub_topic             | Cache lookup                     |
| qa_messages         | idx_qa_session_sub              | Q&A history retrieval            |
| quotas              | idx_quotas_reset                | Monthly reset job                |
| ai_usage_logs       | idx_usage_user_created          | Usage history queries            |

### 3.5 Cascade Delete Strategy

```
User DELETE
  |
  +---> Course DELETE
  |       |
  |       +---> File DELETE
  |               |
  |               +---> TopicGroup DELETE
  |               |       |
  |               |       +---> SubTopic DELETE
  |               |               |
  |               |               +---> SubTopicCache DELETE
  |               |               +---> QAMessage DELETE
  |               |
  |               +---> LearningSession DELETE
  |                       |
  |                       +---> SubTopicProgress DELETE
  |                       +---> QAMessage DELETE
  |
  +---> Quota DELETE
  +---> QuotaLog DELETE
  +---> AIUsageLog DELETE
  +---> VerificationToken DELETE
  +---> UserPreference DELETE
```

---

## 4. Integration Architecture

### 4.1 Integration Overview

```
+==============================================================================+
|                       EXTERNAL INTEGRATIONS                                   |
+==============================================================================+

+-------------------+       +-------------------+       +-------------------+
|    Claude API     |       |     Supabase      |       |   Trigger.dev     |
+-------------------+       +-------------------+       +-------------------+
| - Messages API    |       | - Auth            |       | - Job Scheduling  |
| - Skills API      |       | - Storage         |       | - Background Exec |
| - File API        |       | - Database (conn) |       | - Cron Jobs       |
+-------------------+       +-------------------+       +-------------------+
         |                           |                           |
         v                           v                           v
+-----------------------------------------------------------------------+
|                          Next.js Application                          |
+-----------------------------------------------------------------------+
```

### 4.2 Claude API Integration

```
+==============================================================================+
|                      CLAUDE API ARCHITECTURE                                  |
+==============================================================================+

                         +----------------------------+
                         |       Claude API           |
                         +----------------------------+
                         |  Endpoint: api.anthropic   |
                         |  Model: claude-sonnet-4    |
                         +-------------+--------------+
                                       |
         +-----------------------------+-----------------------------+
         |                             |                             |
         v                             v                             v
+------------------+       +------------------+       +------------------+
|   Messages API   |       |    Skills API    |       |    File API      |
+------------------+       +------------------+       +------------------+
| - Streaming SSE  |       | - Custom Skills  |       | - PDF Upload     |
| - Multi-turn     |       | - courseware-    |       | - Native OCR     |
| - Container      |       |   tutor skill    |       | - File Reference |
|   Reuse          |       | - Code Execution |       |   in Messages    |
+------------------+       +------------------+       +------------------+

API Configuration:
+-----------------------------------------------------------------------+
| const response = await anthropic.beta.messages.create({               |
|   model: 'claude-sonnet-4-20250514',                                  |
|   max_tokens: 4096,                                                   |
|   betas: ['code-execution-2025-08-25',                                |
|           'skills-2025-10-02',                                        |
|           'files-api-2025-04-14'],                                    |
|   container: {                                                        |
|     skills: [{ type: 'custom',                                        |
|                skill_id: TUTOR_SKILL_ID,                              |
|                version: 'latest' }]                                   |
|   },                                                                  |
|   messages: [...]                                                     |
| });                                                                   |
+-----------------------------------------------------------------------+

Container Reuse Pattern:
+-----------------------------------------------------------------------+
| Session Start:                                                        |
|   - Create new container with skill                                   |
|   - Store container_id in learning_sessions table                     |
|                                                                       |
| Subsequent Calls:                                                     |
|   - Reuse container_id for context continuity                         |
|   - Container timeout: 30 minutes of inactivity                       |
|                                                                       |
| Container Expiry:                                                     |
|   - Create new container on next request                              |
|   - Update container_id in database                                   |
+-----------------------------------------------------------------------+
```

### 4.3 Supabase Integration

```
+==============================================================================+
|                      SUPABASE INTEGRATION                                     |
+==============================================================================+

+-----------------------------------------------------------------------+
|                           Supabase Services                           |
+-----------------------------------------------------------------------+

+-------------------+     +-------------------+     +-------------------+
|   Supabase Auth   |     | Supabase Storage  |     | Supabase Database |
+-------------------+     +-------------------+     +-------------------+
| - Email/Password  |     | - PDF File Store  |     | - PostgreSQL 15+  |
| - Session Mgmt    |     | - Signed URLs     |     | - Via Prisma ORM  |
| - JWT Tokens      |     | - 5GB per user    |     | - Direct + Pooled |
+-------------------+     +-------------------+     +-------------------+
         |                         |                         |
         v                         v                         v
+-----------------------------------------------------------------------+
|                      Application Integration                          |
+-----------------------------------------------------------------------+

Auth Flow:
+-----------------------------------------------------------------------+
| 1. Client submits credentials to /api/auth/login                      |
| 2. API validates via Supabase Auth                                    |
| 3. Supabase creates session, returns JWT                              |
| 4. API sets httpOnly cookie with session token                        |
| 5. Subsequent requests include cookie for auth                        |
+-----------------------------------------------------------------------+

Storage Flow:
+-----------------------------------------------------------------------+
| Upload:                                                               |
| 1. Client requests presigned URL from /api/files/upload-url           |
| 2. API generates signed URL via Supabase Storage                      |
| 3. Client uploads directly to Supabase                                |
| 4. Client confirms upload via /api/files/confirm                      |
|                                                                       |
| Download:                                                             |
| 1. Client requests download URL from /api/files/:id/download-url      |
| 2. API generates time-limited signed URL                              |
| 3. Client downloads directly from Supabase                            |
+-----------------------------------------------------------------------+

Database Access:
+-----------------------------------------------------------------------+
| - All database access via Prisma ORM (not Supabase client)            |
| - Two connection strings:                                             |
|   - DATABASE_URL: Pooled connection (for application queries)         |
|   - DIRECT_URL: Direct connection (for migrations)                    |
+-----------------------------------------------------------------------+
```

### 4.4 Trigger.dev Integration

```
+==============================================================================+
|                     TRIGGER.DEV INTEGRATION                                   |
+==============================================================================+

+-----------------------------------------------------------------------+
|                         Job Architecture                              |
+-----------------------------------------------------------------------+

+-------------------+                          +-------------------+
|   Next.js API     |  -- trigger.jobs.run --> |   Trigger.dev     |
|   (Job Trigger)   |                          |   Cloud Runtime   |
+-------------------+                          +-------------------+
                                                        |
                                                        v
                                               +-------------------+
                                               |   Job Execution   |
                                               | - extract-pdf     |
                                               | - quota-reset     |
                                               +-------------------+
                                                        |
                                                        v
                                               +-------------------+
                                               |  Result/Webhook   |
                                               +-------------------+

Job Definitions:
+-----------------------------------------------------------------------+
| extract-pdf-structure:                                                |
|   - Trigger: POST /api/files/confirm (after upload)                   |
|   - Payload: { fileId: string }                                       |
|   - Steps:                                                            |
|     1. Update file.structure_status = 'PROCESSING'                    |
|     2. Fetch PDF from Supabase Storage                                |
|     3. Upload to Claude File API                                      |
|     4. Store claude_file_id in files table                            |
|     5. Call Claude API for structure analysis                         |
|     6. Parse and store TopicGroups + SubTopics                        |
|     7. Update file.structure_status = 'READY' or 'FAILED'             |
|   - Timeout: 5 minutes                                                |
|   - Retry: Manual only                                                |
+-----------------------------------------------------------------------+
| quota-reset:                                                          |
|   - Trigger: Cron (daily at 00:00 UTC)                                |
|   - Steps:                                                            |
|     1. Query quotas WHERE reset_at <= NOW()                           |
|     2. Reset ai_interactions to 500                                   |
|     3. Set reset_at to next month same day                            |
|   - Timeout: 1 minute                                                 |
+-----------------------------------------------------------------------+
```

---

## 5. Security Architecture

### 5.1 Authentication Flow

```
+==============================================================================+
|                      AUTHENTICATION FLOW                                      |
+==============================================================================+

[Registration Flow]
+--------+     +----------+     +----------+     +----------+     +--------+
| Client |---->| API      |---->| Validate |---->| Supabase |---->| Send   |
| Submit |     | /register|     | + Hash   |     | Auth     |     | Email  |
+--------+     +----------+     +----------+     +----------+     +--------+
                                                                       |
                                                                       v
+--------+     +----------+     +----------+     +----------+     +--------+
| Active |<----| Update   |<----| Verify   |<----| Click    |<----| User   |
| Account|     | Status   |     | Token    |     | Link     |     | Email  |
+--------+     +----------+     +----------+     +----------+     +--------+

[Login Flow]
+--------+     +----------+     +----------+     +----------+     +--------+
| Client |---->| API      |---->| Supabase |---->| Validate |---->| Create |
| Submit |     | /login   |     | Auth     |     | Verified |     | Session|
+--------+     +----------+     +----------+     +----------+     +--------+
                                                                       |
                                                      +----------------+
                                                      v
                                               +-------------+
                                               | Set Cookie  |
                                               | (httpOnly)  |
                                               +-------------+

[Session Validation]
+--------+     +----------+     +----------+     +----------+     +--------+
| Request|---->| Middleware|---->| Extract  |---->| Supabase |---->| Allow/ |
| + Cookie     | Auth     |     | Token    |     | Validate |     | Deny   |
+--------+     +----------+     +----------+     +----------+     +--------+
```

### 5.2 Security Measures Matrix

| Security Measure     | Implementation                                       |
|----------------------|------------------------------------------------------|
| Password Storage     | bcrypt with salt (cost factor 12)                    |
| Session Management   | httpOnly cookies, 7-day expiry (30-day with "remember me") |
| CSRF Protection      | Token-based validation on all state-changing operations |
| Input Validation     | Zod schemas on all API endpoints                     |
| SQL Injection        | Prisma ORM with parameterized queries                |
| XSS Prevention       | React auto-escaping + Content Security Policy        |
| Account Lockout      | 5 failed attempts triggers 30-minute lock            |
| Email Verification   | Required before login (24-hour token expiry)         |

### 5.3 Rate Limiting Architecture

```
+==============================================================================+
|                       RATE LIMITING                                           |
+==============================================================================+

+-----------------------------------------------------------------------+
|                         Rate Limiter Configuration                    |
+-----------------------------------------------------------------------+

Endpoint Category     | Window    | Max Requests | Implementation
----------------------|-----------|--------------|----------------
Authentication        | 15 min    | 10           | Per IP
General API           | 1 min     | 100          | Per User
AI Endpoints          | 1 min     | 20           | Per User
Email (verification)  | 15 min    | 5            | Per User
Email (password reset)| 15 min    | 5            | Per User

+-----------------------------------------------------------------------+
|                         Implementation Flow                           |
+-----------------------------------------------------------------------+

+--------+     +----------+     +----------+     +----------+
| Request|---->| Rate     |---->| Check    |---->| Allow/   |
|        |     | Limiter  |     | Counter  |     | Reject   |
+--------+     +----------+     +----------+     +----------+
                    |                                  |
                    v                            [429 Error]
              +----------+                             |
              | Increment|                             v
              | Counter  |                    +----------------+
              +----------+                    | Retry-After    |
                                              | Header         |
                                              +----------------+

Note: Current in-memory implementation; migrate to Upstash Redis
      for production serverless compatibility.
```

### 5.4 Admin Authentication

```
+==============================================================================+
|                    ADMIN AUTHENTICATION                                       |
+==============================================================================+

+-----------------------------------------------------------------------+
| Admin accounts are completely separate from user accounts             |
| - Stored in 'admins' table (not 'users')                              |
| - Different login endpoint: /api/admin/login                          |
| - Different session mechanism                                         |
+-----------------------------------------------------------------------+

Admin Roles:
+-----------------------------------------------------------------------+
| SUPER_ADMIN:                                                          |
|   - Created via SUPER_ADMIN_EMAIL environment variable                |
|   - Can manage other admin accounts                                   |
|   - Full access to all admin features                                 |
|                                                                       |
| ADMIN:                                                                |
|   - Created by super admin                                            |
|   - Access to monitoring and user management                          |
|   - Cannot manage admin accounts                                      |
+-----------------------------------------------------------------------+
```

---

## 6. Deployment Architecture

### 6.1 Infrastructure Overview

```
+==============================================================================+
|                      DEPLOYMENT INFRASTRUCTURE                                |
+==============================================================================+

                              +------------------+
                              |    Cloudflare    |
                              |    (DNS/CDN)     |
                              +--------+---------+
                                       |
                                       v
+------------------------------------------------------------------------------+
|                              VERCEL                                           |
|  +------------------------------------------------------------------------+  |
|  |                        Edge Network                                    |  |
|  +------------------------------------------------------------------------+  |
|  |  +------------------------+  +------------------------------------+    |  |
|  |  | Static Assets (CDN)    |  | Serverless Functions               |    |  |
|  |  | - JS/CSS bundles       |  | - API Routes                       |    |  |
|  |  | - Images               |  | - Server Components                |    |  |
|  |  | - Fonts                |  | - Middleware                       |    |  |
|  |  +------------------------+  +------------------------------------+    |  |
|  +------------------------------------------------------------------------+  |
+------------------------------------------------------------------------------+
         |                    |                    |                    |
         v                    v                    v                    v
+-------------+     +----------------+     +-------------+     +-------------+
|  Supabase   |     |   Anthropic    |     | Trigger.dev |     |   Sentry    |
+-------------+     +----------------+     +-------------+     +-------------+
| - Postgres  |     | - Claude API   |     | - Job Runner|     | - Error     |
| - Auth      |     | - Skills       |     | - Cron      |     |   Tracking  |
| - Storage   |     | - File API     |     |             |     | - Perf      |
+-------------+     +----------------+     +-------------+     +-------------+
```

### 6.2 Environment Configuration

```
+==============================================================================+
|                      ENVIRONMENT VARIABLES                                    |
+==============================================================================+

# Database
DATABASE_URL=postgresql://...?pgbouncer=true
DIRECT_URL=postgresql://...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# AI Services
ANTHROPIC_API_KEY=sk-ant-...
TUTOR_SKILL_ID=skill_...

# Background Jobs
TRIGGER_API_KEY=tr_...
TRIGGER_API_URL=https://api.trigger.dev

# Admin
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_PASSWORD_HASH=$2b$...

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
```

### 6.3 CI/CD Pipeline

```
+==============================================================================+
|                         CI/CD PIPELINE                                        |
+==============================================================================+

+------------------+     +------------------+     +------------------+
|   Pull Request   |---->|   CI Workflow    |---->|   Merge to Main  |
+------------------+     +------------------+     +------------------+
                                |
                    +-----------+-----------+
                    |           |           |
                    v           v           v
              +----------+ +----------+ +----------+
              |  Lint    | |  Type    | |  Test    |
              |  Check   | |  Check   | |  Suite   |
              +----------+ +----------+ +----------+
                                |
                                v
                         +-------------+
                         | Build Check |
                         +-------------+

+------------------+     +------------------+     +------------------+
|   Merge to Main  |---->|   CD Workflow    |---->|   Production     |
+------------------+     +------------------+     +------------------+
                                |
                    +-----------+-----------+
                    |           |           |
                    v           v           v
              +----------+ +----------+ +----------+
              |  Build   | |  DB      | |  Deploy  |
              |  App     | |  Migrate | |  Vercel  |
              +----------+ +----------+ +----------+

GitHub Actions Workflow:
+-----------------------------------------------------------------------+
| name: Deploy                                                          |
| on:                                                                   |
|   push:                                                               |
|     branches: [main]                                                  |
|                                                                       |
| jobs:                                                                 |
|   test:                                                               |
|     runs-on: ubuntu-latest                                            |
|     steps:                                                            |
|       - uses: actions/checkout@v4                                     |
|       - run: pnpm install                                             |
|       - run: pnpm lint                                                |
|       - run: pnpm type-check                                          |
|       - run: pnpm test                                                |
|                                                                       |
|   deploy:                                                             |
|     needs: test                                                       |
|     runs-on: ubuntu-latest                                            |
|     steps:                                                            |
|       - uses: actions/checkout@v4                                     |
|       - run: pnpm prisma migrate deploy                               |
|       - uses: vercel/actions/deploy@v1                                |
+-----------------------------------------------------------------------+
```

### 6.4 Monitoring and Observability

```
+==============================================================================+
|                      MONITORING STACK                                         |
+==============================================================================+

+-----------------------------------------------------------------------+
|                           Sentry                                      |
+-----------------------------------------------------------------------+
| - Error Tracking (client + server)                                    |
| - Performance Monitoring                                              |
| - Release Tracking                                                    |
| - User Session Replay (optional)                                      |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
|                      Vercel Analytics                                 |
+-----------------------------------------------------------------------+
| - Core Web Vitals                                                     |
| - Route Performance                                                   |
| - Serverless Function Logs                                            |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
|                      Application Metrics                              |
+-----------------------------------------------------------------------+
| - AI API latency (logged to ai_usage_logs)                            |
| - Quota consumption rates                                             |
| - Background job success/failure rates                                |
| - Worker health status (via admin dashboard)                          |
+-----------------------------------------------------------------------+
```

---

## 7. Key Design Decisions

### 7.1 Technology Choices

| Decision                   | Choice                  | Rationale                                                                 |
|----------------------------|-------------------------|---------------------------------------------------------------------------|
| **Framework**              | Next.js 14+ App Router  | Server components for performance, unified full-stack development         |
| **Database**               | PostgreSQL via Supabase | Reliable, full-featured RDBMS with managed hosting                        |
| **ORM**                    | Prisma                  | Type-safe queries, excellent DX, migration management                     |
| **Authentication**         | Supabase Auth           | Built-in email/password, session management, integrates with storage      |
| **File Storage**           | Supabase Storage        | Direct integration with auth, signed URLs, cost-effective                 |
| **AI Provider**            | Claude API + Skills     | Advanced reasoning, custom skill support, native PDF analysis             |
| **Background Jobs**        | Trigger.dev v3          | Serverless-compatible, reliable execution, good monitoring                |
| **State Management**       | TanStack Query + Zustand| Separation of server/client state, optimal caching                        |
| **Styling**                | Tailwind CSS + shadcn   | Rapid development, accessible components, consistent design               |

### 7.2 Architectural Decisions

```
+==============================================================================+
|                      KEY ARCHITECTURAL DECISIONS                              |
+==============================================================================+

Decision 1: Two-Layer Knowledge Structure (TopicGroup -> SubTopic)
+-----------------------------------------------------------------------+
| Problem: How to organize PDF content for progressive learning?        |
| Solution: Two-level hierarchy with page ranges                        |
| Benefits:                                                             |
|   - Manageable chunk sizes for AI explanation                         |
|   - Clear progress tracking per SubTopic                              |
|   - Flexible quiz association                                         |
+-----------------------------------------------------------------------+

Decision 2: Teach-Then-Test Pattern
+-----------------------------------------------------------------------+
| Problem: How to ensure comprehension before progressing?              |
| Solution: Each SubTopic requires quiz pass before advancing           |
| Benefits:                                                             |
|   - Active learning reinforcement                                     |
|   - Identifies knowledge gaps immediately                             |
|   - Supports re-explanation when needed                               |
+-----------------------------------------------------------------------+

Decision 3: Content Caching (SubTopicCache)
+-----------------------------------------------------------------------+
| Problem: AI calls are expensive and slow                              |
| Solution: Cache explanation + quiz per SubTopic                       |
| Benefits:                                                             |
|   - First-time users get fresh content                                |
|   - Returning users get instant load                                  |
|   - Quota only consumed on first generation                           |
+-----------------------------------------------------------------------+

Decision 4: Container Reuse for Context
+-----------------------------------------------------------------------+
| Problem: Q&A needs awareness of current explanation                   |
| Solution: Reuse Claude container within learning session              |
| Benefits:                                                             |
|   - AI understands current teaching context                           |
|   - More relevant Q&A responses                                       |
|   - Reduced token usage (no context re-sending)                       |
+-----------------------------------------------------------------------+

Decision 5: Separate Admin Authentication
+-----------------------------------------------------------------------+
| Problem: Admin access security                                        |
| Solution: Completely separate admin accounts and sessions             |
| Benefits:                                                             |
|   - Privilege escalation prevention                                   |
|   - Independent session management                                    |
|   - Clear audit trail                                                 |
+-----------------------------------------------------------------------+

Decision 6: Frontend Quiz Validation
+-----------------------------------------------------------------------+
| Problem: How to handle quiz answer checking?                          |
| Solution: Correct answers in response, validate client-side           |
| Benefits:                                                             |
|   - No API call for answer checking                                   |
|   - Instant feedback                                                  |
|   - Reduced server load                                               |
| Trade-off: Answers visible in network tab (acceptable for learning)   |
+-----------------------------------------------------------------------+

Decision 7: Unified Quota System
+-----------------------------------------------------------------------+
| Problem: How to manage AI usage limits?                               |
| Solution: Single aiInteractions bucket (500/month)                    |
| Benefits:                                                             |
|   - Simple user mental model                                          |
|   - Easy tracking and enforcement                                     |
|   - Flexible usage across features                                    |
+-----------------------------------------------------------------------+
```

### 7.3 Trade-offs and Constraints

| Trade-off                           | Accepted Because                                             |
|-------------------------------------|--------------------------------------------------------------|
| In-memory rate limiting             | Simpler initial implementation; will migrate to Redis        |
| Single quota bucket                 | Simpler UX; detailed tracking via AIUsageLog for analytics   |
| Claude-only AI provider             | Best reasoning + skill support; can abstract later if needed |
| No real-time collaboration          | MVP scope; single-user learning model is sufficient          |
| Maximum 6 courses per user          | Resource management; expandable with subscription tiers      |
| 500-page PDF limit                  | Claude File API constraints; covers most courseware          |

### 7.4 Future Extensibility Points

```
+==============================================================================+
|                      EXTENSIBILITY POINTS                                     |
+==============================================================================+

1. Authentication
   Current: Email/password only
   Extension: OAuth providers (Google, GitHub), SSO, 2FA

2. Content Types
   Current: PDF (Lecture type only)
   Extension: Homework, Exam, Notes; PPT/Word support

3. Learning Modes
   Current: Single PDF teach-then-test
   Extension: Course-level learning, spaced repetition, adaptive difficulty

4. AI Providers
   Current: Claude only
   Extension: Abstract AI service layer for multi-provider support

5. Monetization
   Current: Fixed free quota
   Extension: Subscription tiers, pay-per-use, institutional licensing

6. Internationalization
   Current: en/zh for UI and explanations
   Extension: Additional languages, RTL support

7. Analytics
   Current: Basic admin dashboard
   Extension: Learning analytics, user insights, A/B testing framework
```

---

## Appendix A: Glossary

| Term               | Definition                                                        |
|--------------------|-------------------------------------------------------------------|
| TopicGroup         | Top-level knowledge unit extracted from PDF, contains SubTopics   |
| SubTopic           | Individual concept within a TopicGroup, unit of learning          |
| Learning Session   | User's progress through a single PDF file                         |
| Container          | Claude API session container for maintaining conversation context |
| Skill              | Custom Claude capability (courseware-tutor) for structured output |
| Quota              | Monthly limit on AI interactions (default: 500)                   |
| SSE                | Server-Sent Events, used for streaming AI responses               |

## Appendix B: References

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Claude API Documentation](https://docs.anthropic.com)
- [Trigger.dev Documentation](https://trigger.dev/docs)

---

*Document maintained by the Luma Web development team.*
