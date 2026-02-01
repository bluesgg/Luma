# Luma Web - Implementation Task List

> **Version**: 1.0
> **Last Updated**: 2026-02-01
> **Status**: Planning Complete

---

## Overview

This document breaks down the Luma Web MVP implementation into 11 phases with detailed tasks. Each task includes dependencies, acceptance criteria, and priority levels.

### Task ID Format

| Phase | Prefix | Description |
|-------|--------|-------------|
| Phase 0 | FND | Foundation - Project setup, database, base components |
| Phase 1 | AUTH | Authentication - Login, register, verification, password reset |
| Phase 2 | CRS | Course Management - CRUD, limits |
| Phase 3 | FILE | File Management - Upload, storage, scan detection |
| Phase 4 | TUTOR | AI Interactive Tutor - Core feature with teach-then-test flow |
| Phase 5 | QUOTA | Quota Management - Display, alerts, reset |
| Phase 6 | SET | User Settings - Language preferences |
| Phase 7 | ADMIN | Admin Dashboard - Stats, users, cost, workers |
| Phase 8 | READER | PDF Reader - Viewer, navigation |
| Phase 9 | TEST | Testing - Unit, integration, E2E |
| Phase 10 | DEPLOY | Deployment - CI/CD, production |

### Priority Levels

- **P0**: Critical path, must complete before next phase
- **P1**: Important, should complete in current phase
- **P2**: Nice to have, can defer if needed

---

## Phase 0: Foundation (FND)

| Task ID | Task Name | Description | Dependencies | Acceptance Criteria | Priority |
|---------|-----------|-------------|--------------|---------------------|----------|
| FND-001 | 项目初始化 | Initialize Next.js 14+ project with TypeScript, App Router, and base configuration | None | - Next.js 14+ with App Router configured<br>- TypeScript 5.7+ configured<br>- ESLint + Prettier configured<br>- Husky pre-commit hooks setup | P0 |
| FND-002 | 数据库配置 | Setup Supabase PostgreSQL and configure Prisma ORM | FND-001 | - Supabase project created<br>- Prisma schema initialized<br>- DATABASE_URL and DIRECT_URL configured<br>- `prisma db push` works | P0 |
| FND-003 | 数据库 Schema 设计 | Create complete Prisma schema with all entities and relationships | FND-002 | - All tables defined (users, courses, files, topic_groups, sub_topics, etc.)<br>- Relationships with cascade deletes<br>- Indexes for performance-critical queries<br>- Migration generated and applied | P0 |
| FND-004 | Supabase Storage 配置 | Configure Supabase Storage for PDF file uploads | FND-002 | - Storage bucket created with proper policies<br>- 5GB per user limit configured<br>- Signed URL generation working | P0 |
| FND-005 | UI 组件库安装 | Setup shadcn/ui with Tailwind CSS and base components | FND-001 | - Tailwind CSS configured<br>- shadcn/ui initialized<br>- Base components installed (Button, Card, Dialog, Input, etc.)<br>- Dark mode support (optional) | P1 |
| FND-006 | 状态管理配置 | Configure TanStack Query and Zustand | FND-001 | - TanStack Query Provider setup<br>- Default query options configured<br>- Zustand stores structure defined | P1 |
| FND-007 | 环境变量配置 | Setup all required environment variables | FND-002 | - .env.example file with all variables<br>- Vercel environment variables documented<br>- Type-safe env access via lib/env.ts | P0 |
| FND-008 | 项目目录结构 | Create complete project directory structure | FND-001 | - All directories created as per tech_design.md<br>- Index files for exports<br>- README for each major directory | P1 |

---

## Phase 1: Authentication (AUTH)

