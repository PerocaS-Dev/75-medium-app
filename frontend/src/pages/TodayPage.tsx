import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  getActiveChallenge,
  getTasks,
  getTodayChecks,
  checkTask,
  uncheckTask,
  ApiAuthError,
  type ChallengeResponse,
  type TaskResponse,
} from "../api";

interface TaskWithCheck extends TaskResponse {
  checked: boolean;
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-5 h-5 rounded-full border-2 border-blush-400 border-t-transparent animate-spin" />
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="10" viewBox="0 0 12 10" fill="none" aria-hidden="true">
      <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── local-date helpers (match the user's device/timezone, same basis the backend uses) ──
function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(`${fromISO}T00:00:00`).getTime();
  const b = new Date(`${toISO}T00:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}
function prettyDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-ZA", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function TodayPage() {
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<ChallengeResponse | null>(null);
  const [tasks, setTasks] = useState<TaskWithCheck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  const today = isoToday();
  const isActive = challenge?.status === "ACTIVE";
  // "Scheduled": locked & ACTIVE, but Day 1 is still in the future.
  const isScheduled = isActive && challenge!.startDate > today;

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    async function load() {
      try {
        const c = await getActiveChallenge();
        setChallenge(c);

        // Only a live (started) challenge has a checkable "today".
        if (c && c.status === "ACTIVE" && c.startDate <= isoToday()) {
          const [taskList, checks] = await Promise.all([
            getTasks(c.id),
            getTodayChecks(c.id),
          ]);
          const checkedIds = new Set(checks.map((ck) => ck.taskDefinitionId));
          const merged: TaskWithCheck[] = taskList
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((t) => ({ ...t, checked: checkedIds.has(t.id) }));
          setTasks(merged);
        }
      } catch (err) {
        if (err instanceof ApiAuthError) { navigate("/login", { replace: true }); return; }
        setError("Failed to load. Please refresh.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [navigate]);

  const handleToggle = async (task: TaskWithCheck) => {
    if (!challenge || pendingIds.has(task.id)) return;
    const next = !task.checked;

    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, checked: next } : t)));
    setPendingIds((prev) => new Set(prev).add(task.id));
    setError(null);

    try {
      if (next) {
        await checkTask(challenge.id, task.id);
      } else {
        await uncheckTask(challenge.id, task.id);
      }
    } catch {
      // Revert
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, checked: task.checked } : t)));
      setError("Couldn't save that — try again.");
    } finally {
      setPendingIds((prev) => {
        const s = new Set(prev);
        s.delete(task.id);
        return s;
      });
    }
  };

  if (isLoading) return <Spinner />;

  // ── No challenge yet — warm setup invitation ─────────────────────────────────
  if (!challenge) {
    return (
      <div className="animate-rise">
        <p className="text-caption font-semibold text-clay-400 tracking-widest uppercase">
          {prettyDate(today)}
        </p>
        <h1 className="font-display text-3xl font-medium text-clay-950 mt-1 mb-6">Today</h1>

        <div className="rounded-xl border border-clay-200 bg-paper shadow-soft px-6 py-8 text-center flex flex-col items-center gap-3">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lift mb-1"
            style={{ background: "linear-gradient(150deg, var(--blush-400), var(--lilac-400))" }}
          >
            <span className="font-display text-2xl font-semibold text-white">75</span>
          </div>
          <h2 className="font-display text-2xl font-medium text-clay-950">No challenge yet</h2>
          <p className="font-sans text-base text-clay-500 max-w-[300px]">
            Look around as much as you like. When you're ready, set your daily tasks, lock them in,
            and pick your Day 1.
          </p>
          <button
            onClick={() => navigate("/setup")}
            className="mt-3 h-14 w-full max-w-[280px] rounded-xl bg-blush-500 text-lg font-bold text-clay-950 shadow-soft transition hover:bg-blush-600 active:scale-[.99]"
          >
            Set up your challenge
          </button>
        </div>
      </div>
    );
  }

  // ── Setup begun but not locked — nudge to finish ─────────────────────────────
  if (challenge.status === "PENDING") {
    return (
      <div className="animate-rise">
        <p className="text-caption font-semibold text-clay-400 tracking-widest uppercase">
          {prettyDate(today)}
        </p>
        <h1 className="font-display text-3xl font-medium text-clay-950 mt-1 mb-6">Today</h1>
        <div className="rounded-xl border border-clay-200 bg-paper shadow-soft px-6 py-8 text-center flex flex-col items-center gap-3">
          <h2 className="font-display text-2xl font-medium text-clay-950">Almost there</h2>
          <p className="font-sans text-base text-clay-500 max-w-[300px]">
            You've started setting up your challenge but haven't locked it in yet. Finish choosing
            your tasks and pick your start day.
          </p>
          <button
            onClick={() => navigate("/setup")}
            className="mt-3 h-14 w-full max-w-[280px] rounded-xl bg-blush-500 text-lg font-bold text-clay-950 shadow-soft transition hover:bg-blush-600 active:scale-[.99]"
          >
            Finish setup
          </button>
        </div>
      </div>
    );
  }

  // ── Ended states ─────────────────────────────────────────────────────────────
  if (!isActive) {
    return (
      <div className="animate-rise">
        <p className="text-caption font-semibold text-clay-400 tracking-widest uppercase">
          {prettyDate(today)}
        </p>
        <h1 className="font-display text-3xl font-medium text-clay-950 mt-1 mb-6">Today</h1>
        <div className="rounded-xl border border-clay-200 bg-paper shadow-soft px-6 py-8 text-center flex flex-col items-center gap-3">
          <h2 className="font-display text-2xl font-medium text-clay-950">This challenge has ended</h2>
          <p className="font-sans text-base text-clay-500 max-w-[300px]">
            Take a look back at how it went — new challenges are coming soon.
          </p>
          <button
            onClick={() => navigate("/progress")}
            className="mt-3 h-12 rounded-xl bg-clay-100 px-6 font-sans font-semibold text-clay-700 hover:bg-clay-200 transition"
          >
            View progress
          </button>
        </div>
      </div>
    );
  }

  // ── Scheduled — locked, waiting for Day 1 ────────────────────────────────────
  if (isScheduled) {
    const daysToGo = daysBetween(today, challenge.startDate);
    return (
      <div className="animate-rise">
        <p className="text-caption font-semibold text-clay-400 tracking-widest uppercase">
          {prettyDate(today)}
        </p>
        <h1 className="font-display text-3xl font-medium text-clay-950 mt-1 mb-6">Today</h1>
        <div className="rounded-xl border border-peach-300 bg-peach-100 shadow-soft px-6 py-8 text-center flex flex-col items-center gap-3">
          <span className="text-caption font-semibold text-peach-600 tracking-widest uppercase">
            Locked &amp; ready
          </span>
          <h2 className="font-display text-2xl font-medium text-clay-950">
            {daysToGo === 1 ? "Your challenge starts tomorrow" : `Starts in ${daysToGo} days`}
          </h2>
          <p className="font-sans text-base text-clay-700 max-w-[320px]">
            Day 1 begins <strong className="font-semibold">{prettyDate(challenge.startDate)}</strong>.
            Your tasks are locked in — come back then to make your first day count.
          </p>
        </div>
      </div>
    );
  }

  // ── Live — the normal daily check-off ────────────────────────────────────────
  // Day number is a simple counter off completed days: the day you're on = days banked + 1.
  const currentDay = Math.min(75, (challenge.currentStreak || 0) + 1);
  const doneCount = tasks.filter((t) => t.checked).length;
  const totalCount = tasks.length;
  const allDone = totalCount > 0 && doneCount === totalCount;
  const progressPct = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  return (
    <div className="animate-rise">
      {/* Header */}
      <div className="mb-2">
        <p className="text-caption font-semibold text-clay-400 tracking-widest uppercase">
          {prettyDate(today)}
        </p>
        <h1 className="font-display text-3xl font-medium text-clay-950 mt-1">
          Day {currentDay}
        </h1>
      </div>

      {/* Progress line */}
      <p className={`font-sans text-base font-semibold mb-4 transition-colors ${allDone ? "text-sage-600" : "text-clay-500"}`}>
        {allDone ? "All done — great work today!" : `${doneCount} of ${totalCount} done`}
      </p>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-clay-100 mb-6 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-soft ${allDone ? "bg-sage-500" : "bg-blush-400"}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Error */}
      {error && (
        <p className="font-sans text-sm text-rust-600 mb-4">{error}</p>
      )}

      {/* Task rows */}
      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <button
            key={task.id}
            onClick={() => handleToggle(task)}
            disabled={pendingIds.has(task.id)}
            className={[
              "flex items-center gap-4 w-full text-left rounded-xl border px-4 py-4 shadow-soft transition-all active:scale-[.99]",
              task.checked
                ? "bg-sage-100 border-sage-300"
                : "bg-paper border-clay-200 hover:border-clay-300",
              pendingIds.has(task.id) ? "opacity-60" : "",
            ].join(" ")}
          >
            {/* Circle checkbox */}
            <span
              className={[
                "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                task.checked ? "bg-sage-500 border-sage-500" : "border-clay-300",
              ].join(" ")}
            >
              {task.checked && <CheckIcon />}
            </span>

            <span
              className={[
                "flex-1 font-sans text-base transition-colors",
                task.checked ? "text-sage-600 line-through decoration-sage-400" : "text-clay-950",
              ].join(" ")}
            >
              {task.label}
            </span>
          </button>
        ))}
      </div>

      {/* All-done celebration */}
      {allDone && (
        <div className="mt-6 rounded-xl bg-sage-100 border border-sage-300 px-5 py-4 text-center animate-rise">
          <p className="font-display text-xl font-medium text-sage-600">
            Day {currentDay} complete
          </p>
          <p className="font-sans text-sm text-clay-600 mt-1">
            {75 - currentDay > 0
              ? `${75 - currentDay} day${75 - currentDay !== 1 ? "s" : ""} to go.`
              : "75 days done. You did it."}
          </p>
        </div>
      )}
    </div>
  );
}
