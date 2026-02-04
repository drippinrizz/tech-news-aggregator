// Bulk update article analysis results. Accepts an array of article updates and applies them all in one request.
query bulk_update_analysis verb=POST {
  api_group = "Topics"

  input {
    // API key for authentication
    text api_key

    json articles
  }

  stack {
    function.run "auth/verify_api_key" {
      input = {api_key: $input.api_key}
    }

    var $updated {
      value = 0
    }

    foreach ($input.articles) {
      each as $article {
        db.edit articles {
          field_name = "id"
          field_value = $article.article_id
          data = {
            analyzed          : $article.analyzed
            relevance_score   : $article.relevance_score
            topics            : $article.topics
            reasoning         : $article.reasoning
            should_comment    : $article.should_comment
            suggested_response: $article.suggested_response
          }
        } as $updated_article

        math.add $updated {
          value = 1
        }
      }
    }
  }

  response = {success: true, updated: $updated}
}
