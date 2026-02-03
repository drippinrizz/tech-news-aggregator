table digest_log {
  auth = false

  schema {
    int id
    timestamp created_at?=now
    timestamp sent_at?=now
    text digest_type
    int article_count
    text status?
    bool success?=true
    text error?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "sent_at", op: "desc"}]}
  ]

  tags = ["email", "digest"]
}
