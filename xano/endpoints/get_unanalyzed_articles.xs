// Endpoint: get_unanalyzed_articles
// Method: GET
// Path: /get_unanalyzed_articles
// Description: Endpoint created via MCP - get_unanalyzed_articles

query get_unanalyzed_articles verb=GET {
  api_group = "Topics"

  input {
    // API key for authentication
    text api_key

    int limit?=50
  }

  stack {
    function.run "auth/verify_api_key" {
      input = {api_key: $input.api_key}
    }

    db.query articles {
      where = $db.articles.analyzed == false
      sort = {published_at: "desc"}
      return = {type: "list", paging: {page: 1, per_page: $input.limit}}
    } as $articles
  }

  response = $articles.items
  tags = ["🤖 2026-01-22 19:58 PST"]
}
