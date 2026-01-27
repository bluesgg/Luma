# Phase 10: Deployment and DevOps - Implementation Plan

## Executive Summary

Phase 10 covers the deployment infrastructure for the Luma web application, including Vercel deployment configuration, database migration strategy, Trigger.dev production setup, and monitoring/logging with Sentry integration.

---

## Task Dependencies Overview

```
DEPLOY-001 (Vercel Deployment Setup)
    |
    +---> DEPLOY-002 (Database Migration Strategy)
    |
    +---> DEPLOY-003 (Trigger.dev Setup)
    |
    +---> DEPLOY-004 (Monitoring and Logging)
```

All Phase 10 tasks depend on the completion of previous phases, particularly:

- Phase 0: Foundation (FND-001 to FND-008)
- Phase 1: Authentication (AUTH-001 to AUTH-015)
- Phase 4: AI Interactive Tutor (TUTOR-001 for Trigger.dev)
- Phase 5: Quota Management (QUOTA-004 for scheduled jobs)

---

## DEPLOY-001: Vercel Deployment Setup

### Overview

Configure Vercel for hosting the Next.js application with proper environment variables, preview deployments for PRs, and production deployment from the main branch.

### Files to Create

#### 1. `/vercel.json` - Vercel Project Configuration

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "installCommand": "npm ci",
  "outputDirectory": ".next",
  "regions": ["iad1"],
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    },
    "src/app/api/learn/sessions/*/explain/route.ts": {
      "maxDuration": 60
    },
    "src/app/api/files/*/extract/route.ts": {
      "maxDuration": 60
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-store, must-revalidate"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/home",
      "destination": "/",
      "permanent": true
    }
  ],
  "crons": []
}
```

#### 2. `/.github/workflows/deploy.yml` - CI/CD Pipeline

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  # Run tests first
  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client
        run: npm run db:generate

      - name: Run type check
        run: npm run type-check

      - name: Run linter
        run: npm run lint

      - name: Run unit tests
        run: npm run test:ci

  # Deploy preview for PRs
  deploy-preview:
    name: Deploy Preview
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install Vercel CLI
        run: npm install --global vercel@latest

      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build Project
        run: vercel build --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy to Vercel (Preview)
        id: deploy
        run: |
          url=$(vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }})
          echo "url=$url" >> $GITHUB_OUTPUT

      - name: Comment PR with Preview URL
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🚀 Preview deployment ready: ${{ steps.deploy.outputs.url }}'
            })

  # Deploy to production for main branch
  deploy-production:
    name: Deploy Production
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client
        run: npm run db:generate

      - name: Run database migrations
        run: npm run db:migrate:deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          DIRECT_URL: ${{ secrets.DIRECT_URL }}

      - name: Install Vercel CLI
        run: npm install --global vercel@latest

      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build Project
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy to Vercel (Production)
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```

### Files to Modify

#### 1. Update `/package.json` - Add Vercel-specific scripts

Add the following scripts:

```json
{
  "scripts": {
    "vercel-build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

### Environment Variables for Vercel

The following environment variables must be configured in Vercel Dashboard (Settings > Environment Variables):

**Required for all environments:**

```
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app (or custom domain)
NODE_ENV=production

# Security
CSRF_SECRET=<generate with: openssl rand -base64 32>
SESSION_SECRET=<generate with: openssl rand -base64 32>
```

**Required for production:**

```
# AI Services
OPENROUTER_API_KEY=sk-or-v1-...
MATHPIX_APP_ID=your_app_id
MATHPIX_APP_KEY=your_app_key

# Cloudflare R2
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=luma-images
R2_PUBLIC_URL=https://pub-xxx.r2.dev

# Trigger.dev
TRIGGER_API_KEY=tr_prod_...
TRIGGER_API_URL=https://api.trigger.dev

# Admin
SUPER_ADMIN_EMAIL=admin@yourdomain.com
SUPER_ADMIN_PASSWORD=<secure password>

# Email Service
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com

