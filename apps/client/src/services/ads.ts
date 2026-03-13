/**
 * AdsService 인터페이스 - Mock 구현
 * TODO: 실제 SDK 연동 (AdMob, Toss Ads 등)
 */

export interface AdsService {
  loadInterstitial(): Promise<void>;
  showInterstitial(): Promise<boolean>;
  loadRewarded(): Promise<void>;
  showRewarded(type: 'revive' | 'result'): Promise<boolean>;
}

class MockAdsService implements AdsService {
  private _interstitialLoaded = false;
  private _rewardedLoaded = false;
  private _lastAdShownAt = 0;
  private readonly COOLDOWN_MS = 25_000;

  async loadInterstitial(): Promise<void> {
    await new Promise((r) => setTimeout(r, 100));
    this._interstitialLoaded = true;
  }

  async showInterstitial(): Promise<boolean> {
    if (Date.now() - this._lastAdShownAt < this.COOLDOWN_MS) {
      return false;
    }
    if (!this._interstitialLoaded) {
      await this.loadInterstitial();
    }
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
    if (!this._rewardedLoaded) {
      await this.loadRewarded();
    }
    if (import.meta.env.DEV) console.log('[Mock] Rewarded ad shown');
    this._lastAdShownAt = Date.now();
    this._rewardedLoaded = false;
    return true;
  }
}

export const adsService: AdsService = new MockAdsService();
