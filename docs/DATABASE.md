# Luma Web - 数据库设计文档

> **版本**: v1.0
> **最后更新**: 2026-01-19
> **对应 Schema**: `prisma/schema.prisma`

---

## 1. 概述

### 技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| 数据库 | PostgreSQL | 托管于 Supabase |
| ORM | Prisma | 类型安全的数据库访问 |
| 迁移 | Prisma Migrate | 版本控制的数据库迁移 |

### 表总览 (15 张表)

| 模块 | 表名 | 用途 |
|------|------|------|
| 用户认证 | `users` | 用户账户信息 |
| 用户认证 | `verification_tokens` | 邮箱验证/密码重置令牌 |
| 课程管理 | `courses` | 课程信息 |
| 文件管理 | `files` | PDF 文件元数据 |
| PDF 学习 | `explanations` | 页面 AI 讲解内容 |
| PDF 学习 | `image_regions` | PDF 图片区域及解释 |
| PDF 学习 | `qas` | 问答记录 |
| PDF 学习 | `reading_progress` | 阅读进度 |
| 配额管理 | `quotas` | 用户配额状态 |
| 配额管理 | `quota_logs` | 配额变动日志 |
| 用户设置 | `user_preferences` | 用户偏好设置 |
| 管理后台 | `admins` | 管理员账户 (独立体系) |
| 日志系统 | `access_logs` | 用户访问日志 |
| 日志系统 | `ai_usage_logs` | AI 使用量日志 |
| 日志系统 | `audit_logs` | 管理员操作审计日志 |

---

## 2. ER 关系图

```mermaid
erDiagram
    %% ==================== User Authentication ====================
    User {
        string id PK
        string email UK
        string password_hash
        datetime email_confirmed_at
        datetime last_login_at
        int failed_login_attempts
        datetime locked_until
        datetime created_at
        datetime updated_at
    }

    VerificationToken {
        string id PK
        string user_id FK
        string token UK
        enum type
        datetime expires_at
        datetime created_at
    }

    %% ==================== Course Management ====================
    Course {
        string id PK
        string user_id FK
        string name
        string school
        string term
        datetime created_at
        datetime updated_at
    }

    %% ==================== File Management ====================
    File {
        string id PK
        string course_id FK
        string name
        enum type
        int page_count
        int file_size
        boolean is_scanned
        enum status
        string storage_path
        datetime created_at
    }

    %% ==================== PDF Learning ====================
    Explanation {
        string id PK
        string file_id FK
        int page_number
        text content
        datetime created_at
    }

    ImageRegion {
        string id PK
        string file_id FK
        int page_number
        json bbox
        text explanation
        datetime created_at
    }

    QA {
        string id PK
        string file_id FK
        text question
        text answer
        json page_refs
        datetime created_at
    }

    ReadingProgress {
        string id PK
        string user_id FK
        string file_id FK
        int page_number
        datetime updated_at
    }

    %% ==================== Quota Management ====================
    Quota {
        string id PK
        string user_id FK
        enum bucket
        int used
        int limit
        datetime reset_at
    }

    QuotaLog {
        string id PK
        string user_id FK
        enum bucket
        int change
        enum reason
        datetime created_at
    }

    %% ==================== User Settings ====================
    UserPreference {
        string id PK
        string user_id FK_UK
        string ui_locale
        string explain_locale
        datetime updated_at
    }

    %% ==================== Admin Management ====================
    Admin {
        string id PK
        string email UK
        string password_hash
        enum role
        datetime created_at
        datetime disabled_at
    }

    %% ==================== Logging ====================
    AccessLog {
        string id PK
        string user_id FK
        enum action_type
        json metadata
        datetime timestamp
    }

    AIUsageLog {
        string id PK
        string user_id FK
        enum action_type
        int input_tokens
        int output_tokens
        string model
        datetime created_at
    }

    AuditLog {
        string id PK
        string admin_id FK
        string action
        string target_user_id
        json details
        datetime created_at
    }

    %% ==================== Relationships ====================
    User ||--o{ VerificationToken : "has"
    User ||--o{ Course : "owns"
    User ||--o{ Quota : "has"
    User ||--o{ QuotaLog : "has"
    User ||--o{ ReadingProgress : "has"
    User ||--|| UserPreference : "has"
    User ||--o{ AccessLog : "generates"
    User ||--o{ AIUsageLog : "generates"

    Course ||--o{ File : "contains"

    File ||--o{ Explanation : "has"
    File ||--o{ ImageRegion : "has"
    File ||--o{ QA : "has"
    File ||--o{ ReadingProgress : "tracks"

    Admin ||--o{ AuditLog : "generates"
```

