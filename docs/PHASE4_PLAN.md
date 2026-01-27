# Phase 4: AI Interactive Tutor - Implementation Plan

## Executive Summary

Phase 4 implements the core AI Interactive Tutor feature (TUTOR-001 to TUTOR-027), which is the primary value proposition of Luma Web. This phase involves 27 tasks spanning backend infrastructure (Trigger.dev background jobs, R2 storage, AI integrations), API endpoints, and frontend components.

**Total Tasks**: 27
**Complexity Breakdown**: 1 XL, 6 L, 9 M, 11 S

---

## 1. Implementation Order (Dependency-Based Batches)

### Batch 1: Infrastructure Foundation

**Goal**: Set up external integrations and background job infrastructure

| Task ID   | Description                              | Complexity | Dependencies                    |
| --------- | ---------------------------------------- | ---------- | ------------------------------- |
| TUTOR-003 | R2 Image Storage Integration             | S          | None                            |
| TUTOR-002 | Python Image Extraction Script           | M          | None                            |
| TUTOR-004 | AI Knowledge Structure Extraction Prompt | L          | None                            |
| TUTOR-001 | PDF Structure Extraction Background Job  | XL         | TUTOR-002, TUTOR-003, TUTOR-004 |

### Batch 2: Core Learning APIs

**Goal**: Build the foundational learning session APIs

| Task ID   | Description                       | Complexity | Dependencies        |
| --------- | --------------------------------- | ---------- | ------------------- |
| TUTOR-005 | Structure Extraction Retry API    | S          | TUTOR-001           |
| TUTOR-006 | Start/Resume Learning Session API | M          | TUTOR-001, FILE-002 |
| TUTOR-007 | Get Learning Session API          | S          | TUTOR-006           |
| TUTOR-016 | Get File Images API               | S          | TUTOR-003           |

### Batch 3: Explanation & Confirmation APIs

**Goal**: Implement SSE streaming and formula recognition

| Task ID   | Description                             | Complexity | Dependencies                    |
| --------- | --------------------------------------- | ---------- | ------------------------------- |
| TUTOR-009 | Mathpix Formula Recognition Integration | M          | None (lib utility)              |
| TUTOR-008 | SubTopic Explanation API (SSE)          | L          | TUTOR-006, TUTOR-009, QUOTA-003 |
| TUTOR-010 | Confirm Understanding API               | S          | TUTOR-008                       |

### Batch 4: Testing & Progress APIs

**Goal**: Complete the test generation and answer submission flow

| Task ID   | Description                  | Complexity | Dependencies         |
| --------- | ---------------------------- | ---------- | -------------------- |
| TUTOR-011 | Generate Topic Test API      | M          | TUTOR-010, QUOTA-003 |
| TUTOR-012 | Submit Test Answer API       | M          | TUTOR-011            |
| TUTOR-013 | Skip Test Question API       | S          | TUTOR-011            |
| TUTOR-014 | Advance to Next Topic API    | S          | TUTOR-012            |
| TUTOR-015 | Pause Learning Session API   | S          | TUTOR-006            |
| TUTOR-027 | Topic Type Manual Adjustment | S          | TUTOR-001            |

### Batch 5: Frontend Hooks

**Goal**: Build React hooks for state management

| Task ID   | Description                 | Complexity | Dependencies           |
| --------- | --------------------------- | ---------- | ---------------------- |
| TUTOR-025 | SSE Connection Handler Hook | M          | TUTOR-008              |
| TUTOR-026 | useLearningSession Hook     | M          | TUTOR-006 to TUTOR-015 |

### Batch 6: Frontend Components

**Goal**: Build all UI components for the learning experience

