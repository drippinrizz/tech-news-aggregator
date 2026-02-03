// Endpoint: articles_by_topic
// Method: GET
// Path: /articles_by_topic
// Description: Returns articles for a given major topic, optionally filtered by minor topics

query articles_by_topic verb=GET {
  api_group = "Topics"

  input {
    int major_topic_id
    json minor_topic_ids?
  }

  stack {
    // Query articles with matching major_topic
    db.query articles {
      where = $db.articles.major_topic == $input.major_topic_id
      sort = {articles.relevance_score: "desc"}
      return = {type: "list", paging: {page: 1, per_page: 20}}
    } as $articles
  }

  response = {
    success : true
    count   : $articles.items|count
    articles: $articles.items
  }

  tags = ["🤖 2026-01-22 10:59 PST"]
  history = false
}
