# Luma Web - Project Context for Claude

> AI-powered learning management system for university students

## Project Overview

Luma Web enables students to upload PDF courseware and receive AI-guided interactive tutoring with a "teach-then-test" learning model. The platform uses Claude AI with custom Skills to deliver personalized tutoring experiences.

## Tech Stack

### Core
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript 5.7+
- **Database**: PostgreSQL (Supabase) + Prisma ORM
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage (PDF files)
- **AI**: Claude API + Skills API + File API
- **Background Jobs**: Trigger.dev v3

### Frontend
- React 18, Tailwind CSS, shadcn/ui + Radix UI
- TanStack Query (server state), Zustand (client state)
- React Hook Form + Zod (forms/validation)
- react-pdf (PDF viewer), KaTeX (LaTeX rendering)

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (admin)/           # Admin route group
│   ├── (auth)/            # Auth route group (login, register, etc.)
│   ├── (main)/            # Main app (courses, files, reader, learn, settings)
│   └── api/               # API routes
├── components/
│   ├── ui/                # Base UI components (shadcn/ui)
│   ├── auth/              # Auth components
│   ├── course/            # Course components
│   ├── file/              # File components
│   ├── reader/            # PDF reader components
│   ├── learn/             # AI tutor components
│   └── admin/             # Admin components
├── hooks/                 # React hooks (use-user, use-courses, etc.)
├── stores/                # Zustand stores
├── lib/
│   ├── ai/                # Claude API client + skill management
│   ├── supabase/          # Supabase clients
│   └── middleware/        # Auth, CSRF, rate limiting
└── types/                 # TypeScript types

trigger/                   # Trigger.dev background jobs
├── jobs/
│   ├── extract-structure.ts  # PDF knowledge extraction
│   └── quota-reset.ts        # Monthly quota reset
└── client.ts
```

## Key Entity Relationships

```
User 1:N Course 1:N File 1:N TopicGroup 1:N SubTopic
User 1:N LearningSession 1:N SubTopicProgress
SubTopic 1:1 SubTopicCache (explanation + quiz cache)
SubTopic 1:N QAMessage (Q&A records)
User 1:N Quota, UserPreference, VerificationToken, QuotaLog, AIUsageLog
Admin (separate account system)
```

## Core Feature: AI Interactive Tutor

### Knowledge Structure (Two Layers)
1. **TopicGroup** - Top-level knowledge unit with page range
2. **SubTopic** - Individual concept, unit of learning

### Learning Flow (Teach-Then-Test)
1. Check cache for SubTopic explanation + quiz
2. If cache miss: Call Claude API with `courseware-tutor` Skill (SSE streaming)
3. Save to `SubTopicCache` for future access
4. Display explanation with quiz below
5. Quiz: 4 options, 2-3 correct answers, frontend local validation
6. Pass: advance to next SubTopic | Fail: show explanation, retry (max 3)
7. After 3 fails: "Re-explain" (costs quota, updates cache) or "Skip"

### Q&A Feature
- Right sidebar, shares Claude container context with current explanation
- Each SubTopic has independent Q&A history
- Max 20 Q&A messages per SubTopic

## Business Rules

### Limits
- Courses: max 6 per user
- Files: max 30 per course, ≤500MB, ≤500 pages per file
- Storage: 5GB per user
- Quota: 500 AI interactions/month

### Quota Consumption
- First SubTopic explanation: 1 quota (cache hit = free)
- Re-explain: 1 quota
- Q&A: 1 quota per message

### File Processing States
```
uploading → processing → ready/failed
structure_status: PENDING → PROCESSING → READY/FAILED
```

## API Patterns

### Response Format
```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, error: { code: string, message: string } }
```

### Key Endpoints
- `POST /api/files/:id/learn/start` - Start/resume learning session
- `POST /api/learn/sessions/:id/explain` - Get explanation + quiz (SSE)
- `POST /api/learn/sessions/:id/pass` - Mark SubTopic passed
- `POST /api/learn/sessions/:id/relearn` - Re-explain (updates cache)
- `POST /api/learn/sessions/:id/qa/:subId` - Q&A message (SSE)

## Claude API Integration

```typescript
// Skill-based tutoring request
const response = await anthropic.beta.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 4096,
  betas: ['code-execution-2025-08-25', 'skills-2025-10-02', 'files-api-2025-04-14'],
  container: {
    skills: [{ type: 'custom', skill_id: TUTOR_SKILL_ID, version: 'latest' }],
  },
  messages: [...],
})

// Container reuse for session continuity (Q&A context awareness)
const followUp = await anthropic.beta.messages.create({
  container: { id: response.container.id, skills: [...] },
  messages: [...],
})
```

## Security Measures

- Password: bcrypt with salt
- Session: httpOnly cookies (7 days, 30 days with "remember me")
- CSRF: Token validation on all mutations
- Rate Limiting: Auth 10/15min, API 100/min, AI 20/min
- Account Lockout: 5 failed attempts → 30 min lock
- Admin: Separate account system and login endpoint

## Important Conventions

1. **API Responses**: Always use the standard success/error format
2. **Database Access**: Always use Prisma ORM, never raw SQL except admin stats
3. **State Management**: TanStack Query for server state, Zustand for UI state only
4. **Forms**: React Hook Form + Zod for all forms
5. **Styling**: Tailwind CSS + shadcn/ui components
6. **i18n**: Support en/zh for UI and AI explanations (UserPreference)
7. **Streaming**: Use SSE for AI responses (first byte < 2s target)
8. **Caching**: SubTopicCache for explanations, TanStack Query for API responses

## Environment Variables

```bash
# Database
DATABASE_URL=           # Pooled connection
DIRECT_URL=             # Direct connection (migrations)

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
```

## Development Commands

```bash
pnpm dev          # Start development server
pnpm build        # Production build
pnpm test         # Run tests (Vitest)
pnpm lint         # ESLint
pnpm prisma migrate dev   # Database migrations
pnpm prisma studio        # Database GUI
```