| Task ID | Task Name | Description | Dependencies | Acceptance Criteria | Priority |
|---------|-----------|-------------|--------------|---------------------|----------|
| AUTH-001 | Supabase Auth 集成 | Integrate Supabase Auth for email/password authentication | FND-002 | - Supabase Auth client configured (browser + server)<br>- Auth helpers for session management<br>- httpOnly cookie configuration | P0 |
| AUTH-002 | 用户注册 API | Implement user registration endpoint | AUTH-001, FND-003 | - POST /api/auth/register endpoint<br>- Email format validation (RFC 5322)<br>- Password minimum 8 characters<br>- Create user in database<br>- Email verification not required for login (MVP simplified) | P0 |
| AUTH-003 | 用户登录 API | Implement user login endpoint | AUTH-001 | - POST /api/auth/login endpoint<br>- Validate credentials via Supabase<br>- Set httpOnly cookie (7 days default)<br>- "Remember me" extends to 30 days<br>- Return user data on success | P0 |
| AUTH-004 | 用户登出 API | Implement user logout endpoint | AUTH-001 | - POST /api/auth/logout endpoint<br>- Clear session cookie<br>- Invalidate Supabase session | P0 |
| AUTH-005 | 邮箱验证发送 | Implement email verification sending | AUTH-002 | - Generate verification token (24h expiry)<br>- Send verification email<br>- Store token in verification_tokens table | P1 |
| AUTH-006 | 邮箱验证确认 API | Implement email verification confirmation | AUTH-005 | - GET /api/auth/verify endpoint<br>- Validate token and expiry<br>- Update user email_verified status<br>- Delete used token | P1 |
| AUTH-007 | 重发验证邮件 API | Implement resend verification email | AUTH-005 | - POST /api/auth/resend-verification endpoint<br>- Rate limit: 5 times/15 minutes<br>- Delete old tokens, create new one | P1 |
| AUTH-008 | 密码重置请求 API | Implement password reset request | AUTH-001 | - POST /api/auth/reset-password endpoint<br>- Generate reset token (24h expiry)<br>- Send reset email<br>- Rate limit: 5 times/15 minutes | P1 |
| AUTH-009 | 密码重置确认 API | Implement password reset confirmation | AUTH-008 | - POST /api/auth/confirm-reset endpoint<br>- Validate token and expiry<br>- Update password hash<br>- Delete used token | P1 |
| AUTH-010 | 登录页面 | Create login page with form | AUTH-003, FND-005 | - Login form with email/password fields<br>- "Remember me" checkbox<br>- Link to register and forgot password<br>- Form validation with react-hook-form + zod<br>- Error handling and display | P0 |
| AUTH-011 | 注册页面 | Create registration page with form | AUTH-002, FND-005 | - Registration form with email/password/confirm password<br>- Password strength indicator<br>- Terms acceptance checkbox<br>- Form validation<br>- Success message with verification instructions | P0 |
| AUTH-012 | 忘记密码页面 | Create forgot password page | AUTH-008, FND-005 | - Email input form<br>- Success message after submission<br>- Rate limit feedback | P1 |
| AUTH-013 | 重置密码页面 | Create reset password page | AUTH-009, FND-005 | - New password form with confirmation<br>- Token validation on page load<br>- Success redirect to login | P1 |
| AUTH-014 | Auth 中间件 | Implement authentication middleware | AUTH-003 | - Protect routes requiring authentication<br>- Redirect to login if not authenticated<br>- Check email_verified status (if required)<br>- Pass user to page components | P0 |
| AUTH-015 | 账户锁定机制 | Implement account lockout after failed attempts | AUTH-003 | - Track failed login attempts<br>- Lock account after 5 failures<br>- 30-minute lockout period<br>- Reset counter on successful login | P1 |

---

## Phase 2: Course Management (CRS)

| Task ID | Task Name | Description | Dependencies | Acceptance Criteria | Priority |
|---------|-----------|-------------|--------------|---------------------|----------|
| CRS-001 | 课程列表 API | Implement course list endpoint | AUTH-014, FND-003 | - GET /api/courses endpoint<br>- Return user's courses sorted by created_at DESC<br>- Include file count per course | P0 |
| CRS-002 | 创建课程 API | Implement course creation endpoint | CRS-001 | - POST /api/courses endpoint<br>- Validate: name (max 50 chars), school, term<br>- Check 6-course limit<br>- Return error if limit reached | P0 |
| CRS-003 | 更新课程 API | Implement course update endpoint | CRS-001 | - PATCH /api/courses/:id endpoint<br>- Validate ownership<br>- Update name, school, term fields | P0 |
| CRS-004 | 删除课程 API | Implement course deletion endpoint | CRS-001 | - DELETE /api/courses/:id endpoint<br>- Validate ownership<br>- Cascade delete all files and related data<br>- Delete files from Supabase Storage | P0 |
| CRS-005 | 课程列表页面 | Create courses list page | CRS-001, FND-005 | - Display course cards in grid<br>- Show course name, school, term, file count<br>- Empty state for no courses<br>- Loading skeleton | P0 |
| CRS-006 | 创建课程对话框 | Create course creation dialog | CRS-002, FND-005 | - Modal form with name, school, term fields<br>- Form validation<br>- Course limit warning when at 5 courses<br>- Disable create when at 6 courses | P0 |
| CRS-007 | 编辑课程对话框 | Create course edit dialog | CRS-003, FND-005 | - Modal form with pre-filled values<br>- Form validation<br>- Save and cancel buttons | P0 |
| CRS-008 | 删除课程对话框 | Create course deletion confirmation | CRS-004, FND-005 | - Confirmation dialog<br>- Require typing course name to confirm<br>- Warning about data loss<br>- Loading state during deletion | P0 |
| CRS-009 | 课程 Hook | Create useCourses hook with TanStack Query | CRS-001-004 | - useCourses() hook for list + mutations<br>- Optimistic updates for create/update<br>- Cache invalidation on mutations<br>- Error handling | P0 |

---

## Phase 3: File Management (FILE)

