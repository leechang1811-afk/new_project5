/**
 * 배너 광고 - 홈/기록/결과 하단에 노출 (게임 중 X)
 * TossAds.initialize → attachBanner (앱인토스 WebView 전용)
 */
import { useEffect, useRef } from 'react';
import { TossAds } from '@apps-in-toss/web-framework';
import { AD_GROUP_BANNER } from '../services/ads';

let initPromise: Promise<boolean> | null = null;

function ensureTossAdsInit(): Promise<boolean> {
  if (initPromise) return initPromise;
  if (!TossAds?.initialize?.isSupported?.()) return Promise.resolve(false);
  initPromise = new Promise((resolve) => {
    TossAds.initialize({
      callbacks: {
        onInitialized: () => resolve(true),
        onInitializationFailed: () => resolve(false),
      },
    });
  });
  return initPromise;
}

export default function BannerAd() {
  const containerRef = useRef<HTMLDivElement>(null);

  const destroyRef = useRef<(() => void) | null>(null);
  const BANNER_HEIGHT_PX = 96;

  useEffect(() => {
    if (!AD_GROUP_BANNER || !TossAds?.attachBanner?.isSupported?.()) return;
    ensureTossAdsInit().then((ok) => {
      if (!ok || !containerRef.current) return;
      try {
        const result = TossAds.attachBanner(AD_GROUP_BANNER, containerRef.current, {
          theme: 'light',
          tone: 'grey',
          variant: 'card',
        });
        destroyRef.current = result?.destroy ?? null;
      } catch {
        // ignore
      }
    });
    return () => {
      destroyRef.current?.();
      destroyRef.current = null;
    };
  }, []);

  if (!AD_GROUP_BANNER) return null;
  if (!TossAds?.attachBanner?.isSupported?.()) return null;

  return (
    <>
      {/* 콘텐츠가 배너에 가려지지 않도록 공간 확보 */}
      <div style={{ height: `calc(${BANNER_HEIGHT_PX}px + env(safe-area-inset-bottom))` }} aria-hidden="true" />
      <div className="fixed left-0 right-0 bottom-0 z-40 pointer-events-none">
        <div className="mx-auto max-w-md px-4 sm:px-6 pb-[env(safe-area-inset-bottom)] pointer-events-auto">
          <div
            ref={containerRef}
            className="w-full min-h-[96px] rounded-t-xl border border-slate-200 bg-slate-50/90"
            aria-label="광고"
          />
        </div>
      </div>
    </>
  );
}
