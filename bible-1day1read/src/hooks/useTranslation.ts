import { useMemo } from 'react';
import { useBibleStore } from '../store/bibleStore';
import { t, type Locale } from '../data/i18n';

export function useTranslation() {
  const bibleVersion = useBibleStore((s) => s.bibleVersion);
  const locale: Locale = bibleVersion;

  const translationFn = useMemo(
    () => (key: string, params?: Record<string, string | number>) => t(locale, key, params),
    [locale]
  );

  return { t: translationFn, locale };
}
