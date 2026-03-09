import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { IncomingMessage } from "http";
import type { RequestHandler } from "express";
import { db } from "./db";
import { users, matches } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { calculateElo, getLeague } from "./auth";
import {
  generateSeededPiece,
  createSeededRandom,
} from "./puzzle-generator";

interface PlayerSocket {
  ws: WebSocket;
  userId: string;
  username: string;
  eloRating: number;
  isBot?: boolean;
}

interface ActiveMatch {
  id: number;
  player1: PlayerSocket;
  player2: PlayerSocket;
  seed: string;
  startTime: number;
  duration: number;
  player1Score: number;
  player2Score: number;
  player1Pieces: number;
  player2Pieces: number;
  timer: ReturnType<typeof setTimeout> | null;
  ended: boolean;
  botInterval?: ReturnType<typeof setInterval> | null;
}

const connectedPlayers = new Map<string, PlayerSocket>();
const queue: PlayerSocket[] = [];
const queueJoinTimes = new Map<string, number>();
const activeMatches = new Map<number, ActiveMatch>();
const BOT_WAIT_THRESHOLD = 10000;
const MAX_SCORE_PER_SECOND = 500;

const POWERUP_REWARDS = [
  { id: "undo", name: "Undo", icon: "arrow-undo", description: "Reverse last move" },
  { id: "shuffle", name: "Shuffle", icon: "refresh", description: "Get new blocks" },
  { id: "hint", name: "Hint", icon: "bulb", description: "Show best placement" },
  { id: "swap", name: "Swap", icon: "swap-horizontal", description: "Swap a block" },
];

function sendMessage(ws: WebSocket, type: string, data: Record<string, unknown>) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, ...data }));
  }
}

function generateSeed(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 11);
}

function getBotUsername(): string {
  const names = [
    "BlockMaster", "CubeKing", "PuzzleBot", "NeonPlayer",
    "GridRunner", "BlastPro", "StackChamp", "TileWhiz",
    "BlockStar", "ClearKing", "ComboBot", "LineAce",
  ];
  return names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 999);
}

