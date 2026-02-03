tool get_recent_posts {
  description = "Retrieves recent blog posts to help avoid duplicate content"

  input {
    int limit?
  }

  stack {
    db.query blog_posts {
      sort = {created_at: "desc"}
      return = {type: "list", paging: {page: 1, per_page: $input.limit || 10}}
    } as $posts
  }

  response = $posts
}
