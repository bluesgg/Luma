# Feature: AI Interactive Tutor (AI 互动讲课)

## 1. 需求描述

### 用户故事
- 作为**学生用户**，我想要**AI 导师逐步讲解 PDF 课件内容**，以便**系统性地理解和掌握知识点，而不是碎片化地提问**
- 作为**学生用户**，我想要**每个知识点讲完后进行测试**，以便**确认自己真正理解了内容**
- 作为**学生用户**，我想要**系统记录我的学习进度和薄弱点**，以便**随时继续学习并针对性复习**

### 触发条件
**单 PDF 讲课（MVP）：**
- 点击 PDF 卡片后，弹出预览小窗口
- 小窗口显示 PDF overview，提供两个按钮：
  - "打开阅读器" → 进入现有 PDF 阅读器
  - "开始讲课" → 进入单 PDF 讲课模式

**课程级别讲课（Future）：**
- 在课程详情页点击"开始学习"按钮
- 进入课程讲课模式，覆盖该课程下所有已上传的 PDF

### 预期结果
1. **知识点提取**：上传 PDF 时后台自动提取两层知识结构（总知识点 → 子知识点）和图片
2. **分层讲解**：
   - 按子知识点逐个讲解，包含动机、直觉、数学、理论、应用五个层次
   - 每个子知识点讲完后进行轻量确认（"理解了"按钮）
   - 核心知识点：详细讲解（10-20分钟/点）
   - 支持性知识点：简要讲解（3-5分钟/点）
3. **公式处理**：使用 Mathpix API 按需识别公式 → 逐符号拆解 → 类比理解
4. **总知识点测试**：所有子知识点讲完后，按总知识点进行测试
   - 测试通过条件：核心知识点 3 题答对 ≥ 2 题；支持知识点 1 题答对
   - 单题跳过：同一题答错 3 次后可跳过该题
   - 薄弱点标记：总知识点内累计答错 ≥ 3 次
5. **进度追踪**：实时记录已学/当前/待学知识点，标记薄弱点
   - 恢复学习时以 `currentTopicIndex` + `currentSubIndex` 为准
   - 已回答的测试题状态保留
6. **图片支持**：AI 讲解时引用页码，前端显示该页所有提取的图片

---

## 2. 技术方案

### 2.1 核心技术决策

| 项目 | 决定 | 说明 |
|------|------|------|
| **图片提取工具** | PyMuPDF (Python) | 通过 Trigger.dev 调用 Python 脚本 |
| **图片提取范围** | 仅嵌入图片 | 放弃矢量图，减少复杂度 |
| **图片存储** | Cloudflare R2 | 路径: `images/{fileId}/{pageNumber}_{imageIndex}.png` |
| **图片展示** | 一次性返回 | 返回子知识点相关的所有图片，带页码标记 |
| **图片说明** | 不生成 | 减少处理时间和成本 |
| **知识结构层级** | 两层 | TopicGroup（总知识点）→ SubTopic（子知识点）|
| **知识提取输入** | 纯文本 | 从 PDF 提取的文本内容（不含公式和问题预提取） |
| **知识提取处理** | 分批 | 每批 120 页，内容变化表示新知识点，内容相同表示跨页 |
| **核心/支持判断** | AI 判断 + 手动调整 | AI 提取时自动分类，用户可手动调整 |
| **讲解顺序** | PDF 原始顺序 | 保持教材的逻辑结构 |
| **公式识别** | Mathpix API | 讲解时按需识别，不预提取 |
| **讲解生成策略** | 每次重新生成 | 不缓存讲解内容，每次请求都重新生成 |
| **测试题生成** | 生成后缓存 | 首次点击"开始测试"时生成并缓存，后续直接读取 |

### 2.2 数据库变更

#### 新表

**TopicGroup (总知识点)**
```prisma
model TopicGroup {
  id           String    @id @default(cuid())
  fileId       String
  index        Int                          // 在文件中的顺序
  title        String
  type         TopicType                    // CORE | SUPPORTING
  pageStart    Int?
  pageEnd      Int?
  createdAt    DateTime  @default(now())

  file         File        @relation(fields: [fileId], references: [id], onDelete: Cascade)
  subTopics    SubTopic[]
  tests        TopicTest[]
  progress     TopicProgress[]

  @@unique([fileId, index])
  @@index([fileId])
}

enum TopicType {
  CORE        // 核心内容，详细讲解，3题测试
  SUPPORTING  // 支持内容，简要讲解，1题测试
}
```

