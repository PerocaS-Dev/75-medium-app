import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  getActiveChallenge,
  getTasks,
  addTask,
  deleteTask,
  reorderTasks,
  startChallenge,
  type TaskResponse,
} from "../api";

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-5 h-5 rounded-full border-2 border-blush-400 border-t-transparent animate-spin" />
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M1 1l12 12M13 1L1 13" />
    </svg>
  );
}

export function SetupPage() {
  const navigate = useNavigate();
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const challenge = await getActiveChallenge();
        if (!challenge) {
          navigate("/dashboard", { replace: true });
          return;
        }
        if (challenge.status === "ACTIVE") {
          navigate("/today", { replace: true });
          return;
        }
        if (challenge.status !== "PENDING") {
          navigate("/dashboard", { replace: true });
          return;
        }
        setChallengeId(challenge.id);
        const taskList = await getTasks(challenge.id);
        setTasks(taskList.sort((a, b) => a.sortOrder - b.sortOrder));
      } catch {
        setError("Failed to load. Please refresh.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [navigate]);

  const handleAdd = async () => {
    const label = newLabel.trim();
    if (!label || !challengeId || isAdding) return;
    setIsAdding(true);
    setError(null);
    try {
      const task = await addTask(challengeId, label);
      setTasks((prev) => [...prev, task]);
      setNewLabel("");
      inputRef.current?.focus();
    } catch {
      setError("Failed to add task. Try again.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!challengeId) return;
    const prev = tasks;
    setTasks((t) => t.filter((x) => x.id !== taskId));
    try {
      await deleteTask(challengeId, taskId);
    } catch {
      setTasks(prev);
      setError("Failed to remove task.");
    }
  };

  const handleMove = async (index: number, dir: -1 | 1) => {
    if (!challengeId) return;
    const target = index + dir;
    if (target < 0 || target >= tasks.length) return;
    const prev = tasks;
    const next = [...tasks];
    [next[index], next[target]] = [next[target], next[index]];
    setTasks(next);
    try {
      await reorderTasks(challengeId, next.map((t) => t.id));
    } catch {
      setTasks(prev);
      setError("Failed to reorder tasks.");
    }
  };

  const handleStart = async () => {
    if (!challengeId) return;
    setIsLocking(true);
    setError(null);
    try {
      await startChallenge(challengeId);
      navigate("/today", { replace: true });
    } catch {
      setError("Failed to start. Please try again.");
      setShowConfirm(false);
      setIsLocking(false);
    }
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="animate-rise">
      <p className="text-caption font-semibold text-clay-400 tracking-widest uppercase mb-1">
        Challenge setup
      </p>
      <h1 className="font-display text-3xl font-medium text-clay-950 mb-2">
        Your daily tasks
      </h1>
      <p className="font-sans text-base text-clay-500 mb-6">
        Add every task you'll complete each day. All of them must be done for a day to count.
      </p>

      {/* Lock warning */}
      <div className="rounded-xl bg-peach-100 border border-peach-300 px-4 py-3 mb-6 flex gap-3 items-start">
        <span className="text-peach-600 text-sm mt-0.5 flex-shrink-0">⚠</span>
        <p className="font-sans text-sm text-clay-800">
          Once you lock in and start,{" "}
          <strong className="font-semibold">these tasks cannot change for 75 days.</strong>{" "}
          Set them honestly — they need to be real.
        </p>
      </div>

      {/* Task list */}
      <div className="flex flex-col gap-2 mb-4">
        {tasks.length === 0 && (
          <p className="text-center font-sans text-sm text-clay-400 py-8">
            No tasks yet — add your first one below.
          </p>
        )}
        {tasks.map((task, i) => (
          <div
            key={task.id}
            className="flex items-center gap-2 bg-paper rounded-xl border border-clay-200 shadow-soft px-4 py-3.5"
          >
            <span className="flex-1 font-sans text-base text-clay-950 leading-snug">
              {task.label}
            </span>
            <button
              onClick={() => handleMove(i, -1)}
              disabled={i === 0}
              className="p-1.5 text-clay-400 hover:text-clay-700 disabled:opacity-20 transition-colors"
              aria-label="Move up"
            >
              ↑
            </button>
            <button
              onClick={() => handleMove(i, 1)}
              disabled={i === tasks.length - 1}
              className="p-1.5 text-clay-400 hover:text-clay-700 disabled:opacity-20 transition-colors"
              aria-label="Move down"
            >
              ↓
            </button>
            <button
              onClick={() => handleDelete(task.id)}
              className="p-1.5 text-clay-400 hover:text-rust-500 transition-colors"
              aria-label={`Remove "${task.label}"`}
            >
              <CloseIcon />
            </button>
          </div>
        ))}
      </div>

      {/* Add input */}
      <div className="flex gap-2 mb-8">
        <input
          ref={inputRef}
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Add a task…"
          maxLength={80}
          className="flex-1 h-[52px] rounded-lg border border-clay-200 bg-paper px-4 text-base text-clay-950 shadow-soft outline-none placeholder:text-clay-400 focus:border-blush-400 focus:shadow-ring transition"
        />
        <button
          onClick={handleAdd}
          disabled={!newLabel.trim() || isAdding}
          className="h-[52px] px-5 rounded-lg bg-clay-100 font-sans font-semibold text-sm text-clay-700 hover:bg-clay-200 disabled:opacity-40 transition"
        >
          Add
        </button>
      </div>

      {error && (
        <p className="font-sans text-sm text-rust-600 mb-4">{error}</p>
      )}

      {/* Lock CTA or confirmation */}
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={tasks.length === 0}
          className="w-full h-14 rounded-xl bg-blush-500 text-lg font-bold text-clay-950 shadow-soft transition hover:bg-blush-600 active:scale-[.99] disabled:opacity-40"
        >
          Lock & begin 75 days
        </button>
      ) : (
        <div className="rounded-xl border border-clay-200 bg-paper shadow-lift p-5 animate-rise">
          <h3 className="font-display text-xl font-medium text-clay-950 mb-1">
            Ready to lock?
          </h3>
          <p className="font-sans text-sm text-clay-600 mb-4">
            Your {tasks.length} task{tasks.length !== 1 ? "s" : ""} can't change once the clock
            starts. That's what keeps it honest — and what your friends are holding you to.
          </p>
          <ul className="mb-5 flex flex-col gap-1.5">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2.5 font-sans text-sm text-clay-700">
                <span className="w-1.5 h-1.5 rounded-full bg-blush-400 flex-shrink-0" />
                {t.label}
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleStart}
              disabled={isLocking}
              className="w-full h-14 rounded-xl bg-blush-500 text-lg font-bold text-clay-950 shadow-soft transition hover:bg-blush-600 active:scale-[.99] disabled:opacity-50"
            >
              {isLocking ? "Starting…" : "Lock & begin day 1"}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="w-full h-10 rounded-xl font-sans text-sm font-semibold text-clay-500 hover:text-clay-700 transition"
            >
              Not yet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
