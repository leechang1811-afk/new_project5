import { useState } from 'react';
import { GAME_TYPE_LABELS } from 'shared';
import type { GameType } from 'shared';
import { isMuted, toggleMuted } from '../services/sounds';

interface GameFloatingHudProps {
  gameType: GameType;
}

export default function GameFloatingHud({ gameType }: GameFloatingHudProps) {
  const [muted, setMuted] = useState(() => isMuted());

  const handleMuteToggle = () => {
    setMuted(toggleMuted());
  };

  return (
    <div
      className="pointer-events-auto fixed z-40 flex max-w-[calc(100vw-1rem)] items-center gap-1 rounded-full border border-toss-border bg-white/95 px-2 py-1 shadow-md backdrop-blur-sm"
      style={{
        bottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))',
        right: 'max(0.5rem, env(safe-area-inset-right, 0px))',
      }}
    >
      <span className="max-w-[6.5rem] truncate text-[11px] font-semibold text-toss-text sm:max-w-none">
        {GAME_TYPE_LABELS[gameType]}
      </span>
      <button
        type="button"
        onClick={handleMuteToggle}
        className="shrink-0 rounded-lg p-1 hover:bg-toss-bg transition"
        aria-label={muted ? '소리 켜기' : '소리 끄기'}
      >
        {muted ? (
          <svg className="h-4 w-4 text-toss-sub" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        ) : (
          <svg className="h-4 w-4 text-toss-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        )}
      </button>
    </div>
  );
}
