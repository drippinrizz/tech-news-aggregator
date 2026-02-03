import axios from 'axios';
import Parser from 'rss-parser';
import { AggregatedArticle } from '../types';

const DEV_TO_API = 'https://dev.to/api/articles';
const ARTICLE_LIMIT = 30;

// Popular Medium tech publications via RSS
const MEDIUM_FEEDS = [
  'https://medium.com/feed/tag/technology',
  'https://medium.com/feed/tag/programming',
  'https://medium.com/feed/tag/artificial-intelligence',
  'https://medium.com/feed/tag/web-development',
  'https://medium.com/feed/tag/software-engineering',
  'https://medium.com/feed/@towardsdatascience',
  'https://medium.com/feed/hackernoon',
];

interface DevToArticle {
  id: number;
  title: string;
  description: string;
  url: string;
  published_at: string;
  user: {
    name: string;
  };
  body_markdown?: string;
  tags: string[];
}

export class DevToMediumAggregator {
  private parser: Parser;

  constructor() {
    this.parser = new Parser({
      timeout: 10000,
    });
  }

  async fetchDevToArticles(sourceId: string): Promise<AggregatedArticle[]> {
    try {
      console.log('Fetching Dev.to articles...');

      const { data } = await axios.get<DevToArticle[]>(DEV_TO_API, {
        params: {
          per_page: ARTICLE_LIMIT,
          top: 7, // Articles from the last week
        },
      });

      const articles: AggregatedArticle[] = data.map((article) => ({
        title: article.title,
        url: article.url,
        description: article.description,
        content: article.body_markdown,
        author: article.user.name,
        publishedAt: new Date(article.published_at),
        sourceId,
      }));

      console.log(`Fetched ${articles.length} articles from Dev.to`);
      return articles;
    } catch (error) {
      console.error('Error fetching Dev.to articles:', error);
      return [];
    }
  }

  async fetchMediumArticles(sourceId: string): Promise<AggregatedArticle[]> {
    const articles: AggregatedArticle[] = [];

    console.log(`Fetching articles from ${MEDIUM_FEEDS.length} Medium feeds...`);

    for (const feedUrl of MEDIUM_FEEDS) {
      try {
        const feed = await this.parser.parseURL(feedUrl);

        // Get articles from the last 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        for (const item of feed.items.slice(0, 10)) {
          const publishedDate = item.pubDate ? new Date(item.pubDate) : new Date();

          if (publishedDate < oneDayAgo) {
            continue;
          }

          articles.push({
            title: item.title || 'Untitled',
            url: item.link || item.guid || '',
            description: item.contentSnippet || item.summary || '',
            content: item.content || item.contentSnippet || '',
            author: item.creator || item.author || 'Unknown',
            publishedAt: publishedDate,
            sourceId,
          });
        }

        console.log(`Fetched articles from ${feed.title || feedUrl}`);

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error fetching Medium feed ${feedUrl}:`, error);
      }
    }

    console.log(`Total Medium articles fetched: ${articles.length}`);
    return articles;
  }

  async fetchArticles(sourceId: string): Promise<AggregatedArticle[]> {
    const [devToArticles, mediumArticles] = await Promise.all([
      this.fetchDevToArticles(sourceId),
      this.fetchMediumArticles(sourceId),
    ]);

    return [...devToArticles, ...mediumArticles];
  }
}
