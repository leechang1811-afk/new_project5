import { useEffect, useRef } from "react";
import { useTossBanner } from "@/hooks/useTossAds";

const BANNER_AD_GROUP_ID = "ait.v2.live.b70573a55b294b33";

export function BannerAd() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isInitialized, attachBanner } = useTossBanner();

  useEffect(() => {
    if (!isInitialized || !containerRef.current) return;

    const result = attachBanner(BANNER_AD_GROUP_ID, containerRef.current, {
      theme: "dark",
      tone: "blackAndWhite",
      variant: "expanded",
      callbacks: {
        onAdFailedToRender: (p) =>
          console.warn("[BannerAd] 렌더 실패:", p?.error?.message),
        onNoFill: () => console.warn("[BannerAd] 표시할 광고 없음"),
      },
    });

    return () => {
      result?.destroy?.();
    };
  }, [isInitialized, attachBanner]);

  return (
    <div
      ref={containerRef}
      className="w-full shrink-0"
      style={{ width: "100%", height: "96px" }}
    />
  );
}
