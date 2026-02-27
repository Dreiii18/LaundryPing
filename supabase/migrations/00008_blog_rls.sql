-- Enable RLS on blog_posts table
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Public can read published posts
CREATE POLICY "Public can read published posts"
  ON blog_posts FOR SELECT
  USING (published = true);

-- Service role has full access (admin routes use supabaseAdmin which bypasses RLS)
CREATE POLICY "Service role full access"
  ON blog_posts FOR ALL
  USING (true)
  WITH CHECK (true);