**SubTopic (子知识点)**
```prisma
model SubTopic {
  id              String    @id @default(cuid())
  topicGroupId    String
  index           Int                        // 在总知识点内的顺序
  title           String
  content         Json                       // 子知识点原始内容
  // 注意：讲解内容不缓存，每次请求时重新生成
  createdAt       DateTime  @default(now())

  topicGroup      TopicGroup     @relation(fields: [topicGroupId], references: [id], onDelete: Cascade)
  progress        SubTopicProgress[]

  @@unique([topicGroupId, index])
  @@index([topicGroupId])
}
```

**SubTopic JSON 结构定义：**
```typescript
// content 字段结构（知识结构提取时生成并缓存）
interface SubTopicContent {
  summary: string              // 子知识点摘要
  keywords: string[]           // 关键词
  relatedPages: number[]       // 相关页码（用于显示图片）
}

// 讲解响应结构（每次请求实时生成，不缓存）
// 注意：讲解内容每次都重新生成，确保根据用户上下文提供个性化讲解
interface SubTopicExplanation {
  explanation: {
    motivation: string         // 动机：为什么要学这个
    intuition: string          // 直觉：通俗解释
    mathematics: string        // 数学：公式推导（LaTeX，来自 Mathpix）
    theory: string             // 理论：严谨定义
    application: string        // 应用：实际例子
  }
}
```

**TopicTest (测试题缓存)**
```prisma
model TopicTest {
  id              String    @id @default(cuid())
  topicGroupId    String
  index           Int                          // 题目顺序（0, 1, 2...）
  type            QuestionType
  question        String
  options         Json?                        // 选择题选项 string[]
  correctAnswer   String
  explanation     String
  createdAt       DateTime  @default(now())

  topicGroup      TopicGroup @relation(fields: [topicGroupId], references: [id], onDelete: Cascade)

  @@unique([topicGroupId, index])
  @@index([topicGroupId])
}

enum QuestionType {
  MULTIPLE_CHOICE
  SHORT_ANSWER
}
```

> 测试题在用户首次点击"开始测试"时生成并缓存，后续直接读取。

**测试题 TypeScript 类型：**
```typescript
interface TopicTestQuestion {
  id: string
  type: 'MULTIPLE_CHOICE' | 'SHORT_ANSWER'
  question: string
  options?: string[]         // 选择题选项
  correctAnswer: string      // 正确答案
  explanation: string        // 答案解析
}
```

**LearningSession (学习会话)**
```prisma
model LearningSession {
  id                String        @id @default(cuid())
  userId            String
  fileId            String
  status            SessionStatus @default(IN_PROGRESS)
  currentTopicIndex Int           @default(0)    // 当前总知识点索引
  currentSubIndex   Int           @default(0)    // 当前子知识点索引
  currentPhase      LearningPhase @default(EXPLAINING)  // 当前阶段
  startedAt         DateTime      @default(now())
  lastActiveAt      DateTime      @updatedAt
  completedAt       DateTime?

  user              User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  file              File               @relation(fields: [fileId], references: [id], onDelete: Cascade)
  topicProgress     TopicProgress[]
  subTopicProgress  SubTopicProgress[]

  @@unique([userId, fileId])           // 每个用户每个文件只有一个会话
  @@index([userId, status])
}

enum SessionStatus {
  IN_PROGRESS
  COMPLETED
  PAUSED
}

enum LearningPhase {
  EXPLAINING    // 正在讲解子知识点
  CONFIRMING    // 等待子知识点确认
  TESTING       // 正在测试总知识点
}
```

