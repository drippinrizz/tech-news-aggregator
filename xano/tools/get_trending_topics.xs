tool get_trending_topics {
  description = "Retrieves major and minor topics from the database, shuffled randomly to ensure variety"

  input {
    int limit?
  }

  stack {
    db.query major_topic {
      sort = {article_count: "desc"}
      return = {type: "list", paging: {page: 1, per_page: $input.limit || 20}}
    } as $major_topics

    db.query minor_topic {
      sort = {article_count: "desc"}
      return = {type: "list", paging: {page: 1, per_page: $input.limit || 30}}
    } as $minor_topics

    var $result {
      value = {
        major_topics: $major_topics|shuffle,
        minor_topics: $minor_topics|shuffle
      }
    }
  }

  response = $result
}
