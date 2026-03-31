import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/supabase/admin-auth';
import { getCachedUser } from '@/lib/supabase/cached-auth';
import { BlogPostForm } from '@/components/admin/blog-post-form';

export default async function NewBlogPostPage() {
  const { user, error } = await getCachedUser();

  if (error || !user || !isAdmin(user)) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">New Post</h1>
        <p className="text-slate-500 mt-1">Create a new blog post</p>
      </div>
      <BlogPostForm />
    </div>
  );
}
