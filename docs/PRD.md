# Luma Web - 产品需求文档 (PRD)

> **版本**: v1.1 MVP
> **最后更新**: 2026-01-19

---

## 实体关系概览

```
User 1:N Course 1:N File 1:N TopicGroup 1:N SubTopic
User 1:N LearningSession 1:N TopicProgress
                         1:N SubTopicProgress
                         1:N ExplanationCache (讲解缓存)
                         1:N QACache (问答缓存)
User 1:N Quota
User 1:1 UserPreference
User 1:N VerificationToken
User 1:N QuotaLog
User 1:N AIUsageLog
Admin (独立账户体系)
```

---

# 功能模块 1: 用户认证

## 1. 业务目标 (Context)

用户可以通过邮箱注册、登录系统，管理自己的学习账户。

## 2. 角色与权限 (Roles)

- **学生 (已验证)**: 登录系统、访问所有学习功能
- **学生 (未验证)**: 无法登录 (403 拦截)
- **管理员**: 登录系统、访问管理后台 (独立账户体系，见模块8)

## 3. 功能需求 (Requirements)

- [ ] 邮箱密码登录：使用邮箱+密码登录系统
- [ ] 新用户注册：邮箱注册，需邮箱验证后方可登录 (邮箱格式需符合标准格式)
- [ ] 邮箱验证：注册后发送验证邮件，点击链接完成验证 (链接有效期 24h)
- [ ] 重发验证邮件：未验证用户可请求重发
- [ ] 密码重置：忘记密码时通过邮件重置 (重置链接有效期 24h)
- [ ] 登出：清理会话，退出登录状态

## 4. 业务规则 (Business Rules)

- 邮箱格式: 标准邮箱格式验证 (RFC 5322)
- 密码要求: 最少 8 位
- 重发验证邮件限流: 5次/15分钟
- 密码重置邮件限流: 5次/15分钟
- 验证链接有效期: 24小时
- 重置链接有效期: 24小时
- 登录失败处理: 连续失败 5 次后锁定账户 30 分钟
- 会话管理: httpOnly Cookie，有效期 7 天；勾选"记住我"延长至 30 天

## 5. 数据结构建议 (Data Schema)

- User: { id, email, password_hash, role, created_at, updated_at, email_confirmed_at, last_login_at, failed_login_attempts, locked_until }
- VerificationToken: { id, user_id, token, type (email_verify | password_reset), expires_at, created_at }

## 6. MVP 范围 vs 未来扩展

- **MVP**: 邮箱密码登录、注册、邮箱验证、密码重置、登出
- **Future**: OAuth 登录 (Google/GitHub)、双因素认证

---

# 功能模块 2: 课程管理

## 1. 业务目标 (Context)

用户可以创建课程来组织和管理学习资料 (PDF)。

## 2. 角色与权限 (Roles)

- **学生**: 创建、查看、编辑、删除自己的课程
- **管理员**: 查看全局课程统计数据

## 3. 功能需求 (Requirements)

- [ ] 查看课程列表：展示用户所有课程，按创建时间倒序
- [ ] 创建课程：输入课程名/学校/学期，创建新课程
- [ ] 编辑课程：修改课程名、学校、学期
- [ ] 删除课程：二次确认后删除课程及所有关联数据

## 4. 业务规则 (Business Rules)

- 每用户最多 6 门课程，达到上限时提示: "已达课程数量上限 (6门)，请删除后再创建"
- 课程名称: 最大 50 字符，允许中英文、数字、常用标点
- 删除课程需二次确认 (输入课程名)
- 删除课程级联删除: 所有文件、AI讲解、AI问答

## 5. 数据结构建议 (Data Schema)

- Course: { id, user_id, name, school, term, created_at, updated_at }

## 6. MVP 范围 vs 未来扩展

- **MVP**: 课程 CRUD、数量限制
- **Future**: 课程归档、课程模板、课程分享

---

# 功能模块 3: 文件管理

## 1. 业务目标 (Context)

用户可以上传 PDF 文件到课程中，系统自动检测扫描件。

## 2. 角色与权限 (Roles)

- **学生**: 上传、查看、删除自己课程内的文件
- **管理员**: 查看全局文件统计数据

## 3. 功能需求 (Requirements)

- [ ] 查看文件列表：展示课程内所有 Lecture 文件
- [ ] 上传 PDF：支持多文件上传+拖拽，文件类型固定为 Lecture
- [ ] 删除文件：确认后删除文件及关联 AI 数据
- [ ] 扫描件检测：上传后后端自动检测，扫描件显示提示标签（AI 功能正常可用）
- [ ] 配额预览：显示当前账户 AI 配额使用情况

## 4. 业务规则 (Business Rules)

