import 'dotenv/config';
import xanoClient from './database/xano-client';
import { DigestEmailer } from './email/digest';
import { DigestData } from './types';

const MIN_RELEVANCE_SCORE = parseFloat(process.env.MIN_RELEVANCE_SCORE || '7');

async function sendDigest(type: 'morning' | 'evening') {
  console.log(`Preparing ${type} digest...`);
  console.log('=====================================');

  try {
    // Validate email configuration
    const emailConfig = {
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      user: process.env.EMAIL_USER,
      password: process.env.EMAIL_PASSWORD,
      toEmail: process.env.EMAIL_TO,
    };

    if (!emailConfig.host || !emailConfig.user || !emailConfig.password || !emailConfig.toEmail) {
      throw new Error('Email configuration incomplete. Check .env file.');
    }

    const emailer = new DigestEmailer(emailConfig as { host: string; port: number; user: string; password: string; toEmail: string });

    // Calculate time range for this digest
    const now = new Date();
    let startTime: Date;

    // Look back 7 days to capture all unsent articles
    const lookbackDays = parseInt(process.env.DIGEST_LOOKBACK_DAYS || '7');

    if (type === 'morning') {
      // Morning digest: articles from lookback period
      startTime = new Date(now);
      startTime.setDate(startTime.getDate() - lookbackDays);
      startTime.setHours(0, 0, 0, 0);
    } else {
      // Evening digest: articles from lookback period
      startTime = new Date(now);
      startTime.setDate(startTime.getDate() - lookbackDays);
      startTime.setHours(0, 0, 0, 0);
    }

    console.log(`Time range: ${startTime.toLocaleString()} to ${now.toLocaleString()}`);

    // Get relevant articles that haven't been included in a digest yet
    const articles: any[] = await xanoClient.article.findMany({
      where: {
        analyzed: true,
        shouldComment: true,
        relevanceScore: { gte: MIN_RELEVANCE_SCORE },
        includedInDigest: false,
        createdAt: { gte: startTime },
      },
      include: {
        source: true,
      },
      orderBy: {
        relevanceScore: 'desc',
      },
      take: 20, // Limit to top 20 articles
    });

    console.log(`Found ${articles.length} relevant articles`);

    if (articles.length === 0) {
      console.log('No new relevant articles for this digest. Skipping email.');
      console.log('=====================================');
      return true; // Not an error, just nothing to send
    }

    // Prepare digest data
    const digestData: DigestData = {
      articles: articles.map((article) => ({
        title: article.title,
        url: article.url,
        description: article.description || undefined,
        author: article.author || undefined,
        publishedAt: article.publishedAt || undefined,
        relevanceScore: article.relevanceScore || 0,
        topics: article.topics ? article.topics.split(',') : [],
        reasoning: article.reasoning || '',
        sourceName: article.source.name,
        suggestedResponse: article.suggestedResponse || undefined,
      })),
      type,
      date: now,
    };

    // Send the digest
    const success = await emailer.sendDigest(digestData);

    if (success) {
      // Mark articles as included in digest
      await xanoClient.article.updateMany({
        where: {
          id: { in: articles.map((a) => a.id) },
        },
        data: {
          includedInDigest: true,
          digestSentAt: now,
        },
      });

      // Log the digest
      await xanoClient.digestLog.create({
        data: {
          type,
          articleCount: articles.length,
          success: true,
        },
      });

      console.log('=====================================');
      console.log(`${type.charAt(0).toUpperCase() + type.slice(1)} digest sent successfully!`);
      console.log(`Articles included: ${articles.length}`);
    } else {
      // Log failure
      await xanoClient.digestLog.create({
        data: {
          type,
          articleCount: 0,
          success: false,
          error: 'Failed to send email',
        },
      });

      console.error('Failed to send digest email');
    }

    return success;
  } catch (error) {
    console.error('Error sending digest:', error);

    // Log error
    await xanoClient.digestLog.create({
      data: {
        type,
        articleCount: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    throw error;
  } finally {
    await xanoClient.$disconnect();
  }
}

// Parse command line arguments
const digestType = process.argv[2] as 'morning' | 'evening' | undefined;

// Run if executed directly
if (require.main === module) {
  if (!digestType || (digestType !== 'morning' && digestType !== 'evening')) {
    console.error('Usage: npm run digest -- <morning|evening>');
    process.exit(1);
  }

  sendDigest(digestType)
    .then(() => {
      console.log('Done!');
      setTimeout(() => process.exit(0), 100);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      setTimeout(() => process.exit(1), 100);
    });
}

export { sendDigest };
