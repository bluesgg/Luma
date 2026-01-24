# Luma Web

AI 驱动的 PDF 学习助手，帮助学生高效理解课程资料。

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 框架 | Next.js 14 (App Router) | 全栈框架，前后端一体 |
| 语言 | TypeScript | 全栈使用 |
| 样式 | Tailwind CSS | 原子化 CSS |
| 数据库 | PostgreSQL (Supabase) | 托管数据库 |
| ORM | Prisma | 类型安全的数据库访问 |
| 文件存储 | Cloudflare R2 | S3 兼容，存储 PDF |
| 后台任务 | Trigger.dev | PDF 处理、配额重置 |
| AI 服务 | OpenRouter | 多模型网关 (Claude/GPT/Gemini) |
| 邮件 | Resend | 验证邮件、密码重置 |
| 部署 | Vercel | 自动部署 |
| 认证 | 自建 (httpOnly Cookie) | 邮箱密码认证 |

## 目录结构

```
studentaid-web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # 认证相关页面 (登录/注册/重置密码)
│   │   ├── (main)/             # 主应用页面 (需登录)
│   │   │   ├── courses/        # 课程列表和详情
│   │   │   ├── files/[id]/     # PDF 阅读器
│   │   │   └── settings/       # 用户设置
│   │   ├── admin/              # 管理后台
│   │   └── api/                # API Routes
│   │       ├── auth/           # 认证 API
│   │       ├── courses/        # 课程 API
│   │       ├── files/          # 文件 API
│   │       ├── quota/          # 配额 API
│   │       └── admin/          # 管理 API
│   ├── components/             # React 组件
│   │   ├── ui/                 # 基础 UI 组件
│   │   ├── pdf/                # PDF 阅读器组件
│   │   └── admin/              # 管理后台组件
│   ├── lib/                    # 工具函数和服务
│   │   ├── db.ts               # Prisma 客户端
│   │   ├── auth.ts             # 认证逻辑
│   │   ├── storage.ts          # R2 存储操作
│   │   ├── ai.ts               # OpenRouter 客户端
│   │   ├── email.ts            # Resend 邮件
│   │   └── quota.ts            # 配额管理
│   ├── hooks/                  # React Hooks
│   ├── types/                  # TypeScript 类型定义
│   └── i18n/                   # 国际化 (en/zh)
├── prisma/
│   └── schema.prisma           # 数据库 Schema
├── trigger/                    # Trigger.dev 任务
│   ├── pdf-processing.ts       # PDF 处理任务
│   └── quota-reset.ts          # 配额重置任务
├── public/                     # 静态资源
├── docs/                       # 项目文档
│   ├── PRD.md                  # 产品需求文档
│   └── TASKS.md                # 任务分解
└── tests/                      # 测试文件
```

## 开发命令

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 数据库
pnpm db:generate    # 生成 Prisma Client
pnpm db:push        # 推送 Schema 到数据库
pnpm db:migrate     # 创建迁移文件
pnpm db:studio      # 打开 Prisma Studio

# Trigger.dev 本地开发
pnpm trigger:dev

# 构建
pnpm build

# 类型检查
pnpm typecheck

# 代码检查
pnpm lint
pnpm lint:fix
```

## 环境变量

```bash
# .env.local
DATABASE_URL=               # Supabase PostgreSQL 连接串
DIRECT_URL=                 # Supabase 直连 URL (Prisma 迁移用)

R2_ACCOUNT_ID=              # Cloudflare Account ID
R2_ACCESS_KEY_ID=           # R2 Access Key
R2_SECRET_ACCESS_KEY=       # R2 Secret Key
R2_BUCKET_NAME=             # R2 Bucket 名称
R2_PUBLIC_URL=              # R2 公开访问 URL

OPENROUTER_API_KEY=         # OpenRouter API Key

RESEND_API_KEY=             # Resend API Key
EMAIL_FROM=                 # 发件人地址

TRIGGER_API_KEY=            # Trigger.dev API Key
TRIGGER_API_URL=            # Trigger.dev API URL

SUPER_ADMIN_EMAIL=          # 超级管理员邮箱
SUPER_ADMIN_PASSWORD=       # 超级管理员初始密码 (仅首次启动)

