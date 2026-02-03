// Endpoint: get_digest_articles
// Method: GET
// Path: /get_digest_articles
// Description: Endpoint created via MCP - get_digest_articles

query get_digest_articles verb=GET {
  api_group = "Topics"

  input {
    timestamp start_time
    int min_relevance_score?=7
    int limit?=20
  }

  stack {
    db.query articles {
      where = $db.articles.analyzed && $db.articles.should_comment && $db.articles.relevance_score >= $input.min_relevance_score && $db.articles.included_in_digest == false && $db.articles.created_at >= $input.start_time
      sort = {relevance_score: "desc"}
      return = {type: "list", paging: {page: 1, per_page: $input.limit}}
    } as $articles
  }

  response = $articles.items
  tags = ["🤖 2026-01-22 19:59 PST"]
}