# Monitoring
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=sntrys_...
```

### GitHub Secrets Required

Configure these in GitHub repository Settings > Secrets and variables > Actions:

```
VERCEL_TOKEN        - Vercel API token (from Vercel account settings)
VERCEL_ORG_ID       - Vercel organization ID (from .vercel/project.json)
VERCEL_PROJECT_ID   - Vercel project ID (from .vercel/project.json)
DATABASE_URL        - Production database URL
DIRECT_URL          - Production direct database URL
```

### Step-by-Step Implementation

1. **Create Vercel Project:**
   - Log in to Vercel Dashboard
   - Click "Add New" > "Project"
   - Import from GitHub repository
   - Configure framework preset as "Next.js"
   - Do NOT deploy yet (need to configure environment variables first)

2. **Configure Environment Variables:**
   - Go to Project Settings > Environment Variables
   - Add all required environment variables listed above
   - Mark sensitive variables as "Sensitive" to hide values

3. **Set Up Custom Domain (Optional):**
   - Go to Project Settings > Domains
   - Add your custom domain
   - Configure DNS records as instructed

4. **Create and Push vercel.json:**
   - Create the `vercel.json` file as specified above
   - Commit and push to trigger first deployment

5. **Configure GitHub Integration:**
   - Ensure GitHub app has access to repository
   - Configure branch protection rules for main branch
   - Set up required status checks

---

## DEPLOY-002: Database Migration Strategy

### Overview

Implement a safe database migration process with CI/CD integration and rollback procedures.

### Files to Create

#### 1. `/docs/DATABASE_MIGRATION_GUIDE.md` - Migration Documentation

```markdown
# Database Migration Guide

## Overview

This document describes the database migration strategy for Luma Web using Prisma ORM.

## Migration Commands

### Development

\`\`\`bash

# Create a new migration (after modifying schema.prisma)

npm run db:migrate -- --name <migration_name>

# Apply migrations to development database

npm run db:migrate

# Reset database and apply all migrations

npx prisma migrate reset

# View migration status

npx prisma migrate status
\`\`\`

### Production

\`\`\`bash

# Apply pending migrations (CI/CD)

npm run db:migrate:deploy

# Seed database (initial setup only)

npm run db:seed
\`\`\`

## Migration Workflow

### 1. Schema Changes

1. Modify `prisma/schema.prisma`
2. Generate migration: `npm run db:migrate -- --name descriptive_name`
3. Review generated SQL in `prisma/migrations/`
4. Test migration locally
5. Commit migration files
6. Create PR for review

### 2. CI/CD Pipeline

The deployment workflow automatically:

1. Runs `prisma migrate deploy` before deployment
2. Only applies pending migrations
3. Does NOT modify schema (safe for production)

### 3. Rollback Procedure

**IMPORTANT:** Prisma does not support automatic rollbacks.

#### Manual Rollback Steps:

1. **Identify the issue:**
   \`\`\`bash
   npx prisma migrate status
   \`\`\`

2. **Create a rollback migration:**
   \`\`\`bash

   # Modify schema.prisma to reverse the changes

   npm run db:migrate -- --name rollback\_<original_migration_name>
   \`\`\`

3. **For emergency rollback (data loss risk):**
   \`\`\`bash

   # Connect to database directly

   psql $DATABASE_URL

   # Manually reverse changes using SQL

   -- Example: DROP COLUMN added_column FROM table_name;

   # Mark migration as rolled back

   DELETE FROM "\_prisma_migrations" WHERE migration_name = '...';
   \`\`\`

### 4. Best Practices

1. **Always backup before migrations:**
   \`\`\`bash
   pg*dump $DATABASE_URL > backup*$(date +%Y%m%d\_%H%M%S).sql
   \`\`\`

2. **Test migrations on staging first**

3. **Use non-destructive migrations when possible:**
   - Add columns with defaults
   - Create new tables instead of modifying existing
   - Mark deprecated columns, remove later

4. **For large tables, use batched migrations:**
   - Add column (nullable)
   - Backfill data in batches
   - Add NOT NULL constraint

## Migration File Naming Convention

\`\`\`
YYYYMMDDHHMMSS_descriptive_name.sql
\`\`\`

Examples:

- `20260127120000_add_user_profile`
- `20260127130000_add_index_on_email`
- `20260127140000_rollback_user_profile`

## Troubleshooting

### Migration Failed

\`\`\`bash

# Check migration status

npx prisma migrate status

# Check for drift

npx prisma migrate diff --from-schema-datamodel ./prisma/schema.prisma --to-schema-datasource ./prisma/schema.prisma

# Reset development database (DEVELOPMENT ONLY)

npx prisma migrate reset
\`\`\`

### Schema Drift

If production schema drifts from migrations:

\`\`\`bash

# Baseline existing database

npx prisma migrate resolve --applied <migration_name>
\`\`\`
```

