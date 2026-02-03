// Endpoint: mark_articles_in_digest
// Method: POST
// Path: /mark_articles_in_digest
// Description: Endpoint created via MCP - mark_articles_in_digest

query mark_articles_in_digest verb=POST {
  api_group = "Topics"

  input {
    json article_ids
    timestamp digest_sent_at?=now
  }

  stack {
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
