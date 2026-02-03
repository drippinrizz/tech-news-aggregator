import 'dotenv/config';
import xanoClient from './database/xano-client';
import { HackerNewsAggregator } from './aggregators/hackernews';
import { RSSAggregator } from './aggregators/rss';
import { RedditAggregator } from './aggregators/reddit';
import { DevToMediumAggregator } from './aggregators/devto';
import { AggregatedArticle } from './types';

async function initializeSources(): Promise<any[]> {
  const defaultSources = [
    { name: 'HackerNews', type: 'api', url: 'https://hacker-news.firebaseio.com/v0' },
    { name: 'Tech Blogs (RSS)', type: 'rss', url: null },
    { name: 'Reddit', type: 'api', url: 'https://reddit.com' },
    { name: 'Dev.to/Medium', type: 'rss', url: null },
  ];

  // Fetch existing sources (1 API call)
  let sources = (await xanoClient.source.findMany({
    where: { enabled: true },
  })) as any[];

  const existingNames = new Set(sources.map((s: any) => s.name));

  // Only upsert sources that don't already exist
  const missingSources = defaultSources.filter(s => !existingNames.has(s.name));

  if (missingSources.length > 0) {
    console.log(`Creating ${missingSources.length} missing source(s)...`);
    for (const source of missingSources) {
      await xanoClient.source.upsert({
        where: { name: source.name },
        update: { enabled: true },
        create: {
          name: source.name,
          type: source.type,
          url: source.url,
          enabled: true,
        },
      });
    }
    // Re-fetch to get IDs for newly created sources
    sources = (await xanoClient.source.findMany({
      where: { enabled: true },
    })) as any[];
  } else {
    console.log('All sources already exist, skipping initialization.');
  }

  return sources;
}

async function saveArticles(articles: AggregatedArticle[]) {
  const total = articles.length;
  console.log(`\nSaving ${total} articles to database (bulk)...`);

  if (total === 0) {
    console.log('No articles to save.');
    return 0;
  }

  try {
    const result = await xanoClient.article.createMany({
      data: articles.map(article => ({
        sourceId: article.sourceId,
        title: article.title,
        url: article.url,
        description: article.description,
        content: article.content,
        author: article.author,
        publishedAt: article.publishedAt,
        topics: undefined,
      })),
    });

    console.log(`Saved ${result.created} new articles, skipped ${result.skipped} duplicates`);
    return result.created;
  } catch (error) {
    console.error('Error in bulk save:', error);
    throw error;
  }
}

async function scrapeAll() {
  console.log('Starting scraping process...');
  console.log('=====================================');

  try {
    // Initialize sources in database (returns existing sources, avoids extra API call)
    const sources = await initializeSources();

    let totalArticles: AggregatedArticle[] = [];

    // Scrape from each source
    for (const source of sources) {
      console.log(`\nScraping: ${source.name}`);
      console.log('-------------------------------------');

      let articles: AggregatedArticle[] = [];

      try {
        switch (source.name) {
          case 'HackerNews': {
            const aggregator = new HackerNewsAggregator();
            articles = await aggregator.fetchArticles(source.id);
            break;
          }

          case 'Tech Blogs (RSS)': {
            const aggregator = new RSSAggregator();
            articles = await aggregator.fetchArticles(source.id);
            break;
          }

          case 'Reddit': {
            const aggregator = new RedditAggregator();
            articles = await aggregator.fetchArticles(source.id);
            break;
          }

          case 'Dev.to/Medium': {
            const aggregator = new DevToMediumAggregator();
            articles = await aggregator.fetchArticles(source.id);
            break;
          }

          default:
            console.log(`Unknown source type: ${source.name}`);
        }

        // Update last scraped time
        await xanoClient.source.update({
          where: { id: source.id },
          data: { lastScraped: new Date() },
        });

        totalArticles = totalArticles.concat(articles);
      } catch (error) {
        console.error(`Error scraping ${source.name}:`, error);
      }
    }

    console.log('\n=====================================');
    console.log(`Total articles collected: ${totalArticles.length}`);

    // Save all articles to database
    const savedCount = await saveArticles(totalArticles);

    console.log('=====================================');
    console.log('Scraping complete!');
    console.log(`New articles to analyze: ${savedCount}`);

    return savedCount;
  } catch (error) {
    console.error('Error in scraping process:', error);
    throw error;
  } finally {
    await xanoClient.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  scrapeAll()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { scrapeAll };
