table major_topic {
  auth = false

  schema {
    int id
    timestamp created_at?=now
    text name
    text description?
    decimal importance?
    text rationale?
    int article_count?
    timestamp last_blog_at?
    int blog_count?=0
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
  ]

  tags = ["topics", "blog"]
}