#### 2. `/scripts/backup-database.sh` - Database Backup Script

```bash
#!/bin/bash

# Database Backup Script for Luma Web
# Usage: ./scripts/backup-database.sh [output_dir]

set -e

# Configuration
OUTPUT_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${OUTPUT_DIR}/luma_backup_${TIMESTAMP}.sql"

# Ensure output directory exists
mkdir -p "$OUTPUT_DIR"

# Check for DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable is not set"
    exit 1
fi

echo "Starting database backup..."
echo "Output: $BACKUP_FILE"

# Create backup
pg_dump "$DATABASE_URL" \
    --format=plain \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    > "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

echo "Backup completed: ${BACKUP_FILE}.gz"
echo "Size: $(du -h "${BACKUP_FILE}.gz" | cut -f1)"

# Clean up old backups (keep last 10)
cd "$OUTPUT_DIR"
ls -t luma_backup_*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm

echo "Cleanup completed. Keeping last 10 backups."
```

#### 3. `/.github/workflows/migration-check.yml` - Migration Safety Check

```yaml
name: Migration Safety Check

on:
  pull_request:
    paths:
      - 'prisma/schema.prisma'
      - 'prisma/migrations/**'

jobs:
  check-migration:
    name: Check Migration Safety
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client
        run: npm run db:generate

      - name: Check for breaking changes
        run: |
          # Check if migration includes dangerous operations
          if grep -r "DROP TABLE\|DROP COLUMN\|ALTER COLUMN.*TYPE" prisma/migrations/; then
            echo "::warning::This migration contains potentially breaking changes!"
            echo "Please ensure you have:"
            echo "1. Backed up the database"
            echo "2. Tested on staging environment"
            echo "3. Prepared rollback plan"
          fi

      - name: Validate schema
        run: npx prisma validate

      - name: Check migration status
        run: npx prisma migrate status
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
          DIRECT_URL: ${{ secrets.STAGING_DIRECT_URL }}
```

### Files to Modify

#### 1. Update `/package.json`

Add migration-related scripts:

```json
{
  "scripts": {
    "db:migrate:status": "prisma migrate status",
    "db:migrate:diff": "prisma migrate diff --from-schema-datamodel ./prisma/schema.prisma --to-schema-datasource ./prisma/schema.prisma",
    "db:backup": "bash scripts/backup-database.sh"
  }
}
```

### Step-by-Step Implementation

1. **Create Initial Migration:**

   ```bash
   npm run db:migrate -- --name initial_schema
   ```

2. **Generate Migration Files:**
   - This creates `prisma/migrations/YYYYMMDDHHMMSS_initial_schema/migration.sql`
   - Review the generated SQL

3. **Test Migration Locally:**

   ```bash
   npm run db:migrate:status
   npm run db:migrate
   ```

4. **Deploy to Staging:**
   - Push changes to staging branch
   - Verify migration applies correctly
   - Test application functionality

5. **Deploy to Production:**
   - Create PR to main branch
   - CI/CD automatically runs `prisma migrate deploy`

---

## DEPLOY-003: Trigger.dev Setup

### Overview

Configure Trigger.dev for production background job processing, including PDF structure extraction and monthly quota reset jobs.

### Files to Create

#### 1. `/trigger.config.ts` - Trigger.dev Configuration

```typescript
import type { TriggerConfig } from '@trigger.dev/sdk/v3'

export const config: TriggerConfig = {
  project: 'luma-web',
  logLevel: 'log',
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
    },
  },
  dirs: ['./src/trigger'],
}
```

#### 2. `/src/trigger/index.ts` - Job Exports

```typescript
/**
 * Trigger.dev Job Registry
 * Export all background jobs from this file
 */

export * from './jobs/extract-pdf-structure'
export * from './jobs/quota-reset'
```

#### 3. Update `/src/trigger/client.ts` - Enhanced Client Configuration

