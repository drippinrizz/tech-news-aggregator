import 'dotenv/config';
import xanoClient from '../database/xano-client';
import { TopicExtractor, ExistingTopic } from '../analyzers/topic-extractor';
import { TopicAnalysis } from '../types';

const XANO_API_URL = process.env.XANO_API_URL || '';
const XANO_AUTH_TOKEN = process.env.XANO_AUTH_TOKEN || '';
const XANO_API_KEY = process.env.XANO_API_KEY || '';

interface XanoTopic {
  id: number;
  name: string;
  description?: string;
}

interface XanoSyncResult {
  success: boolean;
  processed_count: number;
  results: Array<{ major_topic: string; processed: boolean }>;
}

interface XanoArticleSyncResult {
  success: boolean;
  processed_count: number;
  stats: { added: number; updated: number; skipped: number };
}

interface XanoTopicsResponse {
  items: XanoTopic[];
}

async function fetchExistingTopics(): Promise<{ majors: ExistingTopic[]; minors: ExistingTopic[] }> {
  try {
    // Fetch major topics
    const majorsResponse = await fetch(`${XANO_API_URL}/major_topics?api_key=${encodeURIComponent(XANO_API_KEY)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    // Fetch minor topics
    const minorsResponse = await fetch(`${XANO_API_URL}/minor_topics?api_key=${encodeURIComponent(XANO_API_KEY)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    let majors: ExistingTopic[] = [];
    let minors: ExistingTopic[] = [];

    if (majorsResponse.ok) {
      const majorsData = await majorsResponse.json() as XanoTopicsResponse;
      majors = (majorsData.items || []).map(t => ({ id: t.id, name: t.name, description: t.description }));
    }

    if (minorsResponse.ok) {
      const minorsData = await minorsResponse.json() as XanoTopicsResponse;
      minors = (minorsData.items || []).map(t => ({ id: t.id, name: t.name, description: t.description }));
    }

    console.log(`[Xano Sync] Found ${majors.length} existing major topics, ${minors.length} existing minor topics`);
    return { majors, minors };
  } catch (error) {
    console.error('[Xano Sync] Error fetching existing topics:', error);
    return { majors: [], minors: [] };
  }
}

export async function syncTopicsToXano(): Promise<void> {
  console.log('\n[Xano Sync] Starting topic sync...');
  console.log('=====================================');

  if (!XANO_API_URL || !XANO_AUTH_TOKEN) {
    console.log('[Xano Sync] Skipping - XANO_API_URL or XANO_AUTH_TOKEN not configured');
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[Xano Sync] ANTHROPIC_API_KEY not found');
    return;
  }

  try {
    // Get recently analyzed articles from Xano (with good scores)
    const response = await fetch(`${XANO_API_URL}/get_articles_needing_topic_mapping?api_key=${encodeURIComponent(XANO_API_KEY)}&limit=50`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Xano Sync] API error response: ${errorText}`);
      throw new Error(`Xano API error: ${response.status} - ${errorText}`);
    }

    const allArticles = await response.json() as any[];

    // Filter for high relevance articles
    const recentArticles = allArticles.filter((a: any) => a.relevance_score >= 5).slice(0, 50);

    if (recentArticles.length === 0) {
      console.log('[Xano Sync] No recent articles to analyze for topics');
      return;
    }

    console.log(`[Xano Sync] Found ${recentArticles.length} recent articles`);

    // Fetch existing topics from Xano first
    const existingTopics = await fetchExistingTopics();

    // Extract topics using Claude, passing existing topics to avoid duplicates
    const topicExtractor = new TopicExtractor(apiKey);
    const topics = await topicExtractor.extractTopicsFromArticles(
      recentArticles.map((a) => ({
        title: a.title,
        topics: a.topics || '',
        reasoning: a.reasoning || '',
        relevanceScore: a.relevanceScore || 0,
      })),
      existingTopics.majors,
      existingTopics.minors
    );

    if (topics.length === 0) {
      console.log('[Xano Sync] No topics extracted');
      return;
    }

    console.log(`[Xano Sync] Extracted ${topics.length} major topics`);

    // Send to Xano API
    const result = await sendTopicsToXano(topics);

    if (result.success) {
      console.log(`[Xano Sync] Successfully synced ${result.processed_count} topics`);
      result.results.forEach((r) => {
        console.log(`  ✓ ${r.major_topic}`);
      });
    } else {
      console.error('[Xano Sync] Failed to sync topics');
    }
  } catch (error) {
    console.error('[Xano Sync] Error:', error);
  }

  console.log('=====================================\n');
}

async function sendTopicsToXano(topics: TopicAnalysis[]): Promise<XanoSyncResult> {
  try {
    const response = await fetch(`${XANO_API_URL}/sync_topics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: XANO_API_KEY, topics }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Xano API error: ${response.status} - ${errorText}`);
    }

    return await response.json() as XanoSyncResult;
  } catch (error) {
    console.error('[Xano Sync] API request failed:', error);
    return {
      success: false,
      processed_count: 0,
      results: [],
    };
  }
}

interface ArticleForSync {
  title: string;
  description: string | null;
  url: string;
  source: string;
  content: string | null;
  relevance_score: number | null;
  major_topic: number | null;
  minor_topics: number[] | null;
  reasoning: string | null;
  should_comment: boolean;
  suggested_response: string | null;
  analyzed: boolean;
}

async function mapTopicsToIds(topicsText: string | null, existingTopics: { majors: ExistingTopic[]; minors: ExistingTopic[] }): Promise<{ major_topic: number | null; minor_topics: number[] }> {
  if (!topicsText) {
    return { major_topic: null, minor_topics: [] };
  }

  // Parse topics text (comma-separated lowercase keywords)
  const topicKeywords = topicsText.toLowerCase().split(',').map(t => t.trim()).filter(t => t.length > 0);

  if (topicKeywords.length === 0) {
    return { major_topic: null, minor_topics: [] };
  }

  // Find best matching major topic using keyword overlap
  let bestMajorMatch: { topic: ExistingTopic; score: number } | null = null;

  for (const major of existingTopics.majors) {
    const majorNameLower = major.name.toLowerCase();
    const majorWords = majorNameLower.split(/\s+|&/);

    // Count keyword matches
    let matchScore = 0;
    for (const keyword of topicKeywords) {
      // Check for partial matches in major topic name
      if (majorWords.some(word => word.includes(keyword) || keyword.includes(word))) {
        matchScore++;
      }
      // Check specific patterns
      if (keyword.includes('ai') && majorNameLower.includes('ai')) matchScore += 2;
      if (keyword.includes('developer') && majorNameLower.includes('developer')) matchScore += 2;
      if (keyword.includes('software') && majorNameLower.includes('software')) matchScore += 2;
      if (keyword.includes('web') && majorNameLower.includes('web')) matchScore += 2;
      if (keyword.includes('cloud') && majorNameLower.includes('cloud')) matchScore += 2;
    }

    if (matchScore > 0 && (!bestMajorMatch || matchScore > bestMajorMatch.score)) {
      bestMajorMatch = { topic: major, score: matchScore };
    }
  }

  const majorTopicId = bestMajorMatch ? bestMajorMatch.topic.id : null;

  // Find matching minor topics
  const minorTopicIds: number[] = [];
  for (const minor of existingTopics.minors) {
    const minorNameLower = minor.name.toLowerCase();
    const minorWords = minorNameLower.split(/\s+|&/);

    let hasMatch = false;
    for (const keyword of topicKeywords) {
      if (minorWords.some(word => word.includes(keyword) || keyword.includes(word))) {
        hasMatch = true;
        break;
      }
    }

    if (hasMatch) {
      minorTopicIds.push(minor.id);
    }
  }

  return { major_topic: majorTopicId, minor_topics: minorTopicIds.slice(0, 4) }; // Limit to 4 minor topics
}

async function updateArticleTopics(articles: Array<{ url: string; major_topic_id: number | null; minor_topic_ids: number[] }>): Promise<{ success: boolean; updated_count: number }> {
  try {
    const response = await fetch(`${XANO_API_URL}/update_article_topics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: XANO_API_KEY, articles }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Xano API error: ${response.status} - ${errorText}`);
    }

    return await response.json() as { success: boolean; updated_count: number };
  } catch (error) {
    console.error('[Xano Sync] Update topics API request failed:', error);
    return {
      success: false,
      updated_count: 0,
    };
  }
}

export async function syncArticlesToXano(): Promise<void> {
  console.log('\n[Xano Sync] Starting article topic mapping...');
  console.log('=====================================');

  if (!XANO_API_URL || !XANO_AUTH_TOKEN) {
    console.log('[Xano Sync] Skipping - XANO_API_URL or XANO_AUTH_TOKEN not configured');
    return;
  }

  try {
    // Fetch existing topics from Xano first
    const existingTopics = await fetchExistingTopics();

    // Get articles from Xano that need topic mapping
    const response = await fetch(`${XANO_API_URL}/get_articles_needing_topic_mapping?api_key=${encodeURIComponent(XANO_API_KEY)}&limit=200`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Xano Sync] API error response: ${errorText}`);
      throw new Error(`Xano API error: ${response.status} - ${errorText}`);
    }

    const recentArticles = await response.json() as any[];

    if (!recentArticles || recentArticles.length === 0) {
      console.log('[Xano Sync] No articles need topic mapping');
      return;
    }

    console.log(`[Xano Sync] Mapping topics for ${recentArticles.length} articles...`);

    // Map topics to IDs for each article
    const articlesWithTopicIds = await Promise.all(
      recentArticles.map(async (a) => {
        const topicMapping = await mapTopicsToIds(a.topics, existingTopics);
        return {
          url: a.url,
          major_topic_id: topicMapping.major_topic,
          minor_topic_ids: topicMapping.minor_topics,
        };
      })
    );

    // Filter out articles without topic mappings
    const validArticles = articlesWithTopicIds.filter(a => a.major_topic_id !== null);

    if (validArticles.length === 0) {
      console.log('[Xano Sync] No valid topic mappings found');
      return;
    }

    console.log(`[Xano Sync] Updating ${validArticles.length} articles with topic IDs...`);

    // Send to Xano to update articles with topic IDs
    const result = await updateArticleTopics(validArticles);

    if (result.success) {
      console.log(`[Xano Sync] Successfully updated ${result.updated_count} articles with topic mappings`);
    } else {
      console.error('[Xano Sync] Failed to update article topics');
    }
  } catch (error) {
    console.error('[Xano Sync] Topic mapping error:', error);
  }

  console.log('=====================================\n');
}

// Run if executed directly
if (require.main === module) {
  (async () => {
    await syncTopicsToXano();
    await syncArticlesToXano();
    console.log('Sync complete!');
    process.exit(0);
  })().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

