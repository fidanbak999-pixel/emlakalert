const cron = require('node-cron');
const { cronSchedule, cronTimezone, emailTo } = require('../config');
const { searchListings } = require('./search');
const { sendDailyDigest } = require('./email');

let task = null;
let lastRun = null;

async function runDailyJob() {
  const started = new Date().toISOString();
  console.log(`[cron] Started ${started} (${cronTimezone})`);
  try {
    const result = await searchListings();
    const info = await sendDailyDigest(result, emailTo);
    lastRun = {
      started,
      finished: new Date().toISOString(),
      ok: true,
      count: result.listings.length,
      messageId: info.messageId,
      warnings: result.warnings,
    };
    console.log(`[cron] Sent ${result.listings.length} listings to ${emailTo}`);
    return lastRun;
  } catch (err) {
    lastRun = {
      started,
      finished: new Date().toISOString(),
      ok: false,
      error: err.message,
    };
    console.error('[cron] Failed:', err.message);
    throw err;
  }
}

function startCron() {
  if (!cron.validate(cronSchedule)) {
    console.error(`[cron] Invalid schedule: ${cronSchedule}`);
    return null;
  }
  task = cron.schedule(
    cronSchedule,
    () => {
      runDailyJob().catch(() => {});
    },
    { timezone: cronTimezone }
  );
  console.log(`[cron] Scheduled "${cronSchedule}" tz=${cronTimezone} → ${emailTo}`);
  return task;
}

function getCronStatus() {
  return {
    schedule: cronSchedule,
    timezone: cronTimezone,
    emailTo,
    running: Boolean(task),
    lastRun,
  };
}

module.exports = { startCron, runDailyJob, getCronStatus };