```typescript
/**
 * Trigger.dev Client Configuration for v3
 */

import { configure } from '@trigger.dev/sdk/v3'

// Configure Trigger.dev
export function configureTrigger() {
  if (!process.env.TRIGGER_API_KEY) {
    console.warn('TRIGGER_API_KEY not set, background jobs will not run')
    return
  }

  configure({
    secretKey: process.env.TRIGGER_API_KEY,
  })
}

/**
 * Check if Trigger.dev is configured
 */
export function isTriggerConfigured(): boolean {
  return !!process.env.TRIGGER_API_KEY
}

/**
 * Get Trigger.dev project configuration
 */
export function getTriggerProjectId(): string {
  return 'luma-web'
}
```

### Files to Modify

#### 1. Update `/src/lib/env.ts` - Add Trigger.dev Validation

```typescript
// Add to envSchema
TRIGGER_SECRET_KEY: z.string().optional(),
```

#### 2. Update `/package.json` - Add Trigger.dev Scripts

```json
{
  "scripts": {
    "trigger:dev": "npx trigger.dev@latest dev",
    "trigger:deploy": "npx trigger.dev@latest deploy"
  },
  "dependencies": {
    "@trigger.dev/sdk": "^3.0.0"
  }
}
```

### Environment Variables for Trigger.dev

**Development:**

```
TRIGGER_API_KEY=tr_dev_xxx
TRIGGER_API_URL=https://api.trigger.dev
```

**Production:**

```
TRIGGER_API_KEY=tr_prod_xxx
TRIGGER_SECRET_KEY=tr_sk_xxx (for webhook verification)
```

### Step-by-Step Implementation

1. **Create Trigger.dev Account:**
   - Sign up at https://cloud.trigger.dev/
   - Create a new project named "luma-web"

2. **Install Dependencies:**

   ```bash
   npm install @trigger.dev/sdk@latest
   ```

3. **Initialize Trigger.dev:**

   ```bash
   npx trigger.dev@latest init
   ```

4. **Configure Environment Variables:**
   - Copy API key from Trigger.dev dashboard
   - Add to `.env.local` for development
   - Add to Vercel for production

5. **Deploy Tasks:**

   ```bash
   npx trigger.dev@latest deploy
   ```

6. **Verify in Dashboard:**
   - Check tasks are registered
   - Verify cron job is scheduled
   - Test with a sample trigger

---

## DEPLOY-004: Monitoring and Logging

### Overview

Set up Sentry for error tracking, enhance the logging utility with production capabilities, and configure alert notifications.

### Files to Create

#### 1. `/src/lib/sentry.ts` - Sentry Configuration

```typescript
/**
 * Sentry Error Tracking Configuration
 */

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

/**
 * Initialize Sentry
 */
export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured, error tracking disabled')
    return
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Session Replay (optional)
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Release tracking
    release: process.env.VERCEL_GIT_COMMIT_SHA || 'development',

    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'ResizeObserver loop limit exceeded',
      // Network errors that are expected
      'Network request failed',
      'Failed to fetch',
      // User-triggered errors
      'AbortError',
    ],

    // Filter out sensitive data
    beforeSend(event, hint) {
      // Remove email addresses from error messages
      if (event.message) {
        event.message = event.message.replace(
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
          '[EMAIL]'
        )
      }

      // Don't send errors in development
      if (process.env.NODE_ENV === 'development') {
        return null
      }

      return event
    },

    // Custom tags
    initialScope: {
      tags: {
        app: 'luma-web',
        component: 'nextjs',
      },
    },
  })
}

/**
 * Capture an error with context
 */
export function captureError(
  error: Error,
  context?: Record<string, unknown>,
  level: Sentry.SeverityLevel = 'error'
) {
  if (!SENTRY_DSN) {
    console.error('Sentry not configured, error:', error)
    return
  }

  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context)
    }
    scope.setLevel(level)
    Sentry.captureException(error)
  })
}

/**
 * Set user context for Sentry
 */
export function setUserContext(user: {
  id: string
  email?: string
  role?: string
}) {
  if (!SENTRY_DSN) return

  Sentry.setUser({
    id: user.id,
    // Don't include email for privacy
    username: user.role,
  })
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext() {
  if (!SENTRY_DSN) return
  Sentry.setUser(null)
}

/**
 * Add breadcrumb for tracking user actions
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
) {
  if (!SENTRY_DSN) return

  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data,
  })
}
```

#### 2. `/sentry.client.config.ts` - Client-side Sentry

