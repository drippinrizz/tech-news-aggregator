# Xano Database Schema and API

This directory contains all XanoScript files for the tech news aggregator backend.

## Directory Structure

```
xano/
├── endpoints/       # API endpoints (17 total)
├── functions/       # Reusable functions (2 total)
├── tables/          # Database table schemas (5 total)
└── README.md        # This file
```

## Tables

### Core Tables
- **articles** (498) - News articles from various sources with AI analysis
- **sources** (499) - News sources (RSS feeds, Reddit, HackerNews)
- **digest_log** (500) - Email digest send logs

### Topic Management
- **major_topic** (494) - High-level blog post topics
- **minor_topic** (495) - Subtopics related to major topics

## API Endpoints

### Article Management
- `create_article` (POST) - Create new article with source lookup
- `get_article_by_url` (GET) - Fetch article by URL
- `get_unanalyzed_articles` (GET) - Get articles pending AI analysis
- `update_article` (PATCH) - Update article analysis data
- `get_articles_needing_topic_mapping` (GET) - Articles needing topic IDs

### Digest System
- `get_digest_articles` (GET) - Retrieve articles for email digest
- `mark_articles_in_digest` (POST) - Mark articles as sent
- `create_digest_log` (POST) - Log digest sends

### Source Management
- `upsert_source` (POST) - Create or update news source
- `get_sources` (GET) - Get enabled/disabled sources
- `update_source` (PATCH) - Update last scraped timestamp

### Topic Management
- `sync_topics` (POST) - Sync major/minor topics from AI analysis
- `major_topics` (GET) - Get all major topics
- `minor_topics` (GET) - Get all minor topics
- `articles_by_topic` (GET) - Filter articles by topic
- `update_article_topics` (POST) - Update article topic mappings

### Legacy/Utility
- `sync_articles` (POST) - Batch article sync (legacy)

## Functions

- **get_articles_by_topic** (178) - Fetch articles for a topic (used by AI agent)
- **generate_blog** (179) - Trigger Blog Post Generator AI agent

## Data Flow

1. **Scraping** → `upsert_source`, `create_article`
2. **Analysis** → `get_unanalyzed_articles`, `update_article`
3. **Topic Extraction** → `sync_topics`, `get_articles_needing_topic_mapping`, `update_article_topics`
4. **Digest** → `get_digest_articles`, `mark_articles_in_digest`, `create_digest_log`
5. **Blog Generation** → `get_articles_by_topic`, `generate_blog`

## Authentication

All endpoints and tables are currently public (`auth = false`). Consider adding authentication for production use.

## API Base URL

```
https://xxmf-qrth-inat.n7d.xano.io/api:2xYQq2ub
```

## Notes

- All timestamps use Unix milliseconds
- `topics` field in articles stores comma-separated keywords
- `major_topic` and `minor_topics` store integer references to topic tables
- Source names are denormalized in articles for easier querying