**TopicProgress (总知识点进度)**
```prisma
model TopicProgress {
  id                String      @id @default(cuid())
  sessionId         String
  topicGroupId      String
  status            ProgressStatus @default(PENDING)
  isWeakPoint       Boolean     @default(false)
  totalAttempts     Int         @default(0)     // 测试总尝试次数
  correctCount      Int         @default(0)     // 答对题数
  wrongCount        Int         @default(0)     // 答错次数（用于判断薄弱点）
  questionAttempts  Json?                       // 每道题的尝试记录
  completedAt       DateTime?

  session           LearningSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  topicGroup        TopicGroup      @relation(fields: [topicGroupId], references: [id], onDelete: Cascade)

  @@unique([sessionId, topicGroupId])
  @@index([sessionId, status])
}

enum ProgressStatus {
  PENDING       // 未开始
  IN_PROGRESS   // 进行中（讲解或测试）
  COMPLETED     // 已完成（测试通过）
  SKIPPED       // 已跳过
}
```

**TopicProgress.questionAttempts 结构：**
```typescript
interface QuestionAttempts {
  [questionId: string]: {
    attempts: number      // 尝试次数
    answered: boolean     // 是否已回答正确或跳过
    skipped: boolean      // 是否跳过
  }
}
```

**SubTopicProgress (子知识点进度)**
```prisma
model SubTopicProgress {
  id            String      @id @default(cuid())
  sessionId     String
  subTopicId    String
  confirmed     Boolean     @default(false)     // 是否已确认理解
  confirmedAt   DateTime?

  session       LearningSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  subTopic      SubTopic        @relation(fields: [subTopicId], references: [id], onDelete: Cascade)

  @@unique([sessionId, subTopicId])
  @@index([sessionId])
}
```

**ExtractedImage (提取的图片)**
```prisma
model ExtractedImage {
  id          String   @id @default(cuid())
  fileId      String
  pageNumber  Int
  imageIndex  Int
  storagePath String   // R2 存储路径: images/{fileId}/{pageNumber}_{imageIndex}.png
  bbox        Json     // { x, y, width, height }
  createdAt   DateTime @default(now())

  file File @relation(fields: [fileId], references: [id], onDelete: Cascade)

  @@unique([fileId, pageNumber, imageIndex])
  @@index([fileId, pageNumber])
}
```

#### 字段变更

**File 表新增：**
```prisma
model File {
  // ... 现有字段
  structureStatus   StructureStatus @default(PENDING)
  structureError    String?
  extractedAt       DateTime?

  topicGroups       TopicGroup[]
  extractedImages   ExtractedImage[]
  learningSessions  LearningSession[]
  mathpixUsages     MathpixUsage[]
}

enum StructureStatus {
  PENDING     // 待提取
  PROCESSING  // 提取中
  READY       // 提取完成
  FAILED      // 提取失败
}
```

---

### 2.3 图片提取技术方案

#### 提取流程
```
PDF 上传确认 → Trigger.dev 任务启动 → 调用 Python 脚本 → PyMuPDF 提取图片 → 上传 R2 → 写入数据库
```

#### Python 脚本示例
```python
# scripts/extract_images.py
import fitz  # PyMuPDF
import sys
import json

def extract_images(pdf_path: str) -> list:
    """提取 PDF 中的嵌入图片"""
    doc = fitz.open(pdf_path)
    images = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        image_list = page.get_images(full=True)

        for img_index, img in enumerate(image_list):
            xref = img[0]
            base_image = doc.extract_image(xref)

            if base_image:
                images.append({
                    "pageNumber": page_num + 1,  # 1-indexed
                    "imageIndex": img_index,
                    "data": base_image["image"],  # bytes
                    "ext": base_image["ext"],
                    "bbox": list(page.get_image_bbox(img))
                })

    doc.close()
    return images

if __name__ == "__main__":
    pdf_path = sys.argv[1]
    output_path = sys.argv[2]

    images = extract_images(pdf_path)
    # 输出元数据，图片数据单独处理
    with open(output_path, 'w') as f:
        json.dump([{
            "pageNumber": img["pageNumber"],
            "imageIndex": img["imageIndex"],
            "ext": img["ext"],
            "bbox": img["bbox"]
        } for img in images], f)
```

#### Trigger.dev 任务调用
```typescript
// trigger/extract-pdf-structure.ts
import { task } from "@trigger.dev/sdk/v3";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const extractPdfStructure = task({
  id: "extract-pdf-structure",
  run: async (payload: { fileId: string; pdfUrl: string }) => {
    // 1. 下载 PDF 到临时目录
    // 2. 调用 Python 脚本提取图片
    // 3. 上传图片到 R2
    // 4. 提取知识结构（调用 AI）
    // 5. 写入数据库
  }
});
```

