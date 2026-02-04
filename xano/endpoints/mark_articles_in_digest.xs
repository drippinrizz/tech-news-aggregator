// Endpoint: mark_articles_in_digest
// Method: POST
// Path: /mark_articles_in_digest
// Description: Endpoint created via MCP - mark_articles_in_digest

query mark_articles_in_digest verb=POST {
  api_group = "Topics"

  input {
    // API key for authentication
    text api_key

    json article_ids
    timestamp digest_sent_at?=now
  }

  stack {
    function.run "auth/verify_api_key" {
      input = {api_key: $input.api_key}
    }

    foreach ($input.article_ids) {
      each as $article_id {
        db.edit articles {
          field_name = "id"
          field_value = $article_id
          data = {
            included_in_digest: true
            digest_sent_at    : $input.digest_sent_at
          }
        }
      }
    }
  }

  response = {success: true, count: $input.article_ids|count}
  tags = ["🤖 2026-01-22 19:59 PST"]
}
