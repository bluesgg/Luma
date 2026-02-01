# Planner Agent Brief - Phase 0 Foundation

## Your Mission

You are the **Planner Agent** using the Claude Opus model. Your task is to create a comprehensive implementation plan for Phase 0 (Foundation) of the Luma Web project.

## Context

**Project**: Luma Web - AI-powered learning management system
**Phase**: Phase 0 - Foundation (8 tasks)
**Your Model**: Claude Opus (for architectural planning)

## Phase 0 Tasks to Plan

| Task ID | Task Name | Description | Priority |
|---------|-----------|-------------|----------|
| FND-001 | 项目初始化 | Initialize Next.js 14+ project with TypeScript, App Router, and base configuration | P0 |
| FND-002 | 数据库配置 | Setup Supabase PostgreSQL and configure Prisma ORM | P0 |
| FND-003 | 数据库 Schema 设计 | Create complete Prisma schema with all entities and relationships | P0 |
| FND-004 | Supabase Storage 配置 | Configure Supabase Storage for PDF file uploads | P0 |
| FND-005 | UI 组件库安装 | Setup shadcn/ui with Tailwind CSS and base components | P1 |
| FND-006 | 状态管理配置 | Configure TanStack Query and Zustand | P1 |
| FND-007 | 环境变量配置 | Setup all required environment variables | P0 |
| FND-008 | 项目目录结构 | Create complete project directory structure | P1 |

## Your Deliverables

Create a detailed plan that includes:

1. **Implementation Order**: Sequence of tasks considering dependencies
2. **File Inventory**: Complete list of files to create/modify
3. **Technology Decisions**: Specific versions, configurations, and trade-offs
4. **Database Schema Details**: Complete Prisma schema with all entities from PRD
5. **Directory Structure**: Exact folder hierarchy
6. **Configuration Details**: ESLint, Prettier, Husky, TypeScript configs
7. **Risk Assessment**: Potential blockers and mitigation strategies

## Key Requirements

### Database Schema (FND-003)
Based on PRD, include ALL entities:
- users, verification_tokens
- courses, files
- topic_groups, sub_topics
- learning_sessions, sub_topic_progress
- sub_topic_cache, qa_messages
- quotas, quota_logs, ai_usage_logs
- user_preferences
- admins (separate from users)

### Project Structure (FND-008)
Based on TECH_DESIGN.md:
- src/app/ (with route groups: (admin), (auth), (main))
- src/components/ (ui, auth, course, file, reader, learn, admin)
- src/hooks/
- src/stores/
- src/lib/ (ai, api, supabase, middleware)
- src/types/
- trigger/ (jobs)
- tests/ (unit, integration, e2e)

### Technology Stack
- Next.js 14.2+
- TypeScript 5.7+
- Prisma 5.22+
- Tailwind CSS + shadcn/ui
- TanStack Query + Zustand
- Vitest + Playwright

## Important Constraints

1. **Existing Files**: The project already has some files deleted (git status shows 'D' for many files). Plan assumes starting fresh.
2. **No Implementation**: You only plan, you don't implement
3. **Be Specific**: Include exact commands, file paths, configuration snippets
4. **Consider Dependencies**: FND-002 must complete before FND-003, etc.

## Reference Documents

- `/Users/samguan/Desktop/project/Luma/CLAUDE.md` - Project context
- `/Users/samguan/Desktop/project/Luma/docs/PRD.md` - Product requirements
- `/Users/samguan/Desktop/project/Luma/docs/TECH_DESIGN.md` - Technical design
- `/Users/samguan/Desktop/project/Luma/docs/task.md` - Task breakdown

## Output Format

Create a detailed markdown document with:

1. Executive Summary
2. Implementation Phases (within Phase 0)
3. Detailed Task Plans (one section per FND task)
4. File Inventory
5. Configuration Specifications
6. Risk Assessment

## Begin Planning

Read the reference documents and create your comprehensive plan.
