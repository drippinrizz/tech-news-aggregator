import Parser from 'rss-parser';
import { AggregatedArticle } from '../types';

// Popular tech blog RSS feeds
const TECH_BLOG_FEEDS = [
  'https://techcrunch.com/feed/',
  'https://www.theverge.com/rss/index.xml',
  'https://arstechnica.com/feed/',
  'https://venturebeat.com/feed/',
  'https://www.wired.com/feed/rss',
  'https://www.cnet.com/rss/news/',
  'https://www.engadget.com/rss.xml',
  'https://www.zdnet.com/news/rss.xml',
  'https://techradar.com/rss',
];

export class RSSAggregator {
  private parser: Parser;

  constructor() {
    this.parser = new Parser({
      timeout: 10000,
      customFields: {
        item: [
          ['media:content', 'mediaContent'],
          ['content:encoded', 'contentEncoded'],
        ],
      },
    });
  }

  async fetchArticles(sourceId: string, customFeeds?: string[]): Promise<AggregatedArticle[]> {
    const feeds = customFeeds || TECH_BLOG_FEEDS;
    const articles: AggregatedArticle[] = [];

    console.log(`Fetching articles from ${feeds.length} RSS feeds...`);

    for (const feedUrl of feeds) {
      try {
        const feed = await this.parser.parseURL(feedUrl);

        // Get articles from the last 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        for (const item of feed.items) {
          const publishedDate = item.pubDate ? new Date(item.pubDate) : new Date();

          // Only include recent articles
          if (publishedDate < oneDayAgo) {
            continue;
          }

          articles.push({
            title: item.title || 'Untitled',
            url: item.link || item.guid || '',
            description: item.contentSnippet || item.summary || item.content || '',
            content: (item as any).contentEncoded || item.content || item.contentSnippet || '',
            author: item.creator || item.author || feed.title || 'Unknown',
            publishedAt: publishedDate,
            sourceId,
          });
        }

        console.log(`Fetched ${feed.items.length} items from ${feed.title || feedUrl}`);
      } catch (error) {
        console.error(`Error fetching RSS feed ${feedUrl}:`, error);
      }
    }

    console.log(`Total RSS articles fetched: ${articles.length}`);
    return articles;
  }
}
