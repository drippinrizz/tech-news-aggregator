// Endpoint: sync_articles
// Method: POST
// Path: /sync_articles
// Description: Receives articles from external news aggregator and upserts them

query sync_articles verb=POST {
  api_group = "Topics"

  input {
    json articles
  }

  stack {
    var $results {
      value = []
    }

    var $stats {
      value = {added: 0, updated: 0, skipped: 0}
    }

    foreach ($input.articles) {
      each as $article_data {
        // Check if article already exists by URL
        db.query articles {
          where = $db.articles.url == $article_data.url
          return = {type: "single"}
        } as $existing

        conditional {
          if ($existing != null) {
            // Update existing article
            db.edit articles {
              field_name = "id"
              field_value = $existing.id
              data = {
                title             : $article_data.title
                description       : $article_data.description
                relevance_score   : $article_data.relevance_score
                major_topic       : $article_data.major_topic
                minor_topics      : $article_data.minor_topics
                reasoning         : $article_data.reasoning
                should_comment    : $article_data.should_comment
                suggested_response: $article_data.suggested_response
                analyzed          : $article_data.analyzed
                synced_at         : now
              }
            }

            var.update $stats {
              value = $stats|set:"updated":$stats.updated + 1
            }
          }

          else {
            // Create new article
            db.add articles {
              data = {
                title             : $article_data.title
                description       : $article_data.description
                url               : $article_data.url
                source            : $article_data.source
                content           : $article_data.content
                relevance_score   : $article_data.relevance_score
                major_topic       : $article_data.major_topic
                minor_topics      : $article_data.minor_topics
                reasoning         : $article_data.reasoning
                should_comment    : $article_data.should_comment
                suggested_response: $article_data.suggested_response
                analyzed          : $article_data.analyzed
                synced_at         : now
              }
            }

            var.update $stats {
              value = $stats|set:"added":$stats.added + 1
            }
          }
        }

        var.update $results {
          value = $results
            |push:{url: $article_data.url, processed: true}
        }
      }
    }
  }

  response = {
    success        : true
    processed_count: $results|count
    stats          : $stats
  }

  tags = ["🤖 2026-01-21 18:21 PST"]
  history = 100
}
