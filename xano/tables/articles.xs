table articles {
  auth = false

  schema {
    int id
    timestamp created_at?=now
    text title
    text description?
    text url
    text source
    text content?
    int relevance_score?
    text reasoning?
    bool should_comment?
    text suggested_response?
    bool analyzed?
    timestamp synced_at?=now
    int major_topic?
    int minor_topics?
    int source_id?
    text author?
    timestamp published_at?
    bool included_in_digest?
    timestamp digest_sent_at?
    text topics?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree|unique", field: [{name: "url", op: "asc"}]}
  ]

  tags = ["news", "aggregator"]
}
