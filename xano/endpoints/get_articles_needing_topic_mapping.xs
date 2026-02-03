// Endpoint: get_articles_needing_topic_mapping
// Method: GET
// Path: /get_articles_needing_topic_mapping
// Description: Endpoint created via MCP - get_articles_needing_topic_mapping

query get_articles_needing_topic_mapping verb=GET {
  api_group = "Topics"

  input {
    int limit?=200
  }

  stack {
    db.query articles {
      where = $db.articles.analyzed && $db.articles.topics != null && $db.articles.topics != ""
      sort = {created_at: "desc"}
      return = {type: "list", paging: {page: 1, per_page: $input.limit}}
    } as $articles
  }

  response = $articles.items
  tags = ["🤖 2026-01-23 11:39 PST"]
}