```typescript
/**
 * Sentry Client Configuration
 * This file configures Sentry for the browser
 */

import { initSentry } from '@/lib/sentry'

initSentry()
```

#### 3. `/sentry.server.config.ts` - Server-side Sentry

```typescript
/**
 * Sentry Server Configuration
 * This file configures Sentry for Node.js server
 */

import { initSentry } from '@/lib/sentry'

initSentry()
```

#### 4. `/sentry.edge.config.ts` - Edge Runtime Sentry

```typescript
/**
 * Sentry Edge Configuration
 * This file configures Sentry for Edge runtime (middleware, edge functions)
 */

import { initSentry } from '@/lib/sentry'

initSentry()
```

#### 5. Update `/src/lib/logger.ts` - Enhanced Logger with Sentry Integration

```typescript
/**
 * Application Logger with Sentry Integration
 * Provides structured logging with automatic error reporting
 */

import { captureError, addBreadcrumb } from './sentry'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  traceId?: string
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private isProduction = process.env.NODE_ENV === 'production'

  /**
   * Format log entry for structured logging
   */
  private formatEntry(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      traceId: this.getTraceId(),
    }
  }

  /**
   * Get trace ID for request correlation
   */
  private getTraceId(): string | undefined {
    // In production, you might get this from headers or generate one
    return undefined
  }

  /**
   * Output log based on environment
   */
  private output(entry: LogEntry): void {
    if (this.isProduction) {
      // In production, output JSON for log aggregation
      console.log(JSON.stringify(entry))
    } else {
      // In development, output human-readable format
      const contextStr = entry.context
        ? ` ${JSON.stringify(entry.context)}`
        : ''
      console.log(
        `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${contextStr}`
      )
    }
  }

  /**
   * Debug level logging (development only)
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      this.output(this.formatEntry('debug', message, context))
    }
  }

  /**
   * Info level logging
   */
  info(message: string, context?: LogContext): void {
    this.output(this.formatEntry('info', message, context))

    // Add breadcrumb for Sentry
    addBreadcrumb(message, 'info', context)
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: LogContext): void {
    this.output(this.formatEntry('warn', message, context))

    // Add breadcrumb for Sentry
    addBreadcrumb(message, 'warning', context)
  }

  /**
   * Error level logging with Sentry reporting
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = {
      ...context,
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : error,
    }

    this.output(this.formatEntry('error', message, errorContext))

    // Report to Sentry in production
    if (this.isProduction && error instanceof Error) {
      captureError(error, { message, ...context })
    }
  }

  // Context-specific loggers
  auth(message: string, context?: LogContext): void {
    this.info(message, { ...context, _category: 'auth' })
  }

  api(message: string, context?: LogContext): void {
    this.info(message, { ...context, _category: 'api' })
  }

  db(message: string, context?: LogContext): void {
    this.debug(message, { ...context, _category: 'database' })
  }

  ai(message: string, context?: LogContext): void {
    this.info(message, { ...context, _category: 'ai' })
  }

  storage(message: string, context?: LogContext): void {
    this.debug(message, { ...context, _category: 'storage' })
  }

  trigger(message: string, context?: LogContext): void {
    this.info(message, { ...context, _category: 'trigger' })
  }
}

export const logger = new Logger()

/**
 * Performance logging utility
 */
export function logPerformance(
  operation: string,
  startTime: number,
  context?: LogContext
): void {
  const duration = Date.now() - startTime
  logger.debug(`Performance: ${operation}`, { duration, ...context })

  // Add performance breadcrumb
  addBreadcrumb(`Performance: ${operation}`, 'performance', {
    duration,
    ...context,
  })
}

/**
 * Request logging utility
 */
export function logRequest(
  method: string,
  path: string,
  userId?: string,
  statusCode?: number
): void {
  logger.api(`${method} ${path}`, { userId, statusCode })
}

/**
 * Error reporter with Sentry integration
 */
export function reportError(error: Error, context?: LogContext): void {
  logger.error('Unexpected error', error, context)
}

/**
 * Create a child logger with preset context
 */
export function createLogger(baseContext: LogContext) {
  return {
    debug: (message: string, context?: LogContext) =>
      logger.debug(message, { ...baseContext, ...context }),
    info: (message: string, context?: LogContext) =>
      logger.info(message, { ...baseContext, ...context }),
    warn: (message: string, context?: LogContext) =>
      logger.warn(message, { ...baseContext, ...context }),
    error: (message: string, error?: Error | unknown, context?: LogContext) =>
      logger.error(message, error, { ...baseContext, ...context }),
  }
}
```

