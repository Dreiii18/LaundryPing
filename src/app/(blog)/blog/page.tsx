import { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const metadata: Metadata = {
  title: 'Blog | LaundryPing',
  description: 'Tips, updates, and guides for Philippine laundromats',
};

export default async function BlogPage() {
  const { data: posts } = await supabaseAdmin
    .from('blog_posts')
    .select('slug, title, description, author, created_at')
    .eq('published', true)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Blog</h1>
        <p className="text-slate-500 mt-2">Tips, updates, and guides for Philippine laundromats</p>
      </div>

      {!posts || posts.length === 0 ? (
        <p className="text-slate-400 py-12 text-center">No posts yet. Check back soon!</p>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block p-6 bg-white rounded-xl border border-slate-200 hover:border-[#0d968b]/30 transition-colors shadow-sm"
            >
              <time className="text-sm text-slate-400">
                {new Date(post.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
              <h2 className="text-xl font-semibold text-slate-800 mt-1">{post.title}</h2>
              <p className="text-slate-500 mt-2 line-clamp-2">{post.description}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