- 文件类型: MVP 阶段仅支持 Lecture，上传时自动设置
- 单文件大小: ≤200MB
- 单文件页数: ≤500 页
- 单课程文件数: ≤30 个
- 用户总存储: ≤5GB
- 文件名冲突: 禁止上传，提示 "同名文件已存在，请先删除或重命名后再上传"
- 只允许用户上传 PDF
- 文件状态流转: uploading → processing → ready/failed
- 扫描件检测逻辑：后端处理时使用 pdf-parse 提取文本，若提取文本字符数 < 页数 × 100，则判定为扫描件

## 5. 数据结构建议 (Data Schema)

- File: { id, course_id, name, type, page_count, file_size, is_scanned, status (uploading | processing | ready | failed), storage_path, created_at }

## 6. MVP 范围 vs 未来扩展

- **MVP**: PDF 上传 (仅 Lecture 类型)、文件列表、删除、扫描件检测
- **Future**: 多文件类型支持 (Homework/Exam/Other)、按类型分组展示、支持更多格式 (PPT/Word)、文件预览缩略图

---

# 功能模块 4: PDF 知识结构提取

## 1. 业务目标 (Context)

上传 PDF 后自动提取知识大纲（知识点标题和页码范围），为后续 AI 讲课提供结构化索引。采用 Claude File API 直接分析 PDF 文件，无需图片转换。

## 2. 角色与权限 (Roles)

- **学生 (已验证)**: 触发知识结构提取（上传 PDF 时自动），查看提取状态，手动重试失败的提取
- **管理员**: 查看提取任务统计

## 3. 功能需求 (Requirements)

### 3.1 PDF 上传与存储

- [ ] 文件上传：用户上传 PDF 后存储至 Claude File API
- [ ] 文件管理：记录 Claude File ID，用于后续大纲提取和讲解

### 3.2 知识大纲提取

- [ ] PDF 分析：使用 Claude File API 直接分析 PDF 内容
- [ ] 两层结构：提取 TopicGroup（总知识点）→ SubTopic（子知识点）+ 页码范围

### 3.3 状态管理

- [ ] 状态展示：文件卡片显示提取状态 (提取中/已完成/失败)
- [ ] 失败重试：提取失败时显示重试按钮，支持手动重试（从头开始）

## 4. 业务规则 (Business Rules)

### 提取规则

- 支持普通 PDF 和扫描件 PDF（Claude File API 原生支持 PDF OCR，扫描件无需特殊处理）
- 提取超时：5 分钟后标记 FAILED，支持手动重试
- 重试时从头开始提取，清除之前的部分数据

### 技术选型

- PDF 存储与分析：Claude File API
- 大纲提取模型：Claude 3.5 Sonnet

## 5. 数据结构建议 (Data Schema)

### 知识结构

- TopicGroup: { id, file_id, index, title, page_start, page_end }
- SubTopic: { id, topic_group_id, index, title, page_start, page_end }

### File 表扩展

- 新增字段: claude_file_id, structure_status (PENDING|PROCESSING|READY|FAILED), structure_error, extracted_at

## 6. API 端点

| Method | Path                           | 说明             |
| ------ | ------------------------------ | ---------------- |
| POST   | `/api/files/:id/extract/retry` | 重试知识结构提取 |

## 7. 错误码

| 错误码                   | 说明               |
| ------------------------ | ------------------ |
| EXTRACT_STRUCTURE_FAILED | 知识结构提取失败   |
| EXTRACT_ALREADY_RUNNING  | 提取任务正在进行中 |
| EXTRACT_PDF_TOO_LARGE    | PDF 页数超过限制   |

## 8. MVP 范围 vs 未来扩展

- **MVP**: Claude File API 存储、大纲提取、支持扫描件、失败重试
- **Future**: 用户手动调整知识结构、知识点合并/拆分、增量更新

---

# 功能模块 5: AI 互动讲课 (核心)

## 1. 业务目标 (Context)

AI 导师系统性地讲解 PDF 课件内容，通过分层讲解、测试确认的学习闭环，帮助学生高效理解和掌握课程资料。

## 2. 角色与权限 (Roles)

- **学生 (已验证)**: 使用讲课功能 (受配额限制)，只能访问自己上传的文件和学习会话
- **管理员**: 查看学习会话统计

## 3. 功能需求 (Requirements)

### 3.1 入口与触发

- [ ] PDF 预览小窗口：点击 PDF 卡片后弹出，显示 overview，提供"打开阅读器"和"开始讲课"两个按钮
- [ ] 开始/恢复讲课：点击"开始讲课"进入单 PDF 讲课模式，自动恢复上次进度
- [ ] 前置检查：知识结构未就绪时禁用"开始讲课"按钮，显示提取状态

### 3.2 分层讲解

- [ ] 子知识点讲解：按顺序逐个讲解，包含动机、直觉、数学、理论、应用五个层次
- [ ] 轻量确认：每个子知识点讲完后显示"理解了"按钮