### 关系说明

| 关系 | 类型 | 说明 |
|------|------|------|
| User → Course | 1:N | 用户拥有多个课程 |
| User → Quota | 1:N | 用户有多个配额桶 |
| User → QuotaLog | 1:N | 用户的配额变动记录 |
| User → ReadingProgress | 1:N | 用户的阅读进度记录 |
| User → UserPreference | 1:1 | 用户的偏好设置 |
| User → VerificationToken | 1:N | 用户的验证令牌 |
| User → AccessLog | 1:N | 用户的访问日志 |
| User → AIUsageLog | 1:N | 用户的 AI 使用日志 |
| Course → File | 1:N | 课程包含多个文件 |
| File → Explanation | 1:N | 文件的页面讲解 |
| File → ImageRegion | 1:N | 文件的图片区域 |
| File → QA | 1:N | 文件的问答记录 |
| File → ReadingProgress | 1:N | 文件的阅读进度 |
| Admin → AuditLog | 1:N | 管理员的操作日志 |

---

## 3. 表详细说明

### 3.1 用户认证模块

#### users (用户表)

存储用户账户基本信息和登录状态。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | String | PK, cuid | 用户唯一标识 |
| `email` | String | UNIQUE | 邮箱地址 |
| `password_hash` | String | NOT NULL | 密码哈希值 |
| `email_confirmed_at` | DateTime | NULLABLE | 邮箱验证时间 |
| `last_login_at` | DateTime | NULLABLE | 最后登录时间 |
| `failed_login_attempts` | Int | DEFAULT 0 | 连续登录失败次数 |
| `locked_until` | DateTime | NULLABLE | 账户锁定截止时间 |
| `created_at` | DateTime | DEFAULT now() | 创建时间 |
| `updated_at` | DateTime | @updatedAt | 更新时间 |

**业务规则**:
- 连续登录失败 5 次后锁定 30 分钟
- 邮箱验证后方可登录 (`email_confirmed_at` 非空)

---

#### verification_tokens (验证令牌表)

存储邮箱验证和密码重置令牌。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | String | PK, cuid | 令牌唯一标识 |
| `user_id` | String | FK → users.id | 关联用户 |
| `token` | String | UNIQUE | 令牌值 |
| `type` | VerificationTokenType | NOT NULL | 令牌类型 |
| `expires_at` | DateTime | NOT NULL | 过期时间 |
| `created_at` | DateTime | DEFAULT now() | 创建时间 |

**索引**: `user_id`, `token`

**业务规则**:
- 验证链接有效期: 24 小时
- 重置链接有效期: 24 小时

---

### 3.2 课程管理模块

#### courses (课程表)

存储用户创建的课程信息。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | String | PK, cuid | 课程唯一标识 |
| `user_id` | String | FK → users.id | 所属用户 |
| `name` | String | VARCHAR(50) | 课程名称 |
| `school` | String | VARCHAR(100), NULLABLE | 学校名称 |
| `term` | String | VARCHAR(50), NULLABLE | 学期 |
| `created_at` | DateTime | DEFAULT now() | 创建时间 |
| `updated_at` | DateTime | @updatedAt | 更新时间 |

**索引**: `user_id`

