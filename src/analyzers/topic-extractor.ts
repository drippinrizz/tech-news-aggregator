import { TopicAnalysis } from '../types';
import {
  AIProvider,
  createAIProvider,
  getProviderType,
  getProviderApiKey,
} from './providers';

export interface ExistingTopic {
  id: number;
  name: string;
  description?: string;
}

export class TopicExtractor {
  private provider: AIProvider;

  constructor(apiKey?: string, providerType?: 'anthropic' | 'openai' | 'google') {
    const type = providerType || getProviderType();
    const key = apiKey || getProviderApiKey(type);

    if (!key) {
      throw new Error(`No API key found for provider: ${type}`);
    }

    this.provider = createAIProvider(type, key);
    console.log(`TopicExtractor initialized with ${this.provider.getName()}`);
  }

  async extractTopicsFromArticles(
    articles: Array<{
      title: string;
      topics: string;
      reasoning: string;
      relevanceScore: number;
    }>,
    existingMajorTopics: ExistingTopic[] = [],
    existingMinorTopics: ExistingTopic[] = []
  ): Promise<TopicAnalysis[]> {
    if (articles.length === 0) {
      return [];
    }

    try {
      // Prepare article summaries for analysis
      const articleSummaries = articles
        .map(
          (a, i) =>
            `${i + 1}. "${a.title}" - Topics: ${a.topics} - Score: ${a.relevanceScore}/10 - Reasoning: ${a.reasoning.substring(0, 200)}`
        )
        .join('\n');

      // Build existing topics section if available
      const existingMajorList = existingMajorTopics.length > 0
        ? `\n\nEXISTING MAJOR TOPICS IN DATABASE (USE THESE EXACT NAMES if applicable):\n${existingMajorTopics.map(t => `- "${t.name}"`).join('\n')}`
        : '';

      const existingMinorList = existingMinorTopics.length > 0
        ? `\n\nEXISTING MINOR TOPICS IN DATABASE (USE THESE EXACT NAMES if applicable):\n${existingMinorTopics.map(t => `- "${t.name}"`).join('\n')}`
        : '';

      const prompt = `You are analyzing a batch of tech news articles to identify major themes and subtopics.
Your goal is to group these articles into coherent major topics with relevant minor subtopics.
${existingMajorList}${existingMinorList}

CRITICAL: If an existing topic matches what you want to categorize, you MUST use the EXACT existing topic name.
Only create a new topic name if nothing in the existing list is a good match.

Here are the articles analyzed recently:
${articleSummaries}

Based on these articles, identify the major themes/topics and their subtopics. For each topic:
1. Identify a clear MAJOR TOPIC - FIRST check if an existing topic matches, use that exact name. Otherwise create a new one.
2. Rate its IMPORTANCE (0-10) based on how many articles relate to it and their relevance scores
3. Provide a RATIONALE explaining why this topic is important right now
4. List 2-4 MINOR SUBTOPICS - FIRST check existing minor topics, use exact names if they match.

Respond in this exact JSON format:
{
  "topics": [
    {
      "major_topic": "Major Topic Name (use existing name if matches)",
      "importance": 8.5,
      "rationale": "Why this major topic is important based on the articles",
      "minor_topics": [
        {
          "name": "Minor Subtopic 1 (use existing name if matches)",
          "importance": 7.0,
          "rationale": "Why this subtopic matters"
        },
        {
          "name": "Minor Subtopic 2",
          "importance": 6.5,
          "rationale": "Why this subtopic matters"
        }
      ]
    }
  ]
}

Focus on:
- REUSING existing topic names when they fit (this is critical to avoid duplicates!)
- Identifying 2-5 major topics that best represent the current news landscape
- Ensuring minor topics are specific enough to be actionable but broad enough to encompass multiple articles
- Providing insightful rationales that could inform blog post content

Respond with only the JSON object, no markdown formatting.`;

      const responseText = await this.provider.complete(
        [{ role: 'user', content: prompt }],
        { maxTokens: 2048 }
      );

      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse topic extraction response');
      }

      const result = JSON.parse(jsonMatch[0]);

      // Validate and normalize the response
      if (!result.topics || !Array.isArray(result.topics)) {
        return [];
      }

      return result.topics.map((topic: any) => ({
        major_topic: topic.major_topic || 'Uncategorized',
        importance: Math.max(0, Math.min(10, topic.importance || 5)),
        rationale: topic.rationale || '',
        minor_topics: (topic.minor_topics || []).map((minor: any) => ({
          name: minor.name || 'Unknown',
          importance: Math.max(0, Math.min(10, minor.importance || 5)),
          rationale: minor.rationale || '',
        })),
      }));
    } catch (error) {
      console.error('Error extracting topics:', error);
      return [];
    }
  }
}
