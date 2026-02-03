task generate_blog_post {
  stack {
    debug.log {
      value = "Starting blog post generation task"
    }

    db.query major_topic {
      return = {type: "count"}
    } as $topic_count

    conditional {
      if ($topic_count == 0) {
        debug.log {
          value = "No topics found in database. Skipping blog generation."
        }

        return {
          value = {
            success: false
            message: "No topics available for blog generation"
          }
        }
      }
    }

    db.query user {
      return = {type: "single"}
    } as $system_user

    conditional {
      if ($system_user == null) {
        debug.log {
          value = "No user found for blog attribution. Skipping."
        }

        return {
          value = {
            success: false
            message: "No user available for blog attribution"
          }
        }
      }
    }

    debug.log {
      value = "Calling Blog Post Generator agent with user_id: " ~ $system_user.id
    }

    ai.agent.run "Blog Post Generator" {
      args = {}|set:"user_id":$system_user.id
      allow_tool_execution = true
    } as $agent_result

    debug.log {
      value = {
        status        : "Blog generation task completed"
        agent_response: $agent_result
      }
    }
  }

  schedule = [{starts_on: 2026-01-16 18:00:00+0000, freq: 43200}]
  history = "all"
}
