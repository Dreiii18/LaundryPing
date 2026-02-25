import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const BLOG_DIR = path.join(process.cwd(), 'src/content/blog');

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  published: boolean;
  content: string;
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.mdx'));

  const posts = files
    .map((filename) => {
      const filePath = path.join(BLOG_DIR, filename);
      const raw = fs.readFileSync(filePath, 'utf-8');
      const { data, content } = matter(raw);

      return {
        slug: data.slug || filename.replace(/\.mdx$/, ''),
        title: data.title || '',
        description: data.description || '',
        date: data.date || '',
        author: data.author || '',
        published: data.published !== false,
        content,
      } satisfies BlogPost;
    })
    .filter((post) => post.published)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return posts;
}

export function getPostBySlug(slug: string): BlogPost | null {
  const posts = getAllPosts();
  return posts.find((p) => p.slug === slug) || null;
}
