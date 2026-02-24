'use client';

import { lazy, Suspense, useSyncExternalStore } from 'react';
import { Play } from 'lucide-react';

const LazyPlayer = lazy(() =>
  import('./player-inner').then((mod) => ({ default: mod.PlayerInner }))
);

const emptySubscribe = () => () => {};

function Placeholder() {
  return (
    <div className="relative w-full aspect-video bg-white rounded-xl border border-[#0d968b]/20 shadow-sm flex items-center justify-center">
      <div className="size-16 rounded-full bg-[#0d968b]/10 flex items-center justify-center">
        <Play className="size-8 text-[#0d968b] ml-1" />
      </div>
    </div>
  );
}

export function ExplainerPlayer() {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!mounted) {
    return <Placeholder />;
  }

  return (
    <Suspense fallback={<Placeholder />}>
      <LazyPlayer />
    </Suspense>
  );
}