### 3.3 知识点测试

- [ ] 测试生成：所有子知识点讲完后，首次点击"开始测试"时生成题目并缓存
- [ ] 题目数量：每个总知识点 3 题
- [ ] 通过条件：必须答完所有题目，≥ 2/3 题正确即通过
- [ ] 单题跳过：同一题答错 3 次后可跳过（视为答错）
- [ ] 薄弱点标记：总知识点内累计答错 ≥ 3 次

### 3.4 进度追踪

- [ ] 进度恢复：以 currentTopicIndex + currentSubIndex + currentPhase 为准
- [ ] 状态保留：已确认的子知识点、已回答的测试题状态保留
- [ ] 多设备支持：允许多设备学习同一文件，进度以最后提交为准

## 4. 业务规则 (Business Rules)

### 配额规则

| 操作       | 配额桶         | 扣费规则                          |
| ---------- | -------------- | --------------------------------- |
| 生成讲解   | aiInteractions | 每次扣 1 次（重新获取也扣费）     |
| 生成测试题 | aiInteractions | 首次生成扣 1 次（缓存后不重复扣） |

- 统一使用 `aiInteractions` 配额桶，默认 500 次/月
- 管理后台通过 AIUsageLog 追踪各功能的详细使用情况（见模块 8）

### 知识点规则

- 每个知识点统一采用完整讲解模式
- 测试题数：每个总知识点 3 题
- 通过条件：≥ 2 题正确

### 分层讲解结构

每个子知识点按以下五层结构讲解：

| 层次 | 说明                             | 输出要求             |
| ---- | -------------------------------- | -------------------- |
| 动机 | 为什么要学这个？解决什么问题？   | 1-2 段，通俗易懂     |
| 直觉 | 核心思想是什么？用类比/图示解释  | 1-2 段，配合简单示例 |
| 数学 | 相关公式、定理、推导（如有）     | LaTeX 格式，逐步推导 |
| 理论 | 严谨定义、性质、证明要点         | 结构化列表           |
| 应用 | 实际应用场景、代码示例、练习建议 | 1-2 个具体例子       |

- 所有知识点均采用五层完整讲解

### 其他规则

- 讲课功能仅对已验证邮箱的用户开放
- 扫描件 PDF 正常支持讲课功能（Claude File API 原生支持 OCR）
- 知识结构必须为 READY 状态才能开始讲课

## 5. 数据结构建议 (Data Schema)

### 测试题目

- TopicTest: { id, topic_group_id, index, type, question, options, correct_answer, explanation }

### 学习会话

- LearningSession: { id, user_id, file_id, status, current_topic_index, current_sub_index, current_phase }
- TopicProgress: { id, session_id, topic_group_id, status, is_weak_point, correct_count, wrong_count, question_attempts }
- SubTopicProgress: { id, session_id, sub_topic_id, confirmed, confirmed_at }

## 6. API 端点

| Method | Path                              | 说明              |
| ------ | --------------------------------- | ----------------- |
| GET    | `/api/files/:id/preview`          | 获取 PDF 预览信息 |
| POST   | `/api/files/:id/learn/start`      | 开始/恢复讲课     |
| GET    | `/api/learn/sessions/:id`         | 获取学习会话详情  |
| POST   | `/api/learn/sessions/:id/explain` | 获取讲解 (SSE)    |
| POST   | `/api/learn/sessions/:id/confirm` | 确认理解          |
| POST   | `/api/learn/sessions/:id/test`    | 开始/获取测试     |
| POST   | `/api/learn/sessions/:id/answer`  | 提交答案          |
| POST   | `/api/learn/sessions/:id/skip`    | 跳过当前题        |

## 7. 错误码

| 错误码                    | 说明               |
| ------------------------- | ------------------ |
| TUTOR_STRUCTURE_NOT_READY | 知识结构未提取完成 |
| TUTOR_SESSION_NOT_FOUND   | 学习会话不存在     |
| TUTOR_SESSION_FORBIDDEN   | 无权访问该学习会话 |
| TUTOR_QUOTA_EXCEEDED      | 配额已用完         |

## 8. MVP 范围 vs 未来扩展

- **MVP**: 单 PDF 讲课、分层讲解、知识点测试、进度追踪、薄弱点标记
- **Future**: 课程级别讲课（跨多个 PDF）、知识图谱关联、语音讲解 (TTS)、间隔重复复习、学习报告

---

# 功能模块 6: 配额管理

## 1. 业务目标 (Context)

系统通过配额机制控制 AI 功能使用量，保障服务成本可控。

## 2. 角色与权限 (Roles)

- **学生**: 查看自己的配额使用情况
- **管理员**: 查看全局配额统计、手动调整用户配额

## 3. 功能需求 (Requirements)

