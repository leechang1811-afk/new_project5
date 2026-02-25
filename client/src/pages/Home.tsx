import { useMemo, useState, useEffect } from "react";

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

function recommendedRoles(n: number) {
  let mafia = 1;
  if (n >= 8) mafia = 2;

  const police = n >= 6 ? 1 : 0;
  const doctor = n >= 6 ? 1 : 0;
  const citizen = Math.max(0, n - mafia - police - doctor);

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

  // ✅ 인원만 선택 (6~12)
  const [playerCount, setPlayerCount] = useState<number>(8);
  const [locked, setLocked] = useState(false);

  // 내부적으로 플레이어 이름 자동 생성
  const players = useMemo(
    () => Array.from({ length: playerCount }, (_, i) => `플레이어 ${i + 1}`),
    [playerCount]
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
  const [nightTurn, setNightTurn] = useState<"MAFIA" | "DOCTOR" | "POLICE">("MAFIA");

  // ✅ 게임 종료 상태(승리조건: 마피아 전멸 or 마피아만 생존)
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<"MAFIA" | "CITIZEN" | null>(null);

  // ✅ 음성 안내(TTS)
  const [ttsOn, setTtsOn] = useState(true);
  const [ttsReady, setTtsReady] = useState(false);

  // 🔥 스릴러 톤(저음/느림)
  const ttsRate = 0.95;
  const ttsPitch = 0.72;
  const ttsVolume = 1.0;

  const speak = (text: string) => {
    if (!ttsOn) return;
    if (!ttsReady) return;
    if (typeof window === "undefined") return;

    const synth = window.speechSynthesis;
    if (!synth) return;

    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR";
    u.rate = ttsRate;
    u.pitch = ttsPitch;
    u.volume = ttsVolume;
    synth.speak(u);
  };

  // ✅ role briefing 자동 반영
  const rolePlan = useMemo(() => recommendedRoles(playerCount), [playerCount]);

  // ✅ 살아있는 플레이어만
  const alivePlayers = useMemo(
    () => players.filter((p) => alive[p] !== false),
    [players, alive]
  );

  // ✅ 직업 보유자(한 명 기준)
  const doctorPlayer = useMemo(
    () => Object.keys(assigned).find((p) => assigned[p] === "Doctor") ?? "",
    [assigned]
  );
  const policePlayer = useMemo(
    () => Object.keys(assigned).find((p) => assigned[p] === "Police") ?? "",
    [assigned]
  );

  // ✅ 마피아는 복수 가능
  const mafiaPlayers = useMemo(
    () => Object.keys(assigned).filter((p) => assigned[p] === "Mafia"),
    [assigned]
  );

  // ✅ 역할 생존 여부(스킵 로직에 사용)
  const mafiaAlive = useMemo(
    () => mafiaPlayers.some((p) => alive[p] !== false),
    [mafiaPlayers, alive]
  );
  const doctorAlive = useMemo(
    () => !!doctorPlayer && alive[doctorPlayer] !== false,
    [doctorPlayer, alive]
  );
  const policeAlive = useMemo(
    () => !!policePlayer && alive[policePlayer] !== false,
    [policePlayer, alive]
  );

  // ✅ 승리 조건 체크(마피아 전멸 or 마피아만 생존)
  const checkWinAndMaybeEnd = (aliveState: Record<string, boolean>) => {
    if (gameOver) return true; // 이미 종료

    // assigned가 비어있으면 아직 게임 시작 전
    if (Object.keys(assigned).length === 0) return false;

    const mafiaAliveCount = mafiaPlayers.filter((p) => aliveState[p] !== false).length;
    const nonMafiaAliveCount = players.filter(
      (p) => aliveState[p] !== false && assigned[p] !== "Mafia"
    ).length;

    // 1) 마피아 전멸 = 시민 승
    if (mafiaAliveCount === 0) {
      setGameOver(true);
      setWinner("CITIZEN");
      setPhase("RESULT");
      setLastEvent("🎉 시민 승리! 모든 마피아가 제거되었습니다. 게임 종료.");
      speak("시민의 승리다. 모든 마피아가 제거되었다. 게임 종료.");
      return true;
    }

    // 2) 마피아만 생존 = 마피아 승
    if (nonMafiaAliveCount === 0 && mafiaAliveCount > 0) {
      setGameOver(true);
      setWinner("MAFIA");
      setPhase("RESULT");
      setLastEvent("💀 마피아 승리! 마피아만 살아남았습니다. 게임 종료.");
      speak("마피아의 승리다. 이제, 끝이다.");
      return true;
    }

    return false;
  };

  // ✅ 다음 밤 턴(역할 사망 시 자동 스킵)
  const nextNightTurn = (
    from: "MAFIA" | "DOCTOR" | "POLICE"
  ): "MAFIA" | "DOCTOR" | "POLICE" | "SUMMARY" => {
    const order: Array<"MAFIA" | "DOCTOR" | "POLICE"> = ["MAFIA", "DOCTOR", "POLICE"];
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

  const goNightHandoff = (turn: "MAFIA" | "DOCTOR" | "POLICE") => {
    setNightTurn(turn);
    setPhase("NIGHT_HANDOFF");

    if (turn === "MAFIA") {
      speak(
        "밤이 되었습니다. 모두 눈을 감으세요. 마피아 차례입니다. 휴대폰을 마피아에게 넘기고 넘겨받았음을 누르세요."
      );
    } else if (turn === "DOCTOR") {
      speak("의사 차례입니다. 휴대폰을 의사에게 넘기고 넘겨받았음을 누르세요.");
    } else {
      speak("경찰 차례입니다. 휴대폰을 경찰에게 넘기고 넘겨받았음을 누르세요.");
    }
  };

  const proceedAfterHandoff = () => {
    // ✅ 넘겨받았음을 눌렀는데 해당 역할이 이미 죽었으면 자동 스킵
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

    // ✅ 정상 진행
    if (nightTurn === "MAFIA") {
      setPhase("NIGHT_MAFIA");
      speak("마피아는 제거할 대상을 선택하고 확정하세요.");
    } else if (nightTurn === "DOCTOR") {
      setPhase("NIGHT_DOCTOR");
      speak("의사는 치료할 대상을 선택하고 확정하세요.");
    } else {
      setPhase("NIGHT_POLICE");
      speak("경찰은 조사할 대상을 선택하고 조사 버튼을 누르세요.");
    }
  };

  const startGame = () => {
    if (playerCount < 6) return;

    // ✅ 종료 상태 초기화
    setGameOver(false);
    setWinner(null);

    const shuffledRoles = shuffle(rolePlan.roles);
    const map: Record<string, Role> = {};
    players.forEach((p, idx) => {
      map[p] = shuffledRoles[idx];
    });
    setAssigned(map);

    // 생존 상태 초기화 (전원 생존)
    const aliveInit: Record<string, boolean> = {};
    players.forEach((p) => (aliveInit[p] = true));
    setAlive(aliveInit);

    // 초기화
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
    setMode(m);
    setRunning(false);
    setSecondsLeft(m === "Day" ? 300 : 120);
    speak(m === "Day" ? "낮 토론 시간을 설정했습니다." : "밤 시간을 설정했습니다.");
  };

  const gotoVote = () => {
    if (gameOver) return;
    const init: Record<string, number> = {};
    alivePlayers.forEach((p) => (init[p] = 0));
    setVotes(init);
    setSelected("");
    setPhase("VOTE");
    speak("투표 단계입니다. 의심되는 사람을 선택하고, 플러스 버튼으로 표를 추가하세요.");
  };

  const addVote = () => {
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

  // ✅ 투표 1등(동점이면 null 처리)
  const topVoted = useMemo(() => {
    if (!results.length) return null;
    const [p1, v1] = results[0];
    const v2 = results[1]?.[1] ?? -1;
    if (v1 <= 0) return null;
    if (v1 === v2) return null; // 동점
    return { player: p1, votes: v1 };
  }, [results]);

  const executeVote = () => {
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

    setAlive((prev) => {
      const next = { ...prev, [target]: false };
      // ✅ 투표 제거 후 승리 체크
      checkWinAndMaybeEnd(next);
      return next;
    });

    setLastExecuted(target);
    setLastEvent(`🗳️ 투표로 ${target} 님이 제거되었습니다.`);
    speak(`투표 결과, ${target} 님이 제거되었습니다.`);
  };

  const undoLastExecute = () => {
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
    if (gameOver) return;

    // 선택값/펜딩 초기화
    setPendingKill(null);
    setPendingHeal(null);
    setMafiaTarget("");
    setDoctorTarget("");
    setPoliceTarget("");
    setPoliceResult("");

    // ✅ 첫 턴: 살아있는 역할부터 시작
    if (mafiaAlive) {
      goNightHandoff("MAFIA");
      return;
    }
    if (doctorAlive) {
      goNightHandoff("DOCTOR");
      return;
    }
    if (policeAlive) {
      goNightHandoff("POLICE");
      return;
    }

    // ✅ 셋 다 죽은 경우: 바로 밤 종료
    setPhase("NIGHT_SUMMARY");
    speak("살아있는 밤 역할이 없습니다. 밤을 종료하고 낮을 시작하세요.");
  };

  // 마피아: 펜딩 살해만 설정
  const mafiaConfirm = () => {
    if (gameOver) return;

    if (!mafiaTarget) {
      setLastEvent("⚠️ 마피아 제거 대상을 선택하세요.");
      speak("제거 대상을 선택하세요.");
      return;
    }
    if (alive[mafiaTarget] === false) {
      setLastEvent(`⚠️ ${mafiaTarget} 님은 이미 제거(사망) 상태입니다.`);
      speak("이미 제거된 플레이어는 선택할 수 없습니다.");
      return;
    }

    setPendingKill(mafiaTarget);
    setLastEvent(`🌙 마피아가 대상을 선택했습니다.`);
    speak("선택이 완료되었습니다. 휴대폰을 내려두고 다음 역할에게 넘기세요.");
    setMafiaTarget("");

    const next = nextNightTurn("MAFIA");
    if (next === "SUMMARY") {
      setPhase("NIGHT_SUMMARY");
      speak("밤 행동이 모두 종료되었습니다. 밤 결과를 적용하고 낮을 시작하세요.");
    } else {
      goNightHandoff(next);
    }
  };

  // 의사: 펜딩 치료만 설정
  const doctorConfirm = () => {
    if (gameOver) return;

    if (!doctorTarget) {
      setLastEvent("⚠️ 의사 치료 대상을 선택하세요.");
      speak("치료 대상을 선택하세요.");
      return;
    }

    // 의사 본인 셀프힐 1회 제한
    if (doctorTarget === doctorPlayer) {
      if (doctorSelfHealUsed) {
        setLastEvent("⚠️ 의사 본인 치료는 게임당 1회만 가능합니다.");
        speak("본인 치료는 게임당 한 번만 가능합니다.");
        return;
      }
      setDoctorSelfHealUsed(true);
    }

    setPendingHeal(doctorTarget);
    setLastEvent(`💉 의사가 대상을 선택했습니다.`);
    speak("선택이 완료되었습니다. 휴대폰을 내려두고 다음 역할에게 넘기세요.");
    setDoctorTarget("");

    const next = nextNightTurn("DOCTOR");
    if (next === "SUMMARY") {
      setPhase("NIGHT_SUMMARY");
      speak("밤 행동이 모두 종료되었습니다. 밤 결과를 적용하고 낮을 시작하세요.");
    } else {
      goNightHandoff(next);
    }
  };

  // 경찰: 조사 결과는 NIGHT_POLICE에서 보여주고, NIGHT_SUMMARY로 넘어가면 숨김(요청사항)
  const policeConfirm = () => {
    if (gameOver) return;

    if (!policeTarget) {
      setLastEvent("⚠️ 경찰 조사 대상을 선택하세요.");
      speak("조사 대상을 선택하세요.");
      return;
    }

    const isMafia = assigned[policeTarget] === "Mafia";
    const msg = isMafia
      ? `🚨 조사 결과: ${policeTarget} = 마피아`
      : `🔎 조사 결과: ${policeTarget} = 마피아 아님`;

    setPoliceResult(msg);
    setLastEvent(msg);
    speak(msg);

    setPoliceTarget("");

    // ✅ 경찰은 항상 마지막. 바로 밤 종료로 이동
    setPhase("NIGHT_SUMMARY");
    speak("경찰 조사가 끝났습니다. 이제 밤 결과를 적용하고 낮을 시작하세요.");
  };

  // 밤 결과 적용(살해/치료 동시 반영) + ✅ 승리조건이면 RESULT로 자동 이동
  const applyNightOutcome = () => {
    if (gameOver) return;

    const kill = pendingKill;
    const heal = pendingHeal;

    let msg = "🌅 밤이 지나갔습니다. ";
    if (!pendingKill && !pendingHeal) msg += "아무 일도 일어나지 않았습니다.";
    else if (pendingKill && pendingHeal && pendingKill === pendingHeal)
      msg += `${pendingKill} 님이 공격받았지만 치료로 살아남았습니다.`;
    else if (pendingKill && pendingHeal)
      msg += `${pendingKill} 님이 제거되었습니다. 그리고 ${pendingHeal} 님이 치료되었습니다.`;
    else if (pendingKill) msg += `${pendingKill} 님이 제거되었습니다.`;
    else if (pendingHeal) msg += `${pendingHeal} 님이 치료되었습니다.`;

    setLastEvent(msg);
    speak(msg);

    setAlive((prev) => {
      const next = { ...prev };
      if (kill) next[kill] = false;
      if (heal) next[heal] = true; // 같은 대상이면 true로 덮여서 “살림”

      // ✅ 밤 결과 적용 후 승리 체크
      const ended = checkWinAndMaybeEnd(next);
      if (!ended) {
        // 다음 낮 토론으로
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

    // ✅ 종료 상태 초기화
    setGameOver(false);
    setWinner(null);

    window.speechSynthesis?.cancel();
  };

  const glowCard =
    "relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 shadow-[0_0_40px_rgba(255,0,60,0.12)] backdrop-blur";

  return (
    <div className="min-h-screen text-white bg-[#07070a] relative overflow-hidden">
      {/* 배경 */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,0,60,0.18),transparent_60%)] blur-2xl" />
        <div className="absolute -bottom-40 right-[-120px] w-[800px] h-[800px] rounded-full bg-[radial-gradient(circle_at_center,rgba(0,255,200,0.10),transparent_55%)] blur-3xl" />
        <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(to_right,rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[size:28px_28px]" />
        <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle,rgba(255,255,255,0.8)_1px,transparent_1px)] bg-[size:14px_14px]" />
      </div>

      <div className="max-w-md mx-auto px-5 py-6 relative">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border border-white/10 bg-white/5">
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
              인원 선택 → 역할 공개 → 낮 토론 → 투표 → 밤 행동 (사회자 없이)
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={resetAll}
              className="text-xs px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
              title="초기화"
            >
              초기화
            </button>

            {!ttsReady ? (
              <button
                onClick={() => {
                  setTtsOn(true);
                  setTtsReady(true);
                  const synth = window.speechSynthesis;
                  synth?.cancel();
                  const u = new SpeechSynthesisUtterance("음성 안내를 시작합니다.");
                  u.lang = "ko-KR";
                  synth?.speak(u);
                }}
                className="text-xs px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
                title="iOS/브라우저는 첫 클릭이 필요할 수 있어요"
              >
                🔊 음성 시작
              </button>
            ) : (
              <button
                onClick={() => {
                  setTtsOn((v) => !v);
                  window.speechSynthesis?.cancel();
                }}
                className="text-xs px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
              >
                {ttsOn ? "🔊 음성 ON" : "🔇 음성 OFF"}
              </button>
            )}
          </div>
        </div>

        {/* 단계 표시 */}
        <div className="mt-5 flex flex-wrap gap-2">
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

        {/* 대기실 */}
        {phase === "LOBBY" && (
          <div className="mt-6 space-y-4">
            <div className={glowCard + " p-4"}>
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg">인원 선택</h2>
                <span className="text-sm text-white/70">
                  현재: <span className="font-extrabold text-red-300">{playerCount}</span>명
                </span>
              </div>
              <p className="text-xs text-white/50 mt-1">
                오프라인 진행용이라 이름 없이 인원만 선택합니다 (6~12명)
              </p>

              <div className="mt-4 flex gap-4 items-center">
                <div className="h-[160px] w-12 flex items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                  <input
                    type="range"
                    min={6}
                    max={12}
                    step={1}
                    value={playerCount}
                    onChange={(e) => setPlayerCount(Number(e.target.value))}
                    disabled={locked}
                    className="w-[140px] rotate-[-90deg] accent-red-500"
                    aria-label="인원 선택"
                  />
                </div>

                <div className="flex-1">
                  <div className="flex gap-2">
                    <button
                      disabled={locked}
                      onClick={() => setPlayerCount((c) => Math.max(6, c - 1))}
                      className={`flex-1 py-3 rounded-xl border border-white/10 ${
                        locked ? "bg-white/5 text-white/30" : "bg-white/10 hover:bg-white/15"
                      }`}
                    >
                      -1
                    </button>
                    <button
                      disabled={locked}
                      onClick={() => setPlayerCount((c) => Math.min(12, c + 1))}
                      className={`flex-1 py-3 rounded-xl border border-white/10 ${
                        locked ? "bg-white/5 text-white/30" : "bg-white/10 hover:bg-white/15"
                      }`}
                    >
                      +1
                    </button>
                  </div>

                  <div className="mt-3 rounded-xl border border-white/10 bg-black/40 p-3">
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
                    disabled={!locked || playerCount < 6}
                    className={`mt-3 w-full py-3 rounded-xl font-extrabold tracking-wide transition ${
                      playerCount < 6
                        ? "bg-white/10 text-white/30 border border-white/10"
                        : "bg-gradient-to-r from-red-600 via-fuchsia-600 to-cyan-500 hover:opacity-90 shadow-[0_0_26px_rgba(255,0,60,0.25)]"
                    }`}
                  >
                    게임 시작
                  </button>
                </div>
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
                  <div className="text-xl font-extrabold text-red-300">{rolePlan.mafia}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-white/50 text-xs">시민</div>
                  <div className="text-xl font-extrabold">{rolePlan.citizen}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-white/50 text-xs">경찰</div>
                  <div className="text-xl font-extrabold text-cyan-200">{rolePlan.police}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-white/50 text-xs">의사</div>
                  <div className="text-xl font-extrabold text-emerald-200">{rolePlan.doctor}</div>
                </div>
              </div>

              <p className="text-xs text-white/45 mt-2">규칙: 8명 이상이면 마피아 2명 추천</p>
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
              휴대폰을 <span className="text-white font-semibold">{currentPlayer}</span>
              님에게 넘겨주세요
            </p>

            {!confirmHandOff ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4 shadow-[0_0_30px_rgba(255,0,60,0.15)]">
                <div className="text-white/70 text-sm">
                  화면을 몰래 보지 않게,{" "}
                  <span className="text-white font-semibold">다음 사람이 직접</span> “넘겨받았음”을 눌러주세요.
                </div>

                <button
                  onClick={() => {
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
                          setIsRevealed(true);
                          setFlip(true);
                          speak("역할을 확인했습니다. 확인 완료를 누르고 휴대폰을 내려두세요.");
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
              <div className={"text-white/60 text-sm " + (dangerPulse ? "opacity-80" : "")}>
                {mode === "Night"
                  ? "조용히… 누군가 움직이고 있어요."
                  : "토론 시간… 누구도 믿지 마세요."}
              </div>
              <div className="text-6xl font-extrabold mt-2 tracking-tight">
                {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
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
                <div className="text-xs text-white/60 mt-1">새 게임을 눌러 다시 시작하세요.</div>
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
                  {topVoted ? `1등: ${topVoted.player} (${topVoted.votes}표)` : "1등 동점/투표 없음"}
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
                🌙 밤 시작(사회자 없음)
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

        {/* ====== 밤 액션: 휴대폰 넘기기 ====== */}
        {phase === "NIGHT_HANDOFF" && (
          <div className={"mt-6 " + glowCard + " p-4"}>
            <h2 className="font-bold text-lg">밤 행동</h2>
            <p className="text-sm text-white/70 mt-1">
              모두 눈을 감으세요. 휴대폰을{" "}
              <span className="text-white font-semibold">
                {nightTurn === "MAFIA" ? "마피아" : nightTurn === "DOCTOR" ? "의사" : "경찰"}
              </span>
              에게 넘겨주세요.
            </p>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4 shadow-[0_0_30px_rgba(0,255,255,0.12)]">
              <div className="text-white/70 text-sm">다음 사람이 직접 “넘겨받았음”을 눌러주세요.</div>

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

        {/* ====== 밤 액션: 마피아 ====== */}
        {phase === "NIGHT_MAFIA" && (
          <div className={"mt-6 " + glowCard + " p-4"}>
            <h2 className="font-bold text-lg">🌙 마피아 행동</h2>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-white/60 mb-1">제거 대상 선택</div>

              <select
                value={mafiaTarget}
                onChange={(e) => setMafiaTarget(e.target.value)}
                className="w-full px-3 py-3 rounded-xl bg-white text-black"
                disabled={gameOver}
              >
                <option value="">선택</option>
                {alivePlayers.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              <button
                onClick={mafiaConfirm}
                disabled={gameOver}
                className={`mt-3 w-full py-3 rounded-xl font-extrabold bg-gradient-to-r from-red-600 to-fuchsia-600 hover:opacity-90 ${
                  gameOver ? "opacity-40 pointer-events-none" : ""
                }`}
              >
                제거 대상 확정
              </button>
            </div>
          </div>
        )}

        {/* ====== 밤 액션: 의사 ====== */}
        {phase === "NIGHT_DOCTOR" && (
          <div className={"mt-6 " + glowCard + " p-4"}>
            <h2 className="font-bold text-lg">💉 의사 행동</h2>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-white/60 mb-1">치료(부활) 대상 선택</div>

              <select
                value={doctorTarget}
                onChange={(e) => setDoctorTarget(e.target.value)}
                className="w-full px-3 py-3 rounded-xl bg-white text-black"
                disabled={gameOver}
              >
                <option value="">선택</option>
                {players.map((p) => (
                  <option key={p} value={p}>
                    {p} {alive[p] === false ? "(제거됨)" : ""}
                  </option>
                ))}
              </select>

              <button
                onClick={doctorConfirm}
                disabled={gameOver}
                className={`mt-3 w-full py-3 rounded-xl font-extrabold bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-90 ${
                  gameOver ? "opacity-40 pointer-events-none" : ""
                }`}
              >
                치료 대상 확정
              </button>

              <div className="mt-2 text-xs text-white/50">
                * 의사 본인({doctorPlayer || "의사"}) 치료는 게임당 1회 제한
              </div>
            </div>
          </div>
        )}

        {/* ====== 밤 액션: 경찰 ====== */}
        {phase === "NIGHT_POLICE" && (
          <div className={"mt-6 " + glowCard + " p-4"}>
            <h2 className="font-bold text-lg">🔎 경찰 행동</h2>
            <p className="text-sm text-white/70 mt-1">
              조사 결과는 <span className="text-white font-semibold">지금 화면에서만</span>{" "}
              보여집니다. (밤 종료 화면에서는 숨김)
            </p>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-white/60 mb-1">조사 대상 선택</div>

              <select
                value={policeTarget}
                onChange={(e) => setPoliceTarget(e.target.value)}
                className="w-full px-3 py-3 rounded-xl bg-white text-black"
                disabled={gameOver}
              >
                <option value="">선택</option>
                {alivePlayers.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              <button
                onClick={policeConfirm}
                disabled={gameOver}
                className={`mt-3 w-full py-3 rounded-xl font-extrabold bg-gradient-to-r from-cyan-500 to-fuchsia-600 hover:opacity-90 ${
                  gameOver ? "opacity-40 pointer-events-none" : ""
                }`}
              >
                조사하기
              </button>

              {policeResult && (
                <div className="mt-3 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80">
                  {policeResult}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ====== 밤 종료/결과 적용 ====== */}
        {phase === "NIGHT_SUMMARY" && (
          <div className={"mt-6 " + glowCard + " p-4"}>
            <h2 className="font-bold text-lg">밤 종료</h2>
            <p className="text-sm text-white/70 mt-1">이제 밤 결과를 적용하고 낮으로 넘어갑니다.</p>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-white/60">밤 행동 요약(비공개)</div>
              <div className="mt-2 text-sm text-white/80">
                {pendingKill ? `마피아 선택 완료` : `마피아 선택 없음`} ·{" "}
                {pendingHeal ? `의사 선택 완료` : `의사 선택 없음`} ·{" "}
                {policeAlive ? `경찰 조사 완료` : `경찰 없음/사망`}
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
  );
}