# Luma Web - API 接口文档

> **版本**: v1.0 MVP
> **最后更新**: 2026-01-19
> **基础路径**: `/api`

---

## 1. 概述

### 技术栈

| 组件 | 技术 |
|------|------|
| 框架 | Next.js 14 (App Router - Route Handlers) |
| 认证 | httpOnly Cookie (Session-based) |
| 数据格式 | JSON |

### 响应格式

**成功响应**
```json
{ "data": T }
```

**分页响应**
```json
{
  "data": T[],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100
  }
}
```

**错误响应**
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 429 | 请求频率超限 |
| 500 | 服务器错误 |

### 错误码前缀

| 前缀 | 模块 |
|------|------|
| `AUTH_` | 认证模块 |
| `COURSE_` | 课程模块 |
| `FILE_` | 文件模块 |
| `QUOTA_` | 配额模块 |
| `AI_` | AI 服务模块 |
| `ADMIN_` | 管理后台模块 |

---

## 2. 用户认证 API

### 2.1 用户注册

**POST** `/api/auth/register`

创建新用户账户，发送邮箱验证邮件。

**请求体**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**验证规则**
| 字段 | 规则 |
|------|------|
| email | 必填，RFC 5322 邮箱格式 |
| password | 必填，最少 8 位 |

**成功响应** `201 Created`
```json
{
  "data": {
    "message": "注册成功，请检查邮箱完成验证"
  }
}
```

**错误响应**
| 错误码 | HTTP | 说明 |
|--------|------|------|
| `AUTH_EMAIL_EXISTS` | 409 | 邮箱已被注册 |
| `AUTH_INVALID_EMAIL` | 400 | 邮箱格式无效 |
| `AUTH_WEAK_PASSWORD` | 400 | 密码不符合要求 |

---

### 2.2 用户登录

**POST** `/api/auth/login`

验证用户凭证，创建会话。

