'use client';

import { useEffect, useRef } from 'react';
import { slugify } from '@/lib/utils/slugify';

interface UseSlugGenerationProps {
  title: string;
  slug: string;
  setSlug: (slug: string) => void;
  isEditing: boolean;
}

/**
 * Auto-generates a slug from the title while the user hasn't manually edited it.
 * Once the user edits the slug field directly, auto-generation stops.
 */
export function useSlugGeneration({ title, slug, setSlug, isEditing }: UseSlugGenerationProps) {
  // Track the last auto-generated slug to know when to auto-update
  const autoSlugRef = useRef(isEditing ? '' : slugify(title));

  useEffect(() => {
    // Only auto-generate slug if user hasn't manually edited it
    if (!isEditing && (slug === '' || slug === autoSlugRef.current)) {
      const newSlug = slugify(title);
      setSlug(newSlug);
      autoSlugRef.current = newSlug;
    }
  }, [title, isEditing, slug, setSlug]);
}
