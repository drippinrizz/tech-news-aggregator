agent "Blog Post Generator" {
  canonical = "blog_post_generator"
  llm = {
    type         : "anthropic"
    system_prompt: "You are a tech blog writer. Use your tools to research topics and save blog posts."
    max_steps    : 15
    prompt       : ""
    api_key      : "{{ $env.AI_PROVIDER_API_KEY }}"
    model        : "claude-sonnet-4-20250514"
    temperature  : 0.7
    reasoning    : true
    baseURL      : ""
    headers      : ""
  }

  tools = [
    {name: "get_articles_by_topic"}
    {name: "get_trending_topics"}
    {name: "get_recent_posts"}
    {name: "get_voices"}
    {name: "save_blog_post"}
  ]
}
