import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { isAdmin } from '@/lib/supabase/admin-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

const createPostSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens only'),
  description: z.string().default(''),
  content: z.string().default(''),
  author: z.string().default('LaundryPing Team'),
  published: z.boolean().default(false),
});

export async function GET() {
  try {
    const { user, error } = await getAuthenticatedUser();

    if (error === 'Unauthorized' || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: posts, error: dbError } = await supabaseAdmin
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (dbError) {
      return NextResponse.json(
        { error: dbError.message || 'Failed to fetch posts' },
        { status: 500 }
      );
    }

    return NextResponse.json(posts);
  } catch {
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { user, error } = await getAuthenticatedUser();

    if (error === 'Unauthorized' || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createPostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { data: post, error: dbError } = await supabaseAdmin
      .from('blog_posts')
      .insert(parsed.data)
      .select()
      .single();

    if (dbError) {
      if (dbError.code === '23505') {
        return NextResponse.json(
          { error: 'A post with this slug already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: dbError.message || 'Failed to create post' },
        { status: 500 }
      );
    }

    return NextResponse.json(post, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
