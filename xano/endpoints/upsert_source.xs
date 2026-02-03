// Endpoint: upsert_source
// Method: POST
// Path: /upsert_source
// Description: Endpoint created via MCP - upsert_source

query upsert_source verb=POST {
  api_group = "Topics"

  input {
    text name
    text type
    text url?
    bool enabled?=true
  }

  stack {
    db.query sources {
      where = $db.sources.name == $input.name
      return = {type: "single"}
    } as $existing

    conditional {
      if ($existing != null) {
        db.edit sources {
          field_name = "id"
          field_value = $existing.id
          data = {enabled: $input.enabled}
        } as $updated_source
      }

      else {
        db.add sources {
          data = {
            name   : $input.name
            type   : $input.type
            url    : $input.url
            enabled: $input.enabled
          }
        } as $new_source
      }
    }
  }

  response = {success: true}
  tags = ["🤖 2026-01-22 19:57 PST"]
}
