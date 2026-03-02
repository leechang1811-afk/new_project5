import { useMemo, useState, useEffect, useRef } from "react";

type Role = "Mafia" | "Citizen" | "Police" | "Doctor";
type Phase =
  | "LOBBY"
  | "ROLES"
  | "TIMER"
  | "VOTE"
  | "RESULT"
  | "NIGHT_MAFIA"
  | "NIGHT_DOCTOR"
  | "NIGHT_POLICE"
  | "NIGHT_SUMMARY";

// 한국어 조사 자동 선택 (이/가, 은/는, 을/를 등)
function josa(name: string, batchim: string, noBatchim: string): string {
  if (!name) return noBatchim;
  const last = name[name.length - 1];
  const code = last.charCodeAt(0);
  // 한글 음절 (AC00–D7A3)
  if (code >= 0xAC00 && code <= 0xD7A3) {
    return (code - 0xAC00) % 28 !== 0 ? batchim : noBatchim;
  }
  // 아라비아 숫자 → 한국어 발음 받침 여부
  const digitHasBatchim: Record<string, boolean> = {
    "0": true,  // 영 (ㅇ받침)
    "1": true,  // 일 (ㄹ받침)
    "2": false, // 이
    "3": true,  // 삼 (ㅁ받침)
    "4": false, // 사
    "5": false, // 오
    "6": true,  // 육 (ㄱ받침)
    "7": true,  // 칠 (ㄹ받침)
    "8": true,  // 팔 (ㄹ받침)
    "9": false, // 구
  };
  if (last in digitHasBatchim) {
    return digitHasBatchim[last] ? batchim : noBatchim;
  }
  return noBatchim;
}

function assignRoles(
  playerIds: string[],
  roleCounts: Record<string, number>,
): Record<string, string> {
  const totalPlayers = playerIds.length;
  const roles: string[] = [];

  // 1. 필요한 직업군을 배열에 추가
  for (const [role, count] of Object.entries(roleCounts)) {
    for (let i = 0; i < count; i++) {
      roles.push(role);
    }
  }

  // 2. 남은 자리를 시민으로 채움
  const filledCount = roles.length;
  if (filledCount > totalPlayers) throw new Error("플레이어 수보다 역할이 많습니다.");
  for (let i = 0; i < totalPlayers - filledCount; i++) {
    roles.push("Citizen");
  }

  // 3. Fisher-Yates Shuffle
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }

  // 4. 유저 ID와 역할 매핑
  const assignment: Record<string, string> = {};
  playerIds.forEach((id, index) => {
    assignment[id] = roles[index];
  });

  return assignment;
}

function recommendedRoles(total: number) {
  const n = Math.max(4, total);

  // 마피아: 전체의 약 1/4, 최소 1명
  // 4~5명: 1명, 6~9명: 2명, 10~12명: 3명
  let mafia = n <= 5 ? 1 : n <= 9 ? 2 : 3;

  // 경찰: 5명+부터 1명, 11명+부터 2명
  let police = n >= 5 ? 1 : 0;
  if (n >= 11) police = 2;

  // 의사: 균형상 8명+부터 추천 (소규모에서는 시민팀이 지나치게 유리해짐)
  let doctor = n >= 8 ? 1 : 0;
  if (n >= 12) doctor = 2;

  let citizen = n - mafia - police - doctor;

  // 시민 최소 1명 보장
  while (citizen < 1 && doctor > 0) { doctor--; citizen++; }
  while (citizen < 1 && police > 1) { police--; citizen++; }

  citizen = n - mafia - police - doctor;
  return { mafia, police, doctor, citizen };
}

const phaseLabel: Record<Phase, string> = {
  LOBBY: "대기실",
  ROLES: "역할 공개",
  TIMER: "타이머",
  VOTE: "투표",
  RESULT: "결과",
  NIGHT_MAFIA: "밤 · 마피아",
  NIGHT_DOCTOR: "밤 · 의사",
  NIGHT_POLICE: "밤 · 경찰",
  NIGHT_SUMMARY: "밤 종료",
};

const roleKorean: Record<Role, string> = {
  Mafia: "마피아",
  Citizen: "시민",
  Police: "경찰",
  Doctor: "의사",
};

