import { schedules } from "@trigger.dev/sdk/v3";

export const quotaResetTask = schedules.task({
  id: "quota-reset",
  cron: "0 0 * * *", // Run daily at midnight
  maxDuration: 60, // 1 minute
  run: async () => {
    // TODO: Implement quota reset logic
    // 1. Find users whose reset_at date is today
    // 2. Reset their quota buckets to 0
    // 3. Update reset_at to next month (same day)
    // 4. Log the reset in quota_logs

    console.log("Running daily quota reset check");

    return {
      usersProcessed: 0,
    };
  },
});
