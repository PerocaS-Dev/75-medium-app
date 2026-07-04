export class ApiAuthError extends Error {
  constructor() {
    super("Unauthenticated");
    this.name = "ApiAuthError";
  }
}

function assertAuth(res: Response) {
  if (res.status === 401) throw new ApiAuthError();
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

export async function startChallenge(challengeId: string): Promise<ChallengeResponse> {
  const res = await fetch(`/api/challenges/${challengeId}/start`, { method: "POST" });
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
