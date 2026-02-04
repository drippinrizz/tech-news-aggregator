// Endpoint: minor_topics
// Method: GET
// Path: /minor_topics
// Description: Returns all minor topics

query minor_topics verb=GET {
  api_group = "Topics"

  input {
    // API key for authentication
    text api_key
  }

  stack {
    function.run "auth/verify_api_key" {
      input = {api_key: $input.api_key}
    }

    db.query minor_topic {
      sort = {minor_topic.importance: "desc"}
      return = {type: "list", paging: {page: 1, per_page: 1000}}
    } as $topics
  }

  response = $topics
  history = false
}
