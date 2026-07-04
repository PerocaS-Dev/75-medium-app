export interface ChallengeResponse {
  id: string;
  status: "PENDING" | "ACTIVE" | "COMPLETED" | "FAILED" | "ABANDONED";
  currentDay: number;
  currentStreak: number;
  currentTier: number;
  missBufferRemaining: number;
  personalBestDays: number;
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
  if (res.status === 204 || res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to get active challenge: ${res.status}`);
  const text = await res.text();
  if (!text.trim()) return null;
  return JSON.parse(text);
}

export async function createChallenge(): Promise<ChallengeResponse> {
  const res = await fetch("/api/challenges", { method: "POST" });
  if (!res.ok) throw new Error("Failed to create challenge");
  return res.json();
}

export async function getTasks(challengeId: string): Promise<TaskResponse[]> {
  const res = await fetch(`/api/challenges/${challengeId}/tasks`);
  if (!res.ok) throw new Error("Failed to load tasks");
  return res.json();
}

export async function addTask(challengeId: string, label: string): Promise<TaskResponse> {
  const res = await fetch(`/api/challenges/${challengeId}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label }),
  });
  if (!res.ok) throw new Error("Failed to add task");
  return res.json();
}

export async function deleteTask(challengeId: string, taskId: string): Promise<void> {
  const res = await fetch(`/api/challenges/${challengeId}/tasks/${taskId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete task");
}

export async function reorderTasks(challengeId: string, orderedIds: string[]): Promise<void> {
  const res = await fetch(`/api/challenges/${challengeId}/tasks/reorder`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderedIds }),
  });
  if (!res.ok) throw new Error("Failed to reorder tasks");
}

export async function startChallenge(challengeId: string): Promise<ChallengeResponse> {
  const res = await fetch(`/api/challenges/${challengeId}/start`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to start challenge");
  return res.json();
}

export async function getTodayChecks(challengeId: string): Promise<DailyTaskCheckResponse[]> {
  const res = await fetch(`/api/challenges/${challengeId}/today/checks`);
  if (!res.ok) throw new Error("Failed to load today's checks");
  return res.json();
}

export async function checkTask(challengeId: string, taskId: string): Promise<void> {
  const res = await fetch(`/api/challenges/${challengeId}/today/tasks/${taskId}/check`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to check task");
}

export async function uncheckTask(challengeId: string, taskId: string): Promise<void> {
  const res = await fetch(`/api/challenges/${challengeId}/today/tasks/${taskId}/check`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to uncheck task");
}
