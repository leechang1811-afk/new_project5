/**
 * 앱인토스 통합 광고 (인앱 광고 2.0 ver2) 연동
 *
 * 성능 최적화:
 * - 초기 번들에서 광고 SDK를 정적으로 불러오지 않음
 * - 광고 필요 시점에만 동적 import
 */

export interface AdsService {
  loadInterstitial(): Promise<void>;
  showInterstitial(): Promise<boolean>;
  loadRewarded(): Promise<void>;
  showRewarded(type: 'revive' | 'result'): Promise<boolean>;
}

// 광고 그룹 ID (앱인토스 콘솔 발급) - env로 오버라이드 가능
const AD_GROUP_INTERSTITIAL =
  import.meta.env.VITE_AD_GROUP_INTERSTITIAL ?? 'ait.v2.live.1dcfae320faa45a1';
const AD_GROUP_REWARDED =
  import.meta.env.VITE_AD_GROUP_REWARDED ?? 'ait.v2.live.aa19920554fe4121';
export const AD_GROUP_BANNER =
  import.meta.env.VITE_AD_GROUP_BANNER ?? 'ait.v2.live.7b08bc10a37f4a1f';

/** 토스 앱 WebView 내부에서만 true */
function canUseRealAds(): boolean {
  if (!AD_GROUP_INTERSTITIAL || !AD_GROUP_REWARDED) return false;
  if (typeof window === 'undefined') return false;
  // 웹/PC에서는 SDK 로딩 자체를 피해서 초기 로딩을 가볍게 유지
  return Boolean((window as Window & { ReactNativeWebView?: unknown }).ReactNativeWebView);
}

let adsSdkPromise: Promise<typeof import('@apps-in-toss/web-framework')> | null = null;
function getAdsSdk() {
  if (!adsSdkPromise) {
    adsSdkPromise = import('@apps-in-toss/web-framework');
  }
  return adsSdkPromise;
}

/** 앱인토스 실제 연동 */
class AppsInTossAdsService implements AdsService {
  private _interstitialLoaded = false;
  private _rewardedLoaded = false;
  private _lastInterstitialAt = 0;
  private readonly COOLDOWN_MS = 30_000; // PO: 30초 (업계 권장, UX-수익 균형)

  async loadInterstitial(): Promise<void> {
    const sdk = await getAdsSdk();
    if (sdk.loadFullScreenAd?.isSupported?.() !== true) throw new Error('ads not supported');
    return new Promise((resolve, reject) => {
      sdk.loadFullScreenAd({
        options: { adGroupId: AD_GROUP_INTERSTITIAL },
        onEvent: (event) => {
          if (event.type === 'loaded') {
            this._interstitialLoaded = true;
            resolve();
          }
        },
        onError: (err) => {
          this._interstitialLoaded = false;
          reject(err);
        },
      });
    });
  }

  async showInterstitial(): Promise<boolean> {
    const sdk = await getAdsSdk();
    if (sdk.showFullScreenAd?.isSupported?.() !== true) return false;
    if (Date.now() - this._lastInterstitialAt < this.COOLDOWN_MS) return false;
    if (!this._interstitialLoaded) {
      try {
        await this.loadInterstitial();
      } catch {
        return false;
      }
    }

    return new Promise((resolve) => {
      let shown = false;
      sdk.showFullScreenAd({
        options: { adGroupId: AD_GROUP_INTERSTITIAL },
        onEvent: (event) => {
          if (event.type === 'show' || event.type === 'impression') {
            shown = true;
            this._lastInterstitialAt = Date.now();
          }
          if (event.type === 'dismissed' || event.type === 'failedToShow') {
            this._interstitialLoaded = false;
            resolve(shown);
            sdk.loadFullScreenAd({
              options: { adGroupId: AD_GROUP_INTERSTITIAL },
              onEvent: (e) => { if (e.type === 'loaded') this._interstitialLoaded = true; },
              onError: () => {},
            });
          }
        },
        onError: () => {
          this._interstitialLoaded = false;
          resolve(false);
        },
      });
    });
  }

  async loadRewarded(): Promise<void> {
    const sdk = await getAdsSdk();
    if (sdk.loadFullScreenAd?.isSupported?.() !== true) throw new Error('ads not supported');
    return new Promise((resolve, reject) => {
      sdk.loadFullScreenAd({
        options: { adGroupId: AD_GROUP_REWARDED },
        onEvent: (event) => {
          if (event.type === 'loaded') {
            this._rewardedLoaded = true;
            resolve();
          }
        },
        onError: (err) => {
          this._rewardedLoaded = false;
          reject(err);
        },
      });
    });
  }

  async showRewarded(_type: 'revive' | 'result'): Promise<boolean> {
    const sdk = await getAdsSdk();
    if (sdk.showFullScreenAd?.isSupported?.() !== true) return false;
    if (!this._rewardedLoaded) {
      try {
        await this.loadRewarded();
      } catch {
        return false;
      }
    }

    return new Promise((resolve) => {
      let earned = false;
      sdk.showFullScreenAd({
        options: { adGroupId: AD_GROUP_REWARDED },
        onEvent: (event) => {
          if (event.type === 'userEarnedReward') earned = true;
          if (event.type === 'dismissed' || event.type === 'failedToShow') {
            this._rewardedLoaded = false;
            resolve(earned);
            sdk.loadFullScreenAd({
              options: { adGroupId: AD_GROUP_REWARDED },
              onEvent: (e) => { if (e.type === 'loaded') this._rewardedLoaded = true; },
              onError: () => {},
            });
          }
        },
        onError: () => {
          this._rewardedLoaded = false;
          resolve(false);
        },
      });
    });
  }
}

/** Mock 구현 - 토스 앱 외부(웹, 개발환경)에서 사용 */
class MockAdsService implements AdsService {
  private _interstitialLoaded = false;
  private _rewardedLoaded = false;
  private _lastAdShownAt = 0;
  private readonly COOLDOWN_MS = 30_000;

  async loadInterstitial(): Promise<void> {
    await new Promise((r) => setTimeout(r, 100));
    this._interstitialLoaded = true;
  }

  async showInterstitial(): Promise<boolean> {
    if (Date.now() - this._lastAdShownAt < this.COOLDOWN_MS) return false;
    if (!this._interstitialLoaded) await this.loadInterstitial();
    if (import.meta.env.DEV) console.log('[Mock] Interstitial ad shown');
    this._lastAdShownAt = Date.now();
    this._interstitialLoaded = false;
    return true;
  }

  async loadRewarded(): Promise<void> {
    await new Promise((r) => setTimeout(r, 100));
    this._rewardedLoaded = true;
  }

  async showRewarded(_type: 'revive' | 'result'): Promise<boolean> {
    if (!this._rewardedLoaded) await this.loadRewarded();
    if (import.meta.env.DEV) console.log('[Mock] Rewarded ad shown');
    this._lastAdShownAt = Date.now();
    this._rewardedLoaded = false;
    return true;
  }
}

export const adsService: AdsService = canUseRealAds()
  ? new AppsInTossAdsService()
  : new MockAdsService();
