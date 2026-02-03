// Endpoint: sync_topics
// Method: POST
// Path: /sync_topics
// Description: Receives topic data from external news aggregator and upserts major/minor topics

query sync_topics verb=POST {
  api_group = "Topics"

  input {
    json topics
  }

  stack {
    var $results {
      value = []
    }

    var $stats {
      value = {
        majors_added  : 0
        majors_updated: 0
        minors_added  : 0
        minors_updated: 0
      }
    }

    foreach ($input.topics) {
      each as $topic_data {
        // Query database directly for existing major topic (case insensitive)
        db.query major_topic {
          where = ($db.major_topic.name|to_lower) == ($topic_data.major_topic|to_lower)
          return = {type: "single"}
        } as $existing_major

        var $major_id {
          value = 0
        }

        conditional {
          if ($existing_major != null) {
            // Major exists - update it
            db.edit major_topic {
              field_name = "id"
              field_value = $existing_major.id
              data = {
                importance   : $topic_data.importance
                rationale    : $topic_data.rationale
                article_count: ($existing_major.article_count + 1)
                last_blog_at : now
              }
            }

            var.update $major_id {
              value = $existing_major.id
            }

            var.update $stats {
              value = $stats
                |set:"majors_updated":$stats.majors_updated + 1
            }
          }

          else {
            // Create new major topic
            db.add major_topic {
              data = {
                name         : $topic_data.major_topic
                description  : $topic_data.rationale
                importance   : $topic_data.importance
                rationale    : $topic_data.rationale
                article_count: 1
                last_blog_at : now
              }
            } as $new_major

            var.update $major_id {
              value = $new_major.id
            }

            var.update $stats {
              value = $stats
                |set:"majors_added":$stats.majors_added + 1
            }
          }
        }

        // Process minor topics
        foreach ($topic_data.minor_topics) {
          each as $minor_data {
            // Query database directly for existing minor topic
            db.query minor_topic {
              where = (($db.minor_topic.name|to_lower) == ($minor_data.name|to_lower)) && ($db.minor_topic.major_topic == $major_id)
              return = {type: "single"}
            } as $existing_minor

            conditional {
              if ($existing_minor != null) {
                // Update existing
                db.edit minor_topic {
                  field_name = "id"
                  field_value = $existing_minor.id
                  data = {
                    importance   : $minor_data.importance
                    rationale    : $minor_data.rationale
                    article_count: ($existing_minor.article_count + 1)
                  }
                }

                var.update $stats {
                  value = $stats
                    |set:"minors_updated":$stats.minors_updated + 1
                }
              }

              else {
                // Create new minor topic
                db.add minor_topic {
                  data = {
                    name         : $minor_data.name
                    description  : $minor_data.rationale
                    major_topic  : $major_id
                    importance   : $minor_data.importance
                    rationale    : $minor_data.rationale
                    article_count: 1
                  }
                }

                var.update $stats {
                  value = $stats
                    |set:"minors_added":$stats.minors_added + 1
                }
              }
            }
          }
        }

        var.update $results {
          value = $results
            |push:{major_topic: $topic_data.major_topic, major_id: $major_id, processed: true}
        }
      }
    }
  }

  response = {
    success        : true
    processed_count: $results|count
    stats          : $stats
    results        : $results
  }

  history = 100
}
