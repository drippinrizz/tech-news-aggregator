tool save_blog_post {
  input {
    text title
    text content
    text summary?
    int major_topic_id?
    text voice?
    text status?
  }

  stack {
    db.add blog_posts {
      data = {
        title: $input.title,
        content: $input.content,
        summary: $input.summary,
        major_topic_id: $input.major_topic_id,
        voice: $input.voice,
        status: $input.status || "draft"
      }
    } as $new_post
  }

  response = $new_post
}
