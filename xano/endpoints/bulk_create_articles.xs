// Bulk create articles with server-side deduplication by URL. Accepts an array of articles, checks each for duplicates, and creates only new ones.
query bulk_create_articles verb=POST {
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

    var $created {
      value = 0
    }

    var $skipped {
      value = 0
    }

    foreach ($input.articles) {
      each as $article {
        db.query articles {
          where = $db.articles.url == $article.url
          return = {type: "list"}
        } as $existing

        conditional {
          if (($existing|count) > 0) {
            math.add $skipped {
              value = 1
            }
          }

          else {
            db.query sources {
              where = $db.sources.id == $article.source_id
              return = {type: "list"}
            } as $source_result

            var $source_name {
              value = ""
            }

            conditional {
              if (($source_result|count) > 0) {
                var.update $source_name {
                  value = ($source_result|first).name
                }
              }
            }

            db.add articles {
              data = {
                source_id         : $article.source_id
                source            : $source_name
                title             : $article.title
                url               : $article.url
                description       : $article.description
                content           : $article.content
                author            : $article.author
                published_at      : $article.published_at
                topics            : $article.topics
                analyzed          : false
                included_in_digest: false
              }
            } as $new_article

            math.add $created {
              value = 1
            }
          }
        }
      }
    }
  }

  response = {success: true, created: $created, skipped: $skipped}
}
