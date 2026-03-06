'use client';

import { useState } from 'react';
import { Play, X } from 'lucide-react';
import { ExplainerPlayer } from '@/components/explainer-video/explainer-player';

export function DemoVideoModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-transparent text-[#618986] font-semibold text-[0.9375rem] px-7 py-3 rounded-xl border border-black/[0.06] hover:border-[#0d968b] hover:text-[#0d968b] transition-colors cursor-pointer"
      >
        <Play className="size-4" />
        Watch Demo
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute -top-12 right-0 text-white/80 hover:text-white transition-colors p-2"
              aria-label="Close video"
            >
              <X className="size-6" />
            </button>
            <div className="bg-black rounded-xl overflow-hidden">
              <ExplainerPlayer />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
