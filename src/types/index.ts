export interface AggregatedArticle {
  title: string;
  url: string;
  description?: string;
  content?: string;
  author?: string;
  publishedAt?: Date;
  sourceId: string;
}

export interface AnalysisResult {
  relevanceScore: number; // 0-10
  topics: string[];
  reasoning: string;
  shouldComment: boolean;
  suggestedResponse?: string;
}

export interface MinorTopic {
  name: string;
  importance: number; // 0-10
  rationale: string;
}

export interface TopicAnalysis {
  major_topic: string;
  importance: number; // 0-10
  rationale: string;
  minor_topics: MinorTopic[];
}

export interface ExtendedAnalysisResult extends AnalysisResult {
  topicAnalysis?: TopicAnalysis;
}

export interface DigestData {
  articles: Array<{
    title: string;
    url: string;
    description?: string;
    author?: string;
    publishedAt?: Date;
    relevanceScore: number;
    topics: string[];
    reasoning: string;
    sourceName: string;
    suggestedResponse?: string;
  }>;
  type: 'morning' | 'evening';
  date: Date;
}

export interface SourceConfig {
  name: string;
  type: 'api' | 'rss' | 'scraper';
  url?: string;
  enabled: boolean;
}
