'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useBlogActions } from './use-blog-actions';
import { BlogTable } from './blog-table';
import { DeleteBlogDialog } from './delete-blog-dialog';
import type { BlogPost } from '@/types';

interface AdminBlogContentProps {
  posts: BlogPost[];
}

export function AdminBlogContent({ posts }: AdminBlogContentProps) {
  const {
    search,
    setSearch,
    deleteId,
    deleting,
    handleRequestDelete,
    handleCancelDelete,
    handleDelete,
  } = useBlogActions();

  const filtered = posts.filter((post) =>
    post.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <p className="text-sm text-slate-500">
          {filtered.length} post{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      <BlogTable
        posts={filtered}
        onDelete={handleRequestDelete}
      />

      <DeleteBlogDialog
        open={!!deleteId}
        deleting={deleting}
        onConfirm={handleDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}