| Task ID   | Description                          | Complexity | Dependencies         |
| --------- | ------------------------------------ | ---------- | -------------------- |
| TUTOR-017 | PDF Preview Modal Component          | M          | FILE-004             |
| TUTOR-021 | LaTeX/Formula Renderer Component     | M          | None (KaTeX)         |
| TUTOR-022 | Page Images Component                | S          | TUTOR-016            |
| TUTOR-024 | Learning Progress Bar Component      | S          | TUTOR-007            |
| TUTOR-019 | Topic Outline Component              | M          | TUTOR-007            |
| TUTOR-020 | SubTopic Explanation Panel Component | L          | TUTOR-008, TUTOR-021 |
| TUTOR-023 | Topic Test Component                 | L          | TUTOR-011, TUTOR-012 |
| TUTOR-018 | Learning Page Layout                 | L          | All above components |

---

## 2. File Structure (New Files to Create)

### Backend: API Routes

```
src/app/api/
├── files/
│   └── [id]/
│       ├── extract/
│       │   └── retry/
│       │       └── route.ts          # TUTOR-005
│       ├── learn/
│       │   └── start/
│       │       └── route.ts          # TUTOR-006
│       ├── images/
│       │   └── route.ts              # TUTOR-016
│       └── topics/
│           └── [topicId]/
│               └── route.ts          # TUTOR-027
└── learn/
    └── sessions/
        └── [id]/
            ├── route.ts              # TUTOR-007
            ├── explain/
            │   └── route.ts          # TUTOR-008 (SSE)
            ├── confirm/
            │   └── route.ts          # TUTOR-010
            ├── test/
            │   └── route.ts          # TUTOR-011
            ├── answer/
            │   └── route.ts          # TUTOR-012
            ├── skip/
            │   └── route.ts          # TUTOR-013
            ├── next/
            │   └── route.ts          # TUTOR-014
            └── pause/
                └── route.ts          # TUTOR-015
```

### Backend: Library Utilities

```
src/lib/
├── ai/
│   ├── index.ts                      # AI client (OpenRouter)
│   ├── mathpix.ts                    # TUTOR-009: Mathpix integration
│   └── prompts/
│       ├── structure-extraction.ts   # TUTOR-004: Prompt templates
│       └── explanation.ts            # Explanation prompts
├── r2/
│   └── index.ts                      # TUTOR-003: R2 storage client
└── quota/
    └── index.ts                      # Quota consumption utilities
```

### Backend: Trigger.dev Jobs

```
src/trigger/
├── client.ts                         # Trigger.dev client configuration
└── jobs/
    └── extract-pdf-structure.ts      # TUTOR-001: Main extraction job
```

### Backend: Python Scripts

```
scripts/
└── extract_images.py                 # TUTOR-002: PyMuPDF image extraction
```

### Frontend: Components

```
src/components/
├── file/
│   └── pdf-preview-modal.tsx         # TUTOR-017
└── learn/
    ├── topic-outline.tsx             # TUTOR-019
    ├── explanation-panel.tsx         # TUTOR-020
    ├── latex-renderer.tsx            # TUTOR-021
    ├── page-images.tsx               # TUTOR-022
    ├── topic-test.tsx                # TUTOR-023
    └── progress-bar.tsx              # TUTOR-024
```

### Frontend: Pages

```
src/app/(main)/
└── learn/
    └── [sessionId]/
        └── page.tsx                  # TUTOR-018: Learning page layout
```

### Frontend: Hooks

```
src/hooks/
├── use-sse.ts                        # TUTOR-025
└── use-learning-session.ts           # TUTOR-026
```

---

## 3. Database Schema

The existing Prisma schema already includes all required models:

### Existing Models (Already Defined)

- `TopicGroup` - Two-layer knowledge structure (level 1)
- `SubTopic` - Knowledge structure (level 2)
- `TopicTest` - Cached test questions
- `ExtractedImage` - PDF extracted images
- `LearningSession` - User learning state
- `TopicProgress` - Topic completion tracking
- `SubTopicProgress` - SubTopic confirmation tracking
- `MathpixUsage` - Mathpix API cost tracking
- `AIUsageLog` - AI token usage logging

### No Additional Schema Changes Required

---

## 4. API Endpoints Summary

