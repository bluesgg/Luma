# Luma Web - 技术设计文档

> **版本**: v1.0
> **最后更新**: 2026-01-24
> **对应 PRD 版本**: v1.1 MVP

---

## 目录

1. [技术栈总览](#1-技术栈总览)
2. [系统架构](#2-系统架构)
3. [数据库设计](#3-数据库设计)
4. [认证方案](#4-认证方案)
5. [文件存储方案](#5-文件存储方案)
6. [PDF 处理流程](#6-pdf-处理流程)
7. [AI 集成方案](#7-ai-集成方案)
8. [API 设计](#8-api-设计)
9. [后台任务](#9-后台任务)
10. [部署方案](#10-部署方案)
11. [开发规范](#11-开发规范)

---

## 1. 技术栈总览

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 前端框架 | Next.js 14 (App Router) | React 全栈框架 |
| 样式 | Tailwind CSS + shadcn/ui | 组件库 |
| 状态管理 | Zustand / React Query | 客户端状态 + 服务端缓存 |
| 后端 | Next.js API Routes + Server Actions | Serverless |
| 数据库 | Supabase PostgreSQL | 托管 Postgres |
| ORM | Prisma | 类型安全 |
| 认证 | Supabase Auth | 邮箱验证开箱即用 |
| 文件存储 | Supabase Storage | MVP 阶段，后期可迁移 R2 |
| PDF 渲染 | react-pdf (pdf.js) | 前端阅读器 |
| AI 服务 | Gemini 2.5 Pro (主) + OpenAI/Claude (备) | 多平台支持 |
| 部署 | Vercel | Serverless |
| 定时任务 | cron-job.org | 外部 Cron 服务 |

---

## 2. 系统架构

### 2.1 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                          客户端 (Browser)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   课程管理   │  │   文件管理   │  │    PDF 阅读器 (pdf.js)   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Vercel (Next.js)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  API Routes  │  │Server Actions│  │     Middleware       │   │
│  └──────┬───────┘  └──────┬───────┘  │   (Auth 检查)        │   │
│         └────────┬────────┘          └──────────────────────┘   │
│                  ▼                                               │
│         ┌─────────────────┐                                      │
│         │   Prisma ORM    │                                      │
│         └────────┬────────┘                                      │
└──────────────────┼──────────────────────────────────────────────┘
                   │
     ┌─────────────┼─────────────┬─────────────────┐
     ▼             ▼             ▼                 ▼
┌─────────┐  ┌──────────┐  ┌──────────┐    ┌─────────────┐
│Supabase │  │ Supabase │  │ Supabase │    │   AI APIs   │
│  Auth   │  │ Postgres │  │ Storage  │    │ Gemini/GPT  │
└─────────┘  └──────────┘  └──────────┘    └─────────────┘
```

### 2.2 目录结构

```
luma-web/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── (auth)/                # 登录/注册
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (main)/                # 主应用（需登录）
│   │   │   ├── courses/
│   │   │   ├── files/
│   │   │   ├── reader/[fileId]/
│   │   │   └── settings/
│   │   ├── (admin)/               # 管理后台
│   │   │   └── admin/
│   │   └── api/
│   │       ├── auth/
│   │       ├── courses/
│   │       ├── files/
│   │       ├── ai/
│   │       ├── cron/
│   │       └── admin/
│   ├── components/
│   │   ├── ui/                    # shadcn/ui
│   │   ├── course/
│   │   ├── file/
│   │   ├── reader/
│   │   └── admin/
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── supabase.ts
│   │   ├── ai/                    # 多 LLM 封装
│   │   │   ├── index.ts
│   │   │   ├── gemini.ts
│   │   │   ├── openai.ts
│   │   │   └── anthropic.ts
│   │   ├── pdf.ts
│   │   └── quota.ts
│   ├── hooks/
│   ├── stores/
│   └── types/
├── public/
├── .env.local
├── CLAUDE.md
├── PRD.md
└── TECH_DESIGN.md
```

---

## 3. 数据库设计

### 3.1 ER 图

```
┌──────────────────┐
│   auth.users     │ (Supabase 管理)
└────────┬─────────┘
         │ 1:1
         ▼
┌──────────────────┐     ┌──────────────────┐
│     Profile      │     │  UserPreference  │
│ ──────────────── │     │ ──────────────── │
│ user_id (PK,FK)  │     │ user_id (PK,FK)  │
│ role             │     │ ui_locale        │
└────────┬─────────┘     │ explain_locale   │
         │               └──────────────────┘
         │ 1:N
    ┌────┴────┐
    ▼         ▼
┌────────┐  ┌────────┐
│ Course │  │ Quota  │
└───┬────┘  └────────┘
    │ 1:N
    ▼
┌────────┐
│  File  │
└───┬────┘
    │ 1:N
    ├──────────┬──────────┬──────────┐
    ▼          ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌─────────────┐
│Explain │ │   QA   │ │ Image  │ │  Reading    │
│        │ │        │ │ Region │ │  Progress   │
└────────┘ └────────┘ └────────┘ └─────────────┘
```

### 3.2 表设计

#### Profile

| 字段 | 类型 | 说明 |
|------|------|------|
| user_id | uuid | PK, FK → auth.users |
| role | enum('student','admin') | 默认 student |
| created_at | timestamp | |
| updated_at | timestamp | |

> MVP 不实现登录锁定，依赖 Supabase 默认行为

#### Course

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | PK |
| user_id | uuid | FK |
| name | varchar(50) | NOT NULL |
| school | varchar(100) | |
| term | varchar(50) | |
| created_at | timestamp | |
| updated_at | timestamp | |

索引: `UNIQUE(user_id, name)`

#### File

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | PK |
| course_id | uuid | FK, ON DELETE CASCADE |
| user_id | uuid | FK, 冗余字段便于查询 |
| name | varchar(255) | |
| type | enum('lecture') | MVP 固定值 |
| page_count | int | |
| file_size | bigint | 字节 |
| is_scanned | boolean | 默认 false |
| status | enum | uploading/processing/ready/failed |
| storage_path | varchar(500) | |
| created_at | timestamp | |
| updated_at | timestamp | 状态变更时更新 |

索引: `UNIQUE(course_id, name)`, `(user_id)`

#### Explanation

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | PK |
| file_id | uuid | FK, ON DELETE CASCADE |
| page_number | int | |
| content | text | AI 生成的讲解 |
| created_at | timestamp | |

索引: `UNIQUE(file_id, page_number)`

#### ImageRegion

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | PK |
| file_id | uuid | FK, ON DELETE CASCADE |
| page_number | int | |
| bbox | jsonb | {x, y, width, height} |
| explanation | text | AI 生成的图片解释 |
| created_at | timestamp | |

#### QA

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | PK |
| file_id | uuid | FK, ON DELETE CASCADE |
| question | text | |
| answer | text | |
| page_refs | jsonb | 引用页码 [1,3,5] |
| created_at | timestamp | |

> 问答只关联到提问时所在的文件，不支持跨文件

#### ReadingProgress

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | PK |
| user_id | uuid | FK |
| file_id | uuid | FK, ON DELETE CASCADE |
| page_number | int | |
| updated_at | timestamp | |

索引: `UNIQUE(user_id, file_id)`

#### Quota

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | PK |
| user_id | uuid | FK |
| bucket | enum | learningInteractions / autoExplain |
| used | int | 默认 0 |
| limit | int | 150 / 300 |
| reset_at | timestamp | 下次重置时间 |

索引: `UNIQUE(user_id, bucket)`

#### QuotaLog

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | PK |
| user_id | uuid | FK |
| bucket | enum | |
| change | int | +1 消耗, -1 退还 |
| reason | enum | consume/refund/system_reset/admin_adjust |
| created_at | timestamp | |

#### UserPreference

| 字段 | 类型 | 说明 |
|------|------|------|
| user_id | uuid | PK, FK |
| ui_locale | enum('en','zh') | 默认 en |
| explain_locale | enum('en','zh') | 默认 en |
| updated_at | timestamp | |

#### Admin（独立账户体系）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | PK |
| email | varchar(255) | UNIQUE |
| password_hash | varchar(255) | bcrypt |
| role | enum | super_admin / admin |
| created_at | timestamp | |
| disabled_at | timestamp | |

#### AccessLog

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | PK |
| user_id | uuid | |
| action_type | enum | login/view_file/use_qa/use_explain |
| metadata | jsonb | |
| timestamp | timestamp | |

#### AIUsageLog

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | PK |
| user_id | uuid | FK |
| action_type | enum | qa / explain |
| input_tokens | int | |
| output_tokens | int | |
| model | varchar(50) | |
| cost_cents | int | 成本（分） |
| created_at | timestamp | |

#### AuditLog（管理员操作审计）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | PK |
| admin_id | uuid | FK → Admin |
| action | varchar(50) | adjust_quota / disable_user 等 |
| target_user_id | uuid | 被操作的用户 |
| details | jsonb | 操作详情 |
| created_at | timestamp | |

---

## 4. 认证方案

### 4.1 Supabase Auth 提供

- ✅ 邮箱密码注册/登录
- ✅ 邮箱验证（自动发送）
- ✅ 密码重置
- ✅ Session 管理

### 4.2 MVP 简化

| PRD 需求 | MVP 实现 |
|----------|----------|
| 登录失败锁定 | 不做，依赖 Supabase |
| 邮件限流 | 不做，依赖 Supabase |
| 记住我 | Session 有效期配置 |
| 管理员账户 | 独立表 + bcrypt + JWT |

### 4.3 认证流程

```
注册:
1. supabase.auth.signUp(email, password)
2. Supabase 发送验证邮件
3. 用户点击验证
4. Webhook → 创建 Profile + Quota

登录:
1. supabase.auth.signInWithPassword()
2. 成功 → 记录 AccessLog

管理员登录:
1. POST /api/admin/login
2. bcrypt 验证
3. 签发独立 JWT
```

---

## 5. 文件存储方案

### 5.1 存储结构

```
bucket: luma-files
└── {user_id}/
    └── {course_id}/
        └── {file_id}.pdf
```

### 5.2 上传流程（支持断点续传）

```
1. POST /api/files/upload-url → 获取签名 URL
2. 前端使用 TUS 协议上传（显示进度条）
3. 上传完成 → POST /api/files/confirm
4. 后端：status = processing → 扫描件检测 → status = ready/failed
```

### 5.3 断点续传实现

Supabase Storage 支持 resumable upload，使用原生 API：

```typescript
// 1. 后端生成签名上传 URL
const { data, error } = await supabase.storage
  .from('luma-files')
  .createSignedUploadUrl(`${userId}/${courseId}/${fileId}.pdf`);

// 2. 前端上传（支持断点续传）
async function uploadFile(
  file: File, 
  signedUrl: string, 
  token: string,
  onProgress: (pct: number) => void
) {
  const xhr = new XMLHttpRequest();
  
  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      onProgress(Math.round((e.loaded / e.total) * 100));
    }
  };
  
  xhr.open('PUT', signedUrl);
  xhr.setRequestHeader('Authorization', `Bearer ${token}`);
  xhr.send(file);
  
  return new Promise((resolve, reject) => {
    xhr.onload = () => xhr.status === 200 ? resolve(true) : reject(xhr.statusText);
    xhr.onerror = () => reject('Upload failed');
  });
}
```

> 对于超大文件（>50MB），可使用 `tus-js-client` 配合自建 TUS 服务器，MVP 阶段暂用 Supabase 原生方案

### 5.4 限制检查

```typescript
async function checkLimits(userId: string, fileSize: number) {
  // 单文件 ≤200MB
  if (fileSize > 200 * 1024 * 1024) throw new Error('文件超过 200MB');
  
  // 用户总存储 ≤5GB
  const total = await prisma.file.aggregate({
    where: { course: { userId } },
    _sum: { fileSize: true }
  });
  if ((total._sum.fileSize || 0) + fileSize > 5 * 1024 * 1024 * 1024) {
    throw new Error('已达存储上限 5GB');
  }
}
```

---

## 6. PDF 处理流程

### 6.1 处理策略

| 时机 | 处理内容 | 方式 |
|------|----------|------|
| 上传时 | 扫描件检测 | 同步（几秒） |
| 用户打开页面时 | 文本提取 + 图片检测 | 按需实时 |
| 用户触发讲解时 | AI 生成 | 按需 |

### 6.2 扫描件检测

```typescript
async function detectScanned(pdfBuffer: Buffer): Promise<boolean> {
  const pdf = await getDocument({ data: pdfBuffer }).promise;
  const samplePages = Math.min(5, pdf.numPages);
  let textPages = 0;
  
  for (let i = 1; i <= samplePages; i++) {
    const page = await pdf.getPage(i);
    const text = await page.getTextContent();
    if (text.items.length > 50) textPages++;
  }
  
  // 80% 以上页面没有文字 → 扫描件
  return textPages / samplePages < 0.2;
}
```

### 6.3 文本提取（实时，不缓存）

```typescript
async function extractPageText(fileId: string, pageNumber: number): Promise<string> {
  const pdfBuffer = await downloadPDF(fileId);
  const pdf = await getDocument({ data: pdfBuffer }).promise;
  const page = await pdf.getPage(pageNumber);
  const content = await page.getTextContent();
  return content.items.map(item => item.str).join(' ');
}
```

> pdf.js 提取速度很快（毫秒级），MVP 不做缓存，避免一致性问题

### 6.4 图片区域检测

```typescript
async function detectImages(fileId: string, pageNumber: number) {
  // 检查是否已检测
  const existing = await prisma.imageRegion.findMany({
    where: { fileId, pageNumber }
  });
  if (existing.length) return existing;
  
  // 检测图片
  const page = await getPage(fileId, pageNumber);
  const ops = await page.getOperatorList();
  const regions = [];
  
  for (let i = 0; i < ops.fnArray.length; i++) {
    if (ops.fnArray[i] === OPS.paintImageXObject) {
      regions.push({ fileId, pageNumber, bbox: extractBBox(ops, i) });
    }
  }
  
  await prisma.imageRegion.createMany({ data: regions });
  return regions;
}
```

---

## 7. AI 集成方案

### 7.1 多平台定价对比

| 厂商 | 模型 | Input $/1M | Output $/1M |
|------|------|------------|-------------|
| **Google** | Gemini 2.5 Pro (≤200K) | $1.25 | $5.00 |
| Google | Gemini 2.5 Pro (>200K) | $2.50 | $10.00 |
| OpenAI | GPT-4o | $2.50 | $10.00 |
| Anthropic | Claude Sonnet 4.5 | $3.00 | $15.00 |
| Google | Gemini 2.5 Flash | $0.15 | $0.60 |
| Anthropic | Claude Haiku 3 | $0.25 | $1.25 |

> MVP 单页讲解 tokens 远小于 200K，使用标准定价

### 7.2 模型选择

| 功能 | 主力模型 | 备选 | 原因 |
|------|----------|------|------|
| 讲解 | Gemini 2.5 Pro | Claude Sonnet | 专业内容质量优先 |
| 问答 | Gemini 2.5 Pro | GPT-4o | 推理能力强 |

### 7.3 成本估算

| 功能 | 月配额 | tokens/次 | 单次成本 | 月成本/用户 |
|------|--------|-----------|----------|-------------|
| 讲解 | 300 | ~2000 | ~$0.006 | ~$1.80 |
| 问答 | 150 | ~3000 | ~$0.005 | ~$0.75 |
| **总计** | | | | **~$2.55** |

### 7.4 多平台封装

```typescript
// lib/ai/index.ts
export const MODELS = {
  gemini: { explain: 'gemini-2.5-pro', qa: 'gemini-2.5-pro' },
  openai: { explain: 'gpt-4o', qa: 'gpt-4o' },
  anthropic: { explain: 'claude-3-5-sonnet', qa: 'claude-3-5-sonnet' },
};

export async function complete(prompt: string, task: 'explain' | 'qa') {
  const providers = ['gemini', 'openai', 'anthropic'];
  
  for (const provider of providers) {
    try {
      return await callProvider(provider, prompt, MODELS[provider][task]);
    } catch (e) {
      console.error(`${provider} failed, trying next...`);
    }
  }
  throw new Error('All providers failed');
}
```

### 7.5 讲解生成

```typescript
async function generateExplanation(fileId: string, page: number, locale: 'en' | 'zh') {
  // 1. 检查缓存
  const cached = await prisma.explanation.findUnique({
    where: { fileId_pageNumber: { fileId, pageNumber: page } }
  });
  if (cached) return cached;
  
  // 2. 提取内容
  const text = await extractPageText(fileId, page);
  const images = await detectImages(fileId, page);
  
  // 3. 构造 prompt
  const prompt = `
${locale === 'zh' ? '用中文解释以下课程内容：' : 'Explain the following content:'}

${text}

${images.length ? `页面包含 ${images.length} 张图片，请一并解释。` : ''}

请提供：1. 主要概念总结 2. 重点知识点 ${images.length ? '3. 图片解释' : ''}
`;

  // 4. 调用 AI
  const response = await complete(prompt, 'explain');
  
  // 5. 记录并存储
  await logAIUsage(fileId, 'explain', response.usage);
  return prisma.explanation.create({
    data: { fileId, pageNumber: page, content: response.text }
  });
}
```

### 7.6 配额管理

```typescript
async function withQuota<T>(
  userId: string,
  bucket: 'learningInteractions' | 'autoExplain',
  fn: () => Promise<T>
): Promise<T> {
  const quota = await prisma.quota.findUnique({
    where: { userId_bucket: { userId, bucket } }
  });
  
  if (!quota || quota.used >= quota.limit) {
    throw new Error('本月配额已用尽');
  }
  
  // 预扣
  await prisma.quota.update({
    where: { id: quota.id },
    data: { used: { increment: 1 } }
  });
  
  try {
    return await Promise.race([
      fn(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('超时')), 30000))
    ]) as T;
  } catch (e) {
    // 失败退还
    await prisma.quota.update({
      where: { id: quota.id },
      data: { used: { decrement: 1 } }
    });
    throw e;
  }
}
```

### 7.7 RAG 预留

MVP 不实现 RAG，问答只用当前页 ±2 页作为上下文。预留接口：

```typescript
// lib/rag.ts
export interface RAGProvider {
  index(fileId: string, chunks: string[]): Promise<void>;
  search(query: string, topK: number): Promise<string[]>;
}

// MVP: 空实现
export const rag: RAGProvider = {
  async index() {},
  async search() { return []; },
};
```

---

## 8. API 设计

### 8.1 认证

| Method | Path | 说明 |
|--------|------|------|
| POST | /api/auth/register | 注册 |
| POST | /api/auth/login | 登录 |
| POST | /api/auth/logout | 登出 |
| POST | /api/auth/resend-verification | 重发验证邮件 |
| POST | /api/auth/reset-password | 请求重置密码 |
| POST | /api/auth/confirm-reset | 确认重置 |

### 8.2 课程

| Method | Path | 说明 |
|--------|------|------|
| GET | /api/courses | 列表 |
| POST | /api/courses | 创建 |
| GET | /api/courses/[id] | 详情 |
| PATCH | /api/courses/[id] | 更新 |
| DELETE | /api/courses/[id] | 删除 |

### 8.3 文件

| Method | Path | 说明 |
|--------|------|------|
| GET | /api/courses/[id]/files | 文件列表 |
| POST | /api/files/upload-url | 获取上传 URL |
| POST | /api/files/confirm | 确认上传完成 |
| DELETE | /api/files/[id] | 删除 |
| GET | /api/files/[id]/download-url | 下载 URL |

### 8.4 AI

| Method | Path | 说明 |
|--------|------|------|
| POST | /api/ai/explain | 生成讲解 |
| POST | /api/ai/qa | 问答 |
| GET | /api/files/[id]/explanations/[page] | 获取已有讲解 |
| GET | /api/files/[id]/qa | 问答历史 |

### 8.5 阅读进度

| Method | Path | 说明 |
|--------|------|------|
| GET | /api/files/[id]/progress | 获取 |
| PATCH | /api/files/[id]/progress | 更新 |

### 8.6 配额 & 设置

| Method | Path | 说明 |
|--------|------|------|
| GET | /api/quota | 配额信息 |
| GET | /api/settings | 用户设置 |
| PATCH | /api/settings | 更新设置 |

### 8.7 管理后台

| Method | Path | 说明 |
|--------|------|------|
| POST | /api/admin/login | 登录 |
| GET | /api/admin/stats | 系统概览 |
| GET | /api/admin/users | 用户列表 |
| POST | /api/admin/users/[id]/quota | 调整配额 |
| GET | /api/admin/ai-usage | AI 使用统计 |
| GET | /api/admin/workers | Worker 状态 |
| GET | /api/admin/audit-logs | 审计日志列表 |

### 8.8 Cron

| Method | Path | 说明 |
|--------|------|------|
| GET | /api/cron/reset-quota | 配额重置 |
| GET | /api/cron/check-workers | 僵尸任务检测 |
| GET | /api/cron/cleanup-uploads | 清理失败上传 |

### 8.9 响应格式

```typescript
// 成功
{ success: true, data: { ... } }

// 失败
{ success: false, error: { code: 'QUOTA_EXCEEDED', message: '配额已用尽' } }
```

---

## 9. 后台任务

### 9.1 使用外部 Cron 服务

Vercel Hobby 限制大，使用 [cron-job.org](https://cron-job.org)（免费）。

| 任务 | Schedule | 说明 |
|------|----------|------|
| 配额重置 | `0 0 * * *` | 每日检查并重置到期配额 |
| 僵尸检测 | `*/10 * * * *` | 检测并处理卡住的任务 |
| 清理上传 | `0 3 * * *` | 清理 uploading 状态超 24h 的文件 |

### 9.2 僵尸任务处理

```typescript
async function checkZombieTasks() {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  
  // 找到 processing 状态超过 10 分钟的文件（基于 updatedAt）
  const zombies = await prisma.file.findMany({
    where: {
      status: 'processing',
      updatedAt: { lt: tenMinutesAgo }
    }
  });
  
  for (const file of zombies) {
    // 1. 标记为失败
    await prisma.file.update({
      where: { id: file.id },
      data: { status: 'failed' }
    });
    
    // 2. 记录日志
    console.error(`Zombie task detected: file ${file.id}`);
    
    // 3. (可选) 清理存储中的文件
    await supabase.storage.from('luma-files').remove([file.storagePath]);
  }
  
  return { processed: zombies.length };
}
```

### 9.3 安全配置

```typescript
// Cron 端点验证
export async function GET(req: Request) {
  if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  // ...
}
```

cron-job.org 配置 Header: `Authorization: Bearer your-secret`

### 9.4 配额重置逻辑

```typescript
async function resetQuotas() {
  const now = new Date();
  const quotas = await prisma.quota.findMany({
    where: { resetAt: { lte: now } }
  });
  
  for (const q of quotas) {
    const nextReset = calculateNextReset(q.resetAt); // 基于用户注册日
    await prisma.quota.update({
      where: { id: q.id },
      data: { used: 0, resetAt: nextReset }
    });
    await logQuotaChange(q.userId, q.bucket, -q.used, 'system_reset');
  }
}
```

---

## 10. 部署方案

### 10.1 环境变量

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=luma-files

# Database
DATABASE_URL=

# AI (多平台)
GOOGLE_AI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Admin
SUPER_ADMIN_EMAIL=
ADMIN_JWT_SECRET=

# Cron
CRON_SECRET=
```

### 10.2 Vercel 配置

- Framework: Next.js
- Build: `prisma generate && next build`
- Node.js: 20.x

### 10.3 数据库迁移

```bash
# 开发
npx prisma migrate dev

# 生产
npx prisma migrate deploy
```

---

## 11. 开发规范

### 11.1 Git 工作流

```
main (生产)
└── develop (开发主线)
    ├── feature/xxx
    └── fix/xxx
```

### 11.2 提交规范

```
feat: 新功能
fix: 修复
docs: 文档
refactor: 重构
test: 测试
chore: 工具/构建
```

### 11.3 代码规范

- ESLint + Prettier
- TypeScript strict
- API 统一返回 `{ success, data?, error? }`

---

## 附录: 技术决策记录

| 决策 | 原因 |
|------|------|
| PDF 懒加载处理 | 上传快，按需消耗资源 |
| MVP 不做 RAG | 先验证单页上下文效果 |
| Supabase Auth | 邮箱验证开箱即用 |
| MVP 不做登录锁定 | 简化，依赖 Supabase |
| MVP 不做邮件限流 | 依赖 Supabase |
| 外部 Cron 服务 | Vercel Hobby 限制大 |
| 断点续传 | 200MB 大文件体验 |
| 文本不缓存 | pdf.js 快，避免一致性问题 |
| 多 LLM 平台 | 稳定性 + 灵活切换 |
| Gemini 2.5 Pro | 专业内容质量优先，比 Claude 便宜 53% |
| Prisma ORM | 类型安全，迁移方便 |
