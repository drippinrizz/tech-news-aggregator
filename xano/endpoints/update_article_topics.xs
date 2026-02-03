// Endpoint: update_article_topics
// Method: POST
// Path: /update_article_topics
// Description: Endpoint created via MCP - update_article_topics

query update_article_topics verb=POST {
  api_group = "Topics"

  input {
    json articles
  }

  stack {
    var $updated_count {
      value = 0
    }

    foreach ($input.articles) {
      each as $article {
        db.edit articles {
          field_name = "url"
          field_value = $article.url
          data = {
            major_topic : $article.major_topic_id
            minor_topics: $article.minor_topic_ids
          }
        }

        var.update $updated_count {
          value = $updated_count + 1
        }
      }
    }
  }

  response = {success: true, updated_count: $updated_count}
  tags = ["🤖 2026-01-23 11:38 PST"]
}
