# Trigger.dev Background Jobs

Asynchronous background job processing with Trigger.dev v3.

## Jobs

- `extract-structure.ts` - Extract PDF knowledge structure via Claude File API
- `quota-reset.ts` - Monthly quota reset (cron job)

## Development

```bash
# Run Trigger.dev dev server
pnpm trigger:dev

# Deploy jobs
pnpm trigger:deploy
```

## Configuration

See `trigger.config.ts` for Trigger.dev configuration.
