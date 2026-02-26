import { useMemo, useState, useEffect, useRef } from "react";

type Role = "Mafia" | "Citizen" | "Police" | "Doctor";
type Phase =
  | "LOBBY"
  | "ROLES"
  | "TIMER"
  | "VOTE"
  | "RESULT"
  | "NIGHT_HANDOFF"
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
  NIGHT_HANDOFF: "밤 시작",
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

  // ✅ 밤 액션 “휴대폰 넘기기” 단계용
  const [nightTurn, setNightTurn] = useState<"MAFIA" | "DOCTOR" | "POLICE">(
    "MAFIA",
  );

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

  // ✅ 밤 시작(멘트 후 자동 진입) 타이머 ref
  const nightStartTimeoutRef = useRef<number | null>(null);

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
      phase === "NIGHT_HANDOFF" ||
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

  // ✅ NIGHT_HANDOFF 없이 바로 역할 화면으로 진입
  const enterNightTurn = (turn: "MAFIA" | "DOCTOR" | "POLICE") => {
    setNightTurn(turn);
    setNightTouchStep("WAIT_ALL");

    if (turn === "MAFIA") {
      setPhase("NIGHT_MAFIA");
      speak(
        "마피아 차례입니다. 모두 손가락을 화면에 올려주세요. 준비되면 마피아는 시작을 누르고, 제거할 대상을 빠르게 터치하세요.",
      );
    } else if (turn === "DOCTOR") {
      setPhase("NIGHT_DOCTOR");
      speak(
        "의사 차례입니다. 모두 손가락을 화면에 올려주세요. 준비되면 의사는 시작을 누르고, 치료할 대상을 빠르게 터치하세요.",
      );
    } else {
      setPhase("NIGHT_POLICE");
      speak(
        "경찰 차례입니다. 모두 손가락을 화면에 올려주세요. 준비되면 경찰은 시작을 누르고, 조사할 대상을 빠르게 터치하세요.",
      );
    }
  };

  const goNightHandoff = (turn: "MAFIA" | "DOCTOR" | "POLICE") => {
    setNightTurn(turn);
    setNightTouchStep("WAIT_ALL");
    setPhase("NIGHT_HANDOFF");

    if (turn === "MAFIA") {
      speak(
        "밤이 되었습니다. 모두 눈을 감으세요. 마피아 차례입니다. 휴대폰을 중앙에 놓으면 마피아는 조용히 넘겨받았음을 누르세요.",
      );
    } else if (turn === "DOCTOR") {
      speak(
        "의사 차례입니다. 휴대폰을 중앙에 놓으면 의사는 조용히 넘겨받았음을 누르세요.",
      );
    } else {
      speak(
        "경찰 차례입니다. 휴대폰을 중앙에 놓으면 경찰은 조용히 넘겨받았음을 누르세요.",
      );
    }
  };

  const proceedAfterHandoff = () => {
    playSfx("click");

    if (nightTurn === "MAFIA" && !mafiaAlive) {
      const next = nextNightTurn("MAFIA");
      if (next === "SUMMARY") {
        setPhase("NIGHT_SUMMARY");
        speak("밤 행동이 모두 종료되었습니다. 밤 결과를 적용하고 낮을 시작하세요.");
      } else {
        goNightHandoff(next);
      }
      return;
    }
    if (nightTurn === "DOCTOR" && !doctorAlive) {
      const next = nextNightTurn("DOCTOR");
      if (next === "SUMMARY") {
        setPhase("NIGHT_SUMMARY");
        speak("밤 행동이 모두 종료되었습니다. 밤 결과를 적용하고 낮을 시작하세요.");
      } else {
        goNightHandoff(next);
      }
      return;
    }
    if (nightTurn === "POLICE" && !policeAlive) {
      setPhase("NIGHT_SUMMARY");
      speak("밤 행동이 모두 종료되었습니다. 밤 결과를 적용하고 낮을 시작하세요.");
      return;
    }

    setNightTouchStep("WAIT_ALL");

    if (nightTurn === "MAFIA") {
      setPhase("NIGHT_MAFIA");
      speak(
        "마피아 차례입니다. 모두 손가락을 화면에 올려주세요. 준비되면 마피아는 시작을 누르고, 제거할 대상을 빠르게 터치하세요.",
      );
    } else if (nightTurn === "DOCTOR") {
      setPhase("NIGHT_DOCTOR");
      speak(
        "의사 차례입니다. 모두 손가락을 화면에 올려주세요. 준비되면 의사는 시작을 누르고, 치료할 대상을 빠르게 터치하세요.",
      );
    } else {
      setPhase("NIGHT_POLICE");
      speak(
        "경찰 차례입니다. 모두 손가락을 화면에 올려주세요. 준비되면 경찰은 시작을 누르고, 조사할 대상을 빠르게 터치하세요.",
      );
    }
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
      speak("낮이 시작됩니다. 토론을 진행하세요. 시간이 끝나면 투표로 이동합니다.");
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
    setLastEvent(
      `🗳️ 투표로 ${target} 님이 제거되었습니다. (역할: ${revealedRole})`,
    );
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
  const beginNight = () => {
    playSfx("click");
    if (gameOver) return;

    // 혹시 이전에 예약된 밤 시작 타이머가 있으면 취소
    if (nightStartTimeoutRef.current) {
      window.clearTimeout(nightStartTimeoutRef.current);
      nightStartTimeoutRef.current = null;
    }

    setPendingKill(null);
    setPendingHeal(null);
    setMafiaTarget("");
    setDoctorTarget("");
    setPoliceTarget("");
    setPoliceResult("");
    setNightTouchStep("WAIT_ALL");

    // ✅ RESULT에서 밤 시작 누르면: 멘트 → 바로 마피아(또는 생존 역할)로 진입
    speak(
      "모두 눈을 감고, 고개를 숙인 후 손가락 하나씩 핸드폰에 대세요.",
    );

    nightStartTimeoutRef.current = window.setTimeout(() => {
      nightStartTimeoutRef.current = null;

      if (mafiaAlive) return enterNightTurn("MAFIA");
      if (doctorAlive) return enterNightTurn("DOCTOR");
      if (policeAlive) return enterNightTurn("POLICE");

      setPhase("NIGHT_SUMMARY");
      speak("살아있는 밤 역할이 없습니다. 밤을 종료하고 낮을 시작하세요.");
    }, 1200);
  };

  // ✅ “손가락 얹기” 공통 UI용: 역할이 대상 탭하면 즉시 확정되는 방식
  const startTouchSelect = () => {
    playSfx("click");
    setNightTouchStep("SELECT");
    speak("이제 해당 역할만 대상을 빠르게 터치하세요.");
  };

  const mafiaTapTarget = (p: string) => {
    playSfx("click");
    if (gameOver) return;
    if (alive[p] === false) return;

    setPendingKill(p);
    setLastEvent("🌙 마피아가 대상을 선택했습니다.");
    speak("선택 완료. 휴대폰을 내려두고 다음 역할에게 넘기세요.");

    const next = nextNightTurn("MAFIA");
    setMafiaTarget("");
    setNightTouchStep("WAIT_ALL");

    if (next === "SUMMARY") {
      setPhase("NIGHT_SUMMARY");
      speak("밤 행동이 모두 종료되었습니다. 밤 결과를 적용하고 낮을 시작하세요.");
    } else {
      enterNightTurn(next);
    }
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
    speak("선택 완료. 휴대폰을 내려두고 다음 역할에게 넘기세요.");

    const next = nextNightTurn("DOCTOR");
    setDoctorTarget("");
    setNightTouchStep("WAIT_ALL");

    if (next === "SUMMARY") {
      setPhase("NIGHT_SUMMARY");
      speak("밤 행동이 모두 종료되었습니다. 밤 결과를 적용하고 낮을 시작하세요.");
    } else {
      enterNightTurn(next);
    }
  };

  const policeTapTarget = (p: string) => {
    playSfx("click");
    if (gameOver) return;

    const isMafia = assigned[p] === "Mafia";
    const msg = isMafia ? `🚨 조사 결과: ${p} = 마피아` : `🔎 조사 결과: ${p} = 마피아 아님`;

    setPoliceResult(msg);
    setLastEvent(msg);
    speak(msg);

    setPoliceTarget("");
    setNightTouchStep("WAIT_ALL");
    // 경찰은 결과 확인 시간이 필요해서 바로 SUMMARY로 보내되, 버튼으로 마무리
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

    if (nightStartTimeoutRef.current) {
      window.clearTimeout(nightStartTimeoutRef.current);
      nightStartTimeoutRef.current = null;
    }

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
                      phase === "NIGHT_HANDOFF" ||
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
                "NIGHT_HANDOFF",
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
              <div className={glowCard + " p-4"}>
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-lg">인원 선택</h2>
                  <span className="text-sm text-white/70">
                    현재:{" "}
                    <span className="font-extrabold text-red-300">{playerCount}</span>명
                  </span>
                </div>

                <p className="text-xs text-white/50 mt-1">숫자만 고르면 끝! (2~12명)</p>

                <div className="mt-6 flex items-center justify-center gap-6">
                  <button
                    disabled={locked || playerCount <= 2}
                    onClick={() => {
                      playSfx("click");
                      setPlayerCount((c) => Math.max(2, c - 1));
                    }}
                    className={`w-14 h-14 text-2xl font-bold rounded-full border transition ${
                      locked || playerCount <= 2
                        ? "bg-white/5 text-white/30 border-white/10"
                        : "bg-white/10 hover:bg-white/20 border-white/20"
                    }`}
                    aria-label="인원 -1"
                  >
                    -
                  </button>

                  <div className="w-28 text-center">
                    <div className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-cyan-400">
                      {playerCount}
                    </div>
                    <div className="text-xs text-white/50 mt-1">명</div>
                  </div>

                  <button
                    disabled={locked || playerCount >= 12}
                    onClick={() => {
                      playSfx("click");
                      setPlayerCount((c) => Math.min(12, c + 1));
                    }}
                    className={`w-14 h-14 text-2xl font-bold rounded-full border transition ${
                      locked || playerCount >= 12
                        ? "bg-white/5 text-white/30 border-white/10"
                        : "bg-white/10 hover:bg-white/20 border-white/20"
                    }`}
                    aria-label="인원 +1"
                  >
                    +
                  </button>
                </div>

                <div className="mt-5 rounded-xl border border-white/10 bg-black/40 p-3">
                  <div className="text-xs text-white/50">참가자 자동 생성</div>
                  <div className="text-sm mt-1 text-white/80">
                    {players.slice(0, 6).join(" · ")}
                    {players.length > 6 ? " · ..." : ""}
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  {!locked ? (
                    <button
                      onClick={() => {
                        playSfx("click");
                        setLocked(true);
                        speak("인원이 확정되었습니다.");
                      }}
                      className="flex-1 py-3 rounded-xl font-extrabold bg-white/10 hover:bg-white/15 border border-white/10"
                    >
                      인원 확정
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        playSfx("click");
                        setLocked(false);
                        speak("인원 확정을 해제했습니다.");
                      }}
                      className="flex-1 py-3 rounded-xl font-extrabold bg-white/10 hover:bg-white/15 border border-white/10"
                    >
                      다시 변경
                    </button>
                  )}
                </div>

                <button
                  onClick={startGame}
                  disabled={!locked || playerCount < 2}
                  className={`mt-3 w-full py-3 rounded-xl font-extrabold tracking-wide transition ${
                    !locked || playerCount < 2
                      ? "bg-white/10 text-white/30 border border-white/10"
                      : "bg-gradient-to-r from-red-600 via-fuchsia-600 to-cyan-500 hover:opacity-90 shadow-[0_0_26px_rgba(255,0,60,0.25)]"
                  }`}
                >
                  게임 시작
                </button>

                <div className="mt-2 text-[11px] text-white/45">
                  * 2~5명은 간단 모드(마피아 1 + 시민 최소 1). 6명 이상은 경찰/의사 포함.
                </div>
              </div>

              <div className={glowCard + " p-4"}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">추천 역할 구성</h3>
                  <span className="text-xs text-white/50">자동 밸런스</span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="text-white/50 text-xs">마피아</div>
                    <div className="text-xl font-extrabold text-red-300">
                      {rolePlan.mafia}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="text-white/50 text-xs">시민</div>
                    <div className="text-xl font-extrabold">{rolePlan.citizen}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="text-white/50 text-xs">경찰</div>
                    <div className="text-xl font-extrabold text-cyan-200">
                      {rolePlan.police}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="text-white/50 text-xs">의사</div>
                    <div className="text-xl font-extrabold text-emerald-200">
                      {rolePlan.doctor}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-white/45 mt-2">
                  규칙: 8명 이상이면 마피아 2명 추천 / 5명 미만은 마피아 1 + 시민 위주
                </p>
              </div>
            </div>
          )}

          {/* 역할 공개 */}
          {phase === "ROLES" && (
            <div className={"mt-6 " + glowCard + " p-4"}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-bold text-lg">역할 확인</h2>
                <div className="text-xs text-white/60">
                  순서: {revealIndex + 1} / {players.length}
                </div>
              </div>

              <p className="text-sm text-white/70 mt-1">
                휴대폰을{" "}
                <span className="text-white font-semibold">{currentPlayer}</span> 님에게
                넘겨주세요
              </p>

              {!confirmHandOff ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4 shadow-[0_0_30px_rgba(255,0,60,0.15)]">
                  <div className="text-white/70 text-sm">
                    화면을 몰래 보지 않게,{" "}
                    <span className="text-white font-semibold">다음 사람이 직접</span>{" "}
                    “넘겨받았음”을 눌러주세요.
                  </div>

                  <button
                    onClick={() => {
                      playSfx("click");
                      setConfirmHandOff(true);
                      setFlip(false);
                      setIsRevealed(false);
                      speak("역할 공개 버튼을 눌러 역할을 확인하세요.");
                    }}
                    className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-fuchsia-600 hover:opacity-90"
                  >
                    ✅ 넘겨받았음
                  </button>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4 text-center shadow-[0_0_30px_rgba(255,0,60,0.15)]">
                  <div className="text-white/60 text-sm">버튼을 눌러 역할을 확인하세요</div>

                  <div
                    className={
                      "mt-4 rounded-2xl border border-white/10 bg-black/40 p-6 transition-transform duration-300 " +
                      (flip ? "scale-[1.01]" : "scale-100")
                    }
                  >
                    {!isRevealed ? (
                      <>
                        <div className="text-white/70 text-sm">아직 공개되지 않았습니다</div>
                        <button
                          onClick={() => {
                            playSfx("reveal");
                            setIsRevealed(true);
                            setFlip(true);
                            speak(
                              "역할을 확인했습니다. 확인 완료를 누르고 휴대폰을 내려두세요.",
                            );
                          }}
                          className="mt-3 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-fuchsia-600 hover:opacity-90"
                        >
                          🔥 역할 공개
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="text-white/60 text-sm">당신의 역할</div>
                        <div className="text-4xl font-extrabold mt-2 text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-cyan-300">
                          {roleKorean[assigned[currentPlayer]]}
                        </div>

                        <button
                          onClick={() => {
                            playSfx("click");
                            setConfirmHandOff(false);
                            setFlip(false);
                            nextReveal();
                          }}
                          className="mt-4 w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10"
                        >
                          확인 완료 · 다음
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 타이머 */}
          {phase === "TIMER" && (
            <div className={"mt-6 " + glowCard + " p-4"}>
              <h2 className="font-bold text-lg">타이머</h2>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPreset("Day")}
                  className={`py-3 rounded-xl border ${
                    mode === "Day"
                      ? "border-red-500/60 bg-red-500/10 text-red-200 shadow-[0_0_18px_rgba(255,0,60,0.25)]"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  낮 (5:00)
                </button>
                <button
                  onClick={() => setPreset("Night")}
                  className={`py-3 rounded-xl border ${
                    mode === "Night"
                      ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-200 shadow-[0_0_18px_rgba(0,255,255,0.18)]"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  밤 (2:00)
                </button>
              </div>

              <div className="mt-5 text-center">
                <div
                  className={
                    "text-white/60 text-sm " + (dangerPulse ? "opacity-80" : "")
                  }
                >
                  {mode === "Night"
                    ? "조용히… 누군가 움직이고 있어요."
                    : "토론 시간… 누구도 믿지 마세요."}
                </div>
                <div className="text-6xl font-extrabold mt-2 tracking-tight">
                  {Math.floor(secondsLeft / 60)}:
                  {String(secondsLeft % 60).padStart(2, "0")}
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    playSfx("click");
                    setRunning((r) => {
                      const next = !r;
                      speak(next ? "타이머를 시작합니다." : "일시정지");
                      return next;
                    });
                  }}
                  className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10"
                >
                  {running ? "일시정지" : "시작"}
                </button>
                <button
                  onClick={() => {
                    playSfx("click");
                    setSecondsLeft(mode === "Day" ? 300 : 120);
                    setRunning(false);
                    speak("타이머를 리셋했습니다.");
                  }}
                  className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10"
                >
                  리셋
                </button>
              </div>

              <button
                onClick={gotoVote}
                disabled={gameOver}
                className={`mt-4 w-full py-3 rounded-xl font-extrabold bg-gradient-to-r from-red-600 via-fuchsia-600 to-cyan-500 hover:opacity-90 ${
                  gameOver ? "opacity-40 pointer-events-none" : ""
                }`}
              >
                투표로 이동
              </button>
            </div>
          )}

          {/* 투표 */}
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
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              <button
                onClick={addVote}
                disabled={gameOver}
                className={`mt-3 w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 ${
                  gameOver ? "opacity-40 pointer-events-none" : ""
                }`}
              >
                + 표 추가
              </button>

              <div className="mt-4 space-y-2">
                {Object.keys(votes).map((p) => (
                  <div
                    key={p}
                    className="flex justify-between rounded-xl px-3 py-2 bg-white/5 border border-white/10"
                  >
                    <span>{p}</span>
                    <span className="font-extrabold">{votes[p] ?? 0}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  playSfx("click");
                  setPhase("RESULT");
                  speak("결과 보기로 이동합니다.");
                }}
                className="mt-4 w-full py-3 rounded-xl font-extrabold bg-gradient-to-r from-red-600 to-fuchsia-600 hover:opacity-90"
              >
                결과 보기
              </button>
            </div>
          )}

          {/* 결과 */}
          {phase === "RESULT" && (
            <div className={"mt-6 " + glowCard + " p-4"}>
              <h2 className="font-bold text-lg">결과</h2>

              {gameOver && (
                <div className="mt-3 rounded-xl border border-white/10 bg-black/50 px-3 py-3">
                  <div className="text-sm font-extrabold">
                    🏁 게임 종료 · {winner === "MAFIA" ? "마피아 승" : "시민 승"}
                  </div>
                  <div className="text-xs text-white/60 mt-1">
                    새 게임을 눌러 다시 시작하세요.
                  </div>
                </div>
              )}

              {lastEvent && (
                <div className="mt-3 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80">
                  {lastEvent}
                </div>
              )}

              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-sm font-bold">플레이어 상태</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {players.map((p) => {
                    const dead = alive[p] === false;
                    return (
                      <span
                        key={p}
                        className={
                          "text-xs px-2 py-1 rounded-full border " +
                          (dead
                            ? "border-red-500/40 bg-red-500/10 text-red-200"
                            : "border-white/10 bg-white/5 text-white/70")
                        }
                      >
                        {p} {dead ? "✖ 제거" : "✔ 생존"}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold">투표 집행</div>
                  <div className="text-xs text-white/50">
                    {topVoted
                      ? `1등: ${topVoted.player} (${topVoted.votes}표)`
                      : "1등 동점/투표 없음"}
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={executeVote}
                    disabled={gameOver}
                    className={`flex-1 py-3 rounded-xl font-extrabold bg-gradient-to-r from-red-600 to-fuchsia-600 hover:opacity-90 ${
                      gameOver ? "opacity-40 pointer-events-none" : ""
                    }`}
                  >
                    집행 확정
                  </button>
                  <button
                    onClick={undoLastExecute}
                    disabled={gameOver}
                    className={`flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 ${
                      gameOver ? "opacity-40 pointer-events-none" : ""
                    }`}
                  >
                    되돌리기
                  </button>
                </div>

                <div className="mt-2 text-xs text-white/50">
                  * 집행 후 “밤 시작”을 눌러 사회자 없이 밤 행동을 진행하세요.
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={beginNight}
                  disabled={gameOver}
                  className={`flex-1 py-3 rounded-xl font-extrabold bg-gradient-to-r from-cyan-500 via-fuchsia-600 to-red-600 hover:opacity-90 ${
                    gameOver ? "opacity-40 pointer-events-none" : ""
                  }`}
                >
                  🌙 밤 시작(손가락 방식)
                </button>

                <button
                  onClick={resetAll}
                  className="flex-1 py-3 rounded-xl font-extrabold bg-gradient-to-r from-red-600 via-fuchsia-600 to-cyan-500 hover:opacity-90"
                >
                  새 게임
                </button>
              </div>
            </div>
          )}

          {/* ====== 밤 액션: 휴대폰 넘기기 (현재 로직에서는 거의 사용 안 함) ====== */}
          {phase === "NIGHT_HANDOFF" && (
            <div className={"mt-6 " + glowCard + " p-4"}>
              <h2 className="font-bold text-lg">밤 행동</h2>
              <p className="text-sm text-white/70 mt-1">
                모두 눈을 감으세요. 휴대폰을{" "}
                <span className="text-white font-semibold">
                  {nightTurn === "MAFIA"
                    ? "마피아"
                    : nightTurn === "DOCTOR"
                      ? "의사"
                      : "경찰"}
                </span>
                에게 넘겨주세요.
              </p>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4 shadow-[0_0_30px_rgba(0,255,255,0.12)]">
                <div className="text-white/70 text-sm">
                  다음 사람이 직접 “넘겨받았음”을 눌러주세요.
                </div>

                <button
                  onClick={proceedAfterHandoff}
                  className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-600 hover:opacity-90"
                >
                  ✅ 넘겨받았음
                </button>

                <div className="mt-3 text-xs text-white/50">
                  * 이 화면에서는 아무 정보도 노출되지 않습니다. (역할 사망 시 자동 스킵)
                </div>
              </div>
            </div>
          )}

          {/* ====== 밤 액션: 마피아 (손가락 방식) ====== */}
          {phase === "NIGHT_MAFIA" && (
            <div className={"mt-6 " + glowCard + " p-4"}>
              <h2 className="font-bold text-lg">🌙 마피아 행동</h2>
              <p className="text-sm text-white/70 mt-1">
                모두 손가락을 화면에 올려두고,{" "}
                <span className="text-white font-semibold">마피아만</span> 대상을
                누릅니다.
              </p>

              {nightTouchStep === "WAIT_ALL" ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4">
                  <div className="text-white/70 text-sm">
                    ✅ 모두 손가락을 얹었다면, 마피아가 “시작”을 누르세요.
                  </div>
                  <button
                    onClick={startTouchSelect}
                    className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-fuchsia-600 hover:opacity-90"
                  >
                    ▶ 시작 (마피아만)
                  </button>
                  <div className="mt-3 text-xs text-white/50">
                    * 시작을 누르면 대상 버튼이 나타납니다.
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {alivePlayers.map((p) => (
                    <button
                      key={p}
                      onClick={() => mafiaTapTarget(p)}
                      className={bigChoiceBtn}
                    >
                      <div className="text-sm text-white/60">대상 선택</div>
                      <div className="text-lg font-extrabold">{p}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ====== 밤 액션: 의사 (손가락 방식) ====== */}
          {phase === "NIGHT_DOCTOR" && (
            <div className={"mt-6 " + glowCard + " p-4"}>
              <h2 className="font-bold text-lg">💉 의사 행동</h2>
              <p className="text-sm text-white/70 mt-1">
                모두 손가락을 화면에 올려두고,{" "}
                <span className="text-white font-semibold">의사만</span> 대상을
                누릅니다.
              </p>

              {nightTouchStep === "WAIT_ALL" ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4">
                  <div className="text-white/70 text-sm">
                    ✅ 모두 손가락을 얹었다면, 의사가 “시작”을 누르세요.
                  </div>
                  <button
                    onClick={startTouchSelect}
                    className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-90"
                  >
                    ▶ 시작 (의사만)
                  </button>
                  <div className="mt-3 text-xs text-white/50">
                    * 의사 본인 치료는 게임당 1회 제한입니다.
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
                        치료 대상 선택 {alive[p] === false ? "(제거됨)" : ""}
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

          {/* ====== 밤 액션: 경찰 (손가락 방식) ====== */}
          {phase === "NIGHT_POLICE" && (
            <div className={"mt-6 " + glowCard + " p-4"}>
              <h2 className="font-bold text-lg">🔎 경찰 행동</h2>
              <p className="text-sm text-white/70 mt-1">
                모두 손가락을 화면에 올려두고,{" "}
                <span className="text-white font-semibold">경찰만</span> 조사 대상을
                누릅니다. 결과는 이 화면에서만 표시됩니다.
              </p>

              {policeResult ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4">
                  <div className="text-sm text-white/80">{policeResult}</div>
                  <button
                    onClick={() => {
                      playSfx("click");
                      setPhase("NIGHT_SUMMARY");
                      speak(
                        "경찰 조사가 끝났습니다. 이제 밤 결과를 적용하고 낮을 시작하세요.",
                      );
                    }}
                    className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-600 hover:opacity-90"
                  >
                    확인 완료 · 밤 종료로
                  </button>
                  <div className="mt-3 text-xs text-white/50">
                    * 휴대폰을 내려두고 모두 다시 눈을 감으세요.
                  </div>
                </div>
              ) : nightTouchStep === "WAIT_ALL" ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4">
                  <div className="text-white/70 text-sm">
                    ✅ 모두 손가락을 얹었다면, 경찰이 “시작”을 누르세요.
                  </div>
                  <button
                    onClick={startTouchSelect}
                    className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-600 hover:opacity-90"
                  >
                    ▶ 시작 (경찰만)
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
                      <div className="text-sm text-white/60">조사 대상 선택</div>
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
              <h2 className="font-bold text-lg">밤 종료</h2>
              <p className="text-sm text-white/70 mt-1">
                이제 밤 결과를 적용하고 낮으로 넘어갑니다.
              </p>

              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-white/60">밤 행동 요약(비공개)</div>
                <div className="mt-2 text-sm text-white/80">
                  {pendingKill ? `마피아 선택 완료` : `마피아 선택 없음`} ·{" "}
                  {pendingHeal ? `의사 선택 완료` : `의사 선택 없음`} ·{" "}
                  {policeAlive ? `경찰 조사 완료/선택` : `경찰 없음/사망`}
                </div>

                <button
                  onClick={applyNightOutcome}
                  disabled={gameOver}
                  className={`mt-3 w-full py-3 rounded-xl font-extrabold bg-gradient-to-r from-red-600 via-fuchsia-600 to-cyan-500 hover:opacity-90 ${
                    gameOver ? "opacity-40 pointer-events-none" : ""
                  }`}
                >
                  🌅 밤 결과 적용하고 낮 시작
                </button>

                <div className="mt-2 text-xs text-white/45">
                  * 마피아 공격과 의사 치료는 동시에 적용됩니다. 같은 대상이면 생존합니다.
                </div>
              </div>
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