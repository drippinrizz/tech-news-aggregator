import 'dotenv/config';

const XANO_API_URL = process.env.XANO_API_URL || '';
const XANO_API_KEY = process.env.XANO_API_KEY || '';

function xanoHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
  };
}

class XanoArticleClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async findMany(params: {
    where?: any;
    select?: any;
    include?: any;
    orderBy?: any;
    take?: number;
  }) {
    // Handle unanalyzed articles query
    if (params.where?.analyzed === false) {
      const limit = params.take || 50;
      const response = await fetch(`${this.baseUrl}/get_unanalyzed_articles?api_key=${encodeURIComponent(XANO_API_KEY)}&limit=${limit}`, {
        method: 'GET',
        headers: xanoHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Xano API error: ${response.status}`);
      }

      const articles = await response.json() as any[];

      // Map field names from snake_case to camelCase
      return articles.map((article: any) => ({
        id: article.id,
        title: article.title,
        url: article.url,
        description: article.description,
        content: article.content,
        relevanceScore: article.relevance_score,
        topics: article.topics,
        reasoning: article.reasoning,
        analyzed: article.analyzed,
      }));
    }

    // Handle digest articles query
    if (params.where?.analyzed === true && params.where?.shouldComment === true) {
      const startTime = params.where.createdAt?.gte;
      const minScore = params.where.relevanceScore?.gte || 7;
      const limit = params.take || 20;

      const queryParams = new URLSearchParams({
        api_key: XANO_API_KEY,
        start_time: startTime ? startTime.toISOString() : new Date(0).toISOString(),
        min_relevance_score: String(minScore),
        limit: String(limit),
        included_in_digest: 'false',
      });

      const response = await fetch(`${this.baseUrl}/get_digest_articles?${queryParams}`, {
        method: 'GET',
        headers: xanoHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Xano API error: ${response.status}`);
      }

      const articles = await response.json() as any[];

      // Map field names from snake_case to camelCase and format source
      return articles.map((article: any) => ({
        id: article.id,
        title: article.title,
        url: article.url,
        description: article.description,
        content: article.content,
        author: article.author,
        publishedAt: article.published_at ? new Date(article.published_at) : null,
        relevanceScore: article.relevance_score,
        topics: article.topics,
        reasoning: article.reasoning,
        shouldComment: article.should_comment,
        suggestedResponse: article.suggested_response,
        analyzed: article.analyzed,
        includedInDigest: article.included_in_digest,
        digestSentAt: article.digest_sent_at ? new Date(article.digest_sent_at) : null,
        createdAt: article.created_at ? new Date(article.created_at) : null,
        source: { name: article.source || 'unknown' },
      }));
    }

    // Default: return empty array for unsupported queries
    console.warn('[Xano Client] Unsupported query:', params);
    return [];
  }

  async createMany(params: {
    data: Array<{
      sourceId: string | number;
      title: string;
      url: string;
      description?: string;
      content?: string;
      author?: string;
      publishedAt?: Date | string;
      topics?: string;
    }>
  }) {
    const articles = params.data.map(article => ({
      source_id: article.sourceId,
      title: article.title,
      url: article.url,
      description: article.description || '',
      content: article.content || '',
      author: article.author || '',
      published_at: article.publishedAt || null,
      topics: article.topics || '',
    }));

    const response = await fetch(`${this.baseUrl}/bulk_create_articles`, {
      method: 'POST',
      headers: xanoHeaders(),
      body: JSON.stringify({ api_key: XANO_API_KEY, articles }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Xano API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json() as any;
    return { created: result.created, skipped: result.skipped };
  }

  async updateBatch(params: {
    data: Array<{
      id: number;
      analyzed: boolean;
      relevanceScore?: number;
      topics?: string;
      reasoning?: string;
      shouldComment?: boolean;
      suggestedResponse?: string;
    }>
  }) {
    const articles = params.data.map(article => ({
      article_id: article.id,
      analyzed: article.analyzed,
      relevance_score: article.relevanceScore ?? null,
      topics: article.topics ?? '',
      reasoning: article.reasoning ?? '',
      should_comment: article.shouldComment ?? false,
      suggested_response: article.suggestedResponse ?? '',
    }));

    const response = await fetch(`${this.baseUrl}/bulk_update_analysis`, {
      method: 'POST',
      headers: xanoHeaders(),
      body: JSON.stringify({ api_key: XANO_API_KEY, articles }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Xano API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json() as any;
    return { updated: result.updated };
  }

  async updateMany(params: { where: { id: { in: number[] } }; data: any }) {
    const response = await fetch(`${this.baseUrl}/mark_articles_in_digest`, {
      method: 'POST',
      headers: xanoHeaders(),
      body: JSON.stringify({
        api_key: XANO_API_KEY,
        article_ids: params.where.id.in,
        digest_sent_at: params.data.digestSentAt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Xano API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }
}

class XanoSourceClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async upsert(params: {
    where: { name: string };
    update: any;
    create: any;
  }) {
    const response = await fetch(`${this.baseUrl}/upsert_source`, {
      method: 'POST',
      headers: xanoHeaders(),
      body: JSON.stringify({
        api_key: XANO_API_KEY,
        name: params.create.name,
        type: params.create.type,
        url: params.create.url,
        enabled: params.update.enabled !== undefined ? params.update.enabled : params.create.enabled,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Xano API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  async findMany(params: { where?: { enabled: boolean } }) {
    const enabled = params.where?.enabled !== undefined ? params.where.enabled : true;
    const response = await fetch(`${this.baseUrl}/get_sources?api_key=${encodeURIComponent(XANO_API_KEY)}&enabled=${enabled}`, {
      method: 'GET',
      headers: xanoHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Xano API error: ${response.status}`);
    }

    return await response.json();
  }

  async update(params: { where: { id: number }; data: { lastScraped: Date } }) {
    const response = await fetch(`${this.baseUrl}/update_source`, {
      method: 'PATCH',
      headers: xanoHeaders(),
      body: JSON.stringify({
        api_key: XANO_API_KEY,
        source_id: params.where.id,
        last_scraped: params.data.lastScraped.toISOString(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Xano API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }
}

class XanoDigestLogClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async create(params: {
    data: {
      type: string;
      articleCount: number;
      success: boolean;
      error?: string;
    };
  }) {
    const response = await fetch(`${this.baseUrl}/create_digest_log`, {
      method: 'POST',
      headers: xanoHeaders(),
      body: JSON.stringify({
        api_key: XANO_API_KEY,
        digest_type: params.data.type,
        article_count: params.data.articleCount,
        success: params.data.success,
        error: params.data.error,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Xano API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json() as any;
    return result.log;
  }
}

class XanoClient {
  article: XanoArticleClient;
  source: XanoSourceClient;
  digestLog: XanoDigestLogClient;

  constructor() {
    if (!XANO_API_URL) {
      throw new Error('XANO_API_URL not configured');
    }

    this.article = new XanoArticleClient(XANO_API_URL);
    this.source = new XanoSourceClient(XANO_API_URL);
    this.digestLog = new XanoDigestLogClient(XANO_API_URL);
  }

  async $disconnect() {
    // No-op for Xano (REST API, no persistent connection)
  }
}

const xanoClient = new XanoClient();

export default xanoClient;
