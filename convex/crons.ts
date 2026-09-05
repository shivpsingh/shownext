import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "sweep expired web try uploads",
  { hours: 1 },
  internal.tryQuota.sweepExpiredSessions,
  {},
);

export default crons;
