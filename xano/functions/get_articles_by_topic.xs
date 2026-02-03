function get_articles_by_topic {
  input {
    int major_topic_id
  }

  stack {
    db.query articles {
      where = $db.articles.major_topic == $input.major_topic_id
      sort = {relevance_score: "desc"}
      return = {type: "list", paging: {page: 1, per_page: 20}}
    } as $articles
  }

  response = $articles
}
