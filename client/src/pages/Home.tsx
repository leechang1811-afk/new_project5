import { useMemo, useState, useEffect, useRef } from "react";

type Role = "Mafia" | "Citizen" | "Police" | "Doctor";
type Phase =
  | "LOBBY"
  | "ROLES"
  | "TIMER"
  | "VOTE"
  | "RESULT"
  // ✅ NIGHT_HANDOFF 제거
  | "NIGHT_MAFIA"
  | "NIGHT_DOCTOR"
  | "NIGHT_POLICE"
  | "NIGHT_SUMMARY";

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * ✅ 인원별 추천 역할
 * - 2~4명(5명 미만): 마피아 1명 + 시민 최소 1명(디폴트 보장). 경찰/의사 없음.
 * - 5명: 마피아 1명 + 시민 4명 (기본). (원하면 여기서 경찰/의사 추가 가능)
 * - 6~7명: 마피아 1, 경찰 1, 의사 1, 나머지 시민
 * - 8명 이상: 마피아 2, 경찰 1, 의사 1, 나머지 시민
 */
function recommendedRoles(n: number) {
  const safeN = Math.max(2, n);

  // 2~5명: 단순 구성 (요청사항: 5명 미만 지원 + 마피아1/시민1 디폴트)
  if (safeN < 6) {
    const mafia = 1;
    const police = 0;
    const doctor = 0;
    const citizen = Math.max(1, safeN - mafia); // ✅ 시민 1명 이상 보장

    const roles: Role[] = [
      ...Array(mafia).fill("Mafia"),
      ...Array(police).fill("Police"),
      ...Array(doctor).fill("Doctor"),
      ...Array(citizen).fill("Citizen"),
    ];

    return { mafia, police, doctor, citizen, roles };
  }

  // 6명 이상: 기존 추천 로직
  let mafia = 1;
  if (safeN >= 8) mafia = 2;

  const police = safeN >= 6 ? 1 : 0;
  const doctor = safeN >= 6 ? 1 : 0;
  const citizen = Math.max(0, safeN - mafia - police - doctor);

  const roles: Role[] = [
    ...Array(mafia).fill("Mafia"),
    ...Array(police).fill("Police"),
    ...Array(doctor).fill("Doctor"),
    ...Array(citizen).fill("Citizen"),
  ];

  return { mafia, police, doctor, citizen, roles };
}

