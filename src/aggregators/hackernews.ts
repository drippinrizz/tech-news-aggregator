import axios from 'axios';
import { AggregatedArticle } from '../types';

const HN_API_BASE = 'https://hacker-news.firebaseio.com/v0';
const STORY_LIMIT = 30; // Number of top stories to fetch per run

export class HackerNewsAggregator {
  async fetchArticles(sourceId: string): Promise<AggregatedArticle[]> {
    try {
      console.log('Fetching HackerNews top stories...');

      // Get top story IDs
      const { data: storyIds } = await axios.get<number[]>(`${HN_API_BASE}/topstories.json`);

      // Fetch details for top N stories
      const articles: AggregatedArticle[] = [];
      const topStoryIds = storyIds.slice(0, STORY_LIMIT);

      for (const id of topStoryIds) {
        try {
          const { data: story } = await axios.get(`${HN_API_BASE}/item/${id}.json`);

          // Skip if not a story or if it's a job posting
          if (story.type !== 'story' || story.title?.toLowerCase().includes('who is hiring')) {
            continue;
          }

          // Skip if no URL (Ask HN, Show HN without links, etc.)
          if (!story.url) {
            story.url = `https://news.ycombinator.com/item?id=${story.id}`;
          }

          articles.push({
            title: story.title,
            url: story.url,
            description: story.text || story.title,
            author: story.by,
            publishedAt: story.time ? new Date(story.time * 1000) : undefined,
            sourceId,
          });
        } catch (error) {
          console.error(`Error fetching HN story ${id}:`, error);
        }
      }

      console.log(`Fetched ${articles.length} articles from HackerNews`);
      return articles;
    } catch (error) {
      console.error('Error fetching HackerNews articles:', error);
      throw error;
    }
  }
}
