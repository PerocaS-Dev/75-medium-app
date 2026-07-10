// Shared helpers for the Friends section — state derivation, avatars, time.
import type { UserProgressResponse } from "./api";

export const CHALLENGE_LENGTH = 75;

export type FriendState = "on-track" | "buffer-low" | "fell-back" | "none";

const FELL_BACK = new Set(["RESET_TO_0", "FELL_BACK_TO_20", "FELL_BACK_TO_40"]);

// Mirrors StreakEngine.freshBufferFor on the backend.
function maxBufferForTier(tier: number): number {
  switch (tier) {
    case 2:
    case 3:
      return 3;
    case 4:
      return 1;
    default:
      return 0;
  }
}

/**
 * Buffer state → the on-track / buffer-low / fell-back signal, derived purely
 * from the progress counts (never from which task). "none" = no active run yet.
 */
export function deriveState(p: UserProgressResponse | null): FriendState {
  if (!p || p.challengeStatus === "PENDING") return "none";
  const reason = p.lastStateChangeReason;
  if (reason && FELL_BACK.has(reason)) return "fell-back";
  const maxBuf = maxBufferForTier(p.currentTier);
  if (reason === "MISS_WITHIN_BUFFER" || (maxBuf > 0 && p.missBufferRemaining === 0)) {
    return "buffer-low";
  }
  return "on-track";
}

export const STATE_META: Record<
  FriendState,
  { label: string; dot: string; bar: string; text: string }
> = {
  "on-track": { label: "On track", dot: "bg-sage-500", bar: "bg-sage-500", text: "text-sage-600" },
  "buffer-low": { label: "Buffer low", dot: "bg-peach-500", bar: "bg-peach-500", text: "text-peach-600" },
  "fell-back": { label: "Fell back", dot: "bg-rust-500", bar: "bg-rust-500", text: "text-rust-600" },
  none: { label: "Not started", dot: "bg-clay-300", bar: "bg-clay-300", text: "text-clay-400" },
};

const AVATAR_COLORS = ["bg-sage-500", "bg-blush-500", "bg-lilac-500", "bg-peach-500", "bg-clay-400"];

export function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function initial(name: string | undefined): string {
  return (name?.trim()[0] ?? "?").toUpperCase();
}

/** Compact relative time for feed cards: "5h ago", "yesterday", "3 Jul". */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en", { day: "numeric", month: "short" });
}

/** Human "last updated" phrasing for the drill-down: "this morning", "yesterday". */
export function lastUpdatedText(iso: string | null): string {
  if (!iso) return "not yet";
  const then = new Date(iso);
  const now = new Date();
  if (then.toDateString() === now.toDateString()) {
    const h = then.getHours();
    if (h < 12) return "this morning";
    if (h < 17) return "this afternoon";
    return "this evening";
  }
  const days = Math.floor((now.getTime() - then.getTime()) / 86400000);
  if (days <= 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString("en", { day: "numeric", month: "short" });
}
