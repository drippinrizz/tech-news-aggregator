table sources {
  auth = false

  schema {
    int id
    timestamp created_at?=now
    text name
    text type
    text url?
    bool enabled?=true
    timestamp last_scraped?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree|unique", field: [{name: "name", op: "asc"}]}
  ]

  tags = ["news", "aggregator"]
}
