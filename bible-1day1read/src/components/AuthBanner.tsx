import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { isSupabaseReady } from '../lib/supabase';
import { useTranslation } from '../hooks/useTranslation';

export function AuthBanner() {
  const { user, signInWithEmail, signOut, loading } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  if (!isSupabaseReady()) return null;
  if (loading) return null;

  if (user) {
    return (
      <div className="bg-[#EEF4FF] border-b border-[#E6EAF2] px-3 xs:px-4 py-2 flex items-center justify-between min-w-0">
        <span className="text-[#5B6475] text-xs truncate flex-1">
          ✓ {user.email} {t('syncStatus')}
        </span>
        <button
          onClick={() => signOut()}
          className="text-[#1B64F2] text-xs font-medium ml-2 shrink-0"
        >
          {t('logout')}
        </button>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="bg-[#EEF4FF] border-b border-[#E6EAF2] px-3 xs:px-4 py-2 text-center">
        <p className="text-[#5B6475] text-xs">
          {t('loginSent')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#EEF4FF] border-b border-[#E6EAF2] px-3 xs:px-4 py-2">
      <p className="text-[#5B6475] text-xs mb-2">{t('loginPrompt')}</p>
      <div className="flex gap-2 min-w-0">
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError('');
          }}
          placeholder={t('emailPlaceholder')}
          className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-[#E6EAF2] text-sm"
        />
        <button
          onClick={async () => {
            if (!email.trim()) return;
            const { error } = await signInWithEmail(email.trim());
            if (error) setError(t('loginFailed'));
            else setSent(true);
          }}
          className="flex-shrink-0 min-h-[40px] px-3 xs:px-4 py-2 rounded-lg bg-[#1B64F2] text-white text-sm font-medium"
        >
          {t('login')}
        </button>
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
