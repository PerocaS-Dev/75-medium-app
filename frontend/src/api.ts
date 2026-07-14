export class ApiAuthError extends Error {
  constructor() {
    super("Unauthenticated");
    this.name = "ApiAuthError";
  }
}

export class ApiForbiddenError extends Error {
  constructor() {
    super("Forbidden");
    this.name = "ApiForbiddenError";
  }
}

function assertAuth(res: Response) {
  if (res.status === 401) throw new ApiAuthError();
  if (res.status === 403) throw new ApiForbiddenError();
}

export interface ChallengeResponse {
  id: string;
  status: "PENDING" | "ACTIVE" | "COMPLETED" | "FAILED" | "ABANDONED";
  currentStreak: number;
  currentTier: number;
  missBufferRemaining: number;
  bestStreak: number;
  startDate: string;
  lastStateChangeReason: string | null;
}

export interface TaskResponse {
  id: string;
  label: string;
  sortOrder: number;
  locked: boolean;
}

export interface DailyTaskCheckResponse {
  taskDefinitionId: string;
  checkedAt: string;
}

export async function getActiveChallenge(): Promise<ChallengeResponse | null> {
  const res = await fetch("/api/challenges/active");
  assertAuth(res);
  if (res.status === 204 || res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to get active challenge: ${res.status}`);
  const text = await res.text();
  if (!text.trim()) return null;
  return JSON.parse(text);
}

export async function createChallenge(): Promise<ChallengeResponse> {
  const res = await fetch("/api/challenges", { method: "POST" });
  assertAuth(res);
  if (!res.ok) throw new Error("Failed to create challenge");
  return res.json();
}

export async function getTasks(challengeId: string): Promise<TaskResponse[]> {
  const res = await fetch(`/api/challenges/${challengeId}/tasks`);
  assertAuth(res);
  if (!res.ok) throw new Error("Failed to load tasks");
  return res.json();
}

export async function addTask(challengeId: string, label: string): Promise<TaskResponse> {
  const res = await fetch(`/api/challenges/${challengeId}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label }),
  });
  assertAuth(res);
  if (!res.ok) throw new Error("Failed to add task");
  return res.json();
}

export async function deleteTask(challengeId: string, taskId: string): Promise<void> {
  const res = await fetch(`/api/challenges/${challengeId}/tasks/${taskId}`, {
    method: "DELETE",
  });
  assertAuth(res);
  if (!res.ok) throw new Error("Failed to delete task");
}

export async function reorderTasks(challengeId: string, orderedIds: string[]): Promise<void> {
  const res = await fetch(`/api/challenges/${challengeId}/tasks/reorder`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderedIds }),
  });
  assertAuth(res);
  if (!res.ok) throw new Error("Failed to reorder tasks");
}

/**
 * Locks tasks and starts the challenge. `startDate` (ISO yyyy-MM-dd) chooses Day 1 and must be
 * today or tomorrow in the user's time zone; omit to start today.
 */