### Files to Modify

#### 1. Update `/next.config.mjs` - Add Sentry webpack plugin

```javascript
import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... existing config
}

// Wrap with Sentry
const sentryWebpackPluginOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
}

export default withSentryConfig(nextConfig, sentryWebpackPluginOptions)
```

#### 2. Update `/src/lib/env.ts` - Add Sentry Environment Variables

```typescript
// Add to envSchema
NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
SENTRY_AUTH_TOKEN: z.string().optional(),
SENTRY_ORG: z.string().optional(),
SENTRY_PROJECT: z.string().optional(),
```

#### 3. Update `/package.json` - Add Sentry Dependencies

```json
{
  "dependencies": {
    "@sentry/nextjs": "^8.0.0"
  }
}
```

### Environment Variables for Monitoring

```
# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=sntrys_xxx
SENTRY_ORG=your-org
SENTRY_PROJECT=luma-web
```

### Step-by-Step Implementation

1. **Create Sentry Project:**
   - Sign up at https://sentry.io/
   - Create a new project for Next.js
   - Copy the DSN

2. **Install Sentry:**

   ```bash
   npm install @sentry/nextjs
   npx @sentry/wizard@latest -i nextjs
   ```

3. **Configure Environment Variables:**
   - Add DSN to `.env.local`
   - Add to Vercel environment variables

4. **Create Alert Rules in Sentry:**
   - Go to Alerts > Create Alert
   - Create alert for:
     - Error frequency > 10/hour
     - New issues
     - Performance degradation

5. **Configure Slack/Email Notifications:**
   - Go to Settings > Integrations
   - Connect Slack workspace
   - Configure notification channels

6. **Verify Integration:**
   - Trigger a test error
   - Verify it appears in Sentry
   - Confirm alert notification

---

## Summary: Files to Create/Modify

### New Files to Create

| File Path                                | Purpose                         |
| ---------------------------------------- | ------------------------------- |
| `/vercel.json`                           | Vercel deployment configuration |
| `/.github/workflows/deploy.yml`          | CI/CD pipeline for deployment   |
| `/.github/workflows/migration-check.yml` | Migration safety checks         |
| `/docs/DATABASE_MIGRATION_GUIDE.md`      | Migration documentation         |
| `/scripts/backup-database.sh`            | Database backup script          |
| `/trigger.config.ts`                     | Trigger.dev configuration       |
| `/src/trigger/index.ts`                  | Trigger.dev job exports         |
| `/src/lib/sentry.ts`                     | Sentry configuration            |
| `/sentry.client.config.ts`               | Client-side Sentry              |
| `/sentry.server.config.ts`               | Server-side Sentry              |
| `/sentry.edge.config.ts`                 | Edge runtime Sentry             |

### Files to Modify

| File Path                                    | Changes                                 |
| -------------------------------------------- | --------------------------------------- |
| `/package.json`                              | Add new scripts and dependencies        |
| `/next.config.mjs`                           | Add Sentry webpack plugin               |
| `/src/lib/env.ts`                            | Add new environment variable validation |
| `/src/lib/logger.ts`                         | Add Sentry integration                  |
| `/src/trigger/client.ts`                     | Update for Trigger.dev v3               |
| `/src/trigger/jobs/extract-pdf-structure.ts` | Full implementation                     |
| `/src/trigger/jobs/quota-reset.ts`           | Full implementation                     |
| `/.env.example`                              | Add new environment variables           |

---

## Critical Files for Implementation

- **/vercel.json** - Core Vercel deployment configuration with function timeouts, headers, and regions
- **/src/lib/logger.ts** - Enhanced logging utility that integrates with Sentry for production error tracking
- **/src/trigger/jobs/extract-pdf-structure.ts** - Critical background job for PDF processing (core feature dependency)
- **/.github/workflows/deploy.yml** - CI/CD pipeline that orchestrates tests, migrations, and deployments
- **/src/lib/sentry.ts** - Error tracking configuration that provides production monitoring capabilities