**请求体**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "rememberMe": false
}
```

**验证规则**
| 字段 | 规则 |
|------|------|
| email | 必填 |
| password | 必填 |
| rememberMe | 可选，默认 false |

**成功响应** `200 OK`

设置 httpOnly Cookie:
- 默认有效期: 7 天
- rememberMe=true: 30 天

```json
{
  "data": {
    "user": {
      "id": "clxxx...",
      "email": "user@example.com"
    }
  }
}
```

**错误响应**
| 错误码 | HTTP | 说明 |
|--------|------|------|
| `AUTH_INVALID_CREDENTIALS` | 401 | 邮箱或密码错误 |
| `AUTH_EMAIL_NOT_VERIFIED` | 403 | 邮箱未验证 |
| `AUTH_ACCOUNT_LOCKED` | 403 | 账户已锁定 (连续失败 5 次后锁定 30 分钟) |

---

### 2.3 邮箱验证

**POST** `/api/auth/verify-email`

验证用户邮箱地址。

**请求体**
```json
{
  "token": "verification-token-string"
}
```

**成功响应** `200 OK`
```json
{
  "data": {
    "message": "邮箱验证成功"
  }
}
```

**错误响应**
| 错误码 | HTTP | 说明 |
|--------|------|------|
| `AUTH_INVALID_TOKEN` | 400 | 验证令牌无效 |
| `AUTH_TOKEN_EXPIRED` | 400 | 验证令牌已过期 (24 小时) |

---

### 2.4 重发验证邮件

**POST** `/api/auth/resend-verification`

重新发送邮箱验证邮件。

**限流**: 5 次/15 分钟

**请求体**
```json
{
  "email": "user@example.com"
}
```

**成功响应** `200 OK`
```json
{
  "data": {
    "message": "验证邮件已发送"
  }
}
```

**错误响应**
| 错误码 | HTTP | 说明 |
|--------|------|------|
| `AUTH_USER_NOT_FOUND` | 404 | 用户不存在 |
| `AUTH_ALREADY_VERIFIED` | 400 | 邮箱已验证 |
| `AUTH_RATE_LIMITED` | 429 | 请求过于频繁 |

---

### 2.5 忘记密码

**POST** `/api/auth/forgot-password`

请求密码重置邮件。

**限流**: 5 次/15 分钟

**请求体**
```json
{
  "email": "user@example.com"
}
```

**成功响应** `200 OK`
```json
{
  "data": {
    "message": "重置链接已发送到您的邮箱"
  }
}
```

**错误响应**
| 错误码 | HTTP | 说明 |
|--------|------|------|
| `AUTH_RATE_LIMITED` | 429 | 请求过于频繁 |

> 注意: 出于安全考虑，即使邮箱不存在也返回成功响应

---

### 2.6 重置密码

**POST** `/api/auth/reset-password`

使用重置令牌设置新密码。

**请求体**
```json
{
  "token": "reset-token-string",
  "password": "newsecurepassword123"
}
```

**验证规则**
| 字段 | 规则 |
|------|------|
| token | 必填 |
| password | 必填，最少 8 位 |

**成功响应** `200 OK`
```json
{
  "data": {
    "message": "密码重置成功"
  }
}
```

**错误响应**
| 错误码 | HTTP | 说明 |
|--------|------|------|
| `AUTH_INVALID_TOKEN` | 400 | 重置令牌无效 |
| `AUTH_TOKEN_EXPIRED` | 400 | 重置令牌已过期 (24 小时) |
| `AUTH_WEAK_PASSWORD` | 400 | 密码不符合要求 |

---

### 2.7 用户登出

**POST** `/api/auth/logout`

清除会话，退出登录。

**认证**: 需要登录

**成功响应** `200 OK`

清除 httpOnly Cookie

```json
{
  "data": {
    "message": "登出成功"
  }
}
```

---

### 2.8 获取当前用户

**GET** `/api/auth/me`

获取当前登录用户信息。

**认证**: 需要登录

**成功响应** `200 OK`
```json
{
  "data": {
    "id": "clxxx...",
    "email": "user@example.com",
    "emailConfirmedAt": "2026-01-15T10:00:00Z",
    "createdAt": "2026-01-15T09:00:00Z"
  }
}
```

**错误响应**
| 错误码 | HTTP | 说明 |
|--------|------|------|
| `AUTH_UNAUTHORIZED` | 401 | 未登录 |

---

## 3. 课程管理 API

### 3.1 获取课程列表

**GET** `/api/courses`

获取当前用户的所有课程。

**认证**: 需要登录

**成功响应** `200 OK`
```json
{
  "data": [
    {
      "id": "clxxx...",
      "name": "高等数学",
      "school": "清华大学",
      "term": "2025 秋季",
      "fileCount": 5,
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-01-16T12:00:00Z"
    }
  ]
}
```

---

### 3.2 创建课程

**POST** `/api/courses`

创建新课程。

**认证**: 需要登录

**请求体**
```json
{
  "name": "高等数学",
  "school": "清华大学",
  "term": "2025 秋季"
}
```

**验证规则**
| 字段 | 规则 |
|------|------|
| name | 必填，最大 50 字符 |
| school | 可选，最大 100 字符 |
| term | 可选，最大 50 字符 |

**成功响应** `201 Created`
```json
{
  "data": {
    "id": "clxxx...",
    "name": "高等数学",
    "school": "清华大学",
    "term": "2025 秋季",
    "createdAt": "2026-01-15T10:00:00Z"
  }
}
```

**错误响应**
| 错误码 | HTTP | 说明 |
|--------|------|------|
| `COURSE_LIMIT_EXCEEDED` | 400 | 已达课程数量上限 (6 门) |
| `COURSE_NAME_TOO_LONG` | 400 | 课程名称超过 50 字符 |

---

### 3.3 更新课程

**PATCH** `/api/courses/:id`

更新课程信息。

**认证**: 需要登录 (仅限课程所有者)

**路径参数**
| 参数 | 说明 |
|------|------|
| id | 课程 ID |

**请求体**
```json
{
  "name": "高等数学 II",
  "school": "清华大学",
  "term": "2026 春季"
}
```

**成功响应** `200 OK`
```json
{
  "data": {
    "id": "clxxx...",
    "name": "高等数学 II",
    "school": "清华大学",
    "term": "2026 春季",
    "updatedAt": "2026-01-16T12:00:00Z"
  }
}
```

**错误响应**
| 错误码 | HTTP | 说明 |
|--------|------|------|
| `COURSE_NOT_FOUND` | 404 | 课程不存在 |
| `COURSE_ACCESS_DENIED` | 403 | 无权访问该课程 |

---

### 3.4 删除课程

**DELETE** `/api/courses/:id`

删除课程及其所有关联数据 (文件、AI 讲解、问答)。

**认证**: 需要登录 (仅限课程所有者)

**路径参数**
| 参数 | 说明 |
|------|------|
| id | 课程 ID |

**请求体**
```json
{
  "confirmName": "高等数学"
}
```

**验证规则**
| 字段 | 规则 |
|------|------|
| confirmName | 必填，必须与课程名称完全匹配 |

**成功响应** `200 OK`
```json
{
  "data": {
    "message": "课程已删除"
  }
}
```

**错误响应**
| 错误码 | HTTP | 说明 |
|--------|------|------|
| `COURSE_NOT_FOUND` | 404 | 课程不存在 |
| `COURSE_ACCESS_DENIED` | 403 | 无权访问该课程 |
| `COURSE_CONFIRM_MISMATCH` | 400 | 确认名称不匹配 |

---

## 4. 文件管理 API

### 4.1 获取文件列表

**GET** `/api/courses/:courseId/files`

获取课程内的所有文件。

**认证**: 需要登录 (仅限课程所有者)

**路径参数**
| 参数 | 说明 |
|------|------|
| courseId | 课程 ID |

**成功响应** `200 OK`
```json
{
  "data": [
    {
      "id": "clxxx...",
      "name": "第一章-函数与极限.pdf",
      "type": "LECTURE",
      "pageCount": 45,
      "fileSize": 2048576,
      "isScanned": false,
      "status": "READY",
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ]
}
```

---

### 4.2 上传文件

**POST** `/api/courses/:courseId/files`

上传 PDF 文件到课程。

**认证**: 需要登录 (仅限课程所有者)

**Content-Type**: `multipart/form-data`

**路径参数**
| 参数 | 说明 |
|------|------|
| courseId | 课程 ID |

**表单字段**
| 字段 | 类型 | 说明 |
|------|------|------|
| file | File | PDF 文件 |

**验证规则**
| 规则 | 限制 |
|------|------|
| 文件类型 | 仅 PDF |
| 单文件大小 | ≤200MB |
| 单文件页数 | ≤500 页 |
| 单课程文件数 | ≤30 个 |
| 用户总存储 | ≤5GB |

**成功响应** `201 Created`
```json
{
  "data": {
    "id": "clxxx...",
    "name": "第一章-函数与极限.pdf",
    "type": "LECTURE",
    "fileSize": 2048576,
    "status": "UPLOADING",
    "createdAt": "2026-01-15T10:00:00Z"
  }
}
```

**错误响应**
| 错误码 | HTTP | 说明 |
|--------|------|------|
| `FILE_TOO_LARGE` | 400 | 文件大小超过 200MB |
| `FILE_TOO_MANY_PAGES` | 400 | 文件页数超过 500 页 |
| `FILE_INVALID_TYPE` | 400 | 不支持的文件类型 |
| `FILE_DUPLICATE_NAME` | 400 | 同名文件已存在 |
| `FILE_COURSE_LIMIT` | 400 | 课程文件数量已达上限 (30 个) |
| `FILE_STORAGE_LIMIT` | 400 | 用户存储空间已满 (5GB) |

---

### 4.3 删除文件

**DELETE** `/api/files/:id`

删除文件及其所有关联 AI 数据。

**认证**: 需要登录 (仅限文件所有者)

**路径参数**
| 参数 | 说明 |
|------|------|
| id | 文件 ID |

**成功响应** `200 OK`
```json
{
  "data": {
    "message": "文件已删除"
  }
}
```

**错误响应**
| 错误码 | HTTP | 说明 |
|--------|------|------|
| `FILE_NOT_FOUND` | 404 | 文件不存在 |
| `FILE_ACCESS_DENIED` | 403 | 无权访问该文件 |

---

### 4.4 获取文件内容

**GET** `/api/files/:id/content`

获取 PDF 文件内容用于阅读器显示。

**认证**: 需要登录 (仅限文件所有者)

**路径参数**
| 参数 | 说明 |
|------|------|
| id | 文件 ID |

**成功响应** `200 OK`

Content-Type: `application/pdf`

返回 PDF 文件流

**错误响应**
| 错误码 | HTTP | 说明 |
|--------|------|------|
| `FILE_NOT_FOUND` | 404 | 文件不存在 |
| `FILE_NOT_READY` | 400 | 文件尚未处理完成 |

---

## 5. AI 功能 API

### 5.1 自动讲解

**POST** `/api/files/:id/explain`

生成指定页面的 AI 讲解。

**认证**: 需要登录

**路径参数**
| 参数 | 说明 |
|------|------|
| id | 文件 ID |

**请求体**
```json
{
  "pageNumber": 1
}
```

**配额消耗**: `autoExplain` -1

**成功响应** `200 OK`
```json
{
  "data": {
    "pageNumber": 1,
    "content": "## 本页概述\n\n这一页主要介绍了函数的基本概念...",
    "imageExplanations": [
      {
        "regionId": "clxxx...",
        "bbox": { "x": 100, "y": 200, "width": 300, "height": 150 },
        "explanation": "这张图展示了函数 y=f(x) 的图像..."
      }
    ],
    "createdAt": "2026-01-15T10:00:00Z"
  }
}
```

**错误响应**
| 错误码 | HTTP | 说明 |
|--------|------|------|
| `FILE_NOT_FOUND` | 404 | 文件不存在 |
| `FILE_IS_SCANNED` | 400 | 该文件为扫描件，暂不支持 AI 功能 |
| `QUOTA_EXCEEDED` | 429 | 本月配额已用尽 |
| `AI_SERVICE_TIMEOUT` | 504 | AI 服务超时 (配额自动退还) |
| `AI_SERVICE_ERROR` | 500 | AI 服务错误 (配额自动退还) |

---

### 5.2 问答

**POST** `/api/courses/:courseId/qa`

基于课程全部文档内容进行问答。

**认证**: 需要登录

**路径参数**
| 参数 | 说明 |
|------|------|
| courseId | 课程 ID |

**请求体**
```json
{
  "question": "什么是函数的极限？"
}
```

**配额消耗**: `learningInteractions` -1

**成功响应** `200 OK`
```json
{
  "data": {
    "id": "clxxx...",
    "question": "什么是函数的极限？",
    "answer": "函数的极限是微积分中的核心概念之一...",
    "pageRefs": [
      { "fileId": "clxxx...", "fileName": "第一章.pdf", "pageNumber": 15 },
      { "fileId": "clxxx...", "fileName": "第一章.pdf", "pageNumber": 16 }
    ],
    "createdAt": "2026-01-15T10:00:00Z"
  }
}
```

**错误响应**
| 错误码 | HTTP | 说明 |
|--------|------|------|
| `COURSE_NOT_FOUND` | 404 | 课程不存在 |
| `COURSE_NO_FILES` | 400 | 课程内没有可用文件 |
| `QUOTA_EXCEEDED` | 429 | 本月配额已用尽 |
| `AI_SERVICE_TIMEOUT` | 504 | AI 服务超时 (配额自动退还) |
| `AI_SERVICE_ERROR` | 500 | AI 服务错误 (配额自动退还) |

---

### 5.3 获取缓存的讲解

**GET** `/api/files/:id/explanations`

获取文件已生成的所有讲解内容。

**认证**: 需要登录

**路径参数**
| 参数 | 说明 |
|------|------|
| id | 文件 ID |

**查询参数**
| 参数 | 类型 | 说明 |
|------|------|------|
| pageNumber | number | 可选，指定页码 |

**成功响应** `200 OK`
```json
{
  "data": [
    {
      "pageNumber": 1,
      "content": "## 本页概述\n\n...",
      "imageExplanations": [...],
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ]
}
```

---

## 6. 配额管理 API

### 6.1 获取用户配额

**GET** `/api/quota`

获取当前用户的配额使用情况。

**认证**: 需要登录

**成功响应** `200 OK`
```json
{
  "data": {
    "buckets": [
      {
        "bucket": "LEARNING_INTERACTIONS",
        "used": 45,
        "limit": 150,
        "resetAt": "2026-02-15T00:00:00Z"
      },
      {
        "bucket": "AUTO_EXPLAIN",
        "used": 120,
        "limit": 300,
        "resetAt": "2026-02-15T00:00:00Z"
      }
    ]
  }
}
```

**配额桶说明**
| 桶名 | 用途 | 默认限制 |
|------|------|----------|
| `LEARNING_INTERACTIONS` | 问答功能 | 150 次/月 |
| `AUTO_EXPLAIN` | 自动讲解 | 300 次/月 |

---

## 7. 阅读进度 API

### 7.1 获取阅读进度

**GET** `/api/files/:id/progress`

获取用户在指定文件的阅读进度。

**认证**: 需要登录

**路径参数**
| 参数 | 说明 |
|------|------|
| id | 文件 ID |

**成功响应** `200 OK`
```json
{
  "data": {
    "pageNumber": 15,
    "updatedAt": "2026-01-15T10:00:00Z"
  }
}
```

如果没有进度记录，返回:
```json
{
  "data": {
    "pageNumber": 1,
    "updatedAt": null
  }
}
```

---

### 7.2 更新阅读进度

**PUT** `/api/files/:id/progress`

更新用户在指定文件的阅读进度。

**认证**: 需要登录

**路径参数**
| 参数 | 说明 |
|------|------|
| id | 文件 ID |

**请求体**
```json
{
  "pageNumber": 20
}
```

**成功响应** `200 OK`
```json
{
  "data": {
    "pageNumber": 20,
    "updatedAt": "2026-01-15T12:00:00Z"
  }
}
```

---

## 8. 用户设置 API

### 8.1 获取用户设置

**GET** `/api/settings`

获取当前用户的偏好设置。

**认证**: 需要登录

**成功响应** `200 OK`
```json
{
  "data": {
    "uiLocale": "zh",
    "explainLocale": "zh"
  }
}
```

---

### 8.2 更新用户设置

**PATCH** `/api/settings`

更新用户偏好设置。

**认证**: 需要登录

**请求体**
```json
{
  "uiLocale": "en",
  "explainLocale": "zh"
}
```

**验证规则**
| 字段 | 规则 |
|------|------|
| uiLocale | 可选，枚举: `en`, `zh` |
| explainLocale | 可选，枚举: `en`, `zh` |

**成功响应** `200 OK`
```json
{
  "data": {
    "uiLocale": "en",
    "explainLocale": "zh"
  }
}
```

---

## 9. 管理员认证 API

> 管理员认证独立于用户认证系统

### 9.1 管理员登录

**POST** `/api/admin/auth/login`

管理员账户登录。

**请求体**
```json
{
  "email": "admin@example.com",
  "password": "adminpassword123"
}
```

**成功响应** `200 OK`

设置管理员 httpOnly Cookie

```json
{
  "data": {
    "admin": {
      "id": "clxxx...",
      "email": "admin@example.com",
      "role": "ADMIN"
    }
  }
}
```

**错误响应**
| 错误码 | HTTP | 说明 |
|--------|------|------|
| `ADMIN_INVALID_CREDENTIALS` | 401 | 邮箱或密码错误 |
| `ADMIN_ACCOUNT_DISABLED` | 403 | 账户已禁用 |

---

### 9.2 管理员登出

**POST** `/api/admin/auth/logout`

管理员退出登录。

**认证**: 需要管理员登录

**成功响应** `200 OK`
```json
{
  "data": {
    "message": "登出成功"
  }
}
```

---

## 10. 管理后台 API

### 10.1 系统概览

**GET** `/api/admin/stats/overview`

获取系统整体统计数据。

**认证**: 需要管理员登录

**成功响应** `200 OK`
```json
{
  "data": {
    "totalUsers": 1250,
    "totalCourses": 3800,
    "totalFiles": 15600,
    "totalStorageBytes": 52428800000,
    "activeUsersToday": 320
  }
}
```

---

### 10.2 访问统计

**GET** `/api/admin/stats/access`

获取用户访问统计数据。

**认证**: 需要管理员登录

**查询参数**
| 参数 | 类型 | 说明 |
|------|------|------|
| period | string | `week` \| `month`，默认 `month` |

**成功响应** `200 OK`
```json
{
  "data": {
    "period": "month",
    "pageViews": [
      { "date": "2026-01-01", "count": 1500 },
      { "date": "2026-01-02", "count": 1620 }
    ],
    "aiUsage": {
      "qa": 4500,
      "explain": 8200
    },
    "byActionType": [
      { "actionType": "LOGIN", "count": 3200 },
      { "actionType": "VIEW_FILE", "count": 15600 },
      { "actionType": "USE_QA", "count": 4500 },
      { "actionType": "USE_EXPLAIN", "count": 8200 }
    ]
  }
}
```

---

### 10.3 成本监控

**GET** `/api/admin/stats/cost`

获取 AI 服务成本统计。

**认证**: 需要管理员登录

**查询参数**
| 参数 | 类型 | 说明 |
|------|------|------|
| period | string | `week` \| `month`，默认 `month` |

**成功响应** `200 OK`
```json
{
  "data": {
    "period": "month",
    "totalCost": 256.78,
    "totalInputTokens": 12500000,
    "totalOutputTokens": 3200000,
    "trend": [
      { "date": "2026-01-01", "cost": 8.50 },
      { "date": "2026-01-02", "cost": 9.20 }
    ],
    "byModel": [
      { "model": "claude-3-opus", "cost": 180.00, "percentage": 70.1 },
      { "model": "gpt-4", "cost": 76.78, "percentage": 29.9 }
    ],
    "byAction": [
      { "actionType": "QA", "cost": 150.00 },
      { "actionType": "EXPLAIN", "cost": 106.78 }
    ]
  }
}
```

---

### 10.4 Worker 健康状态

**GET** `/api/admin/workers/health`

获取后台任务系统状态。

**认证**: 需要管理员登录

**成功响应** `200 OK`
```json
{
  "data": {
    "activeJobs": 5,
    "completedToday": 234,
    "failedToday": 3,
    "zombieTasks": [
      {
        "taskId": "task_xxx",
        "type": "PDF_PROCESSING",
        "startedAt": "2026-01-15T10:00:00Z",
        "runningMinutes": 15
      }
    ]
  }
}
```

> 僵尸任务: 运行时间超过 10 分钟的任务

---

### 10.5 重试失败任务

**POST** `/api/admin/workers/:taskId/retry`

重试失败或僵尸任务。

**认证**: 需要管理员登录

**路径参数**
| 参数 | 说明 |
|------|------|
| taskId | 任务 ID |

**成功响应** `200 OK`
```json
{
  "data": {
    "message": "任务已重新加入队列",
    "newTaskId": "task_yyy"
  }
}
```

---

### 10.6 用户列表

**GET** `/api/admin/users`

获取用户列表及统计信息。

**认证**: 需要管理员登录

**查询参数**
| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码，默认 1 |
| pageSize | number | 每页数量，默认 20，最大 100 |
| search | string | 搜索邮箱 |
| sortBy | string | 排序字段: `createdAt`, `email` |
| sortOrder | string | `asc` \| `desc` |

**成功响应** `200 OK`
```json
{
  "data": [
    {
      "id": "clxxx...",
      "email": "user@example.com",
      "createdAt": "2026-01-01T00:00:00Z",
      "lastLoginAt": "2026-01-15T10:00:00Z",
      "courseCount": 3,
      "fileCount": 15,
      "storageUsedBytes": 52428800,
      "quota": {
        "learningInteractions": { "used": 45, "limit": 150 },
        "autoExplain": { "used": 120, "limit": 300 }
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 1250
  }
}
```

---

### 10.7 调整用户配额

**PATCH** `/api/admin/users/:id/quota`

手动调整用户配额。

**认证**: 需要管理员登录

**路径参数**
| 参数 | 说明 |
|------|------|
| id | 用户 ID |

**请求体**
```json
{
  "bucket": "LEARNING_INTERACTIONS",
  "newLimit": 200,
  "reason": "用户申请额外配额"
}
```

**成功响应** `200 OK`
```json
{
  "data": {
    "bucket": "LEARNING_INTERACTIONS",
    "used": 45,
    "limit": 200,
    "resetAt": "2026-02-15T00:00:00Z"
  }
}
```

> 配额调整会记录到 QuotaLog，reason 为 `ADMIN_ADJUST`

---

### 10.8 用户文件统计

**GET** `/api/admin/users/:id/files`

获取指定用户的文件详细统计。

**认证**: 需要管理员登录

**路径参数**
| 参数 | 说明 |
|------|------|
| id | 用户 ID |

**成功响应** `200 OK`
```json
{
  "data": {
    "userId": "clxxx...",
    "totalFiles": 15,
    "totalStorageBytes": 52428800,
    "filesByCourse": [
      {
        "courseId": "clxxx...",
        "courseName": "高等数学",
        "fileCount": 5,
        "storageBytes": 20000000
      }
    ],
    "uploadTimeline": [
      { "date": "2026-01-01", "count": 3 },
      { "date": "2026-01-05", "count": 2 }
    ]
  }
}
```

---

## 11. 管理员账户管理 API (P2 - Future)

### 11.1 创建管理员

**POST** `/api/admin/admins`

创建新管理员账户。

**认证**: 需要超级管理员 (`SUPER_ADMIN`) 登录

**请求体**
```json
{
  "email": "newadmin@example.com",
  "password": "adminpassword123",
  "role": "ADMIN"
}
```

**成功响应** `201 Created`
```json
{
  "data": {
    "id": "clxxx...",
    "email": "newadmin@example.com",
    "role": "ADMIN",
    "createdAt": "2026-01-15T10:00:00Z"
  }
}
```

---

### 11.2 禁用管理员

**PATCH** `/api/admin/admins/:id/disable`

禁用管理员账户。

**认证**: 需要超级管理员 (`SUPER_ADMIN`) 登录

**路径参数**
| 参数 | 说明 |
|------|------|
| id | 管理员 ID |

**成功响应** `200 OK`
```json
{
  "data": {
    "id": "clxxx...",
    "email": "admin@example.com",
    "disabledAt": "2026-01-15T10:00:00Z"
  }
}
```

---

## 12. 通用错误码

### 认证相关

| 错误码 | HTTP | 说明 |
|--------|------|------|
| `AUTH_UNAUTHORIZED` | 401 | 未登录或会话已过期 |
| `AUTH_FORBIDDEN` | 403 | 无权限访问 |

### 验证相关

| 错误码 | HTTP | 说明 |
|--------|------|------|
| `VALIDATION_ERROR` | 400 | 请求参数验证失败 |
| `INVALID_JSON` | 400 | 请求体不是有效的 JSON |

### 系统相关

| 错误码 | HTTP | 说明 |
|--------|------|------|
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |
| `SERVICE_UNAVAILABLE` | 503 | 服务暂时不可用 |

---

## 13. API 端点汇总

### 用户认证 (8 个)
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/auth/register` | 用户注册 | - |
| POST | `/api/auth/login` | 用户登录 | - |
| POST | `/api/auth/verify-email` | 邮箱验证 | - |
| POST | `/api/auth/resend-verification` | 重发验证邮件 | - |
| POST | `/api/auth/forgot-password` | 忘记密码 | - |
| POST | `/api/auth/reset-password` | 重置密码 | - |
| POST | `/api/auth/logout` | 用户登出 | 用户 |
| GET | `/api/auth/me` | 获取当前用户 | 用户 |

### 课程管理 (4 个)
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/courses` | 获取课程列表 | 用户 |
| POST | `/api/courses` | 创建课程 | 用户 |
| PATCH | `/api/courses/:id` | 更新课程 | 用户 |
| DELETE | `/api/courses/:id` | 删除课程 | 用户 |

### 文件管理 (4 个)
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/courses/:courseId/files` | 获取文件列表 | 用户 |
| POST | `/api/courses/:courseId/files` | 上传文件 | 用户 |
| DELETE | `/api/files/:id` | 删除文件 | 用户 |
| GET | `/api/files/:id/content` | 获取文件内容 | 用户 |

### AI 功能 (3 个)
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/files/:id/explain` | 自动讲解 | 用户 |
| POST | `/api/courses/:courseId/qa` | 问答 | 用户 |
| GET | `/api/files/:id/explanations` | 获取缓存讲解 | 用户 |

### 配额管理 (1 个)
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/quota` | 获取用户配额 | 用户 |

### 阅读进度 (2 个)
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/files/:id/progress` | 获取阅读进度 | 用户 |
| PUT | `/api/files/:id/progress` | 更新阅读进度 | 用户 |

### 用户设置 (2 个)
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/settings` | 获取用户设置 | 用户 |
| PATCH | `/api/settings` | 更新用户设置 | 用户 |

### 管理员认证 (2 个)
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/admin/auth/login` | 管理员登录 | - |
| POST | `/api/admin/auth/logout` | 管理员登出 | 管理员 |

### 管理后台 (8 个)
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/admin/stats/overview` | 系统概览 | 管理员 |
| GET | `/api/admin/stats/access` | 访问统计 | 管理员 |
| GET | `/api/admin/stats/cost` | 成本监控 | 管理员 |
| GET | `/api/admin/workers/health` | Worker 健康状态 | 管理员 |
| POST | `/api/admin/workers/:taskId/retry` | 重试失败任务 | 管理员 |
| GET | `/api/admin/users` | 用户列表 | 管理员 |
| PATCH | `/api/admin/users/:id/quota` | 调整用户配额 | 管理员 |
| GET | `/api/admin/users/:id/files` | 用户文件统计 | 管理员 |

### 管理员账户 (2 个 - Future)
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/admin/admins` | 创建管理员 | 超级管理员 |
| PATCH | `/api/admin/admins/:id/disable` | 禁用管理员 | 超级管理员 |

**总计: 36 个 API 端点**