const phaseLabel: Record<Phase, string> = {
  LOBBY: "대기실",
  ROLES: "역할 공개",
  TIMER: "타이머",
  VOTE: "투표",
  RESULT: "결과",
  // ✅ NIGHT_HANDOFF 제거
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
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [running, setRunning] = useState(false);
  const [dangerPulse, setDangerPulse] = useState(false);

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

  // ✅ 밤 액션용(마피아/의사/경찰)
  const [mafiaTarget, setMafiaTarget] = useState<string>("");
  const [doctorTarget, setDoctorTarget] = useState<string>("");
  const [policeTarget, setPoliceTarget] = useState<string>("");
  const [policeResult, setPoliceResult] = useState<string>("");

  // ✅ 밤 결과(한 번에 적용해서 “동시에 일어난 것처럼”)
  const [pendingKill, setPendingKill] = useState<string | null>(null);
  const [pendingHeal, setPendingHeal] = useState<string | null>(null);

  // ✅ “손가락 얹기” 플로우(역할별)
  const [nightTouchStep, setNightTouchStep] = useState<"WAIT_ALL" | "SELECT">(
    "WAIT_ALL",
  );

  // ✅ 게임 종료 상태(승리조건: 마피아 전멸 or 마피아만 생존)
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<"MAFIA" | "CITIZEN" | null>(null);

  // ✅ 음성 안내(TTS)
  const [ttsOn, setTtsOn] = useState(true);
  const [ttsReady, setTtsReady] = useState(false); // voices 준비 상태
  const [ttsUnlocked, setTtsUnlocked] = useState(false); // 사용자 제스처로 언락됐는지
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

      const u = new SpeechSynthesisUtterance("음성 안내를 시작합니다.");
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
      setTtsUnlocked(true);
      return true;
    } catch {
      setTtsError("TTS 언락에 실패했어요.");
      return false;
    }
  };

  // ✅ 안정형 speak
  const speak = (text: string) => {
    if (!ttsOn) return;
    if (typeof window === "undefined") return;

    const synth = window.speechSynthesis;
    if (!synth) return;

    if (!ttsUnlocked) {
      setTtsError("🔊 음성 시작 버튼을 먼저 눌러주세요 (브라우저 정책).");
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

      u.onend = () => setTtsError("");
      u.onerror = () =>
        setTtsError(
          "TTS 재생 실패(브라우저/iframe 제한 또는 음소거). 새 탭에서 실행해보세요.",
        );

      window.setTimeout(() => synth.speak(u), 80);
    } catch {
      setTtsError("TTS 예외 발생");
    }
  };

  // =========================
  // ✅ BGM/SFX — 통합(soundOn)
  // =========================
  const [soundOn, setSoundOn] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const sfxRef = useRef<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;

    const bgm = new Audio("/sfx/bgm_lobby.mp3");
    bgm.loop = true;
    bgm.volume = 0.28;
    bgmRef.current = bgm;

    const mk = (key: string, src: string, vol = 0.6) => {
      const a = new Audio(src);
      a.preload = "auto";
      a.volume = vol;
      sfxRef.current[key] = a;
    };

    mk("click", "/sfx/click.mp3", 0.5);
    mk("reveal", "/sfx/reveal.mp3", 0.65);
    mk("tick", "/sfx/tick.mp3", 0.45);
    mk("dawn", "/sfx/dawn.mp3", 0.7);
    mk("gavel", "/sfx/gavel.mp3", 0.75);

    return () => {
      bgm.pause();
      bgmRef.current = null;
      sfxRef.current = {};
    };
  }, []);

  const unlockAudio = async () => {
    try {
      const bgm = bgmRef.current;
      if (!bgm) return false;

      bgm.muted = true;
      await bgm.play();
      bgm.pause();
      bgm.currentTime = 0;
      bgm.muted = false;

      setAudioUnlocked(true);
      return true;
    } catch {
      setAudioUnlocked(false);
      return false;
    }
  };

  const playSfx = (key: "click" | "reveal" | "tick" | "dawn" | "gavel") => {
    if (!soundOn) return;
    if (!audioUnlocked) return;

    const a = sfxRef.current[key];
    if (!a) return;

    try {
      a.currentTime = 0;
      a.play();
    } catch {}
  };

  const setBgmKind = async (kind: "LOBBY" | "NIGHT" | "OFF") => {
    const bgm = bgmRef.current;
    if (!bgm) return;

    if (!soundOn || !audioUnlocked || kind === "OFF") {
      bgm.pause();
      return;
    }

    const nextSrc =
      kind === "LOBBY" ? "/sfx/bgm_lobby.mp3" : "/sfx/bgm_night.mp3";

    if (!bgm.src.includes(nextSrc)) {
      bgm.pause();
      bgm.src = nextSrc;
      bgm.load();
    }

    try {
      await bgm.play();
    } catch {}
  };

  useEffect(() => {
    if (!audioUnlocked) return;

    const isNight =
      phase === "NIGHT_MAFIA" ||
      phase === "NIGHT_DOCTOR" ||
      phase === "NIGHT_POLICE" ||
      phase === "NIGHT_SUMMARY";

    void setBgmKind(isNight ? "NIGHT" : "LOBBY");
  }, [phase, audioUnlocked, soundOn]);

  // ✅ role briefing 자동 반영
  const rolePlan = useMemo(() => recommendedRoles(playerCount), [playerCount]);

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

  // ✅ 승리 조건 체크(마피아 전멸 or 마피아만 생존)
  const checkWinAndMaybeEnd = (aliveState: Record<string, boolean>) => {
    if (gameOver) return true;
    if (Object.keys(assigned).length === 0) return false;

    const mafiaAliveCount = mafiaPlayers.filter((p) => aliveState[p] !== false)
      .length;
    const nonMafiaAliveCount = players.filter(
      (p) => aliveState[p] !== false && assigned[p] !== "Mafia",
    ).length;

    if (mafiaAliveCount === 0) {
      setGameOver(true);
      setWinner("CITIZEN");
      setPhase("RESULT");
      setLastEvent("🎉 시민 승리! 모든 마피아가 제거되었습니다. 게임 종료.");
      speak("마피아가 모두 제거되었습니다. 시민의 승리입니다. 축하합니다!");
      return true;
    }

    if (nonMafiaAliveCount === 0 && mafiaAliveCount > 0) {
      setGameOver(true);
      setWinner("MAFIA");
      setPhase("RESULT");
      setLastEvent("💀 마피아 승리! 마피아만 살아남았습니다. 게임 종료.");
      speak("시민들이 모두 제거되었습니다. 마피아의 승리입니다. 축하합니다!");
      return true;
    }

    return false;
  };

  // ✅ 다음 밤 턴(역할 사망 시 자동 스킵)
  const nextNightTurn = (
    from: "MAFIA" | "DOCTOR" | "POLICE",
  ): "MAFIA" | "DOCTOR" | "POLICE" | "SUMMARY" => {
    const order: Array<"MAFIA" | "DOCTOR" | "POLICE"> = [
      "MAFIA",
      "DOCTOR",
      "POLICE",
    ];
    const idx = order.indexOf(from);

    const isAvailable = (t: "MAFIA" | "DOCTOR" | "POLICE") => {
      if (t === "MAFIA") return mafiaAlive;
      if (t === "DOCTOR") return doctorAlive;
      return policeAlive;
    };

    for (let i = idx + 1; i < order.length; i++) {
      if (isAvailable(order[i])) return order[i];
    }
    return "SUMMARY";
  };

  // ✅ handoff 없이 바로 역할 화면으로 이동
  const goToNightTurn = (turn: "MAFIA" | "DOCTOR" | "POLICE" | "SUMMARY") => {
    setNightTouchStep("WAIT_ALL");

    if (turn === "SUMMARY") {
      setPhase("NIGHT_SUMMARY");
      return;
    }

    if (turn === "MAFIA") {
      setPhase("NIGHT_MAFIA");
      speak("마피아는 조용히 고개를 들어 제거할 플레이어를 클릭하세요.");
      return;
    }

    if (turn === "DOCTOR") {
      setPhase("NIGHT_DOCTOR");
      speak("의사는 조용히 고개를 들어 치료할 플레이어를 클릭하세요.");
      return;
    }

    setPhase("NIGHT_POLICE");
    speak("경찰은 조용히 고개를 들어 조사할 대상을 클릭하세요.");
  };

  const startGame = () => {
    playSfx("click");
    if (playerCount < 2) return;

    setGameOver(false);
    setWinner(null);

    const shuffledRoles = shuffle(rolePlan.roles);
    const map: Record<string, Role> = {};
    players.forEach((p, idx) => {
      map[p] = shuffledRoles[idx];
    });
    setAssigned(map);

    const aliveInit: Record<string, boolean> = {};
    players.forEach((p) => (aliveInit[p] = true));
    setAlive(aliveInit);

    setVotes({});
    setSelected("");
    setLastEvent("");
    setLastExecuted(null);

    setPoliceResult("");
    setMafiaTarget("");
    setDoctorTarget("");
    setPoliceTarget("");

    setPendingKill(null);
    setPendingHeal(null);

    setDoctorSelfHealUsed(false);

    setRevealIndex(0);
    setIsRevealed(false);
    setConfirmHandOff(false);
    setFlip(false);

    setMode("Day");
    setSecondsLeft(300);
    setRunning(false);

    setPhase("ROLES");
    speak("게임을 시작합니다. 지금부터 차례대로 역할을 확인하세요.");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, running]);

  const currentPlayer = players[revealIndex];

  const nextReveal = () => {
    setIsRevealed(false);
    if (revealIndex + 1 >= players.length) {
      setPhase("TIMER");
      setMode("Day");
      setSecondsLeft(300);
      setRunning(false);
      speak(
        "낮이 시작됩니다. 토론을 진행하세요. 시간이 끝나면 투표로 이동합니다.",
      );
      return;
    }
    setRevealIndex(revealIndex + 1);
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
    speak(
      "투표 단계입니다. 의심되는 사람을 선택하고, 플러스 버튼으로 표를 추가하세요.",
    );
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

  // ====== ✅ 사회자 없는 “밤 액션 플로우” ======
  // ✅ 밤 시작 멘트: 딱 1줄만 (요청사항)
  const beginNight = () => {
    playSfx("click");
    if (gameOver) return;

    setPendingKill(null);
    setPendingHeal(null);
    setMafiaTarget("");
    setDoctorTarget("");
    setPoliceTarget("");
    setPoliceResult("");
    setNightTouchStep("WAIT_ALL");

    speak("모두 고개를 숙이고 눈을 감고 한 손가락만 휴대폰에 얹어주세요.");

    if (mafiaAlive) return goToNightTurn("MAFIA");
    if (doctorAlive) return goToNightTurn("DOCTOR");
    if (policeAlive) return goToNightTurn("POLICE");
    return goToNightTurn("SUMMARY");
  };

  // ✅ “손가락 얹기” 공통 UI용: 시작 누른 뒤 대상 선택 화면으로
  const startTouchSelect = () => {
    playSfx("click");
    setNightTouchStep("SELECT");
    // ✅ 추가 멘트 없음(요청)
  };

  const mafiaTapTarget = (p: string) => {
    playSfx("click");
    if (gameOver) return;
    if (alive[p] === false) return;

    setPendingKill(p);
    setLastEvent("🌙 마피아가 대상을 선택했습니다.");
    // ✅ "휴대폰 내려놓고 넘기세요" 멘트 제거 (요청)

    const next = nextNightTurn("MAFIA");
    setMafiaTarget("");
    setNightTouchStep("WAIT_ALL");

    if (next === "SUMMARY") return goToNightTurn("SUMMARY");
    return goToNightTurn(next);
  };

  const doctorTapTarget = (p: string) => {
    playSfx("click");
    if (gameOver) return;

    if (p === doctorPlayer) {
      if (doctorSelfHealUsed) {
        setLastEvent("⚠️ 의사 본인 치료는 게임당 1회만 가능합니다.");
        speak("본인 치료는 게임당 한 번만 가능합니다.");
        return;
      }
      setDoctorSelfHealUsed(true);
    }

    setPendingHeal(p);
    setLastEvent("💉 의사가 대상을 선택했습니다.");
    // ✅ "휴대폰 내려놓고 넘기세요" 멘트 제거 (요청)

    const next = nextNightTurn("DOCTOR");
    setDoctorTarget("");
    setNightTouchStep("WAIT_ALL");

    if (next === "SUMMARY") return goToNightTurn("SUMMARY");
    return goToNightTurn(next);
  };

  // ✅ 경찰: 조사 결과 멘트는 “경찰은 조사결과를 확인해주세요”만
  const policeTapTarget = (p: string) => {
    playSfx("click");
    if (gameOver) return;

    const isMafia = assigned[p] === "Mafia";
    const msg = isMafia
      ? `🚨 조사 결과: ${p} = 마피아`
      : `🔎 조사 결과: ${p} = 마피아 아님`;

    setPoliceResult(msg);
    setLastEvent(msg);

    // ✅ 요청 멘트(고정)
    speak("경찰은 조사결과를 확인해주세요.");

    setPoliceTarget("");
    setNightTouchStep("WAIT_ALL");
  };

  const applyNightOutcome = () => {
    playSfx("dawn");
    if (gameOver) return;

    const kill = pendingKill;
    const heal = pendingHeal;

    const killedRole = kill ? roleOf(kill) : "";

    let msg = "🌅 밤이 지나갔습니다. ";
    if (!kill && !heal) msg += "아무 일도 일어나지 않았습니다.";
    else if (kill && heal && kill === heal)
      msg += `${kill} 님이 공격받았지만 치료로 살아남았습니다.`;
    else if (kill && heal)
      msg += `${kill} 님이 제거되었습니다. (역할: ${killedRole}) 그리고 ${heal} 님이 치료되었습니다.`;
    else if (kill) msg += `${kill} 님이 제거되었습니다. (역할: ${killedRole})`;
    else if (heal) msg += `${heal} 님이 치료되었습니다.`;

    setLastEvent(msg);
    speak(msg);

    setAlive((prev) => {
      const next = { ...prev };
      if (kill) next[kill] = false;
      if (heal) next[heal] = true;

      const ended = checkWinAndMaybeEnd(next);
      if (!ended) {
        setMode("Day");
        setSecondsLeft(300);
        setRunning(false);
        setPhase("TIMER");
        speak("낮이 시작됩니다. 토론을 진행하세요.");
      }

      return next;
    });
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

    setMafiaTarget("");
    setDoctorTarget("");
    setPoliceTarget("");
    setPoliceResult("");

    setPendingKill(null);
    setPendingHeal(null);

    setLocked(false);

    setGameOver(false);
    setWinner(null);

    setNightTouchStep("WAIT_ALL");

    window.speechSynthesis?.cancel();
    setTtsError("");
    setTtsUnlocked(false);

    bgmRef.current?.pause();
  };

  const glowCard =
    "relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 shadow-[0_0_40px_rgba(255,0,60,0.12)] backdrop-blur";

  const bigChoiceBtn =
    "w-full py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 active:bg-white/15 text-left px-4";

  return (
    <div className="min-h-[100svh] text-white bg-[#07070a] relative overflow-hidden">
      {/* 배경 */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,0,60,0.18),transparent_60%)] blur-2xl" />
        <div className="absolute -bottom-40 right-[-120px] w-[800px] h-[800px] rounded-full bg-[radial-gradient(circle_at_center,rgba(0,255,200,0.10),transparent_55%)] blur-3xl" />
        <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(to_right,rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[size:28px_28px]" />
        <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle,rgba(255,255,255,0.8)_1px,transparent_1px)] bg-[size:14px_14px]" />
      </div>

      <div className="max-w-md mx-auto px-5 relative min-h-[100svh] flex flex-col">
        {/* ✅ 헤더 고정 */}
        <div className="sticky top-0 z-20 pt-4 pb-3 bg-[#07070a]/85 backdrop-blur border-b border-white/10">
          {/* ✅ 0) 맨 위: 컨트롤 버튼 줄 */}
          <div className="flex flex-wrap justify-end items-center gap-2">
            <button
              onClick={resetAll}
              className="text-xs px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
              title="초기화"
            >
              초기화
            </button>

            <button
              onClick={async () => {
                setTtsOn(true);
                setSoundOn(true);
                unlockTTS();
                await unlockAudio();
                await setBgmKind("LOBBY");
              }}
              className="text-xs px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
              title="첫 클릭으로 TTS/BGM 언락"
            >
              🔊 음성 시작
            </button>

            <button
              onClick={() => {
                playSfx("click");
                setTtsOn((v) => !v);
                window.speechSynthesis?.cancel();
                setTtsError("");
              }}
              className="text-xs px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
            >
              {ttsOn ? "🔊 음성 ON" : "🔇 음성 OFF"}
            </button>

            <button
              onClick={() => {
                playSfx("click");
                setSoundOn((v) => {
                  const next = !v;
                  if (!next) void setBgmKind("OFF");
                  if (next && audioUnlocked) {
                    const isNight =
                      phase === "NIGHT_MAFIA" ||
                      phase === "NIGHT_DOCTOR" ||
                      phase === "NIGHT_POLICE" ||
                      phase === "NIGHT_SUMMARY";
                    void setBgmKind(isNight ? "NIGHT" : "LOBBY");
                  }
                  return next;
                });
              }}
              className="text-xs px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
            >
              {soundOn ? "🔊 사운드 ON" : "🔇 사운드 OFF"}
            </button>
          </div>

          {/* ✅ TTS 에러 메시지 */}
          {ttsError && (
            <div className="mt-2 text-[11px] text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
              {ttsError}
            </div>
          )}

          {/* ✅ 배지 */}
          <div className="mt-3 inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border border-white/10 bg-white/5">
            <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(255,0,60,0.8)]" />
            스릴러 모드
            <span className="text-white/40">•</span>
            <span className="text-white/70">{phaseLabel[phase]}</span>
          </div>

          <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
            오프라인{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-fuchsia-500 to-cyan-400">
              마피아 도우미
            </span>
          </h1>
          <p className="text-sm text-white/60 mt-1">
            인원 선택 → 역할 공개 → 낮 토론 → 투표 → 밤 행동(손가락 방식)
          </p>

          {/* 단계 표시 */}
          <div className="mt-4 flex flex-wrap gap-2">
            {(
              [
                "LOBBY",
                "ROLES",
                "TIMER",
                "VOTE",
                "RESULT",
                // ✅ NIGHT_HANDOFF 제거
                "NIGHT_MAFIA",
                "NIGHT_DOCTOR",
                "NIGHT_POLICE",
                "NIGHT_SUMMARY",
              ] as Phase[]
            ).map((p) => (
              <span
                key={p}
                className={`text-[11px] px-3 py-1.5 rounded-full border transition ${
                  phase === p
                    ? "border-red-500/60 bg-red-500/10 text-red-300 shadow-[0_0_18px_rgba(255,0,60,0.25)]"
                    : "border-white/10 bg-white/5 text-white/50"
                }`}
              >
                {phaseLabel[p]}
              </span>
            ))}
          </div>
        </div>

        {/* ✅ 본문 */}
        <div className="flex-1 overflow-y-auto pb-8">
          {/* ✅ 대기실 */}
          {phase === "LOBBY" && (
            <div className="mt-6 space-y-4">
              {/* ... (LOBBY 코드는 그대로) ... */}
              {/* ✅ 사용자 제공 코드가 길어서, LOBBY~RESULT까지는 그대로 유지해도 됨 */}
            </div>
          )}

          {/* 역할 공개 */}
          {phase === "ROLES" && (
            <div className={"mt-6 " + glowCard + " p-4"}>
              {/* ... 기존 ROLES 그대로 ... */}
            </div>
          )}

          {/* 타이머 */}
          {phase === "TIMER" && (
            <div className={"mt-6 " + glowCard + " p-4"}>
              {/* ... 기존 TIMER 그대로 ... */}
            </div>
          )}

          {/* 투표 */}
          {phase === "VOTE" && (
            <div className={"mt-6 " + glowCard + " p-4"}>
              {/* ... 기존 VOTE 그대로 ... */}
            </div>
          )}

          {/* 결과 */}
          {phase === "RESULT" && (
            <div className={"mt-6 " + glowCard + " p-4"}>
              {/* ... 기존 RESULT 그대로 ... */}
            </div>
          )}

          {/* ✅ NIGHT_HANDOFF UI 완전 삭제 */}

          {/* ====== 밤 액션: 마피아 ====== */}
          {phase === "NIGHT_MAFIA" && (
            <div className={"mt-6 " + glowCard + " p-4"}>
              <h2 className="font-bold text-lg">🌙 마피아</h2>

              {nightTouchStep === "WAIT_ALL" ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4">
                  <button
                    onClick={startTouchSelect}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-fuchsia-600 hover:opacity-90"
                  >
                    ▶ 시작
                  </button>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {alivePlayers.map((p) => (
                    <button
                      key={p}
                      onClick={() => mafiaTapTarget(p)}
                      className={bigChoiceBtn}
                    >
                      <div className="text-sm text-white/60">제거 대상</div>
                      <div className="text-lg font-extrabold">{p}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ====== 밤 액션: 의사 ====== */}
          {phase === "NIGHT_DOCTOR" && (
            <div className={"mt-6 " + glowCard + " p-4"}>
              <h2 className="font-bold text-lg">💉 의사</h2>

              {nightTouchStep === "WAIT_ALL" ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4">
                  <button
                    onClick={startTouchSelect}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-90"
                  >
                    ▶ 시작
                  </button>
                  <div className="mt-3 text-xs text-white/50">
                    * 의사 본인 치료는 게임당 1회 제한
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {players.map((p) => (
                    <button
                      key={p}
                      onClick={() => doctorTapTarget(p)}
                      className={bigChoiceBtn}
                    >
                      <div className="text-sm text-white/60">
                        치료 대상 {alive[p] === false ? "(제거됨)" : ""}
                      </div>
                      <div className="text-lg font-extrabold">
                        {p}
                        {p === doctorPlayer ? " (본인)" : ""}
                      </div>
                      {p === doctorPlayer && (
                        <div className="text-xs text-white/50 mt-1">
                          {doctorSelfHealUsed
                            ? "본인 치료 사용됨"
                            : "본인 치료 가능(1회)"}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ====== 밤 액션: 경찰 ====== */}
          {phase === "NIGHT_POLICE" && (
            <div className={"mt-6 " + glowCard + " p-4"}>
              <h2 className="font-bold text-lg">🔎 경찰</h2>

              {policeResult ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4">
                  <div className="text-sm text-white/80">{policeResult}</div>
                  <button
                    onClick={() => {
                      playSfx("click");
                      setPhase("NIGHT_SUMMARY");
                    }}
                    className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-600 hover:opacity-90"
                  >
                    확인 완료
                  </button>
                </div>
              ) : nightTouchStep === "WAIT_ALL" ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4">
                  <button
                    onClick={startTouchSelect}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-600 hover:opacity-90"
                  >
                    ▶ 시작
                  </button>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {alivePlayers.map((p) => (
                    <button
                      key={p}
                      onClick={() => policeTapTarget(p)}
                      className={bigChoiceBtn}
                    >
                      <div className="text-sm text-white/60">조사 대상</div>
                      <div className="text-lg font-extrabold">{p}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ====== 밤 종료/결과 적용 ====== */}
          {phase === "NIGHT_SUMMARY" && (
            <div className={"mt-6 " + glowCard + " p-4"}>
              {/* ... 기존 NIGHT_SUMMARY 그대로 ... */}
            </div>
          )}

          <div className="mt-8 text-center text-xs text-white/30">
            오프라인 진행용 • 서버 없이 사용 가능
          </div>
        </div>
      </div>
    </div>
  );
}