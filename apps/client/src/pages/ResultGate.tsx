import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { adsService } from '../services/ads';

const RESULT_AD_COOLDOWN_MS = 25_000;
const NAVIGATE_TIMEOUT_MS = 800;

export default function ResultGate() {
  const navigate = useNavigate();
  const navigatedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const timeout = setTimeout(() => {
      if (mounted && !navigatedRef.current) {
        navigatedRef.current = true;
        navigate('/result', { replace: true });
      }
    }, NAVIGATE_TIMEOUT_MS);

    (async () => {
      try {
        const shown = await adsService.showInterstitial();
        if (shown) {
          localStorage.setItem('last_interstitial_at', String(Date.now()));
        }
      } catch {
        // 광고 실패 시 UX 막지 않음
      }
      if (mounted && !navigatedRef.current) {
        navigatedRef.current = true;
        clearTimeout(timeout);
        navigate('/result', { replace: true });
      }
    })();
    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        className="w-10 h-10 border-2 border-toss-blue border-t-transparent rounded-full"
      />
      <p className="text-toss-text text-sm font-medium">결과를 계산하고 있어요</p>
      <p className="text-toss-sub text-xs">잠시만 기다려 주세요</p>
    </div>
  );
}