**业务规则**:
- 每用户最多 6 门课程
- 删除课程级联删除所有关联数据

---

### 3.3 文件管理模块

#### files (文件表)

存储 PDF 文件元数据信息。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | String | PK, cuid | 文件唯一标识 |
| `course_id` | String | FK → courses.id | 所属课程 |
| `name` | String | VARCHAR(255) | 文件名 |
| `type` | FileType | DEFAULT LECTURE | 文件类型 |
| `page_count` | Int | NULLABLE | 页数 |
| `file_size` | Int | NOT NULL | 文件大小 (字节) |
| `is_scanned` | Boolean | DEFAULT false | 是否为扫描件 |
| `status` | FileStatus | DEFAULT UPLOADING | 处理状态 |
| `storage_path` | String | NOT NULL | R2 存储路径 |
| `created_at` | DateTime | DEFAULT now() | 创建时间 |

**索引**: `course_id`

**唯一约束**: `(course_id, name)` - 同课程内文件名唯一

**业务规则**:
- 单文件大小: ≤200MB
- 单文件页数: ≤500 页
- 单课程文件数: ≤30 个
- 用户总存储: ≤5GB
- 扫描件 PDF 禁用 AI 功能

---

### 3.4 PDF 学习模块

#### explanations (页面讲解表)

存储 AI 生成的页面讲解内容。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | String | PK, cuid | 讲解唯一标识 |
| `file_id` | String | FK → files.id | 所属文件 |
| `page_number` | Int | NOT NULL | 页码 |
| `content` | Text | NOT NULL | 讲解内容 |
| `created_at` | DateTime | DEFAULT now() | 创建时间 |

**索引**: `file_id`

**唯一约束**: `(file_id, page_number)` - 每页只有一个讲解

---

#### image_regions (图片区域表)

存储 PDF 中检测到的图片区域及其解释。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | String | PK, cuid | 区域唯一标识 |
| `file_id` | String | FK → files.id | 所属文件 |
| `page_number` | Int | NOT NULL | 页码 |
| `bbox` | Json | NOT NULL | 边界框 `{ x, y, width, height }` |
| `explanation` | Text | NULLABLE | 图片解释 |
| `created_at` | DateTime | DEFAULT now() | 创建时间 |

**索引**: `(file_id, page_number)`

---

#### qas (问答表)

存储用户的问答记录。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | String | PK, cuid | 问答唯一标识 |
| `file_id` | String | FK → files.id | 所属文件 |
| `question` | Text | NOT NULL | 用户问题 |
| `answer` | Text | NOT NULL | AI 回答 |
| `page_refs` | Json | NULLABLE | 引用页码数组 |
| `created_at` | DateTime | DEFAULT now() | 创建时间 |

**索引**: `file_id`

**关联链**: QA → File → Course → User (通过文件关联到用户)

---

#### reading_progress (阅读进度表)

记录用户的阅读位置。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | String | PK, cuid | 进度唯一标识 |
| `user_id` | String | FK → users.id | 所属用户 |
| `file_id` | String | FK → files.id | 所属文件 |
| `page_number` | Int | NOT NULL | 当前页码 |
| `updated_at` | DateTime | @updatedAt | 更新时间 |

**索引**: `user_id`

**唯一约束**: `(user_id, file_id)` - 每用户每文件一条记录

---

### 3.5 配额管理模块

#### quotas (配额表)

存储用户的配额使用状态。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | String | PK, cuid | 配额唯一标识 |
| `user_id` | String | FK → users.id | 所属用户 |
| `bucket` | QuotaBucket | NOT NULL | 配额桶类型 |
| `used` | Int | DEFAULT 0 | 已使用量 |
| `limit` | Int | NOT NULL | 配额上限 |
| `reset_at` | DateTime | NOT NULL | 下次重置时间 |

**索引**: `user_id`

**唯一约束**: `(user_id, bucket)` - 每用户每桶一条记录

