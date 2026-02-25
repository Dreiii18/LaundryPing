import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/supabase/admin-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { AdminBlogContent } from '@/components/admin/admin-blog-content';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default async function AdminBlogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user)) {
    redirect('/dashboard');
  }

  const { data: posts } = await supabaseAdmin
    .from('blog_posts')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Blog Posts</h1>
          <p className="text-slate-500 mt-1">Manage blog content</p>
        </div>
        <Button asChild className="bg-[#0d968b] hover:bg-[#0d968b]/90 text-white">
          <Link href="/admin/blog/new">
            <Plus className="size-4 mr-2" />
            New Post
          </Link>
        </Button>
      </div>
      <AdminBlogContent posts={posts || []} />
    </div>
  );
}