| Task ID | Task Name | Description | Dependencies | Acceptance Criteria | Priority |
|---------|-----------|-------------|--------------|---------------------|----------|
| FILE-001 | 预签名上传 URL API | Implement presigned upload URL generation | CRS-001, FND-004 | - POST /api/files/upload-url endpoint<br>- Validate file type (PDF only)<br>- Check file size limit (500MB)<br>- Check storage limit (5GB)<br>- Check file count limit (30 per course)<br>- Check duplicate file name<br>- Return presigned URL | P0 |
| FILE-002 | 上传确认 API | Implement upload confirmation endpoint | FILE-001 | - POST /api/files/confirm endpoint<br>- Create file record in database<br>- Set status to 'processing'<br>- Trigger structure extraction job | P0 |
| FILE-003 | 文件列表 API | Implement file list endpoint | CRS-001 | - GET /api/courses/:id/files endpoint<br>- Return files sorted by created_at DESC<br>- Include status, structure_status, is_scanned | P0 |
| FILE-004 | 文件详情 API | Implement file details endpoint | FILE-003 | - GET /api/files/:id endpoint<br>- Return file with knowledge structure<br>- Include TopicGroups and SubTopics | P0 |
| FILE-005 | 删除文件 API | Implement file deletion endpoint | FILE-003 | - DELETE /api/files/:id endpoint<br>- Validate ownership<br>- Delete from Supabase Storage<br>- Cascade delete topics, sessions, cache | P0 |
| FILE-006 | 下载 URL API | Implement download URL generation | FILE-003 | - GET /api/files/:id/download-url endpoint<br>- Generate time-limited signed URL<br>- Validate ownership | P1 |
| FILE-007 | 扫描件检测逻辑 | Implement scanned PDF detection | FILE-002 | - Use pdf-parse to extract text<br>- Calculate: characters < pages × 100 = scanned<br>- Update is_scanned field | P1 |
| FILE-008 | 知识结构提取 Job | Implement Trigger.dev structure extraction job | FILE-002, FND-007 | - Download PDF from Supabase Storage<br>- Upload to Claude File API<br>- Store claude_file_id<br>- Call Claude for structure analysis<br>- Create TopicGroup + SubTopic records<br>- Update structure_status to READY/FAILED<br>- 5-minute timeout | P0 |
| FILE-009 | 结构提取重试 API | Implement structure extraction retry | FILE-008 | - POST /api/files/:id/extract/retry endpoint<br>- Delete existing topics<br>- Re-trigger extraction job<br>- Reset structure_status to PROCESSING | P1 |
| FILE-010 | 文件列表页面 | Create file list page for a course | FILE-003, FND-005 | - Display file cards with status indicators<br>- Show file name, size, page count<br>- Structure status badge (processing/ready/failed)<br>- Scanned PDF warning label<br>- Empty state | P0 |
| FILE-011 | 文件上传组件 | Create file upload component | FILE-001, FILE-002 | - Drag and drop support<br>- Multi-file upload<br>- Progress indicator<br>- File type validation (PDF only)<br>- Size validation feedback<br>- Duplicate name warning | P0 |
| FILE-012 | 文件卡片组件 | Create file card component | FILE-010 | - Display file info (name, size, pages)<br>- Status badge (uploading/processing/ready/failed)<br>- Scanned PDF warning<br>- Click to open preview modal<br>- Delete button with confirmation | P0 |
| FILE-013 | PDF 预览小窗口 | Create PDF preview modal | FILE-004 | - Display file overview<br>- Show knowledge structure outline<br>- "Open Reader" button<br>- "Start Learning" button (disabled if not ready)<br>- Structure status indicator | P0 |
| FILE-014 | 文件 Hook | Create useFiles hook with TanStack Query | FILE-001-005 | - useFiles(courseId) hook<br>- Upload mutation with progress<br>- Delete mutation<br>- Optimistic updates<br>- Status polling for processing files | P0 |

---

## Phase 4: AI Interactive Tutor (TUTOR) - Core Feature

This is the most complex phase implementing the teach-then-test learning flow with SubTopic caching, quiz validation, and Q&A functionality.

### 4.1 Session Management

| Task ID | Task Name | Description | Dependencies | Acceptance Criteria | Priority |
|---------|-----------|-------------|--------------|---------------------|----------|
| TUTOR-001 | 开始/恢复学习会话 API | Implement start/resume learning session | FILE-004 | - POST /api/files/:id/learn/start endpoint<br>- Check structure_status is READY<br>- Check quota availability<br>- Create or resume LearningSession<br>- Return session with current position | P0 |
| TUTOR-002 | 获取会话详情 API | Implement session details endpoint | TUTOR-001 | - GET /api/learn/sessions/:id endpoint<br>- Return session with progress<br>- Include current TopicGroup and SubTopic<br>- Include SubTopicProgress for all topics | P0 |
| TUTOR-003 | 获取学习进度 API | Implement learning progress endpoint | TUTOR-001 | - GET /api/learn/sessions/:id/progress endpoint<br>- Return completion percentage<br>- List completed vs pending SubTopics<br>- Current position (topicIndex, subIndex) | P0 |
| TUTOR-004 | 会话状态管理 | Implement session status tracking | TUTOR-001 | - Track session status: IN_PROGRESS, COMPLETED<br>- Update current_topic_idx, current_sub_idx<br>- Update session on topic/subtopic change<br>- Mark COMPLETED when all done | P0 |

