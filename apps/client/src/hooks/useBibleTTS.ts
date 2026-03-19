/**
 * Web Speech API 사용 - 한국어 남성 목소리로 1일1독 내용 읽기
 */

export function useBibleTTS() {
  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) {
      alert('이 브라우저에서는 음성 읽기가 지원되지 않습니다.');
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.9;

    const voices = speechSynthesis.getVoices();
    const koVoice = voices.find((v) => v.lang.startsWith('ko'));
    if (koVoice) utterance.voice = koVoice;

    window.speechSynthesis.speak(utterance);
  };

  const stop = () => window.speechSynthesis.cancel();

  const getReadingTextForTTS = (book: string, startCh: number, endCh: number): string => {
    const range =
      startCh === endCh ? `${startCh}장` : `${startCh}장부터 ${endCh}장`;
    return `오늘의 말씀은 ${book} ${range}입니다. 성경책이나 지구촌교회 앱에서 해당 본문을 읽어보시기 바랍니다.`;
  };

  return { speak, stop, getReadingTextForTTS };
}
