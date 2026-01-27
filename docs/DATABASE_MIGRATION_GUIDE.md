# Database Migration Guide

## Overview

This document describes the database migration strategy for Luma Web using Prisma ORM.

## Migration Commands

### Development

```bash
# Create a new migration (after modifying schema.prisma)
npm run db:migrate -- --name <migration_name>

# Apply migrations to development database
npm run db:migrate

# Reset database and apply all migrations
npx prisma migrate reset

# View migration status
npx prisma migrate status
```

### Production

```bash
# Apply pending migrations (CI/CD)
npm run db:migrate:deploy

# Seed database (initial setup only)
npm run db:seed
```

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
   ```bash
   npx prisma migrate status
   ```

2. **Create a rollback migration:**
   ```bash
   # Modify schema.prisma to reverse the changes
   npm run db:migrate -- --name rollback_<original_migration_name>
   ```

3. **For emergency rollback (data loss risk):**
   ```bash
   # Connect to database directly
   psql $DATABASE_URL

   # Manually reverse changes using SQL
   -- Example: DROP COLUMN added_column FROM table_name;

   # Mark migration as rolled back
   DELETE FROM "_prisma_migrations" WHERE migration_name = '...';
   ```

### 4. Best Practices

1. **Always backup before migrations:**

   Using the backup script (recommended):
   ```bash
   npm run db:backup
   ```

   Or manually with pg_dump:
   ```bash
   # For Supabase, use the direct connection URL (not pooled)
   pg_dump "$DIRECT_URL" > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

   Note: If using Supabase, get your connection URLs from:
   Supabase Dashboard > Project Settings > Database > Connection String
   - Use "Transaction" mode URL for DATABASE_URL
   - Use "Session" mode URL for DIRECT_URL

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

```
YYYYMMDDHHMMSS_descriptive_name.sql
```

Examples:
- `20260127120000_add_user_profile`
- `20260127130000_add_index_on_email`
- `20260127140000_rollback_user_profile`

## Troubleshooting

### Migration Failed

```bash
# Check migration status
npx prisma migrate status

# Check for drift
npx prisma migrate diff --from-schema-datamodel ./prisma/schema.prisma --to-schema-datasource ./prisma/schema.prisma

# Reset development database (DEVELOPMENT ONLY)
npx prisma migrate reset
```

### Schema Drift

If production schema drifts from migrations:

```bash
# Baseline existing database
npx prisma migrate resolve --applied <migration_name>
```

## Database Backup

For automated backups, use the backup script:

```bash
# Run backup manually
npm run db:backup

# Schedule automatic backups (cron example)
0 2 * * * cd /path/to/luma && npm run db:backup
```

## Migration Testing Checklist

Before deploying a migration to production:

- [ ] Migration tested locally
- [ ] Migration tested on staging
- [ ] Backup created
- [ ] Migration is reversible or rollback plan exists
- [ ] No data loss expected
- [ ] Performance impact assessed
- [ ] Downtime requirements communicated
- [ ] Team reviewed and approved

## Emergency Contacts

In case of migration issues in production:

1. Check deployment logs in Vercel
2. Check database logs in Supabase
3. Contact database administrator
4. Escalate to technical lead if needed

## Additional Resources

- [Prisma Migration Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [PostgreSQL Backup and Restore](https://www.postgresql.org/docs/current/backup.html)
- [Supabase Database Guide](https://supabase.com/docs/guides/database)
