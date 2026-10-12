import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const configPath = new URL("../vercel.json", import.meta.url);
const config = JSON.parse(readFileSync(configPath, "utf8"));
const cronJobs = config.crons;

assert.ok(Array.isArray(cronJobs), "vercel.json must define a crons array");
const snapshotJobs = cronJobs.filter((job) => job.path === "/api/cron/snapshot");
assert.equal(snapshotJobs.length, 1, "exactly one daily snapshot cron must be configured");
assert.equal(snapshotJobs[0].schedule, "0 3 * * *", "snapshot collection must remain scheduled daily at 03:00 UTC");
assert.ok(
  existsSync(new URL("../app/api/cron/snapshot/route.ts", import.meta.url)),
  "the configured snapshot endpoint must exist",
);

console.log("Cron configuration verified: /api/cron/snapshot at 03:00 UTC daily.");
