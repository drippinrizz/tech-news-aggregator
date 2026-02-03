table minor_topic {
  auth = false

  schema {
    int id
    timestamp created_at?=now
    text name
    text description?
    int major_topic
    decimal importance?
    text rationale?
    int article_count?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
  ]

  tags = ["topics", "blog"]
}