---

### 2.4 知识结构提取方案

#### 提取流程
```
PDF 文本提取 → 分批处理（每批 120 页）→ AI 分析识别结构 → 合并结果 → 写入 TopicGroup + SubTopic
```

#### 分批处理说明
- 每批最多处理 120 页，避免超出 AI 输入限制
- 批次边界可能切分同一知识点（MVP 暂不特殊处理，后续优化）
- 合并时按顺序拼接各批次的知识点

#### AI 提取 Prompt 模板
```typescript
const STRUCTURE_EXTRACT_PROMPT = `
分析以下教材内容，提取知识结构。

要求：
1. 识别总知识点（TopicGroup），每个总知识点包含多个子知识点（SubTopic）
2. 判断每个总知识点是"核心"还是"支持性"内容
   - 核心：概念定义、重要定理、关键方法
   - 支持性：背景介绍、例题、补充说明
3. 保持 PDF 原始顺序
4. 每个子知识点应该是一个可以独立讲解的单元

输出 JSON 格式：
{
  "topics": [
    {
      "title": "总知识点标题",
      "type": "CORE" | "SUPPORTING",
      "pageStart": 1,
      "pageEnd": 5,
      "subTopics": [
        {
          "title": "子知识点标题",
          "summary": "简要描述",
          "keywords": ["关键词1", "关键词2"],
          "relatedPages": [1, 2, 3]
        }
      ]
    }
  ]
}

教材内容：
{content}
`;
```

---

### 2.5 公式识别方案（Mathpix）

#### 调用时机
- **不预提取**：避免增加结构提取时间和成本
- **讲解时按需**：当 AI 生成讲解时，检测数学内容并调用 Mathpix

#### 集成方式
```typescript
// src/lib/mathpix.ts
const MATHPIX_API_URL = "https://api.mathpix.com/v3/text";

export async function recognizeFormula(imageBase64: string): Promise<string> {
  const response = await fetch(MATHPIX_API_URL, {
    method: "POST",
    headers: {
      "app_id": process.env.MATHPIX_APP_ID!,
      "app_key": process.env.MATHPIX_APP_KEY!,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      src: `data:image/png;base64,${imageBase64}`,
      formats: ["latex_styled"],
      data_options: { include_latex: true }
    })
  });

  const data = await response.json();
  return data.latex_styled || "";
}
```

---

