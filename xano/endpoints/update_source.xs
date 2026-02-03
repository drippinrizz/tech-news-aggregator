// Endpoint: update_source
// Method: PATCH
// Path: /update_source
// Description: Endpoint created via MCP - update_source

query update_source verb=PATCH {
  api_group = "Topics"

  input {
    int source_id
    timestamp last_scraped?=now
  }

  stack {
    db.edit sources {
      field_name = "id"
      field_value = $input.source_id
      data = {last_scraped: $input.last_scraped}
    } as $updated_source
  }

  response = {success: true, source: $updated_source}
  tags = ["🤖 2026-01-22 19:57 PST"]
}