export async function startChallenge(
  challengeId: string,
  startDate?: string
): Promise<ChallengeResponse> {
  const res = await fetch(`/api/challenges/${challengeId}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(startDate ? { startDate } : {}),
  });
  assertAuth(res);
  if (!res.ok) throw new Error("Failed to start challenge");
  return res.json();
}

export async function getTodayChecks(challengeId: string): Promise<DailyTaskCheckResponse[]> {
  const res = await fetch(`/api/challenges/${challengeId}/today/checks`);
  assertAuth(res);
  if (!res.ok) throw new Error("Failed to load today's checks");
  return res.json();
}

export async function checkTask(challengeId: string, taskId: string): Promise<void> {
  const res = await fetch(`/api/challenges/${challengeId}/today/tasks/${taskId}/check`, {
    method: "POST",
  });
  assertAuth(res);
  if (!res.ok) throw new Error("Failed to check task");
}

export async function uncheckTask(challengeId: string, taskId: string): Promise<void> {
  const res = await fetch(`/api/challenges/${challengeId}/today/tasks/${taskId}/check`, {
    method: "DELETE",
  });
  assertAuth(res);
  if (!res.ok) throw new Error("Failed to uncheck task");
}

// ── Friends ──────────────────────────────────────────────────────────────────

export interface UserProfileResponse {
  id: string;
  displayName: string;
}

export interface UserProgressResponse {
  userId: string;
  displayName: string;
  currentStreak: number;
  currentTier: number;
  missBufferRemaining: number;
  bestStreak: number;
  lastStateChangeReason: string | null;
  challengeStatus: string;
  startDate: string;
  dayNumber: number;
  todayDoneCount: number;
  todayTaskTotal: number;
  lastActivityAt: string | null;
}

export interface FriendshipResponse {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: "PENDING" | "ACCEPTED" | "BLOCKED";
  createdAt: string;
}

export async function lookupUserByEmail(email: string): Promise<UserProfileResponse | null> {
  const res = await fetch(`/api/users/lookup?email=${encodeURIComponent(email)}`);
  assertAuth(res);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Lookup failed");
  return res.json();
}

export async function getUserProfile(userId: string): Promise<UserProfileResponse | null> {
  const res = await fetch(`/api/users/${userId}/profile`);
  assertAuth(res);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to get profile");
  return res.json();
}

export async function getFriendProgress(userId: string): Promise<UserProgressResponse | null> {
  const res = await fetch(`/api/users/${userId}/progress`);
  assertAuth(res);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to get progress");
  return res.json();
}

export async function getFriends(): Promise<FriendshipResponse[]> {
  const res = await fetch("/api/friends");
  assertAuth(res);
  if (!res.ok) throw new Error("Failed to load friends");
  return res.json();
}

export async function getIncomingRequests(): Promise<FriendshipResponse[]> {
  const res = await fetch("/api/friends/requests");
  assertAuth(res);
  if (!res.ok) throw new Error("Failed to load requests");
  return res.json();
}

export async function getOutgoingRequests(): Promise<FriendshipResponse[]> {
  const res = await fetch("/api/friends/pending");
  assertAuth(res);
  if (!res.ok) throw new Error("Failed to load pending invites");
  return res.json();
}

export async function sendFriendRequest(addresseeId: string): Promise<FriendshipResponse> {
  const res = await fetch("/api/friends/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ addresseeId }),
  });
  assertAuth(res);
  if (!res.ok) throw new Error("Failed to send request");
  return res.json();
}

export async function acceptRequest(friendshipId: string): Promise<FriendshipResponse> {
  const res = await fetch(`/api/friends/${friendshipId}/accept`, { method: "POST" });
  assertAuth(res);
  if (!res.ok) throw new Error("Failed to accept request");
  return res.json();
}

export async function declineRequest(friendshipId: string): Promise<void> {
  const res = await fetch(`/api/friends/${friendshipId}/decline`, { method: "POST" });
  assertAuth(res);
  if (!res.ok) throw new Error("Failed to decline request");
}

export async function removeFriend(friendshipId: string): Promise<void> {
  const res = await fetch(`/api/friends/${friendshipId}`, { method: "DELETE" });
  assertAuth(res);
  if (!res.ok) throw new Error("Failed to remove friend");
}

// ── Journals ──────────────────────────────────────────────────────────────────

export interface JournalEntryResponse {
  id: string;
  userId: string;
  body: string;
  entryDate: string;
  audienceType: "SELF" | "FRIENDS";
  createdAt: string;
  updatedAt: string;
}

export interface ReactionResponse {
  id: string;
  userId: string;
  displayName: string;
  type: "LIKE" | "FIRE" | "STRONG" | "LAUGH" | "CELEBRATE" | "SAD";
  replyBody: string | null;
  createdAt: string;
}

export async function getMyJournals(): Promise<JournalEntryResponse[]> {
  const res = await fetch("/api/journals");
  assertAuth(res);
  if (!res.ok) throw new Error("Failed to load journals");
  return res.json();
}

export async function createJournalEntry(
  body: string,
  entryDate: string,
  audienceType: string
): Promise<JournalEntryResponse> {
  const res = await fetch("/api/journals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body, entryDate, audienceType }),
  });
  assertAuth(res);
  if (!res.ok) throw new Error("Failed to create journal entry");
  return res.json();
}

export async function updateJournalEntry(
  id: string,
  body?: string,
  audienceType?: string
): Promise<JournalEntryResponse> {
  const res = await fetch(`/api/journals/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body, audienceType }),
  });
  assertAuth(res);
  if (!res.ok) throw new Error("Failed to update journal entry");
  return res.json();
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const res = await fetch(`/api/journals/${id}`, { method: "DELETE" });
  assertAuth(res);
  if (!res.ok) throw new Error("Failed to delete journal entry");
}

export async function getFriendJournals(userId: string): Promise<JournalEntryResponse[]> {
  const res = await fetch(`/api/users/${userId}/journals`);
  assertAuth(res);
  if (res.status === 403) throw new ApiForbiddenError();
  if (!res.ok) throw new Error("Failed to load friend journals");
  return res.json();
}

export async function getReactions(entryId: string): Promise<ReactionResponse[]> {
  const res = await fetch(`/api/journals/${entryId}/reactions`);
  assertAuth(res);
  if (!res.ok) throw new Error("Failed to load reactions");
  return res.json();
}

