table blog_posts {
  auth = false

  schema {
    int id
    timestamp created_at?=now
    text title
    text content
    text summary?
    int major_topic_id?
    text minor_topic_ids?
    text voice?
    text status?
    timestamp published_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
    {type: "btree", field: [{name: "major_topic_id", op: "asc"}]}
  ]

  tags = ["blog", "content"]
}