| Method | Path                              | Task      | Description                         |
| ------ | --------------------------------- | --------- | ----------------------------------- |
| POST   | `/api/files/:id/extract/retry`    | TUTOR-005 | Retry failed structure extraction   |
| POST   | `/api/files/:id/learn/start`      | TUTOR-006 | Start/resume learning session       |
| GET    | `/api/files/:id/images`           | TUTOR-016 | Get extracted images for file       |
| PATCH  | `/api/files/:id/topics/:topicId`  | TUTOR-027 | Update topic type (CORE/SUPPORTING) |
| GET    | `/api/learn/sessions/:id`         | TUTOR-007 | Get learning session details        |
| POST   | `/api/learn/sessions/:id/explain` | TUTOR-008 | Stream explanation (SSE)            |
| POST   | `/api/learn/sessions/:id/confirm` | TUTOR-010 | Confirm understanding               |
| POST   | `/api/learn/sessions/:id/test`    | TUTOR-011 | Generate/get topic test             |
| POST   | `/api/learn/sessions/:id/answer`  | TUTOR-012 | Submit test answer                  |
| POST   | `/api/learn/sessions/:id/skip`    | TUTOR-013 | Skip test question                  |
| POST   | `/api/learn/sessions/:id/next`    | TUTOR-014 | Advance to next topic               |
| POST   | `/api/learn/sessions/:id/pause`   | TUTOR-015 | Pause learning session              |

---

## 5. React Components Summary

| Component          | Task      | Location                                     | Description                                       |
| ------------------ | --------- | -------------------------------------------- | ------------------------------------------------- |
| PDFPreviewModal    | TUTOR-017 | `src/components/file/pdf-preview-modal.tsx`  | Modal with file overview, "Start Learning" button |
| LearningPageLayout | TUTOR-018 | `src/app/(main)/learn/[sessionId]/page.tsx`  | Three-panel learning interface                    |
| TopicOutline       | TUTOR-019 | `src/components/learn/topic-outline.tsx`     | Collapsible tree navigation                       |
| ExplanationPanel   | TUTOR-020 | `src/components/learn/explanation-panel.tsx` | Five-layer explanation display                    |
| LatexRenderer      | TUTOR-021 | `src/components/learn/latex-renderer.tsx`    | KaTeX formula rendering                           |
| PageImages         | TUTOR-022 | `src/components/learn/page-images.tsx`       | Image gallery with lightbox                       |
| TopicTest          | TUTOR-023 | `src/components/learn/topic-test.tsx`        | Question display and answer submission            |
| ProgressBar        | TUTOR-024 | `src/components/learn/progress-bar.tsx`      | Segmented progress indicator                      |

---

## 6. Custom Hooks Summary

| Hook                 | Task      | Description                                    |
| -------------------- | --------- | ---------------------------------------------- |
| `useSSE`             | TUTOR-025 | SSE connection with auto-reconnect (3 retries) |
| `useLearningSession` | TUTOR-026 | Session state management with mutations        |

---

## 7. External Integrations Configuration

### 7.1 Trigger.dev Setup

**Required Environment Variables:**

```
TRIGGER_API_KEY=<your-trigger-api-key>
TRIGGER_API_URL=https://api.trigger.dev
```

**Tasks to Create:**

- `extract-pdf-structure` - Main extraction job (5 min timeout)
- File: `src/trigger/jobs/extract-pdf-structure.ts`

### 7.2 Cloudflare R2 Setup

**Required Environment Variables:**

```
R2_ACCOUNT_ID=<cloudflare-account-id>
R2_ACCESS_KEY_ID=<r2-access-key>
R2_SECRET_ACCESS_KEY=<r2-secret-key>
R2_BUCKET_NAME=luma-images
R2_PUBLIC_URL=https://<bucket>.r2.dev
```

**Storage Path Pattern:**

```
images/{fileId}/{pageNumber}_{imageIndex}.png
```

### 7.3 Mathpix API Setup

