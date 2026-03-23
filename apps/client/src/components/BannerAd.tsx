/**
 * 배너 광고 - 홈/기록/결과 하단에 노출 (게임 중 X)
 * TossAds.initialize → attachBanner (앱인토스 WebView 전용)
 */
import { useEffect, useRef } from 'react';
import { AD_GROUP_BANNER } from '../services/ads';

let initPromise: Promise<boolean> | null = null;
let sdkPromise: Promise<typeof import('@apps-in-toss/web-framework')> | null = null;

function getBannerSdk() {
  if (!sdkPromise) sdkPromise = import('@apps-in-toss/web-framework');
  return sdkPromise;
}

function ensureTossAdsInit(sdk: typeof import('@apps-in-toss/web-framework')): Promise<boolean> {
  if (initPromise) return initPromise;
  if (sdk.TossAds?.initialize?.isSupported?.() !== true) return Promise.resolve(false);
  initPromise = new Promise((resolve) => {
    sdk.TossAds.initialize({
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
    if (!AD_GROUP_BANNER) return;
    // 첫 페인트 후 배너 SDK 로딩 (초기 체감 로딩 개선)
    const timer = setTimeout(() => {
      getBannerSdk().then((sdk) => {
        if (sdk.TossAds?.attachBanner?.isSupported?.() !== true) return;
        ensureTossAdsInit(sdk).then((ok) => {
          if (!ok || !containerRef.current) return;
          try {
            const result = sdk.TossAds.attachBanner(AD_GROUP_BANNER, containerRef.current, {
              theme: 'light',
              tone: 'grey',
              variant: 'card',
            });
            destroyRef.current = result?.destroy ?? null;
          } catch {
            // ignore
          }
        });
      }).catch(() => {
        // ignore
      });
    }, 600);
    return () => {
      clearTimeout(timer);
      destroyRef.current?.();
      destroyRef.current = null;
    };
  }, []);

  if (!AD_GROUP_BANNER) return null;

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
