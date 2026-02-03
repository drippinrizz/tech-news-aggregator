function "auth/verify_api_key" {
  description = "Verifies the API key sent in the request matches the stored environment variable. Call this at the top of every endpoint stack."

  input {
    text api_key {
      description = "The API key sent by the client"
    }
  }

  stack {
    precondition ($input.api_key == $env.API_KEY) {
      error_type = "accessdenied"
      error = "Invalid API key"
    }
  }

  response = {authenticated: true}
}