NEXT_PUBLIC_APP_URL=        # 应用 URL (用于邮件链接)
```

## 代码规范

### 命名约定

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件/目录 | kebab-case | `user-profile.tsx`, `api-client.ts` |
| React 组件 | PascalCase | `UserProfile`, `CourseList` |
| 函数/变量 | camelCase | `getUserById`, `isLoading` |
| 常量 | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `API_TIMEOUT` |
| 类型/接口 | PascalCase | `User`, `CourseWithFiles` |
| 数据库表 | PascalCase (Prisma) | `User`, `Course`, `VerificationToken` |
| API 路由 | kebab-case | `/api/courses/:id/files` |

### API 设计

```typescript
// 成功响应
{ data: T }

// 错误响应
{ error: { code: string, message: string } }

// 分页响应
{ data: T[], pagination: { page, pageSize, total } }
```

### 错误码规范

| 前缀 | 模块 | 示例 |
|------|------|------|
| AUTH_ | 认证 | `AUTH_INVALID_CREDENTIALS`, `AUTH_EMAIL_NOT_VERIFIED` |
| COURSE_ | 课程 | `COURSE_LIMIT_EXCEEDED`, `COURSE_NOT_FOUND` |
| FILE_ | 文件 | `FILE_TOO_LARGE`, `FILE_DUPLICATE_NAME` |
| QUOTA_ | 配额 | `QUOTA_EXCEEDED` |
| AI_ | AI服务 | `AI_SERVICE_TIMEOUT`, `AI_SERVICE_ERROR` |

### 组件结构

```typescript
// 组件文件结构
export function ComponentName({ prop1, prop2 }: Props) {
  // 1. hooks
  // 2. 派生状态
  // 3. 事件处理函数
  // 4. 副作用
  // 5. 渲染
  return (...)
}
```

### 数据获取

- 服务端组件：直接调用 Prisma
- 客户端组件：使用 fetch + React Query 或 SWR
- API Routes：处理认证、验证、业务逻辑

## 业务规则速查

### 配额限制

| 配额桶 | 限制 | 重置周期 |
|--------|------|----------|
| learningInteractions | 150次/月 | 注册日同日 |
| autoExplain | 300次/月 | 注册日同日 |

### 文件限制

| 限制项 | 值 |
|--------|-----|
| 单文件大小 | ≤200MB |
| 单文件页数 | ≤500页 |
| 单课程文件数 | ≤30个 |
| 用户总存储 | ≤5GB |
| 每用户课程数 | ≤6门 |

### 认证规则

| 规则 | 值 |
|------|-----|
| 密码最小长度 | 8位 |
| 登录失败锁定 | 5次失败 → 锁定30分钟 |
| 会话有效期 | 7天 (记住我: 30天) |
| 验证链接有效期 | 24小时 |
| 重置链接有效期 | 24小时 |
| 邮件限流 | 5次/15分钟 |

## 关键文档

| 文档 | 路径 | 用途 |
|------|------|------|
| PRD.md | `docs/PRD.md` | 产品需求文档，包含所有功能模块详细说明 |
| TASKS.md | `docs/TASKS.md` | 任务分解，按优先级和阶段划分 |
| DATABASE.md | `docs/DATABASE.md` | 数据库设计，表结构、关系、索引说明 |
| API.md | `docs/API.md` | API 接口文档，所有端点的请求/响应格式 |

## AI 辅助开发指南

### 开发新功能时

1. 先查阅 `docs/PRD.md` 确认需求细节和业务规则
2. 查阅 `docs/TASKS.md` 找到对应任务编号
3. 按任务编号顺序开发，注意依赖关系

### 查阅文档指引

| 开发内容 | 应查阅 |
|----------|--------|
| 业务逻辑、产品规则 | PRD.md |
| 任务优先级、开发顺序 | TASKS.md |
| 数据库模型、表关系、Prisma Schema | DATABASE.md |
| API 路径、请求参数、响应格式 | API.md |

### 代码生成偏好

- 优先使用 Server Components，需要交互时再用 Client Components
- 表单使用 React Hook Form + Zod 验证
- 数据表格使用 TanStack Table
- 使用 `cn()` 工具函数合并 Tailwind 类名
- 错误处理统一使用 `AppError` 类

### 不要做的事

- 不要在 Client Components 中直接调用 Prisma
- 不要硬编码业务规则数值，使用 `src/lib/constants.ts`
- 不要跳过类型定义，所有 API 响应都需要类型
- 不要忘记处理 loading 和 error 状态
