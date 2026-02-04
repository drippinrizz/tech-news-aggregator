// Endpoint: major_topics
// Method: GET
// Path: /major_topics
// Description: Returns all major topics

query major_topics verb=GET {
  api_group = "Topics"

  input {
    // API key for authentication
    text api_key
  }

  stack {
    function.run "auth/verify_api_key" {
      input = {api_key: $input.api_key}
    }

    db.query major_topic {
      sort = {major_topic.importance: "desc"}
      return = {type: "list", paging: {page: 1, per_page: 1000}}
    } as $topics
  }

  response = $topics
  history = false
}