export default function Home() {
  const [gameStarted, setGameStarted] = useState(false);
  const [lobbyStep, setLobbyStep] = useState<"ROLES_SETUP" | "TIMER_SETUP">("ROLES_SETUP");
  const [showInstructions, setShowInstructions] = useState(false);
  const [showResultDetails, setShowResultDetails] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const wasRunningRef = useRef(false);
  const [roleStep, setRoleStep] = useState<"ANNOUNCE" | "REVEAL" | "PASS">("ANNOUNCE");
  const [phase, setPhase] = useState<Phase>("LOBBY");

  // ✅ 인원 선택 (2~12) ✅ default = 6
  const [playerCount, setPlayerCount] = useState<number>(6);
  const [locked, setLocked] = useState(false);

  // 내부적으로 플레이어 이름 자동 생성
  const players = useMemo(
    () => Array.from({ length: playerCount }, (_, i) => `플레이어 ${i + 1}`),
    [playerCount],
  );

  // 역할 배정
  const [assigned, setAssigned] = useState<Record<string, Role>>({});
  const [revealIndex, setRevealIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [confirmHandOff, setConfirmHandOff] = useState(false);
  const [flip, setFlip] = useState(false);

  // Timer
  const [mode, setMode] = useState<"Day" | "Night">("Day");
  const [discussionDuration, setDiscussionDuration] = useState(300);
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [running, setRunning] = useState(false);
  const [dangerPulse, setDangerPulse] = useState(false);
  const [discussionRound, setDiscussionRound] = useState(1);
  const [timerEnded, setTimerEnded] = useState(false);
  const [executionTarget, setExecutionTarget] = useState<string>("");
  const [executionResult, setExecutionResult] = useState<{ player: string; role: string } | null>(null);
  const [executionCountdown, setExecutionCountdown] = useState(5);
  const warned30Ref = useRef(false);

  // 밤 결과 오버레이
  const [nightResult, setNightResult] = useState<{ killed: string | null; killedRole: string | null; saved: boolean } | null>(null);

  // 밤 인트로 (역할 확인 후)
  const [nightIntroPhase, setNightIntroPhase] = useState<"night" | null>(null);
  const [nightRoleCountdown, setNightRoleCountdown] = useState<number | null>(null);

  // Vote
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<string>("");

  // ✅ 생존/사망 관리 (true=생존, false=제거/사망)
  const [alive, setAlive] = useState<Record<string, boolean>>({});

  // ✅ 마지막 이벤트 로그
  const [lastEvent, setLastEvent] = useState<string>("");

  // ✅ 마지막으로 투표로 제거된 사람(되돌리기용)
  const [lastExecuted, setLastExecuted] = useState<string | null>(null);

  // ✅ 의사 셀프힐 1회 제한
  const [doctorSelfHealUsed, setDoctorSelfHealUsed] = useState(false);

  // ✅ 밤 액션 결과(한 번에 적용해서 “동시에 일어난 것처럼”)
  const [pendingKill, setPendingKill] = useState<string | null>(null);
  const [pendingHeal, setPendingHeal] = useState<string | null>(null);

  // ✅ 경찰 결과(이 화면에서만 표시)
  const [policeResult, setPoliceResult] = useState<string>("");

  // ✅ 밤 진행 순서 트래킹
  const [nightTurn, setNightTurn] = useState<"MAFIA" | "DOCTOR" | "POLICE">(
    "MAFIA",
  );
  // ✅ 밤 라운드 번호 (N번째 밤)
  const [nightRound, setNightRound] = useState(0);
  // ✅ 현재 밤 행동 화면에서 선택된 플레이어
  const [nightActionTarget, setNightActionTarget] = useState("");
  // ✅ 경찰 결과 화면 표시 여부
  const [policeRevealShowing, setPoliceRevealShowing] = useState(false);
  // ✅ 밤 인트로 이후 행선지 ("TIMER" = 첫 밤→낮토론, "MAFIA" = 이후 밤→마피아행동)
  const nightAfterIntroRef = useRef<"TIMER" | "MAFIA">("TIMER");
  // ✅ stale closure 방지용 pending 값 ref
  const pendingKillRef = useRef<string | null>(null);
  const pendingHealRef = useRef<string | null>(null);

  // ✅ 게임 종료 상태(승리조건: 마피아 전멸 or 마피아만 생존)
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<"MAFIA" | "CITIZEN" | null>(null);
  // stale closure 방지용 ref
  const gameOverRef = useRef(false);
  const timerBlockRef = useRef<HTMLDivElement>(null);

  // ✅ 음성 안내(TTS)
  const [ttsOn, setTtsOn] = useState(true);
  const [ttsReady, setTtsReady] = useState(false); // voices 준비 상태
  const [ttsUnlocked, setTtsUnlocked] = useState(false); // 사용자 제스처로 언락됐는지
  const ttsUnlockedRef = useRef(false);
  const [ttsVoice, setTtsVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [ttsError, setTtsError] = useState<string>("");

  // 🔥 스릴러 톤(저음/느림)
  const ttsRate = 0.95;
  const ttsPitch = 0.62;
  const ttsVolume = 1.0;

  const pickBestKoVoice = (voices: SpeechSynthesisVoice[]) => {
    const ko = voices.filter((v) => (v.lang || "").toLowerCase().includes("ko"));
    const byNameMaleHint = ko.find((v) => /male|man|남/i.test(v.name));
    const koKR = ko.find((v) => (v.lang || "").toLowerCase() === "ko-kr");
    return byNameMaleHint || koKR || ko[0] || null;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) {
      setTtsError("이 브라우저는 speechSynthesis(TTS)를 지원하지 않아요.");
      return;
    }

    const loadVoices = () => {
      const voices = synth.getVoices() || [];
      const best = pickBestKoVoice(voices);
      if (best) setTtsVoice(best);
      if (voices.length > 0) setTtsReady(true);
    };

    loadVoices();
    synth.onvoiceschanged = () => loadVoices();
    const t = window.setTimeout(loadVoices, 400);

    return () => {
      synth.onvoiceschanged = null;
      window.clearTimeout(t);
    };
  }, []);

  // ✅ “사용자 클릭”에서 반드시 1번 호출해서 TTS 언락
  const unlockTTS = () => {
    if (typeof window === "undefined") return false;
    const synth = window.speechSynthesis;
    if (!synth) return false;

    try {
      synth.cancel();
      synth.resume?.();

      const u = new SpeechSynthesisUtterance(" ");
      u.lang = "ko-KR";
      u.rate = 1;
      u.pitch = 1;
      u.volume = 0.9;
      if (ttsVoice) u.voice = ttsVoice;

      u.onend = () => setTtsError("");
      u.onerror = () =>
        setTtsError(
          "TTS가 차단되었어요. Preview(iframe)에서는 막힐 수 있어요. 새 탭에서 실행하거나 음소거 해제 후 다시 눌러주세요.",
        );

      synth.speak(u);
      ttsUnlockedRef.current = true;
      setTtsUnlocked(true);
      return true;
    } catch {
      setTtsError("TTS 언락에 실패했어요.");
      return false;
    }
  };

  // ✅ 안정형 speak (onEnd 콜백 지원)
  const speak = (text: string, onEnd?: () => void) => {
    if (!ttsOn) {
      onEnd?.();
      return;
    }
    if (typeof window === "undefined") { onEnd?.(); return; }

    const synth = window.speechSynthesis;
    if (!synth) { onEnd?.(); return; }

    if (!ttsUnlockedRef.current) {
      setTtsError("🔊 음성 시작 버튼을 먼저 눌러주세요 (브라우저 정책).");
      onEnd?.();
      return;
    }

    try {
      synth.cancel();
      synth.resume?.();

      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ko-KR";
      u.rate = ttsRate;
      u.pitch = ttsPitch;
      u.volume = ttsVolume;

      if (ttsReady && ttsVoice) u.voice = ttsVoice;

      u.onend = () => {
        setTtsError("");
        onEnd?.();
      };
      u.onerror = () => {
        setTtsError(
          "TTS 재생 실패(브라우저/iframe 제한 또는 음소거). 새 탭에서 실행해보세요.",
        );
        onEnd?.();
      };

      window.setTimeout(() => synth.speak(u), 80);
    } catch {
      setTtsError("TTS 예외 발생");
      onEnd?.();
    }
  };

  // =========================
  // ✅ BGM/SFX — 통합(soundOn)
  // =========================
  const [soundOn, setSoundOn] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const sfxRef = useRef<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mk = (key: string, src: string, vol = 0.6) => {
      const a = new Audio(src);
      a.preload = "auto";
      a.volume = vol;
      sfxRef.current[key] = a;
    };

    mk("click", "/sfx/click.mp3", 0.5);
    mk("tick", "/sfx/tick.mp3", 0.45);
    mk("gavel", "/sfx/gavel.mp3", 0.75);


    return () => {
      sfxRef.current = {};
    };
  }, []);

  const unlockAudio = async () => {
    try {
      // 브라우저 오디오 컨텍스트 언락: 무음 버퍼로 처리
      const ctx = new AudioContext();
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      await ctx.close();

      setAudioUnlocked(true);
      return true;
    } catch {
      setAudioUnlocked(false);
      return false;
    }
  };

  const playSfx = (key: "click" | "tick" | "gavel") => {
    if (!soundOn) return;
    if (!audioUnlocked) return;

    const a = sfxRef.current[key];
    if (!a) return;

    try {
      a.currentTime = 0;
      a.play();
    } catch {}
  };

  // (배경음악 제거됨)



  // ─── Web Audio BGM ───────────────────────────────────────────

  // ✅ role briefing 자동 반영
  const rolePlan = useMemo(() => recommendedRoles(playerCount), [playerCount]);

  // 역할 수 (참여자 수 변경 시 자동 동기화)
  const [mafiaCount, setMafiaCount] = useState(rolePlan.mafia);
  const [policeCount, setPoliceCount] = useState(rolePlan.police);
  const [doctorCount, setDoctorCount] = useState(rolePlan.doctor);

  useEffect(() => {
    const plan = recommendedRoles(playerCount);
    setMafiaCount(plan.mafia);
    setPoliceCount(plan.police);
    setDoctorCount(plan.doctor);
  }, [playerCount]);

  // ✅ 살아있는 플레이어만
  const alivePlayers = useMemo(
    () => players.filter((p) => alive[p] !== false),
    [players, alive],
  );

  // ✅ 직업 보유자(한 명 기준)
  const doctorPlayer = useMemo(
    () => Object.keys(assigned).find((p) => assigned[p] === "Doctor") ?? "",
    [assigned],
  );
  const policePlayer = useMemo(
    () => Object.keys(assigned).find((p) => assigned[p] === "Police") ?? "",
    [assigned],
  );

  // ✅ 마피아는 복수 가능
  const mafiaPlayers = useMemo(
    () => Object.keys(assigned).filter((p) => assigned[p] === "Mafia"),
    [assigned],
  );

  // ✅ 역할 생존 여부(스킵 로직에 사용)
  const mafiaAlive = useMemo(
    () => mafiaPlayers.some((p) => alive[p] !== false),
    [mafiaPlayers, alive],
  );
  const doctorAlive = useMemo(
    () => !!doctorPlayer && alive[doctorPlayer] !== false,
    [doctorPlayer, alive],
  );
  const policeAlive = useMemo(
    () => !!policePlayer && alive[policePlayer] !== false,
    [policePlayer, alive],
  );

  const roleOf = (p: string) => {
    const r = assigned[p];
    return r ? roleKorean[r] : "알 수 없음";
  };

  // ✅ 승리 조건 체크
  // 시민 승리: M = 0 (마피아 전멸)
  // 마피아 승리: M >= C (마피아 수 >= 생존 시민 수 → 투표권 역전 불가)
  const checkWinAndMaybeEnd = (aliveState: Record<string, boolean>): boolean => {
    if (gameOverRef.current) return true;
    if (Object.keys(assigned).length === 0) return false;

    const mafiaAliveCount = mafiaPlayers.filter((p) => aliveState[p] !== false).length;
    const nonMafiaAliveCount = players.filter(
      (p) => aliveState[p] !== false && assigned[p] !== "Mafia",
    ).length;

    if (mafiaAliveCount === 0) {
      gameOverRef.current = true;
      setGameOver(true);
      setWinner("CITIZEN");
      setPhase("RESULT");
      setLastEvent("🎉 시민 승리! 모든 마피아가 제거되었습니다.");
      speak("마피아가 모두 제거되었습니다. 시민의 승리입니다. 축하합니다!");
      return true;
    }

    // 마피아 수 >= 생존 시민 수 → 투표로 마피아를 제거 불가 → 마피아 승리
    if (mafiaAliveCount >= nonMafiaAliveCount && mafiaAliveCount > 0) {
      gameOverRef.current = true;
      setGameOver(true);
      setWinner("MAFIA");
      setPhase("RESULT");
      setLastEvent("💀 마피아 승리! 마피아 수가 시민 수 이상이 되었습니다.");
      const mafiaWinMsg = mafiaAliveCount === nonMafiaAliveCount
        ? "마피아와 시민의 수가 같아졌습니다. 마피아의 승리입니다!"
        : "마피아가 시민보다 더 많아졌습니다. 마피아의 승리입니다!";
      speak(mafiaWinMsg);
      return true;
    }

    return false;
  };

  // ✅ 밤 결과 자동 적용 및 아침 안내 (speak onEnd → 3초 뒤 TIMER 전환)
  const goToNextDayTimer = () => {
    setNightResult(null);
    setDiscussionRound((r) => r + 1);
    setMode("Day");
    setSecondsLeft(discussionDuration);
    setTimerEnded(false);
    setExecutionTarget("");
    warned30Ref.current = false;
    setRunning(true);
    setPhase("TIMER");
    speak("토론 시간입니다. 토론을 시작해주세요.");
  };

  const applyNightOutcomeAuto = (kill: string | null, heal: string | null) => {
    const prefix = "아침이 되었습니다. 다들 고개를 들어주세요. ";
    const suffix = " 토론을 시작해주세요.";

    if (kill && heal && kill === heal) {
      // 의사가 살림 → 아무도 사망하지 않음
      setNightResult({ killed: null, killedRole: null, saved: true });
      const resultMsg = prefix + `어젯밤 마피아는 ${kill}${josa(kill, '을', '를')} 죽이려고 했지만 의사가 살렸습니다.` + suffix;
      speak(resultMsg, () => setTimeout(goToNextDayTimer, 3000));

    } else if (kill) {
      // 마피아 킬 성공
      const killedRole = roleOf(kill);
      const resultMsg = prefix + `어젯밤 ${kill}${josa(kill, '은', '는')} 죽었습니다. 역할은 ${killedRole}이었습니다.` + suffix;
      const nextAlive = { ...alive, [kill]: false };
      setAlive(nextAlive);
      const ended = checkWinAndMaybeEnd(nextAlive);
      if (!ended) {
        // 게임이 끝나지 않은 경우에만 결과 오버레이 표시
        setNightResult({ killed: kill, killedRole, saved: false });
        speak(resultMsg, () => setTimeout(goToNextDayTimer, 3000));
      }
      return;

    } else {
      // 킬 없음
      setNightResult({ killed: null, killedRole: null, saved: false });
      const resultMsg = prefix + "어젯밤 아무 일도 일어나지 않았습니다." + suffix;
      speak(resultMsg, () => setTimeout(goToNextDayTimer, 3000));
    }
  };

  const startGame = () => {
    playSfx("click");
    if (playerCount < 4) return;

    gameOverRef.current = false;
    setGameOver(false);
    setWinner(null);

    const map = assignRoles(players, {
      Mafia: mafiaCount,
      Police: policeCount,
      Doctor: doctorCount,
    }) as Record<string, Role>;
    setAssigned(map);

    const aliveInit: Record<string, boolean> = {};
    players.forEach((p) => (aliveInit[p] = true));
    setAlive(aliveInit);

    setVotes({});
    setSelected("");
    setLastEvent("");
    setLastExecuted(null);

    setPoliceResult("");
    setPendingKill(null);
    setPendingHeal(null);

    setDoctorSelfHealUsed(false);

    setRevealIndex(0);
    setIsRevealed(false);
    setConfirmHandOff(false);
    setFlip(false);
    setRoleStep("ANNOUNCE");

    setMode("Day");
    setSecondsLeft(discussionDuration);
    setRunning(false);

    nightAfterIntroRef.current = "TIMER";

    setPhase("ROLES");
    speak("지금부터 직업 확인이 시작됩니다. 당신은 플레이어 1 입니다.");
  };

  // === 타이머 1: 초 감소 ===
  useEffect(() => {
    if (!running) return;

    const t = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);

    return () => clearInterval(t);
  }, [running]);

  // === 타이머 2: 막판 펄스 ===
  useEffect(() => {
    if (!running) return;

    if (secondsLeft <= 10 && secondsLeft > 0) {
      setDangerPulse((p) => !p);
    } else {
      setDangerPulse(false);
    }
  }, [secondsLeft, running]);

  // ✅ 타이머 마지막 10초 tick
  useEffect(() => {
    if (!running) return;
    if (secondsLeft <= 10 && secondsLeft > 0) {
      playSfx("tick");
    }
    if (secondsLeft === 30 && phase === "TIMER" && !warned30Ref.current) {
      warned30Ref.current = true;
      speak("토론 종료까지 30초 남았어요. 누굴 제거할지 투표로 정해주세요.");
    }
    if (secondsLeft === 0 && phase === "TIMER") {
      setRunning(false);
      setTimerEnded(true);
      speak("토론 시간이 다 끝났어요. 사형할 플레이어를 선택해주세요.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, running]);

  // 밤 인트로 타임라인 (nightIntroPhase가 "night"로 바뀔 때 실행)
  useEffect(() => {
    if (nightIntroPhase !== "night") return;

    // StrictMode 이중 실행 방지: cleanup에서 cancelled=true로 설정해 이전 실행 무효화
    let cancelled = false;

    speak("밤이 되었습니다. 스마트폰을 중앙에 내려놔주시고, 모두 눈을 감아주세요.");

    const timers: ReturnType<typeof setTimeout>[] = [];

    if (nightAfterIntroRef.current === "TIMER") {
      // ── 첫 번째 밤: 역할 서로 확인 → 낮 토론으로 ──
      const roleQueue: string[] = [];
      if (mafiaPlayers.length >= 2) roleQueue.push("마피아는 고개를 들어 서로를 확인해주세요.");

      let acc = 8000;
      roleQueue.forEach((msg, idx) => {
        const t = acc;
        timers.push(setTimeout(() => {
          if (cancelled) return;
          speak(msg);
          setNightRoleCountdown(8);
          let remaining = 8;
          // 각 메시지마다 독립된 interval 변수 사용 (공유 변수로 인한 경쟁 조건 방지)
          const thisInterval = setInterval(() => {
            if (cancelled) { clearInterval(thisInterval); return; }
            remaining -= 1;
            if (remaining <= 0) {
              clearInterval(thisInterval);
              setNightRoleCountdown(null);
            } else {
              setNightRoleCountdown(remaining);
            }
          }, 1000);
          timers.push(thisInterval as unknown as ReturnType<typeof setTimeout>);
        }, t));
        acc += 8000;
        void idx; // suppress unused variable warning
      });

      if (roleQueue.length > 0) {
        // 1단계: nightIntroPhase는 유지하면서 phase만 TIMER로 전환
        // → 밤 오버레이가 ROLES 화면을 가려 직업 확인 화면 재노출 방지
        // → nightIntroPhase를 건드리지 않으므로 useEffect cleanup이 2단계 타이머를 취소하지 않음
        timers.push(setTimeout(() => {
          if (cancelled) return;
          setNightRoleCountdown(null);
          setPhase("TIMER");
          setMode("Day");
          setSecondsLeft(discussionDuration);
          setTimerEnded(false);
          setExecutionTarget("");
          setExecutionResult(null);
          warned30Ref.current = false;
        }, acc));
        acc += 3000;
        // 2단계: 3초 후 밤 오버레이 제거 + 타이머 시작 + 음성 안내
        timers.push(setTimeout(() => {
          if (cancelled) return;
          setNightIntroPhase(null);
          setRunning(true);
          speak("아침이 되었습니다. 다들 고개를 들어주세요. 토론을 시작해주세요.");
        }, acc));
      } else {
        // 역할 확인 없는 경우: 2초 후 전환
        acc += 2000;
        timers.push(setTimeout(() => {
          if (cancelled) return;
          setNightIntroPhase(null);
          setPhase("TIMER");
          setMode("Day");
          setSecondsLeft(discussionDuration);
          setTimerEnded(false);
          setExecutionTarget("");
          setExecutionResult(null);
          warned30Ref.current = false;
          setRunning(true);
          speak("아침이 되었습니다. 다들 고개를 들어주세요. 토론을 시작해주세요.");
        }, acc));
      }

    } else {
      // ── 이후 밤: 대기 후 마피아 행동으로 ──
      // 5초 뒤: 손가락 올리기 안내
      timers.push(setTimeout(() => {
        if (cancelled) return;
        speak("모두 손가락을 휴대폰 위에 올려놔주세요.");
      }, 5000));

      // 10초 뒤: 마피아 행동 시작
      timers.push(setTimeout(() => {
        if (cancelled) return;
        setNightIntroPhase(null);
        setNightActionTarget("");
        if (mafiaAlive) {
          setPhase("NIGHT_MAFIA");
          speak("마피아는 조용히 제거할 플레이어를 선택해주세요.");
        } else if (policeAlive) {
          setPhase("NIGHT_POLICE");
          speak("경찰은 정체를 확인하고 싶은 플레이어를 선택해주세요.");
        } else if (doctorAlive) {
          setPhase("NIGHT_DOCTOR");
          speak("의사는 살릴 플레이어를 선택해주세요.");
        } else {
          applyNightOutcomeAuto(null, null);
        }
      }, 10000));
    }

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nightIntroPhase]);

  // 사형 결과 오버레이 카운트다운 표시 (전환은 speak onEnd 콜백에서 처리)
  useEffect(() => {
    if (!executionResult) return;
    setExecutionCountdown(5);
    const interval = setInterval(() => {
      setExecutionCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [executionResult]);

  const currentPlayer = players[revealIndex];

  const nextReveal = () => {
    setIsRevealed(false);
    if (revealIndex + 1 >= players.length) {
      setNightIntroPhase("night");
      return;
    }
    const nextIndex = revealIndex + 1;
    setRevealIndex(nextIndex);
    setRoleStep("ANNOUNCE");
    speak(`당신은 플레이어 ${nextIndex + 1} 입니다.`);
  };

  const setPreset = (m: "Day" | "Night") => {
    playSfx("click");
    setMode(m);
    setRunning(false);
    setSecondsLeft(m === "Day" ? 300 : 120);
    speak(m === "Day" ? "낮 토론 시간을 설정했습니다." : "밤 시간을 설정했습니다.");
  };

  const gotoVote = () => {
    playSfx("click");
    if (gameOver) return;
    const init: Record<string, number> = {};
    alivePlayers.forEach((p) => (init[p] = 0));
    setVotes(init);
    setSelected("");
    setPhase("VOTE");
    speak("투표 단계입니다. 의심되는 사람을 선택하고, 플러스 버튼으로 표를 추가하세요.");
  };

  const addVote = () => {
    playSfx("click");
    if (gameOver) return;
    if (!selected) return;
    setVotes((v) => ({ ...v, [selected]: (v[selected] ?? 0) + 1 }));
    speak(`${selected} 에게 한 표가 추가되었습니다.`);
  };

  const results = useMemo(() => {
    const entries = Object.entries(votes);
    entries.sort((a, b) => b[1] - a[1]);
    return entries;
  }, [votes]);

  const topVoted = useMemo(() => {
    if (!results.length) return null;
    const [p1, v1] = results[0];
    const v2 = results[1]?.[1] ?? -1;
    if (v1 <= 0) return null;
    if (v1 === v2) return null;
    return { player: p1, votes: v1 };
  }, [results]);

  const executeVote = () => {
    playSfx("gavel");
    if (gameOver) return;

    if (!topVoted) {
      setLastEvent("⚠️ 집행 불가: 투표가 없거나 1등 동점입니다.");
      speak("집행 불가. 투표가 없거나 1등이 동점입니다.");
      return;
    }
    const target = topVoted.player;

    if (alive[target] === false) {
      setLastEvent(`⚠️ ${target} 님은 이미 제거(사망) 상태입니다.`);
      speak("이미 제거된 플레이어입니다.");
      return;
    }

    const revealedRole = roleOf(target);

    setAlive((prev) => {
      const next = { ...prev, [target]: false };
      checkWinAndMaybeEnd(next);
      return next;
    });

    setLastExecuted(target);
    setLastEvent(`🗳️ 투표로 ${target} 님이 제거되었습니다. (역할: ${revealedRole})`);
    speak(`투표 결과, ${target} 님이 제거되었습니다. 역할은 ${revealedRole} 입니다.`);
  };

  const undoLastExecute = () => {
    playSfx("click");
    if (gameOver) return;

    if (!lastExecuted) {
      setLastEvent("되돌릴 집행 기록이 없습니다.");
      speak("되돌릴 집행 기록이 없습니다.");
      return;
    }
    setAlive((prev) => ({ ...prev, [lastExecuted]: true }));
    setLastEvent(`↩️ ${lastExecuted} 님이 되살아났습니다.`);
    speak(`${lastExecuted} 님이 되살아났습니다.`);
    setLastExecuted(null);
  };

  // ====== ✅ 사회자 없는 “밤 액션 플로우”(시작 버튼 없이 바로 선택 화면) ======
  const beginNight = () => {
    if (gameOverRef.current) return;

    setPendingKill(null);
    setPendingHeal(null);
    pendingKillRef.current = null;
    pendingHealRef.current = null;
    setPoliceResult("");
    setPoliceRevealShowing(false);
    setNightActionTarget("");
    setNightRound((r) => r + 1);
    nightAfterIntroRef.current = "MAFIA";
    setNightIntroPhase("night");
  };

  // ── 마피아 선택 확정 ──
  const confirmMafiaSelection = () => {
    playSfx("click");
    if (gameOver) return;
    const target = nightActionTarget;
    setPendingKill(target);
    pendingKillRef.current = target;
    setNightActionTarget("");

    if (policeAlive) {
      setPhase("NIGHT_POLICE");
      speak("경찰은 정체를 확인하고 싶은 플레이어를 선택해주세요.");
    } else if (doctorAlive) {
      setPhase("NIGHT_DOCTOR");
      speak("의사는 살릴 플레이어를 선택해주세요.");
    } else {
      applyNightOutcomeAuto(target, null);
    }
  };

  // ── 경찰 조사 대상 선택 (결과 표시) ──
  const selectPoliceTarget = (p: string) => {
    playSfx("click");
    if (gameOver) return;
    setNightActionTarget(p);
    const isMafia = assigned[p] === "Mafia";
    const role = roleOf(p);
    setPoliceResult(`${p}의 역할: ${role}`);
    setPoliceRevealShowing(true);
  };

  // ── 경찰 확인 완료 ──
  const confirmPoliceReveal = () => {
    playSfx("click");
    setPoliceRevealShowing(false);
    setNightActionTarget("");

    if (doctorAlive) {
      setPhase("NIGHT_DOCTOR");
      speak("의사는 살릴 플레이어를 선택해주세요.");
    } else {
      applyNightOutcomeAuto(pendingKillRef.current, null);
    }
  };

  // ── 의사 선택 확정 → 3초 뒤 아침 결과 ──
  const confirmDoctorSelection = () => {
    playSfx("click");
    if (gameOver) return;
    const target = nightActionTarget;
    if (target === doctorPlayer && doctorSelfHealUsed) {
      speak("본인 치료는 게임당 한 번만 가능합니다.");
      return;
    }
    if (target === doctorPlayer) setDoctorSelfHealUsed(true);
    setPendingHeal(target);
    pendingHealRef.current = target;
    setNightActionTarget("");
    applyNightOutcomeAuto(pendingKillRef.current, target);
  };

  const resetAll = () => {
    playSfx("click");

    setPhase("LOBBY");
    setAssigned({});
    setRevealIndex(0);
    setIsRevealed(false);
    setConfirmHandOff(false);
    setFlip(false);

    setRunning(false);
    setSecondsLeft(300);
    setMode("Day");
    setDangerPulse(false);

    setVotes({});
    setSelected("");

    setAlive({});
    setLastEvent("");
    setLastExecuted(null);
    setDoctorSelfHealUsed(false);

    setPoliceResult("");
    setNightResult(null);

    setPendingKill(null);
    setPendingHeal(null);

    setLocked(false);

    gameOverRef.current = false;
    setGameOver(false);
    setWinner(null);

    nightAfterIntroRef.current = "TIMER";

    window.speechSynthesis?.cancel();
    setTtsError("");
    setTtsUnlocked(false);

  };

  const glowCard =
    "relative rounded-2xl bg-[#F2F2F7]";

  const bigChoiceBtn =
    "w-full py-4 rounded-2xl bg-[#F2F2F7] hover:bg-gray-200 active:bg-gray-300 text-left px-4";

  if (!gameStarted) {
    return (
      <div className="min-h-[100svh] flex flex-col items-center justify-center px-6 gap-3 bg-black">
        <p className="text-sm text-white/50">사회자가 필요없는</p>
        <h1 className="text-4xl font-bold tracking-tight text-white">
          마피아 게임
        </h1>

        <div className="mt-6 flex flex-col items-center gap-3 w-full max-w-xs">
          <button
            onClick={() => setGameStarted(true)}
            className="px-14 py-4 rounded-2xl font-semibold text-base transition-all active:scale-95 bg-blue-500 text-white"
          >
            시작하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100svh] relative overflow-hidden bg-black text-white">

      {/* 게임 시작 안내 오버레이 */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between px-6 py-12">
          <div className="flex-1 flex flex-col justify-center gap-8 w-full max-w-sm">
            <h2 className="text-xl font-bold text-white text-center">게임 시작 전 안내</h2>

            <div className="space-y-6">
              <div className="flex gap-4 items-start">
                <span className="mt-0.5 shrink-0 w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold text-white">1</span>
                <p className="text-white/60 text-sm leading-relaxed">
                  게임 진행 중 안내 음성이 나옵니다. <span className="text-white font-semibold">소리가 켜져 있는지</span> 지금 확인해 주세요.
                </p>
              </div>

              <div className="flex gap-4 items-start">
                <span className="mt-0.5 shrink-0 w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold text-white">2</span>
                <p className="text-white/60 text-sm leading-relaxed">
                  직업 확인은 <span className="text-white font-semibold">한 명씩 차례로</span> 진행됩니다. 내 직업을 확인한 뒤, 직업 확인 완료 버튼을 누르고 오른쪽 사람에게 넘겨주세요.
                </p>
              </div>

              <div className="flex gap-4 items-start">
                <span className="mt-0.5 shrink-0 w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold text-white">3</span>
                <p className="text-white/60 text-sm leading-relaxed">
                  모든 직업 확인이 끝나면 <span className="text-white font-semibold">음성 게임 안내에 따라</span> 게임을 시작해주세요.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={async () => {
              unlockTTS();
              await unlockAudio();
              setTtsOn(true);
              setSoundOn(true);
              setShowInstructions(false);
              startGame();
            }}
            className="w-full max-w-sm py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 bg-blue-500 text-white"
          >
            확인
          </button>
        </div>
      )}

      {/* 야간 행동 하단 CTA */}
      {(phase === "NIGHT_MAFIA" || phase === "NIGHT_DOCTOR") && (
        <div className="fixed bottom-0 left-0 right-0 z-30 px-5 pb-8 pt-3 bg-gradient-to-t from-[#07070a] to-transparent flex justify-center pointer-events-none">
          <button
            disabled={!nightActionTarget}
            onClick={phase === "NIGHT_MAFIA" ? confirmMafiaSelection : confirmDoctorSelection}
            className={`w-full max-w-md py-4 rounded-full font-bold text-base transition-all active:scale-95 pointer-events-auto ${
              nightActionTarget
                ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)]"
                : "bg-white/10 text-white/30 border border-white/10"
            }`}
          >
            선택 완료
          </button>
        </div>
      )}
      {phase === "NIGHT_POLICE" && !policeRevealShowing && (
        <div className="fixed bottom-0 left-0 right-0 z-30 px-5 pb-8 pt-3 bg-gradient-to-t from-[#07070a] to-transparent flex justify-center pointer-events-none">
          <button
            disabled={!nightActionTarget}
            onClick={() => { /* 플레이어 탭시 이미 reveal showing 처리됨 */ }}
            className="w-full max-w-md py-4 rounded-full font-bold text-base bg-white/10 text-white/30 border border-white/10 pointer-events-none"
          >
            플레이어를 선택해주세요
          </button>
        </div>
      )}
      {phase === "NIGHT_POLICE" && policeRevealShowing && (
        <div className="fixed bottom-0 left-0 right-0 z-30 px-5 pb-8 pt-3 bg-gradient-to-t from-[#07070a] to-transparent flex flex-col items-center gap-2 pointer-events-none">
          <p className="text-white/40 text-xs">확인을 완료했으면 확인 완료 버튼을 눌러주세요</p>
          <button
            onClick={confirmPoliceReveal}
            className="w-full max-w-md py-4 rounded-full font-bold text-base bg-blue-600 text-white pointer-events-auto active:scale-95 transition-all"
          >
            확인 완료
          </button>
        </div>
      )}

      {/* LOBBY sticky CTA */}
      {phase === "LOBBY" && (
        <div className="fixed bottom-0 left-0 right-0 z-30 flex justify-center px-5 pb-8 pt-3 bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-none">
          {lobbyStep === "ROLES_SETUP" ? (
            <button
              onClick={() => {
                playSfx("click");
                setLobbyStep("TIMER_SETUP");
                setTimeout(() => {
                  timerBlockRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 50);
              }}
              className="w-full max-w-md py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 pointer-events-auto bg-blue-500 text-white"
            >
              다음으로
            </button>
          ) : (
            <button
              onClick={() => setShowInstructions(true)}
              className="w-full max-w-md py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 pointer-events-auto bg-blue-500 text-white"
            >
              게임 시작하기
            </button>
          )}
        </div>
      )}

      {/* 밤 결과 오버레이 (아침 안내방송 동안 표시) */}
      {nightResult && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center px-8 gap-8 text-center">
          <p className="text-4xl">🌅</p>
          <p className="text-gray-900 text-xl font-bold">아침이 되었습니다</p>
          {nightResult.killed ? (
            <div className="w-full max-w-sm bg-gray-100 border border-gray-200 rounded-2xl px-6 py-7 flex flex-col items-center gap-3">
              <p className="text-gray-500 text-sm">어젯밤 사망자</p>
              <p className="text-gray-900 text-2xl font-extrabold">{nightResult.killed}</p>
              <p className={`text-lg font-semibold ${nightResult.killedRole === "마피아" ? "text-red-500" : "text-blue-500"}`}>
                {nightResult.killedRole}
              </p>
            </div>
          ) : nightResult.saved ? (
            <div className="w-full max-w-sm bg-gray-100 border border-gray-200 rounded-2xl px-6 py-7 flex flex-col items-center gap-3">
              <p className="text-gray-900 text-xl font-semibold">의사가 마피아의 손길을<br />막았습니다</p>
              <p className="text-gray-500 text-sm">사망자 없음</p>
            </div>
          ) : (
            <div className="w-full max-w-sm bg-gray-100 border border-gray-200 rounded-2xl px-6 py-7 flex flex-col items-center gap-3">
              <p className="text-gray-900 text-xl font-semibold">어젯밤 아무 일도<br />일어나지 않았습니다</p>
              <p className="text-gray-500 text-sm">사망자 없음</p>
            </div>
          )}
        </div>
      )}

      {/* 사형 결과 오버레이 */}
      {executionResult && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between px-6 py-14">
          <p className="text-base font-bold text-white">선택 결과</p>
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
            <p className="text-white/60 text-lg">{executionResult.player}{josa(executionResult.player, '이', '가')} 죽었습니다</p>
            <p className="text-4xl font-extrabold text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(to right, #f472b6, #e879f9, #3B82F6)" }}>
              {executionResult.role}
            </p>
          </div>
          <p className="text-white/40 text-sm">{executionCountdown}초 뒤엔 밤이 시작돼요</p>
        </div>
      )}

      {/* TIMER 하단 CTA — 패스(좌) + 선택 완료(우) */}
      {phase === "TIMER" && !executionResult && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-8 pt-4 bg-gradient-to-t from-white via-white/90 to-transparent flex items-center gap-3 pointer-events-none">
          {/* 패스 */}
          <button
            onClick={() => {
              playSfx("click");
              setExecutionTarget("");
              warned30Ref.current = false;
              beginNight();
            }}
            className="flex-1 py-4 rounded-2xl font-semibold text-base transition-all active:scale-95 pointer-events-auto bg-gray-300 text-gray-700"
          >
            패스
          </button>
          {/* 선택 완료 */}
          <button
            disabled={!executionTarget}
            onClick={() => {
              if (!executionTarget) return;
              playSfx("gavel");
              const revealedRole = roleOf(executionTarget);
              const nextAlive = { ...alive, [executionTarget]: false };
              setAlive(nextAlive);
              const ended = checkWinAndMaybeEnd(nextAlive);
              setLastExecuted(executionTarget);
              setLastEvent(`🗳️ ${executionTarget} 님이 사형되었습니다. (역할: ${revealedRole})`);
              setRunning(false);
              warned30Ref.current = false;
              if (!ended) {
                setExecutionResult({ player: executionTarget, role: revealedRole });
                speak(
                  `${executionTarget}${josa(executionTarget, '이', '가')} 죽었습니다. ${executionTarget}${josa(executionTarget, '은', '는')} ${revealedRole}이었습니다.`,
                  () => setTimeout(() => {
                    setExecutionResult(null);
                    beginNight();
                  }, 3000),
                );
              }
              setExecutionTarget("");
            }}
            className={`flex-1 py-4 rounded-2xl font-semibold text-base transition-all active:scale-95 pointer-events-auto text-center ${
              executionTarget
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            선택 완료
          </button>
        </div>
      )}

      <div className="max-w-md mx-auto px-5 relative min-h-[100svh] flex flex-col">
        {/* ✅ 헤더 고정 */}
        <div className="sticky top-0 z-20 px-5 pt-2 pb-3 backdrop-blur bg-black/85">
          {phase === "LOBBY" && (
            <p className="text-base font-bold text-white text-center">게임 설정</p>
          )}
          {phase !== "LOBBY" && !showInstructions && (
            <div className="flex items-center justify-end">
              <button
                onClick={() => {
                  wasRunningRef.current = running;
                  setRunning(false);
                  setShowExitModal(true);
                }}
                className="text-white/50 text-sm font-medium px-3 py-1.5 rounded-xl bg-white/10 active:bg-white/20 transition-all"
              >
                종료
              </button>
            </div>
          )}
          {ttsError && (
            <div className="text-[11px] text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 mt-2">
              {ttsError}
            </div>
          )}
        </div>

        {/* ✅ 본문 */}
        <div className={`flex-1 overflow-y-auto ${phase === "LOBBY" ? "pb-32" : "pb-8"}`}>
          {/* ✅ 대기실 */}
          {phase === "LOBBY" && (
            <div className="mt-4 space-y-4 px-5">
              {/* 게임 참여 인원 수 */}
              <div className={glowCard + " p-4"}>
                <h2 className="font-semibold text-base text-gray-900">게임 참여 인원 수</h2>
                <div className="mt-3 flex items-center justify-center gap-6">
                  <button
                    disabled={locked || playerCount <= 4}
                    onClick={() => { playSfx("click"); setPlayerCount((c) => Math.max(4, c - 1)); }}
                    className={`w-12 h-12 text-xl font-bold rounded-full transition ${
                      locked || playerCount <= 4
                        ? "bg-gray-200 text-gray-300"
                        : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                    }`}
                  >-</button>
                  <div className="w-20 text-center flex items-end justify-center gap-1">
                    <div className="text-3xl font-extrabold text-gray-900">{playerCount}</div>
                    <div className="text-sm text-gray-400 mb-0.5">명</div>
                  </div>
                  <button
                    disabled={locked || playerCount >= 12}
                    onClick={() => { playSfx("click"); setPlayerCount((c) => Math.min(12, c + 1)); }}
                    className={`w-12 h-12 text-xl font-bold rounded-full transition ${
                      locked || playerCount >= 12
                        ? "bg-gray-200 text-gray-300"
                        : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                    }`}
                  >+</button>
                </div>
              </div>

              {/* 마피아 */}
              <div className={glowCard + " p-4"}>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-base text-gray-900">마피아</h2>
                  <span className="text-xs text-gray-400">추천 {rolePlan.mafia}명</span>
                </div>
                <div className="mt-3 flex items-center justify-center gap-6">
                  <button
                    disabled={locked || mafiaCount <= 1}
                    onClick={() => { playSfx("click"); setMafiaCount((c) => Math.max(1, c - 1)); }}
                    className={`w-12 h-12 text-xl font-bold rounded-full transition ${
                      locked || mafiaCount <= 1 ? "bg-gray-200 text-gray-300" : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                    }`}
                  >-</button>
                  <div className="w-20 text-center flex items-end justify-center gap-1">
                    <div className="text-3xl font-extrabold text-gray-900">{mafiaCount}</div>
                    <div className="text-sm text-gray-400 mb-0.5">명</div>
                  </div>
                  <button
                    disabled={locked || mafiaCount >= Math.max(1, playerCount - 2)}
                    onClick={() => { playSfx("click"); setMafiaCount((c) => Math.min(Math.max(1, playerCount - 2), c + 1)); }}
                    className={`w-12 h-12 text-xl font-bold rounded-full transition ${
                      locked || mafiaCount >= Math.max(1, playerCount - 2) ? "bg-gray-200 text-gray-300" : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                    }`}
                  >+</button>
                </div>
              </div>

              {/* 특수 역할 */}
              <div className={glowCard + " p-4 space-y-4"}>
                <h2 className="font-semibold text-base text-gray-900">특수 역할</h2>
                {[
                  { label: "경찰", count: policeCount, setCount: setPoliceCount, recommended: rolePlan.police, min: 0, max: Math.max(0, playerCount - mafiaCount - 1) },
                  { label: "의사", count: doctorCount, setCount: setDoctorCount, recommended: rolePlan.doctor, min: 0, max: Math.max(0, playerCount - mafiaCount - policeCount - 1) },
                ].map(({ label, count, setCount, recommended, min, max }, i) => (
                  <div key={label}>
                    {i > 0 && <div className="border-t border-gray-200 pt-4" />}
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm text-gray-900">{label}</h3>
                      <span className="text-xs text-gray-400">추천 {recommended}명</span>
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-6">
                      <button
                        disabled={locked || count <= min}
                        onClick={() => { playSfx("click"); setCount((c) => Math.max(min, c - 1)); }}
                        className={`w-12 h-12 text-xl font-bold rounded-full transition ${
                          locked || count <= min ? "bg-gray-200 text-gray-300" : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                        }`}
                      >-</button>
                      <div className="w-20 text-center flex items-end justify-center gap-1">
                        <div className="text-3xl font-extrabold text-gray-900">{count}</div>
                        <div className="text-sm text-gray-400 mb-0.5">명</div>
                      </div>
                      <button
                        disabled={locked || count >= max}
                        onClick={() => { playSfx("click"); setCount((c) => Math.min(max, c + 1)); }}
                        className={`w-12 h-12 text-xl font-bold rounded-full transition ${
                          locked || count >= max ? "bg-gray-200 text-gray-300" : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                        }`}
                      >+</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* 토론 시간 */}
              {lobbyStep === "TIMER_SETUP" && (
                <div ref={timerBlockRef} className={glowCard + " p-4"}>
                  <h2 className="font-semibold text-base text-gray-900">토론 시간</h2>
                  <div className="mt-4 flex items-center justify-center gap-1">
                    <span className="text-4xl font-extrabold text-gray-900">{Math.floor(discussionDuration / 60)}</span>
                    <span className="text-sm text-gray-400 mr-2">분</span>
                    <span className="text-4xl font-extrabold text-gray-900">{String(discussionDuration % 60).padStart(2, "0")}</span>
                    <span className="text-sm text-gray-400">초</span>
                  </div>
                  <div className="mt-5 flex justify-center gap-2">
                    {[180, 300, 420, 600].map((sec) => (
                      <button
                        key={sec}
                        onClick={() => { playSfx("click"); setDiscussionDuration(sec); }}
                        className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition ${
                          discussionDuration === sec
                            ? "bg-gray-900 text-white border-gray-900"
                            : "bg-gray-200 border-gray-200 text-gray-600 hover:bg-gray-300"
                        }`}
                      >
                        {sec / 60}분
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-4">
                    <button
                      onClick={() => { playSfx("click"); setDiscussionDuration((s) => Math.max(30, s - 30)); }}
                      className="px-5 py-2.5 rounded-xl text-sm bg-gray-200 hover:bg-gray-300 text-gray-700"
                    >-30초</button>
                    <button
                      onClick={() => { playSfx("click"); setDiscussionDuration((s) => Math.min(1800, s + 30)); }}
                      className="px-5 py-2.5 rounded-xl text-sm bg-gray-200 hover:bg-gray-300 text-gray-700"
                    >+30초</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 밤 화면 */}
          {nightIntroPhase === "night" && (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-8"
              style={{ background: "radial-gradient(ellipse at center, #0d1b2a 0%, #000000 100%)" }}>
              <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
                <p className="text-5xl">🌙</p>
                <p className="text-white text-2xl font-bold leading-snug">밤이 되었습니다</p>
                <p className="text-white/50 text-base leading-relaxed">
                  스마트폰을 중앙에 내려놔주시고<br />모두 눈을 감아주세요
                </p>
                {nightRoleCountdown !== null && (
                  <div className="mt-6 flex flex-col items-center gap-1">
                    <p className="text-white/70 text-5xl font-extrabold tabular-nums transition-all duration-500">
                      {nightRoleCountdown}
                    </p>
                    <p className="text-white/30 text-xs tracking-widest">초 뒤 이동</p>
                  </div>
                )}
              </div>
            </div>
          )}


          {/* 역할 공개 */}
          {phase === "ROLES" && (() => {
            const roleVisuals: Record<string, { emoji: string; bg: string; label: string }> = {
              Mafia:   { emoji: "🔫", bg: "#2C2C2E", label: "마피아" },
              Police:  { emoji: "🔍", bg: "#1C3A5E", label: "경찰" },
              Doctor:  { emoji: "💉", bg: "#1A3C2E", label: "의사" },
              Citizen: { emoji: "🧑", bg: "#3A3A3C", label: "시민" },
            };
            const role = assigned[currentPlayer] ?? "Citizen";
            const visual = roleVisuals[role] ?? roleVisuals.Citizen;
            return (
            <div className="fixed inset-0 z-40 flex flex-col bg-black">
              {/* 상단 타이틀 */}
              <div className="pt-6 pb-2 text-center">
                <p className="text-base font-bold text-white">직업 확인</p>
              </div>

              {/* 플레이어 — 항상 표시 */}
              <div className="pt-8 pb-2 text-center">
                <p className="text-base text-white/50">당신은</p>
                <p className="text-4xl font-extrabold text-white mt-1">{currentPlayer} 입니다</p>
              </div>

              {/* 중앙 콘텐츠 — 단계별 */}
              <div className="flex-1 flex flex-col items-center justify-center px-6">

                {/* REVEAL: 이모티콘 + 직업명 */}
                {roleStep === "REVEAL" && (
                  <div
                    key={currentPlayer + "-reveal"}
                    className="flex flex-col items-center gap-4"
                    style={{ animation: "slideInFromRight 0.45s cubic-bezier(0.22,1,0.36,1) forwards" }}
                  >
                    <span style={{ fontSize: "64px", lineHeight: 1 }}>{visual.emoji}</span>
                    <p className="text-3xl font-extrabold text-white">{visual.label}</p>
                  </div>
                )}

                {/* PASS: 기기 넘기기 안내 */}
                {roleStep === "PASS" && (
                  <div className="text-center space-y-2">
                    <p className="text-4xl">👉</p>
                    <p className="text-xl font-semibold text-white">오른쪽 다음 사람에게</p>
                    <p className="text-xl font-semibold text-white">기기를 넘겨주세요</p>
                  </div>
                )}
              </div>

              {/* 하단 CTA */}
              <div className="px-6 pb-12 flex flex-col items-center gap-3 w-full">
                {roleStep === "ANNOUNCE" && (
                  <button
                    onClick={() => { setRoleStep("REVEAL"); }}
                    className="w-full py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 bg-blue-500 text-white"
                  >
                    직업 확인
                  </button>
                )}
                {roleStep === "REVEAL" && (
                  <>
                    <p className="text-white/40 text-sm">직업 확인이 되셨으면 확인을 눌러주세요</p>
                    <button
                      onClick={() => { playSfx("click"); setRoleStep("PASS"); }}
                      className="w-full py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 bg-blue-500 text-white"
                    >
                      직업 확인 완료
                    </button>
                  </>
                )}
                {roleStep === "PASS" && (
                  <>
                    <p className="text-white/40 text-sm">넘겨 받았으면 확인을 눌러주세요</p>
                    <button
                      onClick={() => { playSfx("click"); nextReveal(); }}
                      className="w-full py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 bg-blue-500 text-white"
                    >
                      확인
                    </button>
                  </>
                )}
              </div>
            </div>
            );
          })()}

          {/* 타이머 */}
          {phase === "TIMER" && (() => {
            const cols = players.length <= 4 ? 2 : 3;
            return (
            <div className="fixed inset-0 z-30 bg-white flex flex-col">
              <div className="flex-1 overflow-y-auto pb-36 px-5 pt-4">
                <p className="text-sm text-gray-900 font-semibold text-center mb-4">☀️ {discussionRound}번째 낮 토론 ☀️</p>

                {/* 타이머 카드 */}
                <div className="bg-gray-800 rounded-2xl px-6 py-5 text-center mb-4">
                  <p className="text-xs text-white mb-1">토론 종료까지</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className={`text-5xl font-bold tabular-nums tracking-tight transition-colors ${dangerPulse ? "text-red-400" : "text-white"}`}>
                      {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:{String(secondsLeft % 60).padStart(2, "0")}
                    </span>
                    <span className="text-xl font-semibold text-white ml-1">남음</span>
                  </div>
                  {timerEnded && (
                    <p className="text-xs text-red-400 mt-2">토론 시간이 종료됐습니다</p>
                  )}
                </div>

                {/* 플레이어 투표 섹션 */}
                <div className="bg-gray-100 rounded-2xl px-4 pt-4 pb-5">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-px bg-gray-300" />
                    <p className="text-xs text-gray-900 shrink-0">플레이어 투표</p>
                    <div className="flex-1 h-px bg-gray-300" />
                  </div>
                  <p className="text-xs text-gray-900 leading-relaxed mb-8">
                    사형시킬 플레이어를 정해 투표해주세요. 과반이 넘으면 최후의 변론을 진행하고, 과반을 넘지 못하면 패스를 클릭해주세요.
                  </p>
                  <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                    {players.map((p) => {
                      const isDead = alive[p] === false;
                      const isSelected = executionTarget === p;
                      return (
                        <button
                          key={p}
                          disabled={isDead}
                          onClick={() => {
                            if (isDead) return;
                            playSfx("click");
                            setExecutionTarget((prev) => prev === p ? "" : p);
                          }}
                          className={`
                            relative flex flex-col items-center justify-center
                            rounded-2xl transition-all active:scale-95 aspect-square
                            ${isDead
                              ? "bg-gray-200 cursor-not-allowed"
                              : isSelected
                              ? "bg-blue-500"
                              : "bg-gray-300 hover:bg-gray-400"
                            }
                          `}
                        >
                          {isDead ? (
                            <>
                              <span className="text-gray-400 text-xl mb-0.5">✕</span>
                              <span className="text-gray-400 text-xs font-medium leading-tight text-center px-1">{p}</span>
                            </>
                          ) : (
                            <span className={`text-sm font-semibold leading-tight text-center px-1 ${isSelected ? "text-white" : "text-gray-900"}`}>
                              {p}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            );
          })()}

          {/* 투표 (VOTE phase 제거 - TIMER에 통합) */}
          {phase === "VOTE" && (
            <div className={"mt-6 " + glowCard + " p-4"}>
              <h2 className="font-bold text-lg">투표</h2>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="mt-3 w-full px-3 py-3 rounded-xl bg-white text-black"
                disabled={gameOver}
              >
                <option value="">참가자 선택</option>
                {alivePlayers.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <button
                onClick={addVote}
                disabled={gameOver}
                className={`mt-3 w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 ${gameOver ? "opacity-40 pointer-events-none" : ""}`}
              >
                + 표 추가
              </button>
              <div className="mt-4 space-y-2">
                {Object.keys(votes).map((p) => (
                  <div key={p} className="flex justify-between rounded-xl px-3 py-2 bg-white/5 border border-white/10">
                    <span>{p}</span>
                    <span className="font-extrabold">{votes[p] ?? 0}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => { playSfx("click"); setPhase("RESULT"); speak("결과 보기로 이동합니다."); }}
                className="mt-4 w-full py-3 rounded-xl font-extrabold bg-gradient-to-r from-red-600 to-fuchsia-600 hover:opacity-90"
              >
                결과 보기
              </button>
            </div>
          )}

          {/* 종료 확인 모달 */}
          {showExitModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
              <div className="w-full max-w-sm bg-[#1c1c1e] rounded-3xl overflow-hidden">
                <div className="px-6 pt-8 pb-6 text-center">
                  <p className="text-white text-lg font-bold mb-2">게임을 종료할까요?</p>
                  <p className="text-white/50 text-sm">종료하면 현재 진행 중인 게임이 사라집니다.</p>
                </div>
                <div className="border-t border-white/10 flex">
                  <button
                    onClick={() => {
                      setShowExitModal(false);
                      if (wasRunningRef.current) setRunning(true);
                    }}
                    className="flex-1 py-4 text-blue-400 font-semibold text-base border-r border-white/10 active:bg-white/10 transition-all"
                  >
                    닫기
                  </button>
                  <button
                    onClick={() => {
                      setShowExitModal(false);
                      resetAll();
                    }}
                    className="flex-1 py-4 text-red-400 font-semibold text-base active:bg-white/10 transition-all"
                  >
                    종료하기
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 결과 */}
          {phase === "RESULT" && (
            <div className="fixed inset-0 z-40 bg-black flex flex-col">
              <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8 overflow-y-auto pb-36 pt-16">
                {/* 승리 팀 */}
                <div className="text-center space-y-3">
                  {winner === "CITIZEN" ? (
                    <>
                      <p className="text-7xl animate-bounce">🎉</p>
                      <p className="text-white/50 text-base">게임 결과</p>
                      <p className="text-4xl font-extrabold text-white">시민 승리!</p>
                      <p className="text-white/60 text-sm">마피아를 모두 처치했습니다</p>
                    </>
                  ) : (
                    <>
                      <p className="text-7xl">🔫</p>
                      <p className="text-white/50 text-base">게임 결과</p>
                      <p className="text-4xl font-extrabold text-white">마피아 승리!</p>
                      <p className="text-white/60 text-sm">마피아가 세상을 지배했습니다</p>
                    </>
                  )}
                </div>

                {/* 세부 결과 확인 토글 */}
                <div className="w-full max-w-md">
                  <button
                    onClick={() => setShowResultDetails((v) => !v)}
                    className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-white/10 border border-white/10 transition active:scale-95"
                  >
                    <span className="text-white font-semibold text-sm">세부 결과 확인</span>
                    <span className="text-white/50 text-sm">{showResultDetails ? "▲" : "▼"}</span>
                  </button>

                  {showResultDetails && (
                    <div className="mt-2 rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/10 overflow-hidden">
                      {players.map((p) => {
                        const role = assigned[p] ?? "Citizen";
                        const roleLabel: Record<string, string> = {
                          Mafia: "마피아", Police: "경찰", Doctor: "의사", Citizen: "시민",
                        };
                        const roleEmoji: Record<string, string> = {
                          Mafia: "🔫", Police: "🔍", Doctor: "💉", Citizen: "🧑",
                        };
                        const dead = alive[p] === false;
                        return (
                          <div key={p} className="flex items-center justify-between px-5 py-3">
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{roleEmoji[role]}</span>
                              <div>
                                <p className="text-white text-sm font-semibold">{p}</p>
                                <p className="text-white/50 text-xs">{roleLabel[role]}</p>
                              </div>
                            </div>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${dead ? "bg-red-500/20 text-red-300" : "bg-white/10 text-white/60"}`}>
                              {dead ? "사망" : "생존"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* 하단 CTA */}
              <div className="fixed bottom-0 left-0 right-0 px-6 pb-12 pt-4 bg-gradient-to-t from-black via-black/90 to-transparent">
                <button
                  onClick={() => { setShowResultDetails(false); resetAll(); }}
                  className="w-full py-4 rounded-2xl font-bold text-lg bg-blue-500 text-white transition-all active:scale-95"
                >
                  새로운 게임 시작하기
                </button>
              </div>
            </div>
          )}
          {/* ====== 밤 액션: 마피아 (시작 버튼 없이 바로 선택) ====== */}
          {/* ====== 밤 행동: 마피아 ====== */}
          {phase === "NIGHT_MAFIA" && (
            <div className="mt-6 pb-36 space-y-14">
              <div className="space-y-1">
                <p className="text-xs text-white text-center tracking-widest">🌙 {nightRound}번째 밤 🌙</p>
                <p className="text-2xl font-bold text-white text-center">마피아는 누구를 제거할지<br />선택해주세요</p>
              </div>

              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${players.length <= 4 ? 2 : 3}, 1fr)` }}>
                {players.map((p) => {
                  const dead = alive[p] === false;
                  const isSelected = nightActionTarget === p;
                  return (
                    <button
                      key={p}
                      disabled={dead}
                      onClick={() => { playSfx("click"); setNightActionTarget((prev) => prev === p ? "" : p); }}
                      className={`
                        relative flex flex-col items-center justify-center
                        rounded-2xl transition-all active:scale-95 aspect-square
                        ${dead
                          ? "bg-white/10 cursor-not-allowed"
                          : isSelected
                          ? "bg-blue-500"
                          : "bg-white hover:bg-gray-100"
                        }
                      `}
                    >
                      {dead ? (
                        <>
                          <span className="text-white/30 text-xl mb-0.5">✕</span>
                          <span className="text-white/30 text-xs font-medium leading-tight text-center px-1">{p}</span>
                        </>
                      ) : (
                        <span className={`text-sm font-semibold leading-tight text-center px-1 ${isSelected ? "text-white" : "text-gray-900"}`}>
                          {p}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ====== 밤 행동: 경찰 ====== */}
          {phase === "NIGHT_POLICE" && (
            <div className="mt-6 pb-36 space-y-14">
              <div className="space-y-1">
                <p className="text-xs text-white text-center tracking-widest">🌙 {nightRound}번째 밤 🌙</p>
                <p className="text-2xl font-bold text-white text-center">경찰은 정체를 확인하고 싶은<br />플레이어를 선택해주세요</p>
              </div>

              {!policeRevealShowing && (
                <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${players.length <= 4 ? 2 : 3}, 1fr)` }}>
                  {players.map((p) => {
                    const dead = alive[p] === false;
                    const isSelected = nightActionTarget === p;
                    return (
                      <button
                        key={p}
                        disabled={dead}
                        onClick={() => selectPoliceTarget(p)}
                        className={`
                          relative flex flex-col items-center justify-center
                          rounded-2xl transition-all active:scale-95 aspect-square
                          ${dead
                            ? "bg-white/10 cursor-not-allowed"
                            : isSelected
                            ? "bg-blue-500"
                            : "bg-white hover:bg-gray-100"
                          }
                        `}
                      >
                        {dead ? (
                          <>
                            <span className="text-white/30 text-xl mb-0.5">✕</span>
                            <span className="text-white/30 text-xs font-medium leading-tight text-center px-1">{p}</span>
                          </>
                        ) : (
                          <span className={`text-sm font-semibold leading-tight text-center px-1 ${isSelected ? "text-white" : "text-gray-900"}`}>{p}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {policeRevealShowing && nightActionTarget && (
                <div className="flex flex-col items-center gap-6">
                  <div className="w-full rounded-2xl bg-white/10 border border-white/20 px-6 py-8 flex flex-col items-center gap-3">
                    <p className="text-white text-xl font-semibold text-center">
                      {nightActionTarget}은{" "}
                      <span className="text-blue-400">
                        {assigned[nightActionTarget] === "Mafia" ? "마피아" : roleKorean[assigned[nightActionTarget] as Role]}
                      </span>
                      입니다.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ====== 밤 행동: 의사 ====== */}
          {phase === "NIGHT_DOCTOR" && (
            <div className="mt-6 pb-36 space-y-14">
              <div className="space-y-1">
                <p className="text-xs text-white text-center tracking-widest">🌙 {nightRound}번째 밤 🌙</p>
                <p className="text-2xl font-bold text-white text-center">의사는 누구를 살릴까요?</p>
              </div>

              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${players.length <= 4 ? 2 : 3}, 1fr)` }}>
                {players.map((p) => {
                  const dead = alive[p] === false;
                  const selfUsed = p === doctorPlayer && doctorSelfHealUsed;
                  const disabled = dead || selfUsed;
                  const isSelected = nightActionTarget === p;
                  return (
                    <button
                      key={p}
                      disabled={disabled}
                      onClick={() => { playSfx("click"); setNightActionTarget((prev) => prev === p ? "" : p); }}
                      className={`
                        relative flex flex-col items-center justify-center
                        rounded-2xl transition-all active:scale-95 aspect-square
                        ${disabled
                          ? "bg-white/10 cursor-not-allowed"
                          : isSelected
                          ? "bg-blue-500"
                          : "bg-white hover:bg-gray-100"
                        }
                      `}
                    >
                      {disabled ? (
                        <>
                          <span className="text-white/30 text-xl mb-0.5">✕</span>
                          <span className="text-white/30 text-xs font-medium leading-tight text-center px-1">{p}</span>
                        </>
                      ) : (
                        <span className={`text-sm font-semibold leading-tight text-center px-1 ${isSelected ? "text-white" : "text-gray-900"}`}>{p}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* NIGHT_SUMMARY는 더 이상 사용 안 함 (자동 처리) */}
          {phase === "NIGHT_SUMMARY" && (
            <div className="mt-6 flex items-center justify-center">
              <p className="text-white/40 text-sm">결과를 집계하고 있어요...</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}