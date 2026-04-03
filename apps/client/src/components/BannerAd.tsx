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
        onInitializationFailed: (err) => {
          const message = String((err as { message?: string })?.message ?? err ?? '');
          // 이미 초기화된 상태면 정상으로 간주 (페이지 이동 시 재호출 케이스)
          if (message.includes('Already initialized')) {
            resolve(true);
            return;
          }
          resolve(false);
        },
      },
    });
  });
  return initPromise;
}

export default function BannerAd() {
  const containerRef = useRef<HTMLDivElement>(null);

  const destroyRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!AD_GROUP_BANNER) return;
    if (typeof window === 'undefined') return;
    if (!(window as Window & { ReactNativeWebView?: unknown }).ReactNativeWebView) return;
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
              callbacks: {
                onNoFill: () => {},
                onAdFailedToRender: () => {},
              },
            });
            destroyRef.current = result?.destroy ?? null;
          } catch {
            // ignore
          }
        });
      }).catch(() => {
        // ignore
      });
    }, 250);
    return () => {
      clearTimeout(timer);
      destroyRef.current?.();
      destroyRef.current = null;
    };
  }, []);

  if (!AD_GROUP_BANNER) return null;

  /** 문서 흐름에 두어 상단 스크롤 영역이 배너 높이만큼 비워지게 함 (fixed 시 본문이 가려지는 문제 방지) */
  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="w-full min-h-[96px] rounded-t-xl border border-slate-200 bg-slate-50/90"
        aria-label="광고"
      />
    </div>
  );
}
