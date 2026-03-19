import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBibleStore } from '../store/bibleStore';
import { syncAllToSupabase } from '../services/supabaseSync';

const DEBOUNCE_MS = 2000;

export function BibleSyncEffect() {
  const { user } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const store = useBibleStore.getState();

  useEffect(() => {
    if (!user || !store) return;

    const sync = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const s = useBibleStore.getState();
        syncAllToSupabase(user.id, {
          memos: s.memos,
          bookmarks: s.bookmarks,
          dailyVerses: s.dailyVerses,
          startBookId: s.startBookId,
          customOrder: s.customOrder,
          currentDayIndex: s.currentDayIndex,
        });
        timerRef.current = null;
      }, DEBOUNCE_MS);
    };

    const unsub = useBibleStore.subscribe(sync);

    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user]);

  return null;
}