### 4.2 Claude API + Skills Integration

| Task ID | Task Name | Description | Dependencies | Acceptance Criteria | Priority |
|---------|-----------|-------------|--------------|---------------------|----------|
| TUTOR-005 | Claude API 客户端配置 | Configure Claude API client with Skills | FND-007 | - Anthropic SDK setup<br>- Configure betas: code-execution, skills, files-api<br>- Environment variable for TUTOR_SKILL_ID<br>- Error handling and retries | P0 |
| TUTOR-006 | Container 管理 | Implement Claude container lifecycle | TUTOR-005 | - Create new container with skill on session start<br>- Store container_id in learning_sessions<br>- Reuse container for subsequent calls<br>- Handle container expiry (30 min timeout)<br>- Create new container on expiry | P0 |
| TUTOR-007 | courseware-tutor Skill 配置 | Configure custom tutor skill | TUTOR-005 | - Skill ID configured in environment<br>- Skill version management (use 'latest')<br>- Skill invocation in API calls<br>- Handle skill responses | P0 |

### 4.3 Explanation Generation

| Task ID | Task Name | Description | Dependencies | Acceptance Criteria | Priority |
|---------|-----------|-------------|--------------|---------------------|----------|
| TUTOR-008 | 讲解生成 API (SSE) | Implement explanation generation with streaming | TUTOR-006, TUTOR-007 | - POST /api/learn/sessions/:id/explain endpoint<br>- Stream response via SSE<br>- Call Claude with skill and file reference<br>- Include SubTopic page range context<br>- Return explanation + quiz JSON | P0 |
| TUTOR-009 | SubTopic 缓存检查 | Implement cache lookup before AI call | TUTOR-008 | - Check SubTopicCache before calling Claude<br>- Return cached content if exists<br>- Skip quota deduction on cache hit<br>- Include cache timestamp | P0 |
| TUTOR-010 | SubTopic 缓存写入 | Implement cache storage after AI generation | TUTOR-008 | - Store explanation + quiz to SubTopicCache<br>- Link to sub_topic_id<br>- Store created_at timestamp<br>- Handle large content (markdown/latex) | P0 |
| TUTOR-011 | 重新讲解 API | Implement re-explanation endpoint | TUTOR-008 | - POST /api/learn/sessions/:id/relearn endpoint<br>- Delete existing cache entry<br>- Call Claude for fresh explanation<br>- Update cache with new content<br>- Deduct quota (1 interaction) | P0 |

### 4.4 Quiz System

| Task ID | Task Name | Description | Dependencies | Acceptance Criteria | Priority |
|---------|-----------|-------------|--------------|---------------------|----------|
| TUTOR-012 | Quiz 数据结构 | Define quiz JSON schema | TUTOR-008 | - TypeScript interface for Quiz<br>- 4 options (A/B/C/D)<br>- 2-3 correct_answers (indices)<br>- Question text and explanation | P0 |
| TUTOR-013 | 测试通过 API | Implement quiz pass endpoint | TUTOR-001 | - POST /api/learn/sessions/:id/pass endpoint<br>- Update SubTopicProgress status to PASSED<br>- Set completed_at timestamp<br>- Advance to next SubTopic<br>- Update session position | P0 |
| TUTOR-014 | 测试失败 API | Implement quiz fail endpoint | TUTOR-001 | - POST /api/learn/sessions/:id/fail endpoint<br>- Increment wrong_count in SubTopicProgress<br>- Return current attempt count<br>- Return max attempts (3) | P0 |
| TUTOR-015 | 跳过 SubTopic API | Implement skip endpoint | TUTOR-001 | - POST /api/learn/sessions/:id/skip endpoint<br>- Update SubTopicProgress status to SKIPPED<br>- Advance to next SubTopic<br>- Update session position | P1 |
| TUTOR-016 | 前端 Quiz 验证 | Implement frontend quiz validation | TUTOR-012 | - Compare selected options with correct_answers<br>- All correct options must be selected<br>- Partial correct = fail<br>- Return result without API call | P0 |

### 4.5 Q&A Functionality

| Task ID | Task Name | Description | Dependencies | Acceptance Criteria | Priority |
|---------|-----------|-------------|--------------|---------------------|----------|
| TUTOR-017 | 获取 Q&A 历史 API | Implement Q&A history endpoint | TUTOR-001 | - GET /api/learn/sessions/:id/qa/:subId endpoint<br>- Return QAMessages for specific SubTopic<br>- Ordered by created_at ASC<br>- Include role (user/assistant) | P0 |
| TUTOR-018 | 发送 Q&A 消息 API (SSE) | Implement Q&A message endpoint with streaming | TUTOR-006 | - POST /api/learn/sessions/:id/qa/:subId endpoint<br>- Stream response via SSE<br>- Reuse existing container (context aware)<br>- Save both user and assistant messages<br>- Deduct quota (1 interaction) | P0 |
| TUTOR-019 | Q&A 消息限制 | Implement Q&A message limit per SubTopic | TUTOR-017 | - Limit 20 messages per SubTopic<br>- Return error when limit reached<br>- Include current count in response | P1 |

