/**
 * Share result to Kakao, X (Twitter), Instagram
 */

export interface ShareResultData {
  percentileTop: number;
  runScore: number;
  maxLevel: number;
  isChampion?: boolean;
}

const APP_URL = typeof window !== 'undefined' ? window.location.origin : '';
const APP_TITLE = '롤모델따라하기';

function getShareText(data: ShareResultData): string {
  if (data.isChampion) {
    return `👑 오늘 실행력 상위 0.1% · 실행 점수 ${data.runScore.toLocaleString()}점`;
  }
  return `롤모델따라하기 · 점수 상위 ${data.percentileTop}% · ${data.runScore.toLocaleString()}점`;
}

export function getShareUrl(percentile?: number): string {
  const base = APP_URL || 'https://new-project5-six.vercel.app';
  if (percentile != null) {
    return `${base}?p=${percentile}`;
  }
  return base;
}

/** 상위 N% 공유용 - 친구가 링크 클릭 시 ?p=N으로 유입 */
export function getShareTextPercentile(percentileTop: number): string {
  return `롤모델따라하기 · 점수 상위 ${percentileTop}%! 🏆 너도 해봐!`;
}

/** Load Kakao SDK script */
function loadKakaoSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Not in browser'));
      return;
    }
    const key = import.meta.env.VITE_KAKAO_JS_KEY;
    if (!key) {
      reject(new Error('Kakao JS key not configured'));
      return;
    }
    if ((window as unknown as { Kakao?: { isInitialized: () => boolean } }).Kakao?.isInitialized?.()) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';
    script.integrity = 'sha384-TiCUE00h17CAMRGG5MmVMNDKAYT6Ru9yPhwZHVbKcRhmcGExTs3AeqxHHeGwJhxa';
    script.crossOrigin = 'anonymous';
    script.async = true;
    script.onload = () => {
      try {
        (window as unknown as { Kakao: { init: (k: string) => void } }).Kakao.init(key);
        resolve();
      } catch (e) {
        reject(e);
      }
    };
    script.onerror = () => reject(new Error('Failed to load Kakao SDK'));
    document.head.appendChild(script);
  });
}

export async function shareToKakao(data: ShareResultData): Promise<void> {
  await loadKakaoSdk();
  const Kakao = (window as unknown as { Kakao: { Share: { sendDefault: (o: object) => Promise<void> } } }).Kakao;
  const text = getShareText(data);
  const url = getShareUrl(data.percentileTop);
  await Kakao.Share.sendDefault({
    objectType: 'feed',
    content: {
      title: APP_TITLE,
      description: text,
      imageUrl: `${url}/og-image.png`,
      link: {
        mobileWebUrl: url,
        webUrl: url,
      },
    },
  });
}

export function shareToX(data: ShareResultData): void {
  const text = getShareText(data);
  const url = getShareUrl(data.percentileTop);
  const params = new URLSearchParams({
    text,
    url,
  });
  window.open(`https://twitter.com/intent/tweet?${params.toString()}`, '_blank', 'noopener,noreferrer,width=550,height=420');
}

/** 링크 복사 (결과/기록 페이지 공통) - 카카오/X/인스타 대신 링크만 복사 */
export async function copyShareLink(data: ShareResultData): Promise<void> {
  const text = getShareText(data);
  await navigator.clipboard.writeText(`${text}\n${getShareUrl(data.percentileTop)}`);
}

/** Generate shareable image and share via Web Share API or download */
export async function shareToInstagram(
  data: ShareResultData,
  captureElement: HTMLElement | null
): Promise<void> {
  if (!captureElement) {
    // Fallback: copy text to clipboard and open Instagram
    const text = getShareText(data);
    try {
      await navigator.clipboard.writeText(`${text}\n${getShareUrl(data.percentileTop)}`);
      window.open('https://www.instagram.com/', '_blank');
      return;
    } catch {
      shareToX(data);
      return;
    }
  }

  try {
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(captureElement, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
    });
    const blob = await new Promise<Blob>((res, rej) => {
      canvas.toBlob(
        (b) => (b ? res(b) : rej(new Error('Failed to create blob'))),
        'image/png',
        0.95
      );
    });
    const file = new File([blob], 'today-one-complete-result.png', { type: 'image/png' });

    if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: APP_TITLE,
        text: getShareText(data),
        files: [file],
      });
    } else {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'today-one-complete-result.png';
      link.click();
      URL.revokeObjectURL(link.href);
    }
  } catch (e) {
    console.error('Instagram share failed:', e);
    shareToX(data);
  }
}
