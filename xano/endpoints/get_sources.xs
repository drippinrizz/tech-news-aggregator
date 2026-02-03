// Endpoint: get_sources
// Method: GET
// Path: /get_sources
// Description: Endpoint created via MCP - get_sources

query get_sources verb=GET {
  api_group = "Topics"

  input {
    bool enabled?=true
  }

  stack {
    db.query sources {
      where = $db.sources.enabled == $input.enabled
      return = {type: "list", paging: {page: 1, per_page: 100}}
    } as $sources
  }

  response = $sources.items
  tags = ["🤖 2026-01-22 19:57 PST"]
}