### 4.6 Frontend Components

| Task ID | Task Name | Description | Dependencies | Acceptance Criteria | Priority |
|---------|-----------|-------------|--------------|---------------------|----------|
| TUTOR-020 | 学习会话页面 | Create learning session page layout | TUTOR-002 | - Two-column layout (explanation + Q&A)<br>- TopicGroup/SubTopic navigation<br>- Progress indicator<br>- Exit/pause button | P0 |
| TUTOR-021 | 讲解内容区组件 | Create explanation panel component | TUTOR-008 | - Markdown rendering<br>- LaTeX/KaTeX rendering<br>- Streaming content display<br>- Loading skeleton | P0 |
| TUTOR-022 | Quiz UI 组件 | Create quiz UI component | TUTOR-012, TUTOR-016 | - Display question text<br>- 4 option checkboxes (multi-select)<br>- Submit button<br>- Result feedback (correct/wrong)<br>- Show explanation on wrong<br>- "Continue" / "Retry" / "Re-explain" buttons | P0 |
| TUTOR-023 | Q&A 对话框组件 | Create Q&A chat panel component | TUTOR-017, TUTOR-018 | - Message list display<br>- User/assistant message styling<br>- Input field with send button<br>- Streaming response display<br>- Message limit warning | P0 |
| TUTOR-024 | 进度追踪组件 | Create progress tracker component | TUTOR-003 | - Visual progress bar<br>- TopicGroup list with status<br>- SubTopic list with status (passed/skipped/current/pending)<br>- Click to navigate (if allowed) | P0 |
| TUTOR-025 | Topic 导航组件 | Create topic navigator component | TUTOR-020 | - Collapsible TopicGroup sections<br>- SubTopic list per group<br>- Current position highlight<br>- Completion indicators | P0 |
| TUTOR-026 | 学习状态 Store | Create Zustand learning store | TUTOR-020 | - Current streaming state<br>- Stream content buffer<br>- Test mode flag<br>- Selected quiz answers<br>- Q&A input state | P0 |
| TUTOR-027 | 学习会话 Hook | Create useLearningSession hook | TUTOR-001-018 | - Session data fetching<br>- Explanation mutation (with SSE)<br>- Quiz pass/fail mutations<br>- Q&A mutations (with SSE)<br>- Progress queries<br>- Cache-aware refetching | P0 |

---

## Phase 5: Quota Management (QUOTA)

| Task ID | Task Name | Description | Dependencies | Acceptance Criteria | Priority |
|---------|-----------|-------------|--------------|---------------------|----------|
| QUOTA-001 | 配额状态 API | Implement quota status endpoint | AUTH-014 | - GET /api/quota endpoint<br>- Return ai_interactions used/limit<br>- Return reset_at date<br>- Calculate usage percentage | P0 |
| QUOTA-002 | 配额扣减逻辑 | Implement quota deduction logic | QUOTA-001 | - Deduct from aiInteractions on AI calls<br>- Skip deduction on cache hits<br>- Log to quota_logs table<br>- Block if quota exhausted | P0 |
| QUOTA-003 | 配额重置 Job | Implement Trigger.dev quota reset job | FND-007 | - Daily cron job at 00:00 UTC<br>- Query quotas where reset_at <= now<br>- Reset ai_interactions to 500<br>- Update reset_at to next month<br>- 1-minute timeout | P0 |
| QUOTA-004 | 配额警告组件 | Create quota warning component | QUOTA-001, FND-005 | - Color-coded display:<br>  - Green: <70%<br>  - Yellow: 70-90%<br>  - Red: >90%<br>- Show "配额已用尽" when 100%<br>- Disable AI features when exhausted | P0 |
| QUOTA-005 | 配额预览徽章 | Create quota badge component | QUOTA-001 | - Compact display for file list page<br>- Show usage ratio (e.g., 123/500)<br>- Color indicator | P1 |
| QUOTA-006 | AI 使用记录 | Implement AI usage logging | QUOTA-002 | - Log each AI call to ai_usage_logs<br>- Track feature_type (explain/test/qa)<br>- Track tokens_used<br>- Track timestamp | P1 |
| QUOTA-007 | 配额 Hook | Create useQuota hook | QUOTA-001 | - useQuota() hook for quota status<br>- Auto-refresh on mutations<br>- Provide canUseAI computed value | P0 |

---

## Phase 6: User Settings (SET)

