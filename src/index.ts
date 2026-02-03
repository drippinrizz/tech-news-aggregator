import 'dotenv/config';
import cron from 'node-cron';
import { scrapeAll } from './scraper';
import { analyzeArticles } from './analyzer';
import { sendDigest } from './digest';
import { syncTopicsToXano, syncArticlesToXano } from './services/xano-sync';

console.log('Tech News Aggregator Starting...');
console.log('=====================================');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Min Relevance Score: ${process.env.MIN_RELEVANCE_SCORE || '7'}`);
console.log('=====================================\n');

// Schedule scraping every 2 hours
const scrapeSchedule = process.env.SCRAPE_SCHEDULE || '0 */2 * * *';
cron.schedule(scrapeSchedule, async () => {
  console.log(`\n[${new Date().toISOString()}] Running scheduled scrape...`);
  try {
    const newArticles = await scrapeAll();

    // If new articles were found, analyze them
    if (newArticles > 0) {
      console.log('\nRunning analysis on new articles...');
      await analyzeArticles();
    }
    console.log(`\n[${new Date().toISOString()}] Done. Next scrape in 2 hours.`);
  } catch (error) {
    console.error('Error in scheduled scrape:', error);
  }
});

console.log(`✓ Scraping scheduled: ${scrapeSchedule} (every 2 hours)`);

// Schedule morning digest (9 AM) - Windows Task Scheduler wakes PC at 8:58 AM
const morningSchedule = process.env.DIGEST_MORNING_SCHEDULE || '0 9 * * *';
cron.schedule(morningSchedule, async () => {
  console.log(`\n[${new Date().toISOString()}] Sending morning digest...`);
  try {
    await sendDigest('morning');
    console.log(`[${new Date().toISOString()}] Morning digest sent.`);
  } catch (error) {
    console.error('Error sending morning digest:', error);
  }
});

console.log(`✓ Morning digest scheduled: ${morningSchedule}`);

// Schedule evening digest (6 PM)
const eveningSchedule = process.env.DIGEST_EVENING_SCHEDULE || '0 18 * * *';
cron.schedule(eveningSchedule, async () => {
  console.log(`\n[${new Date().toISOString()}] Sending evening digest...`);
  try {
    await sendDigest('evening');
    console.log(`[${new Date().toISOString()}] Evening digest sent.`);
  } catch (error) {
    console.error('Error sending evening digest:', error);
  }
});

console.log(`✓ Evening digest scheduled: ${eveningSchedule} (6 PM daily)`);

// Schedule Xano topic sync (every 6 hours by default)
const xanoSyncSchedule = process.env.XANO_SYNC_SCHEDULE || '0 */6 * * *';
if (process.env.XANO_API_URL && process.env.XANO_AUTH_TOKEN) {
  cron.schedule(xanoSyncSchedule, async () => {
    console.log(`\n[${new Date().toISOString()}] Running Xano sync...`);
    try {
      await syncTopicsToXano();
      await syncArticlesToXano();
    } catch (error) {
      console.error('Error syncing to Xano:', error);
    }
  });
  console.log(`✓ Xano topic sync scheduled: ${xanoSyncSchedule} (every 6 hours)`);
} else {
  console.log('⚠ Xano sync disabled - XANO_API_URL or XANO_AUTH_TOKEN not configured');
}

console.log('\n=====================================');
console.log('All schedules active! Press Ctrl+C to stop.');
console.log('=====================================\n');

// Run an initial scrape and analysis when the service starts
(async () => {
  console.log('Running initial scrape and analysis...\n');
  try {
    const newArticles = await scrapeAll();
    if (newArticles > 0) {
      await analyzeArticles();
    }
    console.log('\n=====================================');
    console.log('Initial scrape complete. Schedules active:');
    console.log(`  Scrape:          every 2 hours`);
    console.log(`  Morning digest:  ${morningSchedule}`);
    console.log(`  Evening digest:  ${eveningSchedule}`);
    console.log('=====================================\n');
  } catch (error) {
    console.error('Error in initial scrape:', error);
  }
})();

// Keep the process running
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});
