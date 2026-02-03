import 'dotenv/config';
import xanoClient from './database/xano-client';
import { ArticleAnalyzer } from './analyzers/article-analyzer';

const MIN_RELEVANCE_SCORE = parseFloat(process.env.MIN_RELEVANCE_SCORE || '7');
const BATCH_SIZE = 50; // Analyze in batches to avoid overwhelming the API

async function analyzeArticles() {
  console.log('Starting article analysis...');
  console.log('=====================================');

  const analyzer = new ArticleAnalyzer();

  try {
    // Get unanalyzed articles
    const unanalyzedArticles = await xanoClient.article.findMany({
      where: { analyzed: false },
      take: BATCH_SIZE,
      orderBy: { publishedAt: 'desc' },
    });

    if (unanalyzedArticles.length === 0) {
      console.log('No articles to analyze');
      return 0;
    }

    console.log(`Found ${unanalyzedArticles.length} articles to analyze`);
    console.log('-------------------------------------\n');

    let analyzedCount = 0;
    let relevantCount = 0;
    const batchUpdates: Array<{
      id: number;
      analyzed: boolean;
      relevanceScore?: number;
      topics?: string;
      reasoning?: string;
      shouldComment?: boolean;
      suggestedResponse?: string;
    }> = [];

    for (const article of unanalyzedArticles) {
      try {
        console.log(`Analyzing: ${article.title.substring(0, 60)}...`);

        // Analyze the article
        const analysis = await analyzer.analyzeArticle(
          article.title,
          article.description || '',
          article.url,
          article.content || undefined
        );

        // Collect result for batch update
        batchUpdates.push({
          id: article.id,
          analyzed: true,
          relevanceScore: analysis.relevanceScore,
          topics: analysis.topics.join(','),
          reasoning: analysis.reasoning,
          shouldComment: analysis.shouldComment && analysis.relevanceScore >= MIN_RELEVANCE_SCORE,
          suggestedResponse: analysis.suggestedResponse,
        });

        analyzedCount++;

        if (analysis.relevanceScore >= MIN_RELEVANCE_SCORE) {
          relevantCount++;
          console.log(
            `  ✓ Score: ${analysis.relevanceScore}/10 - RELEVANT - Topics: ${analysis.topics.join(', ')}`
          );
        } else {
          console.log(`  ✗ Score: ${analysis.relevanceScore}/10 - Not relevant`);
        }

        // Small delay between analyses to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`  Error analyzing article ${article.id}:`, error);

        // Mark as analyzed even if there was an error to prevent reprocessing
        batchUpdates.push({
          id: article.id,
          analyzed: true,
        });
      }
    }

    // Send all analysis results in a single bulk update
    if (batchUpdates.length > 0) {
      console.log(`\nSending batch update for ${batchUpdates.length} articles...`);
      const result = await xanoClient.article.updateBatch({ data: batchUpdates });
      console.log(`Batch update complete: ${result.updated} articles updated`);
    }

    console.log('\n=====================================');
    console.log(`Analysis complete!`);
    console.log(`Analyzed: ${analyzedCount} articles`);
    console.log(`Relevant (score >= ${MIN_RELEVANCE_SCORE}): ${relevantCount} articles`);
    console.log('=====================================');

    return analyzedCount;
  } catch (error) {
    console.error('Error in analysis process:', error);
    throw error;
  } finally {
    await xanoClient.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  analyzeArticles()
    .then(() => {
      console.log('Done!');
      setTimeout(() => process.exit(0), 100);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      setTimeout(() => process.exit(1), 100);
    });
}

export { analyzeArticles };
