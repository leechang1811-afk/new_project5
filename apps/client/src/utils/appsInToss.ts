/** 앱인토스(토스 미니앱) WebView — 상단 ⋯/닫기 등 시스템 UI와 겹침 방지용 */
export function isAppsInTossWebView(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as Window & { ReactNativeWebView?: unknown }).ReactNativeWebView);
}
