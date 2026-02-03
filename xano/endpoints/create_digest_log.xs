// Endpoint: create_digest_log
// Method: POST
// Path: /create_digest_log
// Description: Endpoint created via MCP - create_digest_log

query create_digest_log verb=POST {
  api_group = "Topics"

  input {
    text digest_type
    int article_count
    bool success?=true
    text error?
  }

  stack {
    db.add digest_log {
      data = {
        digest_type  : $input.digest_type
        article_count: $input.article_count
        success      : $input.success
        error        : $input.error
      }
    } as $log
  }

  response = {success: true, log: $log}
  tags = ["🤖 2026-01-22 19:59 PST"]
}
