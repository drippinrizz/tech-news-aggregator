import axios from 'axios';
import { AggregatedArticle } from '../types';

const SUBREDDITS = [
  'technology',
  'programming',
  'MachineLearning',
  'artificial',
  'webdev',
  'javascript',
  'typescript',
  'reactjs',
  'devops',
  'cybersecurity',
  'learnprogramming',
];

const POST_LIMIT = 25; // Posts per subreddit

interface RedditPost {
  data: {
    title: string;
    url: string;
    selftext: string;
    author: string;
    created_utc: number;
    permalink: string;
    is_self: boolean;
    link_flair_text?: string;
  };
}

export class RedditAggregator {
  async fetchArticles(sourceId: string, customSubreddits?: string[]): Promise<AggregatedArticle[]> {
    const subreddits = customSubreddits || SUBREDDITS;
    const articles: AggregatedArticle[] = [];

    console.log(`Fetching posts from ${subreddits.length} subreddits...`);

    for (const subreddit of subreddits) {
      try {
        const { data } = await axios.get(
          `https://www.reddit.com/r/${subreddit}/hot.json?limit=${POST_LIMIT}`,
          {
            headers: {
              'User-Agent': 'tech-news-aggregator/1.0',
            },
          }
        );

        const posts: RedditPost[] = data.data.children;

        // Filter for recent posts (last 24 hours)
        const oneDayAgo = Date.now() / 1000 - 24 * 60 * 60;

        for (const post of posts) {
          if (post.data.created_utc < oneDayAgo) {
            continue;
          }

          // Determine the URL - use the post permalink for self-posts
          const url = post.data.is_self
            ? `https://www.reddit.com${post.data.permalink}`
            : post.data.url;

          // Build description from selftext and flair
          let description = post.data.selftext || post.data.title;
          if (post.data.link_flair_text) {
            description = `[${post.data.link_flair_text}] ${description}`;
          }

          articles.push({
            title: post.data.title,
            url: url,
            description: description.substring(0, 500), // Limit description length
            content: post.data.selftext,
            author: post.data.author,
            publishedAt: new Date(post.data.created_utc * 1000),
            sourceId,
          });
        }

        console.log(`Fetched ${posts.length} posts from r/${subreddit}`);

        // Rate limiting - be nice to Reddit's servers
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error fetching subreddit r/${subreddit}:`, error);
      }
    }

    console.log(`Total Reddit posts fetched: ${articles.length}`);
    return articles;
  }
}