**Required Environment Variables:**

```
MATHPIX_APP_ID=<app-id>
MATHPIX_APP_KEY=<app-key>
```

**API Usage:**

- Endpoint: `https://api.mathpix.com/v3/text`
- Cost tracking via `MathpixUsage` table

### 7.4 OpenRouter AI Setup

**Required Environment Variables:**

```
OPENROUTER_API_KEY=<openrouter-key>
```

**Model Configuration:**

- Model: `anthropic/claude-3.5-sonnet`
- Max tokens: 4096
- Temperature: 0.7

---

## 8. Critical Path Items

### Highest Priority (Blockers)

1. **TUTOR-001**: PDF Structure Extraction Background Job (XL)
   - This is the foundation for all learning features
   - Blocks: TUTOR-005, TUTOR-006, TUTOR-019
   - Requires: TUTOR-002, TUTOR-003, TUTOR-004

2. **TUTOR-008**: SubTopic Explanation API (SSE) (L)
   - Core value proposition - streaming AI explanations
   - Requires proper SSE implementation
   - Blocks: TUTOR-020, TUTOR-025

3. **TUTOR-018**: Learning Page Layout (L)
   - Main user interface for the feature
   - Requires all components to be ready

### High Complexity Items

1. **TUTOR-020**: SubTopic Explanation Panel Component (L)
   - Five collapsible layers with streaming text
   - LaTeX rendering integration
   - Image gallery integration

2. **TUTOR-023**: Topic Test Component (L)
   - Multiple question types
   - Attempt tracking
   - Re-explanation for wrong answers

---

## 9. Risk Assessment & Mitigations

### Risk 1: PDF Structure Extraction Timeout

**Risk Level**: High
**Description**: Complex PDFs may exceed 5-minute timeout
**Mitigation**:

- Implement batched processing (120 pages per batch)
- Add progress tracking in database
- Allow resume from last successful batch on retry

### Risk 2: SSE Connection Stability

**Risk Level**: Medium
**Description**: SSE connections may drop on Vercel serverless
**Mitigation**:

- Implement auto-reconnect with 3 retries (TUTOR-025)
- Cache partial responses in Zustand store
- Provide manual refresh prompt after max retries

### Risk 3: Mathpix API Rate Limits/Costs

**Risk Level**: Medium
**Description**: Mathpix charges per request ($0.004/request)
**Mitigation**:

- Implement request caching
- Log all usage to `MathpixUsage` table
- Only call for detected formula regions

### Risk 4: R2 Storage Costs

**Risk Level**: Low
**Description**: Image storage costs could accumulate
**Mitigation**:

- Delete images on file deletion (cascade)
- Implement signed URLs with expiry
- Monitor storage usage

### Risk 5: AI Prompt Quality

**Risk Level**: Medium
**Description**: Knowledge structure extraction may be inconsistent
**Mitigation**:

- Extensive prompt engineering (TUTOR-004)
- Allow manual topic type adjustment (TUTOR-027)
- Implement retry mechanism (TUTOR-005)

---

## 10. Testing Strategy

### Unit Tests

- AI prompt utilities
- R2 storage functions
- Quota consumption logic
- Session state calculations

### Integration Tests

- Structure extraction job (mocked AI)
- Learning session API flow
- SSE streaming endpoints

### E2E Tests

- Complete learning flow: Start -> Explain -> Confirm -> Test -> Complete
- Retry extraction flow
- Pause and resume session

---

## 11. Dependencies on Previous Phases

| Phase      | Task                                | Required For            |
| ---------- | ----------------------------------- | ----------------------- |
| Phase 3    | FILE-002 (File Upload Confirm)      | TUTOR-001 trigger point |
| Phase 5    | QUOTA-003 (Quota Consumption Logic) | TUTOR-008, TUTOR-011    |
| Foundation | FND-006 (TanStack Query)            | All hooks               |
| Foundation | FND-007 (Zustand)                   | TUTOR-018, TUTOR-020    |
