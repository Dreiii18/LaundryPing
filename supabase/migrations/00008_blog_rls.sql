-- Enable RLS on blog_posts table
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to make migration idempotent
DROP POLICY IF EXISTS "Public can read published posts" ON blog_posts;
DROP POLICY IF EXISTS "Service role full access" ON blog_posts;

-- Public can read published posts (service role bypasses RLS automatically)
CREATE POLICY "Public can read published posts"
  ON blog_posts FOR SELECT
  USING (published = true);