| Task ID | Task Name | Description | Dependencies | Acceptance Criteria | Priority |
|---------|-----------|-------------|--------------|---------------------|----------|
| SET-001 | 用户偏好 API | Implement user preferences endpoint | AUTH-014 | - GET /api/preferences endpoint<br>- PATCH /api/preferences endpoint<br>- Create default preferences on first access | P0 |
| SET-002 | 语言设置保存 | Implement language preference storage | SET-001 | - Save ui_locale (en/zh)<br>- Save explain_locale (en/zh)<br>- Default: ui_locale = browser language, explain_locale = en | P0 |
| SET-003 | 设置页面 | Create settings page | SET-001, FND-005 | - Language settings section<br>- UI language dropdown (en/zh)<br>- AI explanation language dropdown (en/zh)<br>- Quota details section<br>- Save button with feedback | P0 |
| SET-004 | 语言切换组件 | Create language switcher component | SET-002 | - Dropdown for language selection<br>- Immediate effect on save<br>- Persist to database | P0 |
| SET-005 | 偏好 Hook | Create usePreferences hook | SET-001 | - usePreferences() hook<br>- Update mutation<br>- Optimistic updates<br>- Provide locale values | P0 |

---

## Phase 7: Admin Dashboard (ADMIN)

| Task ID | Task Name | Description | Dependencies | Acceptance Criteria | Priority |
|---------|-----------|-------------|--------------|---------------------|----------|
| ADMIN-001 | 管理员登录 API | Implement admin login endpoint | FND-003 | - POST /api/admin/login endpoint<br>- Validate against admins table<br>- Separate session from user auth<br>- Set admin session cookie | P0 |
| ADMIN-002 | 管理员登出 API | Implement admin logout endpoint | ADMIN-001 | - POST /api/admin/logout endpoint<br>- Clear admin session cookie | P0 |
| ADMIN-003 | 管理员认证中间件 | Implement admin auth middleware | ADMIN-001 | - Protect /admin/* routes<br>- Validate admin session<br>- Check admin role (ADMIN/SUPER_ADMIN)<br>- Redirect to admin login if not authenticated | P0 |
| ADMIN-004 | 系统概览 API | Implement system statistics endpoint | ADMIN-003 | - GET /api/admin/stats endpoint<br>- Total users count<br>- Total courses count<br>- Total files count<br>- Active learning sessions | P0 |
| ADMIN-005 | 用户访问统计 API | Implement user access statistics endpoint | ADMIN-003 | - GET /api/admin/access-stats endpoint<br>- Monthly/weekly page views<br>- Active users by period<br>- Feature usage breakdown | P1 |
| ADMIN-006 | AI 成本统计 API | Implement AI cost statistics endpoint | ADMIN-003 | - GET /api/admin/cost endpoint<br>- Total AI calls by feature type<br>- Token usage by feature type<br>- Cost calculation (tokens × price)<br>- Trend data for charts | P0 |
| ADMIN-007 | 用户列表 API | Implement user list endpoint | ADMIN-003 | - GET /api/admin/users endpoint<br>- Paginated user list<br>- Include quota usage per user<br>- Include file count per user<br>- Search by email | P0 |
| ADMIN-008 | 配额调整 API | Implement quota adjustment endpoint | ADMIN-003 | - POST /api/admin/users/:id/quota endpoint<br>- Adjust ai_interactions limit<br>- Log change to quota_logs<br>- Require reason for adjustment | P0 |
| ADMIN-009 | Worker 健康检查 API | Implement worker health endpoint | ADMIN-003 | - GET /api/admin/workers endpoint<br>- List running Trigger.dev jobs<br>- Detect zombie jobs (>10 min)<br>- Job success/failure stats | P0 |
| ADMIN-010 | 管理员登录页面 | Create admin login page | ADMIN-001, FND-005 | - Separate login form at /admin/login<br>- Email + password fields<br>- Error handling<br>- Redirect to dashboard on success | P0 |
| ADMIN-011 | 管理后台布局 | Create admin dashboard layout | ADMIN-003, FND-005 | - Sidebar navigation<br>- Header with admin info<br>- Logout button<br>- Responsive design | P0 |
| ADMIN-012 | 系统概览页面 | Create system overview page | ADMIN-004 | - Stat cards (users, courses, files, sessions)<br>- Recent activity feed<br>- Quick actions | P0 |
| ADMIN-013 | 用户管理页面 | Create user management page | ADMIN-007 | - User table with pagination<br>- Search by email<br>- Click to view user details<br>- Link to quota adjustment | P0 |
| ADMIN-014 | 配额调整页面 | Create quota adjustment page | ADMIN-008 | - User quota details display<br>- Adjustment form<br>- Reason input (required)<br>- Adjustment history | P0 |
| ADMIN-015 | 成本监控页面 | Create cost monitoring page | ADMIN-006 | - Cost trend chart (Recharts)<br>- Breakdown by feature type<br>- Token usage statistics<br>- Date range filter | P0 |
| ADMIN-016 | Worker 状态页面 | Create worker health page | ADMIN-009 | - Job status table<br>- Running/completed/failed counts<br>- Zombie job alerts<br>- Manual retry button (future) | P0 |
| ADMIN-017 | 超级管理员初始化 | Implement super admin creation | FND-007 | - Create super admin from SUPER_ADMIN_EMAIL env<br>- Hash password securely<br>- Run on first deployment | P0 |
| ADMIN-018 | 管理员 Hook | Create useAdmin hook | ADMIN-001-009 | - Admin session management<br>- Stats queries<br>- User list queries<br>- Quota adjustment mutations | P0 |
| ADMIN-019 | 用户配额统计展示 | Display user quota statistics | ADMIN-007 | - Show each user's quota usage<br>- Usage rate visualization<br>- Reset date display<br>- Historical usage (from quota_logs) | P1 |

---

## Phase 8: PDF Reader (READER)

| Task ID | Task Name | Description | Dependencies | Acceptance Criteria | Priority |
|---------|-----------|-------------|--------------|---------------------|----------|
| READER-001 | PDF 阅读器页面 | Create PDF reader page | FILE-006 | - Full-page PDF viewer<br>- react-pdf integration<br>- Page-by-page rendering<br>- Loading states | P0 |
| READER-002 | 页面导航组件 | Create page navigator component | READER-001 | - Current page / total pages display<br>- Previous/next page buttons<br>- Page number input<br>- Jump to page | P0 |
| READER-003 | 缩放控制组件 | Create zoom controls component | READER-001 | - Zoom in/out buttons<br>- Zoom percentage display<br>- Fit to width/height options<br>- Reset zoom | P1 |
| READER-004 | Reader Store | Create Zustand reader store | READER-001 | - Current page state<br>- Zoom level state<br>- Scroll position<br>- Persist preferences | P1 |

---

## Phase 9: Testing (TEST)

| Task ID | Task Name | Description | Dependencies | Acceptance Criteria | Priority |
|---------|-----------|-------------|--------------|---------------------|----------|
| TEST-001 | 测试环境配置 | Configure test environment | FND-001 | - Vitest setup for unit tests<br>- Playwright setup for E2E<br>- Test database configuration<br>- Mock configurations | P0 |
| TEST-002 | API 单元测试 | Write unit tests for API routes | TEST-001 | - Auth API tests<br>- Course API tests<br>- File API tests<br>- Tutor API tests<br>- Target: 80%+ coverage for core modules | P0 |
| TEST-003 | 组件单元测试 | Write unit tests for components | TEST-001 | - Form component tests<br>- Quiz UI tests<br>- Q&A panel tests<br>- Progress tracker tests | P1 |
| TEST-004 | Hook 单元测试 | Write unit tests for custom hooks | TEST-001 | - useUser tests<br>- useCourses tests<br>- useLearningSession tests<br>- useQuota tests | P1 |
| TEST-005 | 集成测试 | Write integration tests | TEST-001 | - Auth flow integration<br>- Course → File → Learn flow<br>- Quota deduction flow<br>- Admin operations | P0 |
| TEST-006 | E2E 测试 | Write end-to-end tests | TEST-001 | - User registration/login flow<br>- Course creation flow<br>- File upload flow<br>- Learning session flow<br>- Admin dashboard flow | P0 |
| TEST-007 | CI 测试集成 | Integrate tests into CI pipeline | TEST-001, DEPLOY-001 | - Run tests on PR<br>- Block merge on test failure<br>- Coverage reports<br>- Test status badges | P0 |

---

## Phase 10: Deployment (DEPLOY)

| Task ID | Task Name | Description | Dependencies | Acceptance Criteria | Priority |
|---------|-----------|-------------|--------------|---------------------|----------|
| DEPLOY-001 | Vercel 项目配置 | Configure Vercel deployment | FND-001 | - Vercel project created<br>- Environment variables configured<br>- Build settings configured<br>- Custom domain (optional) | P0 |
| DEPLOY-002 | CI/CD Pipeline | Setup GitHub Actions CI/CD | DEPLOY-001 | - Lint check on PR<br>- Type check on PR<br>- Test run on PR<br>- Auto-deploy on main merge<br>- Database migration in deploy | P0 |
| DEPLOY-003 | 监控配置 | Configure monitoring and error tracking | DEPLOY-001 | - Sentry project setup<br>- Client + server error tracking<br>- Performance monitoring<br>- Alert configuration | P0 |
| DEPLOY-004 | 生产环境验证 | Production environment verification | DEPLOY-001-003 | - All environment variables set<br>- Database migrations applied<br>- Super admin created<br>- Health check endpoint working<br>- SSL certificate valid | P0 |

---

## Dependency Graph

```
FND-001 ──► FND-002 ──► FND-003 ──► AUTH-001
   │           │
   │           └──► FND-004
   │
   └──► FND-005 ──► FND-006
   │
   └──► FND-007
   │
   └──► FND-008

AUTH-001 ──► AUTH-002 ──► AUTH-005 ──► AUTH-006
         │           │            └──► AUTH-007
         │           │
         │           └──► AUTH-010 ──► AUTH-011
         │
         └──► AUTH-003 ──► AUTH-004
         │           │
         │           └──► AUTH-014 ──► AUTH-015
         │           │
         │           └──► AUTH-010
         │
         └──► AUTH-008 ──► AUTH-009
                      │
                      └──► AUTH-012 ──► AUTH-013

AUTH-014 ──► CRS-001 ──► CRS-002 ──► CRS-006
                    │           │
                    │           └──► CRS-003 ──► CRS-007
                    │           │
                    │           └──► CRS-004 ──► CRS-008
                    │
                    └──► CRS-005
                    │
                    └──► CRS-009

CRS-001 ──► FILE-001 ──► FILE-002 ──► FILE-007
   │              │            │
   │              │            └──► FILE-008 ──► FILE-009
   │              │
   │              └──► FILE-011
   │
   └──► FILE-003 ──► FILE-004 ──► FILE-013
              │            │
              │            └──► FILE-010 ──► FILE-012
              │
              └──► FILE-005
              │
              └──► FILE-006
              │
              └──► FILE-014

FILE-004 ──► TUTOR-001 ──► TUTOR-002 ──► TUTOR-003 ──► TUTOR-024
                    │            │
                    │            └──► TUTOR-004
                    │            │
                    │            └──► TUTOR-020 ──► TUTOR-025 ──► TUTOR-026
                    │
                    └──► TUTOR-005 ──► TUTOR-006 ──► TUTOR-007
                                            │
                                            └──► TUTOR-008 ──► TUTOR-009 ──► TUTOR-010
                                                        │            │
                                                        │            └──► TUTOR-011
                                                        │
                                                        └──► TUTOR-012 ──► TUTOR-016
                                                                    │
                                                                    └──► TUTOR-022
                    │
                    └──► TUTOR-013 ──► TUTOR-014 ──► TUTOR-015
                    │
                    └──► TUTOR-017 ──► TUTOR-018 ──► TUTOR-019
                                            │
                                            └──► TUTOR-023
                    │
                    └──► TUTOR-021
                    │
                    └──► TUTOR-027

AUTH-014 ──► QUOTA-001 ──► QUOTA-002 ──► QUOTA-006
                    │            │
                    │            └──► QUOTA-003
                    │
                    └──► QUOTA-004 ──► QUOTA-005
                    │
                    └──► QUOTA-007

AUTH-014 ──► SET-001 ──► SET-002 ──► SET-004
                   │
                   └──► SET-003
                   │
                   └──► SET-005

FND-003 ──► ADMIN-001 ──► ADMIN-002
                    │
                    └──► ADMIN-003 ──► ADMIN-004 ──► ADMIN-012
                                 │
                                 └──► ADMIN-005
                                 │
                                 └──► ADMIN-006 ──► ADMIN-015
                                 │
                                 └──► ADMIN-007 ──► ADMIN-013 ──► ADMIN-019
                                 │           │
                                 │           └──► ADMIN-008 ──► ADMIN-014
                                 │
                                 └──► ADMIN-009 ──► ADMIN-016
                    │
                    └──► ADMIN-010 ──► ADMIN-011
                    │
                    └──► ADMIN-017
                    │
                    └──► ADMIN-018

FILE-006 ──► READER-001 ──► READER-002
                     │
                     └──► READER-003
                     │
                     └──► READER-004

FND-001 ──► TEST-001 ──► TEST-002
                   │
                   └──► TEST-003
                   │
                   └──► TEST-004
                   │
                   └──► TEST-005
                   │
                   └──► TEST-006
                   │
                   └──► TEST-007

FND-001 ──► DEPLOY-001 ──► DEPLOY-002
                    │
                    └──► DEPLOY-003
                    │
                    └──► DEPLOY-004
```

---

## Summary

| Phase | Task Count | P0 Tasks | P1 Tasks | P2 Tasks |
|-------|------------|----------|----------|----------|
| Phase 0: Foundation | 8 | 5 | 3 | 0 |
| Phase 1: Authentication | 15 | 6 | 9 | 0 |
| Phase 2: Course Management | 9 | 9 | 0 | 0 |
| Phase 3: File Management | 14 | 10 | 4 | 0 |
| Phase 4: AI Interactive Tutor | 27 | 25 | 2 | 0 |
| Phase 5: Quota Management | 7 | 5 | 2 | 0 |
| Phase 6: User Settings | 5 | 5 | 0 | 0 |
| Phase 7: Admin Dashboard | 19 | 17 | 2 | 0 |
| Phase 8: PDF Reader | 4 | 2 | 2 | 0 |
| Phase 9: Testing | 7 | 5 | 2 | 0 |
| Phase 10: Deployment | 4 | 4 | 0 | 0 |
| **Total** | **119** | **93** | **26** | **0** |

---

*Document generated based on PRD.md, Architecture.md, and TECH_DESIGN.md*