**业务规则**:
- `LEARNING_INTERACTIONS`: 问答 150 次/月
- `AUTO_EXPLAIN`: 自动讲解 300 次/月
- 每月用户注册日同一天重置

---

#### quota_logs (配额日志表)

记录配额变动历史。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | String | PK, cuid | 日志唯一标识 |
| `user_id` | String | FK → users.id | 所属用户 |
| `bucket` | QuotaBucket | NOT NULL | 配额桶类型 |
| `change` | Int | NOT NULL | 变动量 (正/负) |
| `reason` | QuotaLogReason | NOT NULL | 变动原因 |
| `created_at` | DateTime | DEFAULT now() | 创建时间 |

**索引**: `user_id`, `created_at`

---

### 3.6 用户设置模块

#### user_preferences (用户偏好表)

存储用户的个人设置。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | String | PK, cuid | 偏好唯一标识 |
| `user_id` | String | FK → users.id, UNIQUE | 所属用户 |
| `ui_locale` | String | VARCHAR(10), DEFAULT 'en' | UI 语言 |
| `explain_locale` | String | VARCHAR(10), DEFAULT 'en' | AI 解释语言 |
| `updated_at` | DateTime | @updatedAt | 更新时间 |

**业务规则**:
- 支持语言: `en`, `zh`
- UI 语言默认跟随浏览器

---

### 3.7 管理后台模块

#### admins (管理员表)

存储管理员账户 (独立于用户账户体系)。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | String | PK, cuid | 管理员唯一标识 |
| `email` | String | UNIQUE | 邮箱地址 |
| `password_hash` | String | NOT NULL | 密码哈希值 |
| `role` | AdminRole | DEFAULT ADMIN | 角色 |
| `created_at` | DateTime | DEFAULT now() | 创建时间 |
| `disabled_at` | DateTime | NULLABLE | 禁用时间 |

**业务规则**:
- 超级管理员通过环境变量 `SUPER_ADMIN_EMAIL` 创建
- 管理员可被禁用但不删除 (保留审计日志)

---

### 3.8 日志系统模块

#### access_logs (访问日志表)

记录用户访问行为。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | String | PK, cuid | 日志唯一标识 |
| `user_id` | String | FK → users.id | 所属用户 |
| `action_type` | AccessLogType | NOT NULL | 行为类型 |
| `metadata` | Json | NULLABLE | 附加数据 |
| `timestamp` | DateTime | DEFAULT now() | 时间戳 |

**索引**: `user_id`, `timestamp`, `action_type`

---

#### ai_usage_logs (AI 使用日志表)

记录 AI 调用的 token 消耗。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | String | PK, cuid | 日志唯一标识 |
| `user_id` | String | FK → users.id | 所属用户 |
| `action_type` | AIActionType | NOT NULL | 操作类型 |
| `input_tokens` | Int | NOT NULL | 输入 token 数 |
| `output_tokens` | Int | NOT NULL | 输出 token 数 |
| `model` | String | VARCHAR(50) | 使用的模型 |
| `created_at` | DateTime | DEFAULT now() | 创建时间 |

**索引**: `user_id`, `created_at`

---

#### audit_logs (审计日志表)

记录管理员操作历史。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | String | PK, cuid | 日志唯一标识 |
| `admin_id` | String | FK → admins.id | 操作管理员 |
| `action` | String | VARCHAR(100) | 操作类型 |
| `target_user_id` | String | NULLABLE | 目标用户 ID |
| `details` | Json | NULLABLE | 操作详情 |
| `created_at` | DateTime | DEFAULT now() | 创建时间 |

**索引**: `admin_id`, `created_at`

---

## 4. 枚举类型

### VerificationTokenType (验证令牌类型)

| 值 | 说明 |
|-----|------|
| `EMAIL_VERIFY` | 邮箱验证 |
| `PASSWORD_RESET` | 密码重置 |

### FileType (文件类型)

