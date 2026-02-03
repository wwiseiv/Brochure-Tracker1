import { startSmartDigestScheduler, stopSmartDigestScheduler, getSmartDigestScheduler } from "./services/smart-digest-scheduler";

export function startEmailDigestCron() {
  startSmartDigestScheduler({
    debug: process.env.NODE_ENV !== 'production',
  });
}

export function stopEmailDigestCron() {
  stopSmartDigestScheduler();
}

export function getDigestSchedulerStats() {
  return getSmartDigestScheduler().getStats();
}

export async function triggerDigestForUser(userId: string) {
  return getSmartDigestScheduler().triggerForUser(userId);
}
