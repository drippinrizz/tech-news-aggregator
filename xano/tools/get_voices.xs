tool get_voices {
  description = "Retrieves available writing voices/styles for blog posts"

  input {}

  stack {
    var $voices {
      value = [
        {name: "professional", description: "Formal, authoritative tone for enterprise content"},
        {name: "casual", description: "Friendly, conversational tone for general audiences"},
        {name: "technical", description: "Detailed, precise tone for developer content"},
        {name: "enthusiastic", description: "Energetic, excited tone for product announcements"},
        {name: "analytical", description: "Data-driven, objective tone for trend analysis"}
      ]
    }
  }

  response = $voices
}
