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
    .select('title, description, author, created_at, updated_at')
    .eq('slug', slug)
    .eq('published', true)
    .single();

  if (error) console.error('Failed to fetch blog post metadata:', error.message);
  if (!post) return { title: 'Post Not Found' };

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.created_at,
      modifiedTime: post.updated_at,
      authors: post.author ? [post.author] : undefined,
      url: `/blog/${slug}`,
    },
    alternates: { canonical: `/blog/${slug}` },
  };
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://laundryping.com';

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

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    author: {
      '@type': 'Person',
      name: post.author || 'LaundryPing',
    },
    datePublished: post.created_at,
    dateModified: post.updated_at,
    publisher: {
      '@type': 'Organization',
      name: 'LaundryPing',
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/laundryping-logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteUrl}/blog/${slug}`,
    },
  };

  return (
    <article className="space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
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
