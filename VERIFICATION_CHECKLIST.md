# Code Review Fixes - Verification Checklist

## Pre-Deployment Verification

### 1. Database Migration ⚠️

```bash
# REQUIRED: Apply the new compound index
npx prisma migrate dev --name add-quota-compound-index

# Verify migration was successful
npx prisma migrate status
```

**Expected Output:**

- Migration creates index on `quotas` table: `quotas_resetAt_bucket_idx`
- No errors during migration

---

### 2. Code Compilation ✓

```bash
# Check TypeScript compilation
npm run build

# Or just type-check
npx tsc --noEmit
```

**Expected Output:**

- No TypeScript errors
- All types resolve correctly

---

### 3. Unit Tests 🧪

```bash
# Run quota-specific tests
npm run test tests/lib/quota.test.ts

# Run auth tests (for register route changes)
npm run test tests/api/auth/

# Run component tests
npm run test tests/components/quota/
```

**Expected Results:**

- All quota tests pass
- Register route tests pass
- Quota warning component tests pass

---

### 4. Integration Tests 🔗

```bash
# Test quota reset job
npm run test tests/integration/quota-reset.test.ts

# Test full user registration flow
npm run test tests/e2e/auth/register.spec.ts
```

**Expected Results:**

- Quota reset job handles idempotency
- User registration creates quotas atomically

---

### 5. Manual Testing 🖐️

#### Test Case 1: User Registration

1. Register a new user
2. Check database: `SELECT * FROM quotas WHERE user_id = 'NEW_USER_ID';`
3. **Expected:** Two quota records (LEARNING_INTERACTIONS, AUTO_EXPLAIN)
4. **Expected:** Both quotas have `used = 0` and proper limits

**SQL Verification:**

```sql
SELECT
  bucket,
  used,
  limit,
  reset_at
FROM quotas
WHERE user_id = 'YOUR_TEST_USER_ID';
```

#### Test Case 2: Quota Consumption

1. Call an AI endpoint (e.g., explain API)
2. Check quota: `GET /api/quota`
3. **Expected:** Used count incremented by 1
4. **Expected:** Remaining decreased by 1

#### Test Case 3: Race Condition Prevention

1. Make 10 concurrent quota consumption requests
2. Check final quota usage
3. **Expected:** Exactly 10 units consumed (no duplicates or missing)

**Test Script:**

```bash
# Make concurrent requests
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/learn/sessions/SESSION_ID/explain &
done
wait

# Check quota
curl http://localhost:3000/api/quota
```

#### Test Case 4: Keyboard Accessibility

1. Navigate to quota warning component
2. Tab to the progress bar
3. Press Enter/Space key
4. **Expected:** Tooltip opens
5. Press Escape
6. **Expected:** Tooltip closes

#### Test Case 5: API Type Safety

1. Call `GET /api/quota`
2. Check response
3. **Expected:** `resetAt` is an ISO string, not a Date object
4. **Expected:** No JSON serialization errors

**Example Response:**

```json
{
  "learningInteractions": {
    "used": 5,
    "limit": 100,
    "remaining": 95,
    "percentage": 5,
    "resetAt": "2026-02-01T00:00:00.000Z",
    "status": "green"
  }
}
```

---

### 6. Database Performance 🚀

#### Check Index Creation

```sql
-- Verify compound index exists
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'quotas';
```

**Expected:**

- Index `quotas_resetAt_bucket_idx` exists
- Covers columns `(reset_at, bucket)`

#### Test Query Performance

```sql
-- Should use the new compound index
EXPLAIN ANALYZE
SELECT * FROM quotas
WHERE reset_at < NOW()
ORDER BY reset_at, bucket;
```

**Expected:**

- Query plan shows "Index Scan using quotas_resetAt_bucket_idx"
- Execution time < 10ms for tables with 10k+ rows

---

### 7. Trigger.dev Job Testing ⏰

#### Manual Job Trigger

```bash
# If using Trigger.dev CLI
npx trigger dev

# Manually trigger the job
# (Use Trigger.dev dashboard or API)
```

**Verify:**

- Job runs successfully
- Expired quotas are reset
- No duplicate resets occur
- Logs show `jobRunId` for tracking

#### Check Job Configuration

```typescript
// Verify in src/trigger/jobs/quota-reset.ts:
{
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
    factor: 2,
  },
  queue: {
    concurrencyLimit: 1,
  }
}
```

---

### 8. Error Handling Verification 🛡️

#### Test Failed User Registration

1. Attempt to register user with duplicate email
2. **Expected:** No orphan quota records created
3. **Expected:** Transaction rolled back cleanly

#### Test Quota Exhaustion

1. Consume all quota
2. Attempt to consume more
3. **Expected:** 429 Too Many Requests error
4. **Expected:** No quota overrun

#### Test Concurrent Refunds

1. Trigger multiple refund operations simultaneously
2. **Expected:** All refunds processed correctly
3. **Expected:** No negative quota usage

---

### 9. Logging & Monitoring 📊

#### Check Quota Logs

```sql
SELECT
  bucket,
  change,
  reason,
  metadata,
  created_at
FROM quota_logs
ORDER BY created_at DESC
LIMIT 10;
```

**Verify Metadata Contains:**

- `timestamp`
- `amount` or `changeAmount`
- `remainingAfter` (for consumption)
- `previousUsed` (for resets)
- `source`

---

### 10. Rollback Plan 🔄

If issues are discovered:

```bash
# Rollback database migration
npx prisma migrate reset

# Or revert to specific migration
npx prisma migrate resolve --rolled-back MIGRATION_NAME

# Revert code changes
git revert HEAD
```

---

## Sign-Off Checklist

- [ ] Database migration applied successfully
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Manual testing completed
- [ ] Performance verified (index working)
- [ ] Trigger.dev job configured correctly
- [ ] Error handling tested
- [ ] Logging verified
- [ ] Documentation updated
- [ ] Code reviewed by team
- [ ] Ready for production deployment

---

## Production Deployment Steps

1. **Staging Environment**
   - Deploy to staging
   - Run full test suite
   - Monitor for 24 hours

2. **Production Deployment**
   - Apply database migration during low-traffic period
   - Deploy code changes
   - Monitor quota operations closely
   - Check error rates in logging dashboard

3. **Post-Deployment Monitoring**
   - Watch for transaction deadlocks (should be rare)
   - Monitor quota reset job execution
   - Check API response times
   - Verify no increase in error rates

---

## Known Considerations

1. **Serializable Isolation Performance**
   - May cause occasional transaction retries under high contention
   - This is expected and handled by Prisma automatically
   - Monitor for excessive retries (> 1% of requests)

2. **Database Load**
   - Compound index improves read performance
   - Slightly increases write overhead (negligible)
   - Index maintenance is automatic

3. **Breaking Changes**
   - None - all changes are backward compatible
   - Existing quota records continue to work

---

**Status:** Ready for deployment after completing checklist above.
