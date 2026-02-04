// Endpoint: get_article_by_url
// Method: GET
// Path: /get_article_by_url
// Description: Endpoint created via MCP - get_article_by_url

query get_article_by_url verb=GET {
  api_group = "Topics"

  input {
    // API key for authentication
    text api_key

    text url
  }

  stack {
    function.run "auth/verify_api_key" {
      input = {api_key: $input.api_key}
    }

    db.query articles {
      where = $db.articles.url == $input.url
      return = {type: "single"}
    } as $article
  }

  response = $article
  tags = ["🤖 2026-01-22 19:58 PST"]
}