### 2.6 API 变更

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/files/:id/preview` | 获取 PDF 预览信息 |
| POST | `/api/files/:id/extract/retry` | 重试知识结构提取（从头开始） |
| POST | `/api/files/:id/learn/start` | 开始/恢复单 PDF 讲课 |
| GET | `/api/learn/sessions/:sessionId` | 获取学习会话详情 |
| POST | `/api/learn/sessions/:sessionId/explain` | 获取当前子知识点讲解（SSE） |
| POST | `/api/learn/sessions/:sessionId/confirm` | 确认理解当前子知识点 |
| POST | `/api/learn/sessions/:sessionId/test` | 开始/获取当前总知识点测试 |
| POST | `/api/learn/sessions/:sessionId/answer` | 提交测试答案 |
| POST | `/api/learn/sessions/:sessionId/skip` | 跳过当前测试题 |
| POST | `/api/learn/sessions/:sessionId/next` | 进入下一个知识点 |
| POST | `/api/learn/sessions/:sessionId/pause` | 暂停学习 |
| GET | `/api/files/:id/images` | 获取指定页码的图片列表 |
| GET | `/api/admin/cost/mathpix` | 获取 Mathpix 使用量和成本统计（管理员） |

> **注意**：所有 `/api/learn/sessions/*` 端点需验证 session 属于当前登录用户。

**错误码定义：**

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| `TUTOR_STRUCTURE_NOT_READY` | 400 | 知识结构未提取完成 |
| `TUTOR_STRUCTURE_FAILED` | 400 | 知识结构提取失败 |
| `TUTOR_SESSION_NOT_FOUND` | 404 | 学习会话不存在 |
| `TUTOR_SESSION_FORBIDDEN` | 403 | 无权访问该学习会话 |
| `TUTOR_SESSION_COMPLETED` | 400 | 会话已完成 |
| `TUTOR_CANNOT_SKIP` | 400 | 不满足跳过条件 |
| `TUTOR_QUOTA_EXCEEDED` | 400 | 配额已用完 |
| `TUTOR_ALREADY_CONFIRMED` | 400 | 子知识点已确认 |

**关键响应示例：**

```typescript
// POST /api/files/:id/learn/start
Response: {
  data: {
    sessionId: string
    isNew: boolean
    file: { id, name, pageCount }
    outline: Array<{
      id: string
      index: number
      title: string
      type: 'CORE' | 'SUPPORTING'
      status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED'
      isWeakPoint: boolean
      subTopics: Array<{
        id: string
        index: number
        title: string
        confirmed: boolean
      }>
    }>
    currentTopicIndex: number
    currentSubIndex: number
    currentPhase: 'EXPLAINING' | 'CONFIRMING' | 'TESTING'
    progress: { completed: number, total: number }
  }
}

// POST /api/learn/sessions/:sessionId/explain
// SSE 流式响应
Response: {
  data: {
    subTopic: {
      id: string
      title: string
      topicTitle: string        // 所属总知识点标题
      pageRange: string         // "5-8"
    }
    explanation: {
      motivation: string
      intuition: string
      mathematics: string       // LaTeX（来自 Mathpix）
      theory: string
      application: string
    }
    relatedImages: Array<{      // 一次性返回所有相关图片，带标记
      url: string
      pageNumber: number
      imageIndex: number        // 图片在页内的索引
      label: string             // 图片标记，如 "图 1-1"
    }>
    hasNextSub: boolean         // 是否还有下一个子知识点
  }
}

// POST /api/learn/sessions/:sessionId/confirm
// 确认理解当前子知识点
Response: {
  data: {
    confirmed: boolean
    nextAction: 'NEXT_SUB' | 'START_TEST' | 'NEXT_TOPIC' | 'COMPLETE'
    nextSubTopic?: { id, title }
  }
}

// POST /api/learn/sessions/:sessionId/test
// 获取测试题
Response: {
  data: {
    topicGroup: { id, title, type }
    question: {
      id: string
      type: 'MULTIPLE_CHOICE' | 'SHORT_ANSWER'
      question: string
      options?: string[]
    }
    questionIndex: number       // 当前第几题（从 1 开始）
    totalQuestions: number      // 总题数（CORE=3, SUPPORTING=1）
    attempts: number            // 当前题已尝试次数
    canSkip: boolean            // 当前题答错 >= 3 次
    progress: {
      answered: number          // 已完成题数
      correct: number           // 答对题数
      required: number          // 通过所需答对数（CORE=2, SUPPORTING=1）
    }
  }
}

// POST /api/learn/sessions/:sessionId/answer
Request: {
  questionId: string
  answer: string
}
Response: {
  data: {
    isCorrect: boolean
    feedback: string
    correctAnswer?: string
    questionAttempts: number
    canSkipQuestion: boolean
    progress: {
      answered: number
      correct: number
      required: number
      passed: boolean           // 是否已通过（correct >= required）
    }
    isWeakPoint: boolean        // wrongCount >= 3
    reExplanation?: string      // 答错时的针对性讲解
    nextAction: 'NEXT_QUESTION' | 'TOPIC_PASSED' | 'TOPIC_FAILED' | 'CAN_RETRY'
  }
}

// GET /api/admin/cost/mathpix
Response: {
  data: {
    totalRequests: number           // 总请求次数
    totalCost: number               // 总成本（美元）
    daily: Array<{
      date: string                  // "2024-01-15"
      requests: number
      cost: number
    }>
    byUser: Array<{                 // Top 10 用户
      userId: string
      email: string
      requests: number
      cost: number
    }>
  }
}
```

---

### 2.7 前端变更

#### 新页面

**`/files/[id]/learn` - 单 PDF 讲课页**
- 左侧：两层知识点大纲（TopicGroup → SubTopic）
- 中间：讲解内容区（公式渲染、图片展示）
- 右侧/底部：确认按钮 / 测试问答区
- 顶部：进度条 + 操作按钮

#### 新组件

| 组件 | 说明 |
|------|------|
| `<FilePreviewModal />` | PDF 预览小窗口 |
| `<TopicOutline />` | 两层知识点大纲导航 |
| `<SubTopicExplanation />` | 子知识点讲解面板 |
| `<ConfirmButton />` | "理解了"确认按钮 |
| `<TopicTest />` | 总知识点测试组件 |
| `<FormulaRenderer />` | LaTeX 公式渲染 |
| `<PageImages />` | 页面图片展示组件 |
| `<ProgressBar />` | 学习进度条 |

---

## 3. 影响范围

### 配额系统
- [x] **共享现有配额桶**：使用 `learningInteractions` (150次/月)
- [x] **讲解扣费**：每次生成讲解内容时扣除 1 次（每次都重新生成，不缓存）
- [x] **测试题扣费**：首次生成测试题时扣除 1 次（生成后缓存，不重复扣费）
- [x] **配额检查策略**：开始讲课时不检查，用完时提示并暂停

### 权限控制
- [x] 讲课功能仅对**已验证邮箱**的用户开放
- [x] 只能讲解自己上传的 PDF 文件
- [x] 只能访问自己的学习会话

### 并发访问策略
- [x] **允许多设备**：用户可在多设备同时学习同一文件
- [x] **以最后提交为准**：进度冲突时以最后提交的状态为准
- [x] **乐观更新**：前端乐观更新，后端最终一致
- [ ] **同步提醒**（MVP 不考虑）：提醒用户其他设备已更新

### 进度恢复策略
- [x] **恢复位置**：以 `currentTopicIndex` + `currentSubIndex` + `currentPhase` 为准
- [x] **保留测试状态**：已回答的测试题答案和尝试次数保留
- [x] **子知识点确认**：已确认的子知识点保持确认状态

### Mathpix 成本追踪
- [x] **调用记录**：每次 Mathpix API 调用记录到 `MathpixUsage` 表
- [x] **管理端展示**：在管理后台 `/admin/cost` 页面显示 Mathpix 使用量和成本
- [x] **成本计算**：按 Mathpix 定价（$0.004/请求）计算

```prisma
model MathpixUsage {
  id          String   @id @default(cuid())
  userId      String
  fileId      String
  requestCount Int     @default(1)
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  file        File     @relation(fields: [fileId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([fileId])
  @@index([createdAt])
}
```

### SSE 连接中断处理
- [x] **前端重连策略**：SSE 断开后自动重新请求完整讲解
- [x] **用户提示**：断开超过 3 秒显示"重新连接中..."提示
- [x] **重试限制**：最多重试 3 次，超过后提示用户手动刷新

### 已有 API 影响
- [x] **`POST /api/files/confirm`**：上传确认后触发后台任务提取知识结构和图片
- [x] **`DELETE /api/files/:id`**：级联删除关联的所有学习数据

### 后台任务
- [x] **新增 Trigger.dev 任务**：`extract-pdf-structure`
  - 触发：文件状态变为 `ready` 后
  - 步骤：
    1. 下载 PDF 到临时目录
    2. 调用 Python 脚本提取图片 → 上传 R2（仅提取嵌入图片，不做分类）
    3. 提取文本 → 分批调用 AI 识别知识结构（每批 120 页，不预提取公式和问题）
    4. 写入数据库，更新 `File.structureStatus`
  - 超时：5 分钟
  - 重试：从头开始，不支持断点续传

---

## 4. 测试要点

### 功能测试
- [ ] 知识点提取：不同学科 PDF 的两层结构提取准确性
- [ ] 核心/支持分类：AI 分类是否符合内容重要程度
- [ ] 子知识点讲解：五层结构完整、公式渲染正确
- [ ] 子知识点确认：点击"理解了"后正确流转
- [ ] 总知识点测试：题目数量正确（CORE=3, SUPPORTING=1）
- [ ] 测试题缓存：首次生成后缓存，再次访问读取缓存
- [ ] 测试通过判定：核心 ≥2/3 通过，支持 1/1 通过
- [ ] 单题跳过：同一题答错 3 次后可跳过
- [ ] 薄弱点标记：总知识点累计答错 ≥ 3 次
- [ ] 进度恢复：退出后恢复到正确的子知识点和阶段
- [ ] 测试状态保留：恢复后已答题目状态正确
- [ ] 图片显示：一次性返回所有相关图片，带正确标记
- [ ] 知识点手动调整：用户可修改核心/支持分类
- [ ] SSE 断线重连：断开后自动重试，超过 3 次提示刷新

### 边界测试
- [ ] 结构提取失败：显示错误，支持重试（重试从头开始提取）
- [ ] 结构提取超时：5 分钟后标记 FAILED
- [ ] 配额耗尽：提示用户，暂停讲解（测试可继续）
- [ ] 多设备并发：进度以最后提交为准
- [ ] 大文件处理：500 页 PDF 分批提取

### 安全测试
- [ ] XSS：AI 生成内容安全渲染
- [ ] 权限：只能访问自己的 session 和 file
- [ ] CSRF：所有 POST 端点验证

### 性能测试
- [ ] 结构提取：后台任务，超时 5 分钟
- [ ] 讲解生成：首字节 < 2 秒（SSE）
- [ ] 页面加载：知识点大纲 < 1 秒

---

## 5. 上线清单

### 数据库迁移
- [ ] 创建迁移：`pnpm db:migrate --name add_learning_tutor`
- [ ] 新增表：`TopicGroup`、`SubTopic`、`TopicTest`、`LearningSession`、`TopicProgress`、`SubTopicProgress`、`ExtractedImage`、`MathpixUsage`
- [ ] 新增枚举：`TopicType`、`QuestionType`、`SessionStatus`、`LearningPhase`、`ProgressStatus`、`StructureStatus`
- [ ] File 表新增字段

### 环境变量
- [ ] `MATHPIX_APP_ID` - Mathpix 应用 ID
- [ ] `MATHPIX_APP_KEY` - Mathpix API Key

### 常量更新
```typescript
// src/lib/constants.ts
export const TUTOR = {
  // 测试通过条件
  CORE_PASS_CORRECT: 2,                // 核心知识点：3题答对2题
  SUPPORTING_PASS_CORRECT: 1,          // 支持知识点：1题答对1题

  // 题目数量
  CORE_QUESTIONS: 3,
  SUPPORTING_QUESTIONS: 1,

  // 跳过规则
  QUESTION_SKIP_THRESHOLD: 3,          // 单题答错 3 次可跳过
  WEAK_POINT_THRESHOLD: 3,             // 累计答错 3 次标记薄弱点

  // 知识结构提取
  BATCH_PAGES: 120,                    // 每批处理 120 页
  STRUCTURE_EXTRACT_TIMEOUT_MS: 300000,  // 5 分钟
} as const
```

### 后台任务
- [ ] 新增 `trigger/extract-pdf-structure.ts`
- [ ] 新增 `scripts/extract_images.py`
- [ ] 修改 `POST /api/files/confirm` 触发提取任务

### 前端依赖
- [ ] `pnpm add katex react-katex` - 公式渲染
- [ ] `pnpm add -D @types/katex`

### 文档更新
- [ ] PRD.md：新增"AI 互动讲课"模块
- [ ] API.md：添加新 API 端点
- [ ] DATABASE.md：更新 Schema

---

## 6. MVP 范围 vs 未来扩展

### MVP（当前）
- [x] 单 PDF 讲课模式
- [x] 两层知识结构（总知识点 → 子知识点）
- [x] 知识结构手动调整
- [x] 子知识点分层讲解 + 轻量确认
- [x] 总知识点测试（首次生成后缓存）
- [x] 图片提取和一次性返回（带标记）
- [x] 公式按需识别（Mathpix）+ 管理端成本展示
- [x] 讲解内容每次重新生成（不缓存）
- [x] 进度持久化和恢复
- [x] 薄弱点标记
- [x] SSE 断线重连

### MVP 不考虑
- [ ] 多设备同步提醒（用户在其他设备更新的提示）
- [ ] 图片智能分类（公式图、示意图等）
- [ ] 上传时预提取公式和问题
- [ ] Mathpix 配额限制（仅做成本追踪，不限制使用）

### Future
- [ ] 课程级别讲课（跨多个 PDF）
- [ ] 知识图谱关联（跨课程推荐）
- [ ] 语音讲解（TTS 集成）
- [ ] 间隔重复复习提醒
- [ ] 学习报告生成
- [ ] 公式预提取优化
