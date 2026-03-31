import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ArrowLeft } from 'lucide-react';

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { data: post, error } = await supabaseAdmin
    .from('blog_posts')
    .select('title, description')
    .eq('slug', slug)
    .eq('published', true)
    .single();

  if (error) console.error('Failed to fetch blog post metadata:', error.message);
  if (!post) return { title: 'Post Not Found' };

  return {
    title: `${post.title} | LaundryPing Blog`,
    description: post.description,
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const { data: post, error: postError } = await supabaseAdmin
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single();

  if (postError) console.error('Failed to fetch blog post:', postError.message);
  if (!post) {
    notFound();
  }

  return (
    <article className="space-y-8">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1 text-sm text-[#0d968b] hover:underline"
      >
        <ArrowLeft className="size-4" />
        Back to blog
      </Link>

      <header>
        <time className="text-sm text-slate-400">
          {new Date(post.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </time>
        <h1 className="text-3xl font-bold text-slate-800 mt-2">{post.title}</h1>
        {post.author && (
          <p className="text-sm text-slate-500 mt-2">By {post.author}</p>
        )}
      </header>

      <div className="prose prose-slate max-w-none">
        <MDXRemote source={post.content} />
      </div>
    </article>
  );
}
