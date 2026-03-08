import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { getApiUrl } from "./query-client";

interface Opponent {
  username: string;
  eloRating: number;
}

interface MatchResult {
  matchId: number;
  yourScore: number;
  opponentScore: number;
  won: boolean;
  draw: boolean;
  eloChange: number;
  newElo: number;
  newLeague: string;
  coinsEarned: number;
  powerUpReward?: { id: string; name: string; count: number } | null;
}

type QueueStatus = "idle" | "searching" | "found" | "playing" | "result";

interface MultiplayerContextValue {
  queueStatus: QueueStatus;
  opponent: Opponent | null;
  matchId: number | null;
  matchSeed: string | null;
  initialPieces: any[] | null;
  opponentScore: number;
  matchResult: MatchResult | null;
  timeRemaining: number;
  joinQueue: (userId: string) => void;
  leaveQueue: () => void;
  sendScoreUpdate: (score: number, piecesPlaced: number) => void;
  requestPieces: (batchIndex: number) => void;
  disconnect: () => void;
  resetMatch: () => void;
  onNewPieces: ((pieces: any[]) => void) | null;
  setOnNewPieces: (cb: ((pieces: any[]) => void) | null) => void;
}

const MultiplayerContext = createContext<MultiplayerContextValue | null>(null);

export function MultiplayerProvider({ children }: { children: ReactNode }) {
  const [queueStatus, setQueueStatus] = useState<QueueStatus>("idle");
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [matchId, setMatchId] = useState<number | null>(null);
  const [matchSeed, setMatchSeed] = useState<string | null>(null);
  const [initialPieces, setInitialPieces] = useState<any[] | null>(null);
  const [opponentScore, setOpponentScore] = useState(0);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(120);
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onNewPiecesRef = useRef<((pieces: any[]) => void) | null>(null);

  const startTimer = useCallback(() => {
    setTimeRemaining(120);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const joinQueue = useCallback(
    (userId: string) => {
      const baseUrl = getApiUrl();
      const wsUrl = baseUrl.replace(/^http/, "ws") + "ws";
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "auth", userId }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case "authenticated":
            ws.send(JSON.stringify({ type: "join_queue" }));
            setQueueStatus("searching");
            break;
          case "queue_joined":
            setQueueStatus("searching");
            break;
          case "match_found":
            setOpponent(data.opponent);
            setMatchId(data.matchId);
            setMatchSeed(data.seed);
            setInitialPieces(data.initialPieces);
            setQueueStatus("found");
            break;
          case "game_start":
            setQueueStatus("playing");
            startTimer();
            break;
          case "opponent_update":
            setOpponentScore(data.score);
            break;
          case "new_pieces":
            if (onNewPiecesRef.current) {
              onNewPiecesRef.current(data.pieces);
            }
            break;
          case "match_result":
            setMatchResult(data);
            setQueueStatus("result");
            if (timerRef.current) clearInterval(timerRef.current);
            break;
          case "error":
            console.error("WS error:", data.message);
            break;
        }
      };

      ws.onclose = () => {
        if (queueStatus === "searching") {
          setQueueStatus("idle");
        }
      };
    },
    [startTimer]
  );

  const leaveQueue = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "leave_queue" }));
    }
    setQueueStatus("idle");
  }, []);

  const sendScoreUpdate = useCallback(
    (score: number, piecesPlaced: number) => {
      if (wsRef.current?.readyState === WebSocket.OPEN && matchId) {
        wsRef.current.send(
          JSON.stringify({
            type: "score_update",
            matchId,
            score,
            piecesPlaced,
          })
        );
      }
    },
    [matchId]
  );

  const requestPieces = useCallback(
    (batchIndex: number) => {
      if (wsRef.current?.readyState === WebSocket.OPEN && matchId) {
        wsRef.current.send(
          JSON.stringify({
            type: "request_pieces",
            matchId,
            batchIndex,
          })
        );
      }
    },
    [matchId]
  );

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const resetMatch = useCallback(() => {
    setQueueStatus("idle");
    setOpponent(null);
    setMatchId(null);
    setMatchSeed(null);
    setInitialPieces(null);
    setOpponentScore(0);
    setMatchResult(null);
    setTimeRemaining(120);
    disconnect();
  }, [disconnect]);

  const setOnNewPieces = useCallback(
    (cb: ((pieces: any[]) => void) | null) => {
      onNewPiecesRef.current = cb;
    },
    []
  );

  return (
    <MultiplayerContext.Provider
      value={{
        queueStatus,
        opponent,
        matchId,
        matchSeed,
        initialPieces,
        opponentScore,
        matchResult,
        timeRemaining,
        joinQueue,
        leaveQueue,
        sendScoreUpdate,
        requestPieces,
        disconnect,
        resetMatch,
        onNewPieces: onNewPiecesRef.current,
        setOnNewPieces,
      }}
    >
      {children}
    </MultiplayerContext.Provider>
  );
}

export function useMultiplayer() {
  const context = useContext(MultiplayerContext);
  if (!context) {
    throw new Error("useMultiplayer must be used within a MultiplayerProvider");
  }
  return context;
}
