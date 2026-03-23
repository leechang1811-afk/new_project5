import { useCallback, useEffect, useRef, useState } from "react";

// 동적 import로 토스 앱 외부에서는 에러 방지
type TossAdsModule = typeof import("@apps-in-toss/web-framework");

let cachedModule: TossAdsModule | null = null;

async function getTossAds(): Promise<TossAdsModule | null> {
  if (cachedModule) return cachedModule;
  try {
    const mod = await import("@apps-in-toss/web-framework");
    cachedModule = mod;
    return mod;
  } catch {
    return null;
  }
}

/** 배너 광고 SDK 초기화 및 부착 훅 */
export function useTossBanner() {
  const [isInitialized, setIsInitialized] = useState(false);
  const modRef = useRef<TossAdsModule | null>(null);

  useEffect(() => {
    let cancelled = false;
    getTossAds().then((mod) => {
      if (cancelled || !mod?.TossAds?.initialize?.isSupported?.()) return;
      modRef.current = mod;
      mod.TossAds.initialize({
        callbacks: {
          onInitialized: () => !cancelled && setIsInitialized(true),
          onInitializationFailed: (err) =>
            console.warn("[TossAds] 초기화 실패:", err),
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const attachBanner = useCallback(
    (
      adGroupId: string,
      element: HTMLElement,
      options?: Parameters<NonNullable<TossAdsModule["TossAds"]>["attachBanner"]>[2]
    ) => {
      const mod = modRef.current;
      if (!isInitialized || !mod?.TossAds?.attachBanner?.isSupported?.())
        return null;
      return mod.TossAds.attachBanner(adGroupId, element, options);
    },
    [isInitialized]
  );

  return { isInitialized, attachBanner };
}

/** 전면형 광고 로드/표시 훅 */
export function useFullScreenAd(adGroupId: string) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  const load = useCallback(() => {
    return getTossAds().then((mod) => {
      if (!mod?.loadFullScreenAd?.isSupported?.()) {
        setIsSupported(false);
        return () => {};
      }
      setIsSupported(true);
      const unregister = mod.loadFullScreenAd({
        options: { adGroupId },
        onEvent: (e) => {
          if (e.type === "loaded") setIsLoaded(true);
        },
        onError: (err) => console.warn("[FullScreenAd] 로드 실패:", err),
      });
      return unregister;
    });
  }, [adGroupId]);

  const show = useCallback(
    (onDismissed?: () => void) => {
      return getTossAds().then((mod) => {
        if (!mod?.showFullScreenAd?.isSupported?.()) return;
        mod.showFullScreenAd({
          options: { adGroupId },
          onEvent: (e) => {
            if (e.type === "dismissed") {
              setIsLoaded(false);
              onDismissed?.();
            }
          },
          onError: (err) => {
            console.warn("[FullScreenAd] 표시 실패:", err);
            onDismissed?.();
          },
        });
      });
    },
    [adGroupId]
  );

  return { isLoaded, isSupported, load, show };
}
