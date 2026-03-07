'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { Player } from '@remotion/player';
import { ExplainerComposition } from './explainer-composition';
import { VIDEO, TOTAL_FRAMES } from './constants';

function useReducedMotion(): boolean {
  const subscribe = useCallback((callback: () => void) => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    mq.addEventListener('change', callback);
    return () => mq.removeEventListener('change', callback);
  }, []);

  const getSnapshot = useCallback(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export function PlayerInner() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="w-full aspect-[4/3] rounded-xl overflow-hidden border border-[#0d968b]/20 shadow-sm bg-white">
      <Player
        component={ExplainerComposition}
        compositionWidth={VIDEO.width}
        compositionHeight={VIDEO.height}
        durationInFrames={TOTAL_FRAMES}
        fps={VIDEO.fps}
        autoPlay={!prefersReducedMotion}
        loop
        controls={false}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