function createBotPlayer(targetElo: number): PlayerSocket {
  const eloVariance = Math.floor(Math.random() * 100) - 50;
  const mockWs = {
    readyState: WebSocket.OPEN,
    send: () => {},
    close: () => {},
  } as unknown as WebSocket;

  return {
    ws: mockWs,
    userId: `bot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    username: getBotUsername(),
    eloRating: Math.max(800, targetElo + eloVariance),
    isBot: true,
  };
}

function findMatch(): [PlayerSocket, PlayerSocket] | null {
  if (queue.length < 2) return null;

  for (let i = 0; i < queue.length; i++) {
    for (let j = i + 1; j < queue.length; j++) {
      const diff = Math.abs(queue[i].eloRating - queue[j].eloRating);
      const joinTime = queueJoinTimes.get(queue[i].userId) || Date.now();
      const waitI = (Date.now() - joinTime) / 1000;
      const expandedRange = 200 + waitI * 50;
      if (diff <= expandedRange) {
        const p1 = queue.splice(j, 1)[0];
        const p2 = queue.splice(i, 1)[0];
        queueJoinTimes.delete(p1.userId);
        queueJoinTimes.delete(p2.userId);
        return [p2, p1];
      }
    }
  }
  return null;
}

function checkForBotMatch(): [PlayerSocket, PlayerSocket] | null {
  const now = Date.now();
  for (let i = 0; i < queue.length; i++) {
    const player = queue[i];
    if (player.isBot) continue;
    const joinTime = queueJoinTimes.get(player.userId) || now;
    if (now - joinTime >= BOT_WAIT_THRESHOLD) {
      queue.splice(i, 1);
      queueJoinTimes.delete(player.userId);
      const bot = createBotPlayer(player.eloRating);
      return [player, bot];
    }
  }
  return null;
}

function simulateBotPlay(match: ActiveMatch) {
  const botPlayer = match.player1.isBot ? "player1" : "player2";
  const humanPlayer = botPlayer === "player1" ? "player2" : "player1";
  let botScore = 0;
  let botPieces = 0;

  const interval = setInterval(() => {
    if (match.ended) {
      clearInterval(interval);
      return;
    }

    const elapsed = (Date.now() - match.startTime) / 1000;
    if (elapsed > match.duration) {
      clearInterval(interval);
      return;
    }

    const shouldPlace = Math.random() < 0.7;
    if (shouldPlace) {
      botPieces++;
      const baseScore = Math.floor(Math.random() * 15) + 5;
      const comboChance = Math.random();
      let bonus = 0;
      if (comboChance < 0.15) {
        bonus = Math.floor(Math.random() * 80) + 40;
      } else if (comboChance < 0.35) {
        bonus = Math.floor(Math.random() * 30) + 10;
      }
      botScore += baseScore + bonus;

      if (botPlayer === "player1") {
        match.player1Score = botScore;
        match.player1Pieces = botPieces;
        sendMessage(match.player2.ws, "opponent_update", {
          score: botScore,
          piecesPlaced: botPieces,
        });
      } else {
        match.player2Score = botScore;
        match.player2Pieces = botPieces;
        sendMessage(match.player1.ws, "opponent_update", {
          score: botScore,
          piecesPlaced: botPieces,
        });
      }
    }
  }, 2500 + Math.floor(Math.random() * 1500));

  match.botInterval = interval;
}

function getRandomPowerUpReward(): { id: string; name: string; count: number } {
  const pu = POWERUP_REWARDS[Math.floor(Math.random() * POWERUP_REWARDS.length)];
  return { id: pu.id, name: pu.name, count: 1 };
}

async function startMatch(p1: PlayerSocket, p2: PlayerSocket) {
  const seed = generateSeed();
  const hasBot = p1.isBot || p2.isBot;

  const realP1Id = p1.isBot ? p2.userId : p1.userId;
  const realP2Id = p2.isBot ? null : p2.userId;

  const [dbMatch] = await db
    .insert(matches)
    .values({
      player1Id: realP1Id,
      player2Id: realP2Id || realP1Id,
      pieceSeed: seed,
      status: "active",
      duration: 120,
    })
    .returning();

  const match: ActiveMatch = {
    id: dbMatch.id,
    player1: p1,
    player2: p2,
    seed,
    startTime: Date.now(),
    duration: 120,
    player1Score: 0,
    player2Score: 0,
    player1Pieces: 0,
    player2Pieces: 0,
    timer: null,
    ended: false,
    botInterval: null,
  };

  activeMatches.set(dbMatch.id, match);

  const rng = createSeededRandom(seed);
  const initialPieces = [];
  for (let i = 0; i < 6; i++) {
    initialPieces.push(generateSeededPiece(rng));
  }

  const matchData = {
    matchId: dbMatch.id,
    seed,
    duration: 120,
    initialPieces,
    opponent: { username: "", eloRating: 0 },
  };

  if (!p1.isBot) {
    sendMessage(p1.ws, "match_found", {
      ...matchData,
      opponent: { username: p2.username, eloRating: p2.eloRating },
    });
  }

  if (!p2.isBot) {
    sendMessage(p2.ws, "match_found", {
      ...matchData,
      opponent: { username: p1.username, eloRating: p1.eloRating },
    });
  }

  setTimeout(() => {
    if (!p1.isBot) sendMessage(p1.ws, "game_start", { matchId: dbMatch.id });
    if (!p2.isBot) sendMessage(p2.ws, "game_start", { matchId: dbMatch.id });

    if (hasBot) {
      match.startTime = Date.now();
      simulateBotPlay(match);
    }
  }, 3000);

  match.timer = setTimeout(() => {
    endMatch(dbMatch.id);
  }, (120 + 3) * 1000);
}

async function endMatch(matchId: number) {
  const match = activeMatches.get(matchId);
  if (!match || match.ended) return;
  match.ended = true;

  if (match.timer) clearTimeout(match.timer);
  if (match.botInterval) clearInterval(match.botInterval);

  let winnerId: string | null = null;
  let p1Won = false;
  let p2Won = false;

  if (match.player1Score > match.player2Score) {
    winnerId = match.player1.userId;
    p1Won = true;
  } else if (match.player2Score > match.player1Score) {
    winnerId = match.player2.userId;
    p2Won = true;
  }

  const hasBot = match.player1.isBot || match.player2.isBot;
  const humanPlayer = match.player1.isBot ? match.player2 : match.player1;
  const humanIsP1 = !match.player1.isBot;
  const humanWon = humanIsP1 ? p1Won : p2Won;
  const humanLost = humanIsP1 ? p2Won : p1Won;
  const isDraw = !winnerId;

  const coinsWinner = 150;
  const coinsLoser = 25;
  const coinsDraw = 75;

  const winnerPowerUp = getRandomPowerUpReward();

  if (hasBot) {
    const humanElo = humanPlayer.eloRating;
    const botElo = match.player1.isBot ? match.player1.eloRating : match.player2.eloRating;
    const newHumanElo = calculateElo(humanElo, botElo, humanWon);

    const humanCoins = humanWon ? coinsWinner : isDraw ? coinsDraw : coinsLoser;

    await db
      .update(matches)
      .set({
        player1Score: match.player1Score,
        player2Score: match.player2Score,
        winnerId: humanWon ? humanPlayer.userId : null,
        status: "completed",
      })
      .where(eq(matches.id, matchId));

    await db
      .update(users)
      .set({
        eloRating: newHumanElo,
        league: getLeague(newHumanElo),
        wins: humanWon ? sql`wins + 1` : sql`wins`,
        losses: humanLost ? sql`losses + 1` : sql`losses`,
        draws: isDraw ? sql`draws + 1` : sql`draws`,
        coins: sql`coins + ${humanCoins}`,
      })
      .where(eq(users.id, humanPlayer.userId));

    const humanScore = humanIsP1 ? match.player1Score : match.player2Score;
    const botScore = humanIsP1 ? match.player2Score : match.player1Score;

    const resultPayload: any = {
      matchId,
      player1Score: match.player1Score,
      player2Score: match.player2Score,
      winnerId: humanWon ? humanPlayer.userId : null,
      yourScore: humanScore,
      opponentScore: botScore,
      won: humanWon,
      draw: isDraw,
      eloChange: newHumanElo - humanElo,
      newElo: newHumanElo,
      newLeague: getLeague(newHumanElo),
      coinsEarned: humanCoins,
      powerUpReward: humanWon ? winnerPowerUp : null,
    };

    sendMessage(humanPlayer.ws, "match_result", resultPayload);
  } else {
    const newP1Elo = calculateElo(
      match.player1.eloRating,
      match.player2.eloRating,
      p1Won
    );
    const newP2Elo = calculateElo(
      match.player2.eloRating,
      match.player1.eloRating,
      p2Won
    );

    await db
      .update(matches)
      .set({
        player1Score: match.player1Score,
        player2Score: match.player2Score,
        winnerId,
        status: "completed",
      })
      .where(eq(matches.id, matchId));

    await db
      .update(users)
      .set({
        eloRating: newP1Elo,
        league: getLeague(newP1Elo),
        wins: p1Won ? sql`wins + 1` : sql`wins`,
        losses: p2Won ? sql`losses + 1` : sql`losses`,
        draws: !winnerId ? sql`draws + 1` : sql`draws`,
      })
      .where(eq(users.id, match.player1.userId));

    await db
      .update(users)
      .set({
        eloRating: newP2Elo,
        league: getLeague(newP2Elo),
        wins: p2Won ? sql`wins + 1` : sql`wins`,
        losses: p1Won ? sql`losses + 1` : sql`losses`,
        draws: !winnerId ? sql`draws + 1` : sql`draws`,
      })
      .where(eq(users.id, match.player2.userId));

    const coinsP1 = p1Won ? coinsWinner : winnerId ? coinsLoser : coinsDraw;
    const coinsP2 = p2Won ? coinsWinner : winnerId ? coinsLoser : coinsDraw;

    await db
      .update(users)
      .set({ coins: sql`coins + ${coinsP1}` })
      .where(eq(users.id, match.player1.userId));
    await db
      .update(users)
      .set({ coins: sql`coins + ${coinsP2}` })
      .where(eq(users.id, match.player2.userId));

    const resultBase = {
      matchId,
      player1Score: match.player1Score,
      player2Score: match.player2Score,
      winnerId,
    };

    sendMessage(match.player1.ws, "match_result", {
      ...resultBase,
      yourScore: match.player1Score,
      opponentScore: match.player2Score,
      won: p1Won,
      draw: !winnerId,
      eloChange: newP1Elo - match.player1.eloRating,
      newElo: newP1Elo,
      newLeague: getLeague(newP1Elo),
      coinsEarned: coinsP1,
      powerUpReward: p1Won ? winnerPowerUp : null,
    });

    sendMessage(match.player2.ws, "match_result", {
      ...resultBase,
      yourScore: match.player2Score,
      opponentScore: match.player1Score,
      won: p2Won,
      draw: !winnerId,
      eloChange: newP2Elo - match.player2.eloRating,
      newElo: newP2Elo,
      newLeague: getLeague(newP2Elo),
      coinsEarned: coinsP2,
      powerUpReward: p2Won ? winnerPowerUp : null,
    });
  }

  activeMatches.delete(matchId);
}

function handleMessage(player: PlayerSocket, data: any) {
  switch (data.type) {
    case "join_queue": {
      if (!queue.find((p) => p.userId === player.userId)) {
        queue.push(player);
        queueJoinTimes.set(player.userId, Date.now());
        sendMessage(player.ws, "queue_joined", {
          position: queue.length,
        });
      }

      const pair = findMatch();
      if (pair) {
        startMatch(pair[0], pair[1]);
      }
      break;
    }

    case "leave_queue": {
      const idx = queue.findIndex((p) => p.userId === player.userId);
      if (idx >= 0) queue.splice(idx, 1);
      queueJoinTimes.delete(player.userId);
      sendMessage(player.ws, "queue_left", {});
      break;
    }

    case "score_update": {
      const match = activeMatches.get(data.matchId);
      if (!match || match.ended) break;

      const rawScore = Number(data.score);
      const rawPieces = Number(data.piecesPlaced) || 0;
      if (!Number.isFinite(rawScore) || rawScore < 0) break;

      const elapsedSec = Math.max(1, (Date.now() - match.startTime) / 1000);
      const maxAllowed = Math.ceil(elapsedSec * MAX_SCORE_PER_SECOND);
      const clampedScore = Math.min(rawScore, maxAllowed);

      if (match.player1.userId === player.userId) {
        if (clampedScore < match.player1Score) break;
        match.player1Score = clampedScore;
        match.player1Pieces = rawPieces;
        sendMessage(match.player2.ws, "opponent_update", {
          score: clampedScore,
          piecesPlaced: rawPieces,
        });
      } else if (match.player2.userId === player.userId) {
        if (clampedScore < match.player2Score) break;
        match.player2Score = clampedScore;
        match.player2Pieces = rawPieces;
        sendMessage(match.player1.ws, "opponent_update", {
          score: clampedScore,
          piecesPlaced: rawPieces,
        });
      }
      break;
    }

    case "request_pieces": {
      const m = activeMatches.get(data.matchId);
      if (!m || m.ended) break;
      const rng = createSeededRandom(m.seed + "_" + data.batchIndex);
      const pieces = [];
      for (let i = 0; i < 3; i++) {
        pieces.push(generateSeededPiece(rng));
      }
      sendMessage(player.ws, "new_pieces", {
        pieces,
        batchIndex: data.batchIndex,
      });
      break;
    }
  }
}

export function setupWebSocket(server: Server, sessionMiddleware: RequestHandler) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    let player: PlayerSocket | null = null;

    const fakeRes = {
      end: () => {},
      writeHead: () => {},
      setHeader: () => fakeRes,
      getHeader: () => undefined,
      removeHeader: () => {},
      statusCode: 200,
    } as any;
    sessionMiddleware(req as any, fakeRes, async () => {
      const sessionUserId = (req as any).session?.userId;
      if (!sessionUserId) {
        sendMessage(ws, "error", { message: "Not authenticated" });
        ws.close();
        return;
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, sessionUserId))
        .limit(1);

      if (!user) {
        sendMessage(ws, "error", { message: "Invalid user" });
        ws.close();
        return;
      }

      player = {
        ws,
        userId: user.id,
        username: user.username,
        eloRating: user.eloRating,
      };

      connectedPlayers.set(user.id, player);
      sendMessage(ws, "authenticated", {
        userId: user.id,
        username: user.username,
        eloRating: user.eloRating,
        league: user.league,
      });
    });

    ws.on("message", async (raw: Buffer) => {
      try {
        const data = JSON.parse(raw.toString());

        if (data.type === "auth") {
          return;
        }

        if (!player) {
          sendMessage(ws, "error", { message: "Not authenticated" });
          return;
        }

        handleMessage(player, data);
      } catch (err) {
        console.error("WS message error:", err);
      }
    });

    ws.on("close", () => {
      if (player) {
        connectedPlayers.delete(player.userId);
        const idx = queue.findIndex((p) => p.userId === player!.userId);
        if (idx >= 0) {
          queue.splice(idx, 1);
          queueJoinTimes.delete(player.userId);
        }
      }
    });
  });

  setInterval(() => {
    const pair = findMatch();
    if (pair) {
      startMatch(pair[0], pair[1]);
    } else {
      const botPair = checkForBotMatch();
      if (botPair) {
        startMatch(botPair[0], botPair[1]);
      }
    }
  }, 2000);

  return wss;
}
