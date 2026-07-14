import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getFriendProgress, ApiAuthError, ApiForbiddenError, type UserProgressResponse } from "../api";
import {
  CHALLENGE_LENGTH,
  deriveState,
  STATE_META,
  avatarColor,
  initial,
  lastUpdatedText,
} from "../friends";

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-5 h-5 rounded-full border-2 border-blush-400 border-t-transparent animate-spin" />
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-shrink-0 text-clay-400">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-shrink-0 text-clay-400 mt-0.5">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function FriendProgressPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<UserProgressResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || !userId) return;
    ran.current = true;
    (async () => {
      try {
        const p = await getFriendProgress(userId);
        if (p === null) setError("This friend hasn't started a challenge yet.");
        else setProgress(p);
      } catch (err) {
        if (err instanceof ApiAuthError) {
          navigate("/login", { replace: true });
          return;
        }
        if (err instanceof ApiForbiddenError) setError("You need to be in the same circle to see this.");
        else setError("Failed to load. Please refresh.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [navigate, userId]);

  const back = (
    <button
      onClick={() => navigate("/friends")}
      className="font-sans text-sm text-clay-500 hover:text-clay-800 transition-colors self-start flex items-center gap-1"
    >
      <span aria-hidden="true">←</span> Circle
    </button>
  );

  if (isLoading) return <Spinner />;

  if (error || !progress) {
    return (
      <div className="animate-rise flex flex-col gap-4">
        {back}
        <p className="font-sans text-base text-clay-500">{error ?? "Something went wrong."}</p>
      </div>
    );
  }

  const { displayName, currentStreak, dayNumber, bestStreak, todayDoneCount, todayTaskTotal, lastActivityAt } = progress;
  const state = deriveState(progress);
  const meta = STATE_META[state];
  const pct = Math.min(100, Math.round((currentStreak / CHALLENGE_LENGTH) * 100));

  return (
    <div className="animate-rise flex flex-col gap-5">
      {back}

      {/* Identity */}
      <div className="flex items-center gap-4">
        <span
          className={`h-16 w-16 ${avatarColor(userId!)} rounded-full flex items-center justify-center font-sans text-2xl font-semibold text-white`}
        >
          {initial(displayName)}
        </span>
        <div>
          <h1 className="font-display text-3xl font-medium text-clay-950">{displayName}</h1>
          <p className={`font-sans text-base mt-0.5 flex items-center gap-2 ${meta.text}`}>
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${meta.dot}`} />
            Day {dayNumber} · {meta.label}
          </p>
        </div>
      </div>

      {/* Current streak */}
      <div className="rounded-2xl bg-paper border border-clay-200 shadow-soft px-5 py-5">
        <p className="text-caption font-semibold text-clay-400 uppercase tracking-widest mb-1">Current streak</p>
        <p className="font-display font-medium text-clay-950 leading-none">
          <span className="text-stat">{currentStreak}</span>
          <span className="font-sans text-lg text-clay-400"> / {CHALLENGE_LENGTH} days</span>
        </p>
        <div className="h-2.5 rounded-pill bg-clay-100 overflow-hidden mt-4">
          <div className={`h-full rounded-pill ${meta.bar} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Best + Today */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-paper border border-clay-200 shadow-soft px-5 py-4">
          <p className="text-caption font-semibold text-clay-400 uppercase tracking-widest mb-1">Best streak</p>
          <p className="font-display text-3xl font-medium text-clay-950 leading-none">{bestStreak}</p>
          <p className="font-sans text-sm text-clay-500 mt-2">days · never resets</p>
        </div>
        <div className="rounded-2xl bg-paper border border-clay-200 shadow-soft px-5 py-4">
          <p className="text-caption font-semibold text-clay-400 uppercase tracking-widest mb-1">Today</p>
          <p className="font-display font-medium text-clay-950 leading-none">
            <span className="text-3xl">{todayDoneCount}</span>
            <span className="font-sans text-lg text-clay-400"> / {todayTaskTotal}</span>
          </p>
          <p className="font-sans text-sm text-clay-500 mt-2">tasks done</p>
        </div>
      </div>

      {/* Last updated */}
      <div className="rounded-2xl bg-paper border border-clay-200 shadow-soft px-5 py-4 flex items-center gap-3">
        <ClockIcon />
        <p className="font-sans text-base text-clay-600">
          Last updated <span className="font-semibold text-clay-900">{lastUpdatedText(lastActivityAt)}</span>
        </p>
      </div>

      {/* Privacy note */}
      <div className="rounded-2xl bg-clay-100 px-5 py-4 flex items-start gap-3">
        <LockIcon />
        <p className="font-sans text-sm text-clay-600">
          You see the <span className="font-semibold">count</span>, not the checklist. What each task is stays
          private to {displayName}.
        </p>
      </div>
    </div>
  );
}