| 值 | 说明 |
|-----|------|
| `LECTURE` | 课件 (MVP 默认) |
| `HOMEWORK` | 作业 (Future) |
| `EXAM` | 考试 (Future) |
| `OTHER` | 其他 (Future) |

### FileStatus (文件状态)

| 值 | 说明 |
|-----|------|
| `UPLOADING` | 上传中 |
| `PROCESSING` | 处理中 |
| `READY` | 就绪 |
| `FAILED` | 失败 |

### QuotaBucket (配额桶)

| 值 | 限制 | 说明 |
|-----|------|------|
| `LEARNING_INTERACTIONS` | 150次/月 | 问答功能 |
| `AUTO_EXPLAIN` | 300次/月 | 自动讲解 |

### QuotaLogReason (配额变动原因)

| 值 | 说明 |
|-----|------|
| `SYSTEM_RESET` | 系统月度重置 |
| `ADMIN_ADJUST` | 管理员手动调整 |
| `CONSUME` | 用户消耗 |
| `REFUND` | 退还 (AI 失败时) |

### AdminRole (管理员角色)

| 值 | 说明 |
|-----|------|
| `SUPER_ADMIN` | 超级管理员 (可管理其他管理员) |
| `ADMIN` | 普通管理员 |

### AccessLogType (访问日志类型)

| 值 | 说明 |
|-----|------|
| `LOGIN` | 登录 |
| `VIEW_FILE` | 查看文件 |
| `USE_QA` | 使用问答 |
| `USE_EXPLAIN` | 使用讲解 |

### AIActionType (AI 操作类型)

| 值 | 说明 |
|-----|------|
| `QA` | 问答 |
| `EXPLAIN` | 讲解 |

---

## 5. 级联删除规则

所有外键关系均配置 `onDelete: Cascade`，删除父记录时自动删除关联的子记录。

| 删除操作 | 级联影响 |
|----------|----------|
| 删除 User | → VerificationToken, Course, Quota, QuotaLog, ReadingProgress, UserPreference, AccessLog, AIUsageLog |
| 删除 Course | → File |
| 删除 File | → Explanation, ImageRegion, QA, ReadingProgress |
| 删除 Admin | → AuditLog |

### 级联删除链示例

```
删除用户 (User)
  └── 删除课程 (Course) × N
        └── 删除文件 (File) × N
              ├── 删除讲解 (Explanation) × N
              ├── 删除图片区域 (ImageRegion) × N
              ├── 删除问答 (QA) × N
              └── 删除阅读进度 (ReadingProgress) × N
  └── 删除配额 (Quota) × N
  └── 删除配额日志 (QuotaLog) × N
  └── 删除用户偏好 (UserPreference)
  └── 删除验证令牌 (VerificationToken) × N
  └── 删除访问日志 (AccessLog) × N
  └── 删除 AI 使用日志 (AIUsageLog) × N
```

---

## 6. 数据库字段命名映射

Prisma 模型使用 camelCase，数据库表/字段使用 snake_case。

| Prisma 模型 | 数据库表名 |
|-------------|-----------|
| `User` | `users` |
| `VerificationToken` | `verification_tokens` |
| `Course` | `courses` |
| `File` | `files` |
| `Explanation` | `explanations` |
| `ImageRegion` | `image_regions` |
| `QA` | `qas` |
| `ReadingProgress` | `reading_progress` |
| `Quota` | `quotas` |
| `QuotaLog` | `quota_logs` |
| `UserPreference` | `user_preferences` |
| `Admin` | `admins` |
| `AccessLog` | `access_logs` |
| `AIUsageLog` | `ai_usage_logs` |
| `AuditLog` | `audit_logs` |

常用字段映射:
- `userId` → `user_id`
- `courseId` → `course_id`
- `fileId` → `file_id`
- `adminId` → `admin_id`
- `createdAt` → `created_at`
- `updatedAt` → `updated_at`
- `passwordHash` → `password_hash`
- `pageNumber` → `page_number`
- `actionType` → `action_type`