export async function addReaction(
  entryId: string,
  type: string,
  replyBody?: string
): Promise<ReactionResponse> {
  const res = await fetch(`/api/journals/${entryId}/reactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, replyBody }),
  });
  assertAuth(res);
  if (!res.ok) throw new Error("Failed to add reaction");
  return res.json();
}

export async function removeReaction(entryId: string): Promise<void> {
  const res = await fetch(`/api/journals/${entryId}/reactions`, { method: "DELETE" });
  assertAuth(res);
  if (!res.ok) throw new Error("Failed to remove reaction");
}

// ── Notifications ───────────────────────────────────────────────────────────────

export type NotificationType =
  | "JOURNAL_REACTION"
  | "JOURNAL_COMMENT"
  | "PHOTO_REACTION"
  | "FRIEND_REQUEST"
  | "FRIEND_ACCEPT";

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  actorId: string;
  actorDisplayName: string;
  reactionType: string | null;
  targetId: string | null;
  preview: string | null;
  read: boolean;
  createdAt: string;
}

export async function getNotifications(): Promise<NotificationResponse[]> {
  const res = await fetch("/api/notifications");
  assertAuth(res);
  if (!res.ok) throw new Error("Failed to load notifications");
  return res.json();
}

export async function getUnreadNotificationCount(): Promise<number> {
  const res = await fetch("/api/notifications/unread-count");
  assertAuth(res);
  if (!res.ok) throw new Error("Failed to load unread count");
  const data: { count: number } = await res.json();
  return data.count;
}

export async function markNotificationsRead(): Promise<void> {
  const res = await fetch("/api/notifications/mark-read", { method: "POST" });
  assertAuth(res);
  if (!res.ok) throw new Error("Failed to mark notifications read");
}

// ── Photos ────────────────────────────────────────────────────────────────────

export interface PhotoResponse {
  id: string;
  caption: string | null;
  audienceType: "SELF" | "FRIENDS";
  contentType: string;
  createdAt: string;
}

export async function recordPopiaConsent(): Promise<void> {
  const res = await fetch("/api/auth/popia-consent", { method: "POST" });
  assertAuth(res);
  if (!res.ok) throw new Error("Failed to record consent");
}

export async function getMyPhotos(): Promise<PhotoResponse[]> {
  const res = await fetch("/api/photos");
  assertAuth(res);
  if (!res.ok) throw new Error("Failed to load photos");
  return res.json();
}

export async function getPhotoSignedUrl(id: string): Promise<string> {
  const res = await fetch(`/api/photos/${id}/url`);
  assertAuth(res);
  if (!res.ok) throw new Error("Failed to get signed URL");
  const data: { url: string } = await res.json();
  return data.url;
}

export async function uploadPhoto(
  file: File,
  caption: string | undefined,
  audienceType: string
): Promise<PhotoResponse> {
  const form = new FormData();
  form.append("file", file);
  if (caption) form.append("caption", caption);
  form.append("audienceType", audienceType);
  const res = await fetch("/api/photos", { method: "POST", body: form });
  assertAuth(res);
  if (res.status === 403) throw new ApiForbiddenError();
  if (!res.ok) throw new Error("Failed to upload photo");
  return res.json();
}

export async function getFriendPhotos(userId: string): Promise<PhotoResponse[]> {
  const res = await fetch(`/api/users/${userId}/photos`);
  assertAuth(res);
  if (res.status === 403) throw new ApiForbiddenError();
  if (!res.ok) throw new Error("Failed to load friend photos");
  return res.json();
}

export async function deletePhoto(id: string): Promise<void> {
  const res = await fetch(`/api/photos/${id}`, { method: "DELETE" });
  assertAuth(res);
  if (!res.ok) throw new Error("Failed to delete photo");
}

export interface PhotoReactionResponse {
  id: string;
  userId: string;
  displayName: string;
  type: "LIKE" | "FIRE" | "STRONG" | "LAUGH" | "CELEBRATE" | "SAD";
  createdAt: string;
}

export async function getPhotoReactions(photoId: string): Promise<PhotoReactionResponse[]> {
  const res = await fetch(`/api/photos/${photoId}/reactions`);
  assertAuth(res);
  if (!res.ok) throw new Error("Failed to load photo reactions");
  return res.json();
}

export async function addPhotoReaction(photoId: string, type: string): Promise<PhotoReactionResponse> {
  const res = await fetch(`/api/photos/${photoId}/reactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type }),
  });
  assertAuth(res);
  if (!res.ok) throw new Error("Failed to add photo reaction");
  return res.json();
}

export async function removePhotoReaction(photoId: string): Promise<void> {
  const res = await fetch(`/api/photos/${photoId}/reactions`, { method: "DELETE" });
  assertAuth(res);
  if (!res.ok) throw new Error("Failed to remove photo reaction");
}
