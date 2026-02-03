// Endpoint: create_article
// Method: POST
// Path: /create_article
// Description: Create a new article in the database with source name lookup

query create_article verb=POST {
  api_group = "Topics"

  input {
    int source_id
    text title
    text url
    text description?
    text content?
    text author?
    timestamp published_at?
    text topics?
  }

  stack {
    db.query sources {
      where = $db.sources.id == $input.source_id
      return = {type: "single"}
    } as $source

    db.add articles {
      data = {
        source_id         : $input.source_id
        source            : $source.name
        title             : $input.title
        url               : $input.url
        description       : $input.description
        content           : $input.content
        author            : $input.author
        published_at      : $input.published_at
        topics            : $input.topics
        analyzed          : false
        included_in_digest: false
      }
    } as $new_article
  }

  response = {success: true, article: $new_article}
  tags = ["🤖 2026-01-23"]
}
