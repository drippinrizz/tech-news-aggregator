import nodemailer from 'nodemailer';
import { DigestData } from '../types';

export class DigestEmailer {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;
  private toEmail: string;

  constructor(config: {
    host: string;
    port: number;
    user: string;
    password: string;
    toEmail: string;
  }) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });

    this.fromEmail = config.user;
    this.toEmail = config.toEmail;
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  private generateHTML(data: DigestData): string {
    const { articles, type, date } = data;

    const articlesHTML = articles
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .map(
        (article, index) => `
      <div class="article">
        <div class="article-header">
          <span class="score">Score: ${article.relevanceScore.toFixed(1)}/10</span>
          <span class="source">${article.sourceName}</span>
        </div>
        <h2 class="article-number">${index + 1}. <a href="${article.url}">${article.title}</a></h2>
        ${article.author ? `<p class="author">By ${article.author}</p>` : ''}
        ${article.description ? `<p class="description">${article.description.substring(0, 300)}${article.description.length > 300 ? '...' : ''}</p>` : ''}
        <div class="topics">
          ${article.topics.map((topic) => `<span class="topic">${topic}</span>`).join('')}
        </div>
        <p class="reasoning"><strong>Why it matters:</strong> ${article.reasoning}</p>
        ${article.suggestedResponse ? `
        <div class="suggested-response">
          <div class="response-header">💬 Suggested Comment (select & copy):</div>
          <div class="response-text">${article.suggestedResponse}</div>
        </div>
        ` : ''}
        <p class="read-more"><a href="${article.url}">Read full article →</a></p>
      </div>
    `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            text-align: center;
          }
          .header h1 { margin: 0 0 10px 0; font-size: 32px; }
          .header p { margin: 0; font-size: 16px; opacity: 0.9; }
          .summary {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #667eea;
          }
          .article {
            background: white;
            padding: 25px;
            margin-bottom: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .article-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-size: 14px;
          }
          .score {
            background: #667eea;
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-weight: 600;
          }
          .source {
            color: #666;
            font-style: italic;
          }
          .article-number { margin: 10px 0; color: #2c3e50; }
          .article-number a { color: #2c3e50; text-decoration: none; }
          .article-number a:hover { color: #667eea; }
          .author { color: #666; font-size: 14px; margin: 5px 0; }
          .description { color: #555; margin: 15px 0; }
          .topics { margin: 15px 0; }
          .topic {
            display: inline-block;
            background: #e3f2fd;
            color: #1976d2;
            padding: 4px 12px;
            border-radius: 12px;
            margin-right: 8px;
            margin-bottom: 8px;
            font-size: 13px;
          }
          .reasoning {
            background: #f9f9f9;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
            font-size: 14px;
            color: #555;
          }
          .read-more { margin-top: 15px; }
          .read-more a {
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
          }
          .suggested-response {
            background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
            border: 2px solid #4caf50;
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
          }
          .response-header {
            font-weight: 600;
            color: #2e7d32;
            margin-bottom: 10px;
            font-size: 14px;
          }
          .response-text {
            background: white;
            padding: 12px;
            border-radius: 6px;
            font-size: 14px;
            color: #333;
            line-height: 1.5;
            user-select: all;
            cursor: text;
          }
          .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Tech News Digest</h1>
          <p>${type === 'morning' ? 'Morning Edition' : 'Evening Edition'} - ${this.formatDate(date)}</p>
        </div>

        <div class="summary">
          <strong>${articles.length} relevant article${articles.length !== 1 ? 's' : ''} worth your attention</strong>
          <p style="margin: 10px 0 0 0; color: #666;">AI-curated content matching your interests in tech, AI, and development</p>
        </div>

        ${articlesHTML}

        <div class="footer">
          <p>Generated by Tech News Aggregator</p>
          <p>Powered by AI Analysis</p>
        </div>
      </body>
      </html>
    `;
  }

  async sendDigest(data: DigestData): Promise<boolean> {
    try {
      const html = this.generateHTML(data);
      const subject = `Tech News Digest - ${data.type === 'morning' ? 'Morning' : 'Evening'} Edition (${data.articles.length} articles)`;

      await this.transporter.sendMail({
        from: this.fromEmail,
        to: this.toEmail,
        subject,
        html,
      });

      console.log(`Successfully sent ${data.type} digest with ${data.articles.length} articles`);
      return true;
    } catch (error) {
      console.error('Error sending digest email:', error);
      return false;
    }
  }
}
