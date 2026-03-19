import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { loadFromSupabase, saveSettingsToSupabase } from '../services/supabaseSync';
import { useBibleStore } from '../store/bibleStore';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  syncFromCloud: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          const data = await loadFromSupabase(session.user.id);
          if (data) {
            useBibleStore.setState({
              memos: data.memos,
              bookmarks: data.bookmarks,
              dailyVerses: data.dailyVerses,
              ...(data.settings && {
                startBookId: data.settings.startBookId,
                customOrder: data.settings.customOrder,
                currentDayIndex: data.settings.currentDayIndex,
              }),
            });
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (email: string) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error };
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
  };

  const syncFromCloud = async () => {
    if (!user || !supabase) return;
    const data = await loadFromSupabase(user.id);
    if (data) {
      useBibleStore.setState({
        memos: data.memos,
        bookmarks: data.bookmarks,
        dailyVerses: data.dailyVerses,
        ...(data.settings && {
          startBookId: data.settings.startBookId,
          customOrder: data.settings.customOrder,
          currentDayIndex: data.settings.currentDayIndex,
        }),
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signInWithEmail,
        signOut,
        syncFromCloud,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      session: null,
      loading: false,
      signInWithEmail: async () => ({ error: null }),
      signOut: async () => {},
      syncFromCloud: async () => {},
    };
  }
  return ctx;
}
