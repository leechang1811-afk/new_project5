const SINO_KR = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];

function toSinoKorean(n: number): string {
  if (n <= 0) return String(n);
  if (n < 10) return SINO_KR[n];
  if (n < 20) return '십' + (n > 10 ? SINO_KR[n - 10] : '');
  if (n < 100) return SINO_KR[Math.floor(n / 10)] + '십' + (n % 10 ? SINO_KR[n % 10] : '');
  if (n < 200) return '백' + (n > 100 ? toSinoKorean(n - 100) : '');
  return String(n);
}

export function useBibleTTS() {
  const speak = (text: string, lang: 'ko-KR' | 'en-US' = 'ko-KR', onEnd?: () => void) => {
    if (!('speechSynthesis' in window)) {
      alert(lang === 'ko-KR' ? '이 브라우저에서는 음성 읽기가 지원되지 않습니다.' : 'Speech synthesis is not supported in this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    const voices = speechSynthesis.getVoices();
    const voice = voices.find((v) => v.lang.startsWith(lang.startsWith('ko') ? 'ko' : 'en'));
    if (voice) utterance.voice = voice;
    if (onEnd) utterance.onend = onEnd;
    window.speechSynthesis.speak(utterance);
  };

  const speakVerses = (
    texts: string[],
    pauseMs = 1000,
    lang: 'ko-KR' | 'en-US' = 'ko-KR',
    onEnd?: () => void,
    startFromIndex = 0,
    onVerseStart?: (index: number) => void
  ) => {
    if (!('speechSynthesis' in window)) {
      alert(lang === 'ko-KR' ? '이 브라우저에서는 음성 읽기가 지원되지 않습니다.' : 'Speech synthesis is not supported in this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    if (texts.length === 0) return;
    const voices = speechSynthesis.getVoices();
    const voice = voices.find((v) => v.lang.startsWith(lang.startsWith('ko') ? 'ko' : 'en'));
    let i = Math.max(0, Math.min(startFromIndex, texts.length - 1));
    const next = () => {
      if (i >= texts.length) {
        onEnd?.();
        return;
      }
      onVerseStart?.(i);
      const utterance = new SpeechSynthesisUtterance(texts[i]);
      utterance.lang = lang;
      utterance.rate = 0.9;
      if (voice) utterance.voice = voice;
      utterance.onend = () => {
        i++;
        if (i < texts.length) {
          setTimeout(next, pauseMs);
        } else {
          onEnd?.();
        }
      };
      window.speechSynthesis.speak(utterance);
    };
    next();
  };

  const stop = () => window.speechSynthesis.cancel();
  const getReadingTextForTTS = (book: string, startCh: number, endCh: number, version: 'ko' | 'en' = 'ko'): string => {
    if (version === 'en') {
      const range = startCh === endCh ? `${startCh}` : `${startCh} to ${endCh}`;
      return `Today's reading is ${book} chapters ${range}. Please read the passage in your Bible or this app.`;
    }
    const range =
      startCh === endCh ? `${toSinoKorean(startCh)}장` : `${toSinoKorean(startCh)}장부터 ${toSinoKorean(endCh)}장`;
    return `오늘의 말씀은 ${book} ${range}입니다. 성경책이나 이 앱에서 해당 본문을 읽어보시기 바랍니다.`;
  };
  return { speak, speakVerses, stop, getReadingTextForTTS, toSinoKorean };
}
