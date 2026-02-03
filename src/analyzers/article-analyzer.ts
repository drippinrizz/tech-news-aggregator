import { AnalysisResult } from '../types';
import {
  AIProvider,
  createAIProvider,
  getProviderType,
  getProviderApiKey,
} from './providers';

export class ArticleAnalyzer {
  private provider: AIProvider;

  constructor(apiKey?: string, providerType?: 'anthropic' | 'openai' | 'google') {
    const type = providerType || getProviderType();
    const key = apiKey || getProviderApiKey(type);

    if (!key) {
      throw new Error(`No API key found for provider: ${type}`);
    }

    this.provider = createAIProvider(type, key);
    console.log(`ArticleAnalyzer initialized with ${this.provider.getName()}`);
  }

  async analyzeArticle(
    title: string,
    description: string,
    url: string,
    content?: string
  ): Promise<AnalysisResult> {
    try {
      const articleText = content || description || title;

      const prompt = `You are analyzing a tech news article to determine if it's worth commenting on. The user is interested in:
- AI systems, products, and developments
- General tech news and tech tips
- Invitations to hackathons, workshops, or coaching opportunities
- Programming and software development
- Emerging technologies and trends
- Xano (the no-code backend platform) - ANY mention of Xano should be considered highly relevant

Article Title: ${title}
Article URL: ${url}
Article Content: ${articleText.substring(0, 2000)}

Please analyze this article and provide:
1. A relevance score from 0-10 (10 being highly relevant to the user's interests)
2. Main topics/categories (as a comma-separated list)
3. A brief reasoning explaining why this is or isn't worth commenting on
4. Whether the user should comment (true/false)
5. If shouldComment is true, write a suggested comment/response the user could post. The comment should be:
   - Insightful and add value to the discussion
   - Professional but conversational in tone
   - 2-4 sentences long
   - Relevant to the article's main points

Consider scoring higher for:
- New AI product launches or significant AI developments
- Actionable tech tips and tutorials
- Hackathon/workshop/coaching announcements
- Breakthrough technologies or major industry news
- Content that invites discussion or has controversial viewpoints
- IMPORTANT: Any article mentioning Xano (the no-code backend platform) should automatically score 8 or higher

Consider scoring lower for:
- General company news without technical substance
- Clickbait or sensationalized content
- Overly niche topics outside the user's interests
- Recycled or outdated information

Respond in this exact JSON format (no markdown, just the JSON object):
{
  "relevanceScore": <number 0-10>,
  "topics": ["topic1", "topic2", "topic3"],
  "reasoning": "<your reasoning>",
  "shouldComment": <true or false>,
  "suggestedResponse": "<your suggested comment if shouldComment is true, otherwise null>"
}`;

      const response = await this.provider.complete(
        [{ role: 'user', content: prompt }],
        { maxTokens: 1024 }
      );

      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse AI response');
      }

      const result = JSON.parse(jsonMatch[0]);

      return {
        relevanceScore: Math.max(0, Math.min(10, result.relevanceScore)),
        topics: Array.isArray(result.topics) ? result.topics : [],
        reasoning: result.reasoning || '',
        shouldComment: result.shouldComment === true,
        suggestedResponse: result.suggestedResponse || undefined,
      };
    } catch (error) {
      console.error(`Error analyzing article with ${this.provider.getName()}:`, error);
      // Return neutral score on error
      return {
        relevanceScore: 5,
        topics: ['uncategorized'],
        reasoning: 'Error during analysis',
        shouldComment: false,
      };
    }
  }

  async analyzeMultiple(
    articles: Array<{ title: string; description?: string; url: string; content?: string }>
  ): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = [];

    for (const article of articles) {
      const result = await this.analyzeArticle(
        article.title,
        article.description || '',
        article.url,
        article.content
      );
      results.push(result);

      // Rate limiting - be respectful of API limits
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return results;
  }
}