- [ ] 配额预览：文件管理页面显示当前配额使用情况
- [ ] 配额详情：设置页查看各配额桶使用情况
- [ ] 配额告警：按使用率显示不同颜色提示
- [ ] 配额调整：管理员可手动为特定用户调整配额

## 4. 业务规则 (Business Rules)

- 配额桶: `aiInteractions` (AI 交互 500次/月)，统一管理所有 AI 功能调用
- 配额告警: <70% 绿色, 70-90% 黄色, >90% 红色, 100% 按钮置灰并提示 "本月配额已用尽"
- 配额重置: 每月用户注册日的同一天重置 (如注册日为 1月15日，则每月 15日重置；若当月无此日期则为当月最后一天)
- 功能使用统计: 通过 AIUsageLog 记录每次 AI 调用的功能类型、token 消耗，供管理后台分析

## 5. 数据结构建议 (Data Schema)

- Quota: { id, user_id, bucket, used, limit, reset_at }
- QuotaLog: { id, user_id, bucket, change, reason (system_reset | admin_adjust | consume | refund), created_at }
- AIUsageLog: { id, user_id, feature_type (explain | test | qa), input_tokens, output_tokens, model, created_at }

## 6. MVP 范围 vs 未来扩展

- **MVP**: 配额展示、告警、月度重置
- **Future**: 配额购买、按用量付费、多配额桶分离管理

---

# 功能模块 7: 用户设置

## 1. 业务目标 (Context)

用户可以管理个人偏好设置和账户。

## 2. 角色与权限 (Roles)

- **学生**: 管理自己的设置和账户
- **管理员**: 同上

## 3. 功能需求 (Requirements)

- [ ] 语言设置：UI 语言 + AI 解释语言独立设置 (en/zh)
- [ ] 配额使用详情：查看各配额桶使用情况

## 4. 业务规则 (Business Rules)

- 语言切换后立即生效，偏好保存至数据库
- 默认语言: ui_locale 跟随浏览器语言 (不支持则默认 en)，explain_locale 默认 en

## 5. 数据结构建议 (Data Schema)

- UserPreference: { id, user_id, ui_locale, explain_locale, updated_at }

## 6. MVP 范围 vs 未来扩展

- **MVP**: 语言设置 (仅 en/zh)、配额详情
- **Future**: 多语言支持 (日语/韩语/西班牙语等)、账户删除、主题设置、通知偏好、数据导出

---

# 功能模块 8: 管理后台

## 1. 业务目标 (Context)

管理员可以监控系统运行状态、查看用户访问数据和成本。

## 2. 角色与权限 (Roles)

- **超级管理员**: 访问所有管理功能，管理其他管理员账户
- **管理员**: 访问所有管理功能 (除管理员账户管理)
- **学生**: 无权限访问 (403)

## 3. 功能需求 (Requirements)

- [ ] 管理员登录：独立登录入口，邮箱+密码认证
- [ ] 管理员账户管理：超级管理员可创建/禁用管理员账户
- [ ] 系统概览：用户数、课程数、文件数等统计
- [ ] 用户访问统计：月/周浏览量、各功能使用次数
- [ ] AI 功能统计：按功能类型 (explain/test/qa) 分别统计调用次数、token 消耗、成本
- [ ] 成本监控：AI 调用成本趋势、按功能分布 (基于 token 使用量 × 单价计算)
- [ ] Worker 健康检查：后台任务状态、僵尸任务检测 (超过 10 分钟未完成的任务标记为僵尸任务)
- [ ] 配额调整：手动为特定用户调整配额
- [ ] 用户配额统计：查看每个用户的配额使用量详情 (各配额桶已用/上限、使用率、重置日期)
- [ ] 用户文件统计：查看每个用户的文件上传数据 (文件数量、总存储占用、上传时间分布)

## 4. 业务规则 (Business Rules)

- 管理员认证: 独立账户体系，与学生账户分离
- 超级管理员: 系统初始化时通过环境变量 SUPER_ADMIN_EMAIL 创建，密码通过安全渠道发送
- 数据展示: 仅聚合统计，不含具体 PDF 内容或用户隐私数据
- 僵尸任务处理: 检测到后可手动重试或标记失败

## 5. 数据结构建议 (Data Schema)

- Admin: { id, email, password_hash, role (super_admin | admin), created_at, disabled_at }
- AccessLog: { id, user_id, action_type (login | view_file | use_feature), timestamp }
- AIUsageLog: { id, user_id, feature_type (explain | test | qa), input_tokens, output_tokens, model, cost, created_at }
- AuditLog: { id, admin_id, action, target_user_id, details, created_at }

## 6. MVP 范围 vs 未来扩展

- **MVP**: 管理员登录、系统概览、用户访问统计、成本监控、Worker 健康检查、配额调整、用户配额统计、用户文件统计
- **Future**: 管理员账户管理、系统配置、报表导出
