/**
 * 앱인토스 통합 광고 (인앱 광고 2.0 ver2) 연동
 * 전면형·리워드 모두 loadFullScreenAd / showFullScreenAd 사용
 * adGroupId로 광고 타입 자동 구분
 *
 * 환경변수 (granite.config 또는 .env):
 * - VITE_AD_GROUP_INTERSTITIAL: 전면형 광고 그룹 ID
 * - VITE_AD_GROUP_REWARDED: 리워드 광고 그룹 ID
 *
 * 토스 앱 외부(웹 브라우저 등)에서는 Mock으로 동작
 */

import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/web-framework';

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
function isAdsSupported(): boolean {
  return (
    typeof loadFullScreenAd?.isSupported === 'function' &&
    loadFullScreenAd.isSupported() &&
    Boolean(AD_GROUP_INTERSTITIAL && AD_GROUP_REWARDED)
  );
}

/** 앱인토스 실제 연동 */
class AppsInTossAdsService implements AdsService {
  private _interstitialLoaded = false;
  private _rewardedLoaded = false;
  private _lastInterstitialAt = 0;
  private readonly COOLDOWN_MS = 30_000; // PO: 30초 (업계 권장, UX-수익 균형)

  async loadInterstitial(): Promise<void> {
    return new Promise((resolve, reject) => {
      loadFullScreenAd({
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
      showFullScreenAd({
        options: { adGroupId: AD_GROUP_INTERSTITIAL },
        onEvent: (event) => {
          if (event.type === 'show' || event.type === 'impression') {
            shown = true;
            this._lastInterstitialAt = Date.now();
          }
          if (event.type === 'dismissed' || event.type === 'failedToShow') {
            this._interstitialLoaded = false;
            resolve(shown);
            loadFullScreenAd({
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
    return new Promise((resolve, reject) => {
      loadFullScreenAd({
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
    if (!this._rewardedLoaded) {
      try {
        await this.loadRewarded();
      } catch {
        return false;
      }
    }

    return new Promise((resolve) => {
      let earned = false;
      showFullScreenAd({
        options: { adGroupId: AD_GROUP_REWARDED },
        onEvent: (event) => {
          if (event.type === 'userEarnedReward') earned = true;
          if (event.type === 'dismissed' || event.type === 'failedToShow') {
            this._rewardedLoaded = false;
            resolve(earned);
            loadFullScreenAd({
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

export const adsService: AdsService = isAdsSupported()
  ? new AppsInTossAdsService()
  : new MockAdsService();
