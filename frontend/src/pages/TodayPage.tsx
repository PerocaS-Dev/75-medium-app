import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  getActiveChallenge,
  getTasks,
  getTodayChecks,
  checkTask,
  uncheckTask,
  ApiAuthError,
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

export function TodayPage() {
  const navigate = useNavigate();
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [currentDay, setCurrentDay] = useState(1);
  const [tasks, setTasks] = useState<TaskWithCheck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    async function load() {
      try {
        const challenge = await getActiveChallenge();
        if (!challenge || challenge.status !== "ACTIVE") {
          navigate("/dashboard", { replace: true });
          return;
        }
        setChallengeId(challenge.id);
        setCurrentDay(challenge.currentDay || 1);

        const [taskList, checks] = await Promise.all([
          getTasks(challenge.id),
          getTodayChecks(challenge.id),
        ]);

        const checkedIds = new Set(checks.map((c) => c.taskDefinitionId));
        const merged: TaskWithCheck[] = taskList
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((t) => ({ ...t, checked: checkedIds.has(t.id) }));
        setTasks(merged);
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
    if (!challengeId || pendingIds.has(task.id)) return;
    const next = !task.checked;

    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, checked: next } : t)));
    setPendingIds((prev) => new Set(prev).add(task.id));
    setError(null);

    try {
      if (next) {
        await checkTask(challengeId, task.id);
      } else {
        await uncheckTask(challengeId, task.id);
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

  const doneCount = tasks.filter((t) => t.checked).length;
  const totalCount = tasks.length;
  const allDone = totalCount > 0 && doneCount === totalCount;
  const progressPct = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  const todayLabel = new Date().toLocaleDateString("en-ZA", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="animate-rise">
      {/* Header */}
      <div className="mb-2">
        <p className="text-caption font-semibold text-clay-400 tracking-widest uppercase">
          {todayLabel}
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
