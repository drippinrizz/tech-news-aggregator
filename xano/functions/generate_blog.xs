function generate_blog {
  input {
    text content? filters=trim
    int id?
  }

  stack {
    ai.agent.run "Blog Post Generator" {
      args = {}
        |set:"content":$input.content
        |set:"user_id":$input.id
      allow_tool_execution = true
    } as $blog_result
  }

  response = $blog_result
}
