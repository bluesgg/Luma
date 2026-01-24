# StudentAid Web - 产品需求文档 (PRD)

> **版本**: v1.1 MVP
> **最后更新**: 2026-01-19

---

## 实体关系概览

```
User 1:N Course 1:N File 1:N Explanation
                          1:N ImageRegion
                          1:N QA
User 1:N Quota
User 1:N ReadingProgress
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
- **管理员**: 登录系统、访问管理后台 (独立账户体系，见模块7)

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
- [ ] 扫描件检测：上传时检测，扫描件显示警告但允许上传 (上传后该文件 AI 功能禁用)
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

## 5. 数据结构建议 (Data Schema)
- File: { id, course_id, name, type, page_count, file_size, is_scanned, status (uploading | processing | ready | failed), storage_path, created_at }

## 6. MVP 范围 vs 未来扩展
- **MVP**: PDF 上传 (仅 Lecture 类型)、文件列表、删除、扫描件检测
- **Future**: 多文件类型支持 (Homework/Exam/Other)、按类型分组展示、支持更多格式 (PPT/Word)、文件预览缩略图

---

# 功能模块 4: PDF 学习 (核心)

## 1. 业务目标 (Context)
用户可以在 PDF 阅读器中使用 AI 逐页讲解和文档问答功能，高效理解课程资料。

## 2. 角色与权限 (Roles)
- **学生**: 使用 AI 功能 (受配额限制)
- **管理员**: 使用 AI 功能 (无限配额)

## 3. 功能需求 (Requirements)
- [ ] PDF 阅读器：支持分页模式、缩放、页面跳转
- [ ] 阅读进度记忆：记住并恢复上次阅读位置
- [ ] **自动讲解**：点击按钮生成当前页 AI 讲解
- [ ] **图片解释**：上传完成后 (status=ready) 自动检测 PDF 中的图片区域并存储位置信息，用户触发自动讲解时一并生成对应图片的解释
- [ ] **问答 (Q&A)**：输入问题，AI 基于当前课程的全部文档内容回答

## 4. 业务规则 (Business Rules)
- 自动讲解: 每次扣除 `autoExplain` 配额 (图片解释属于自动讲解的一部分，不单独扣配额)
- 问答: 每次扣除 `learningInteractions` 配额
- 问答上下文范围: 当前课程的全部文档
- 扫描件 PDF: AI 功能禁用，显示警告 "该文件为扫描件，暂不支持 AI 功能"
- AI 服务超时 (后端 30s) 或失败: 自动退还配额

## 5. 数据结构建议 (Data Schema)
- Explanation: { id, file_id, page_number, content, created_at }
- ImageRegion: { id, file_id, page_number, bbox, explanation, created_at }
- QA: { id, file_id, question, answer, page_refs, created_at }
- ReadingProgress: { id, user_id, file_id, page_number, updated_at }
- 注: QA 通过 file_id → Course.id → User.id 关联到用户

## 6. MVP 范围 vs 未来扩展
- **MVP**: PDF 阅读器 (分页模式)、自动讲解 (单页)、图片解释、问答
- **Future**: 连续滚动模式、选中文本讲解、追问链、滑动窗口讲解、文档/章节总结

---

# 功能模块 5: 配额管理

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
- 配额桶: `learningInteractions` (问答 150次/月), `autoExplain` (自动讲解 300次/月)
- 配额告警: <70% 绿色, 70-90% 黄色, >90% 红色, 100% 按钮置灰并提示 "本月配额已用尽"
- 配额重置: 每月用户注册日的同一天重置 (如注册日为 1月15日，则每月 15日重置；若当月无此日期则为当月最后一天)

## 5. 数据结构建议 (Data Schema)
- Quota: { id, user_id, bucket, used, limit, reset_at }
- QuotaLog: { id, user_id, bucket, change, reason (system_reset | admin_adjust | consume | refund), created_at }

## 6. MVP 范围 vs 未来扩展
- **MVP**: 配额展示、告警、月度重置
- **Future**: 配额购买、按用量付费、`contextExtraction` 配额桶 (PDF知识点提取)

---

# 功能模块 6: 用户设置

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

# 功能模块 7: 管理后台

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
- [ ] 用户访问统计：月/周浏览量、Q&A 使用量、自动讲解使用量
- [ ] 成本监控：AI 调用成本趋势、分布 (基于 token 使用量 × 单价计算)
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
- AccessLog: { id, user_id, action_type (login | view_file | use_qa | use_explain), timestamp }
- AIUsageLog: { id, user_id, action_type (qa | explain), input_tokens, output_tokens, model, created_at }
- AuditLog: { id, admin_id, action, target_user_id, details, created_at }

## 6. MVP 范围 vs 未来扩展
- **MVP**: 管理员登录、系统概览、用户访问统计、成本监控、Worker 健康检查、配额调整、用户配额统计、用户文件统计
- **Future**: 管理员账户管理、系统配置、报表导出
