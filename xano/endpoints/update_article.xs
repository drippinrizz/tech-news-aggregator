// Endpoint: update_article
// Method: PATCH
// Path: /update_article
// Description: Endpoint created via MCP - update_article

query update_article verb=PATCH {
  api_group = "Topics"

  input {
    // API key for authentication
    text api_key

    int article_id
    bool analyzed?
    int relevance_score?
    text topics?
    text reasoning?
    bool should_comment?
    text suggested_response?
    bool included_in_digest?
    timestamp digest_sent_at?
  }

  stack {
    function.run "auth/verify_api_key" {
      input = {api_key: $input.api_key}
    }

    db.query articles {
      where = $db.articles.id == $input.article_id
      return = {type: "single"}
    } as $existing

    db.edit articles {
      field_name = "id"
      field_value = $input.article_id
      data = {
        analyzed          : $input.analyzed
        relevance_score   : $input.relevance_score
        topics            : $input.topics
        reasoning         : $input.reasoning
        should_comment    : $input.should_comment
        suggested_response: $input.suggested_response
        included_in_digest: $input.included_in_digest
        digest_sent_at    : $input.digest_sent_at
      }
    } as $updated_article
  }

  response = {success: true, article: $updated_article}
  tags = ["🤖 2026-01-22 19:58 PST"]
}
