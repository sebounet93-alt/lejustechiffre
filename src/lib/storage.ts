const NICKNAME_KEY = "player_nickname";
const MY_DUELS_KEY = "my_created_duels";
const SUBMITTED_DUELS_KEY = "my_submitted_duels";

export function getNickname(): string | null {
  try {
    return localStorage.getItem(NICKNAME_KEY);
  } catch {
    return null;
  }
}

export function setNickname(name: string): void {
  try {
    localStorage.setItem(NICKNAME_KEY, name);
  } catch {
    // ignore
  }
}

export function getMyCreatedDuelIds(): string[] {
  try {
    const raw = localStorage.getItem(MY_DUELS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function addMyCreatedDuelId(id: string): void {
  try {
    const ids = getMyCreatedDuelIds();
    if (!ids.includes(id)) {
      ids.unshift(id);
      localStorage.setItem(MY_DUELS_KEY, JSON.stringify(ids));
    }
  } catch {
    // ignore
  }
}

export function getSubmittedDuelIds(): string[] {
  try {
    const raw = localStorage.getItem(SUBMITTED_DUELS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function addSubmittedDuelId(id: string): void {
  try {
    const ids = getSubmittedDuelIds();
    if (!ids.includes(id)) {
      ids.unshift(id);
      localStorage.setItem(SUBMITTED_DUELS_KEY, JSON.stringify(ids));
    }
  } catch {
    // ignore
  }
}

export function hasSubmittedDuel(id: string): boolean {
  return getSubmittedDuelIds().includes(id);
}

/* ---------- Player personal stats ---------- */

const PLAYER_STATS_KEY = "player_stats";

export interface PlayerStats {
  gamesPlayed: number;
  totalAccuracy: number;
  perfectCount: number;
}

const EMPTY_STATS: PlayerStats = { gamesPlayed: 0, totalAccuracy: 0, perfectCount: 0 };

export function getPlayerStats(): PlayerStats {
  try {
    const raw = localStorage.getItem(PLAYER_STATS_KEY);
    return raw ? { ...EMPTY_STATS, ...JSON.parse(raw) } : { ...EMPTY_STATS };
  } catch {
    return { ...EMPTY_STATS };
  }
}

export function recordGame(accuracy: number): PlayerStats {
  const stats = getPlayerStats();
  stats.gamesPlayed += 1;
  stats.totalAccuracy += accuracy;
  if (accuracy === 100) stats.perfectCount += 1;
  try {
    localStorage.setItem(PLAYER_STATS_KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }
  return stats;
}

export function getAverageAccuracy(stats?: PlayerStats): number {
  const s = stats ?? getPlayerStats();
  if (s.gamesPlayed === 0) return 0;
  return s.totalAccuracy / s.gamesPlayed;
}

/* ---------- Seen questions history (30-day sliding window) ---------- */

const SEEN_QUESTIONS_KEY = "seen_questions";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

interface SeenEntry {
  id: number;
  seenAt: number;
}

export function getCleanSeenQuestionIds(): number[] {
  try {
    const raw = localStorage.getItem(SEEN_QUESTIONS_KEY);
    const entries: SeenEntry[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const fresh = entries.filter((e) => now - e.seenAt < THIRTY_DAYS_MS);
    if (fresh.length !== entries.length) {
      localStorage.setItem(SEEN_QUESTIONS_KEY, JSON.stringify(fresh));
    }
    return fresh.map((e) => e.id);
  } catch {
    return [];
  }
}

export function markQuestionSeen(id: number): void {
  try {
    const raw = localStorage.getItem(SEEN_QUESTIONS_KEY);
    const entries: SeenEntry[] = raw ? JSON.parse(raw) : [];
    const updated = entries.filter((e) => e.id !== id);
    updated.push({ id, seenAt: Date.now() });
    localStorage.setItem(SEEN_QUESTIONS_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

/* ---------- Match mode: submitted match IDs ---------- */

const SUBMITTED_MATCHES_KEY = "my_submitted_matches";

export function hasSubmittedMatch(id: string): boolean {
  try {
    const raw = localStorage.getItem(SUBMITTED_MATCHES_KEY);
    return raw ? (JSON.parse(raw) as string[]).includes(id) : false;
  } catch {
    return false;
  }
}

export function addSubmittedMatchId(id: string): void {
  try {
    const raw = localStorage.getItem(SUBMITTED_MATCHES_KEY);
    const ids = raw ? (JSON.parse(raw) as string[]) : [];
    if (!ids.includes(id)) {
      ids.unshift(id);
      localStorage.setItem(SUBMITTED_MATCHES_KEY, JSON.stringify(ids));
    }
  } catch {
    // ignore
  }
}
