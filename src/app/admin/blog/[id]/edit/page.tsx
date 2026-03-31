import { redirect, notFound } from 'next/navigation';
import { isAdmin } from '@/lib/supabase/admin-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getCachedUser } from '@/lib/supabase/cached-auth';
import { BlogPostForm } from '@/components/admin/blog-post-form';

interface EditBlogPostPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBlogPostPage({ params }: EditBlogPostPageProps) {
  const { user, error } = await getCachedUser();

  if (error || !user || !isAdmin(user)) {
    redirect('/dashboard');
  }

  const { id } = await params;

  const { data: post, error: postError } = await supabaseAdmin
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .single();

  if (postError) console.error('Failed to fetch blog post:', postError.message);
  if (!post) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Edit Post</h1>
        <p className="text-slate-500 mt-1">Update blog post</p>
      </div>
      <BlogPostForm post={post} />
    </div>
  );
}
