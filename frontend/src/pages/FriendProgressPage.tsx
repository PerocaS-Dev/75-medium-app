import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { getFriendProgress, ApiAuthError, ApiForbiddenError, type UserProgressResponse } from "../api";

const TIER_META = [
  { tier: 1, label: "Tier 1", range: "Days 1–20",  maxBuffer: 0 },
  { tier: 2, label: "Tier 2", range: "Days 21–39", maxBuffer: 3 },
  { tier: 3, label: "Tier 3", range: "Days 40–64", maxBuffer: 3 },
  { tier: 4, label: "Tier 4", range: "Days 65–75", maxBuffer: 1 },
];

function lastCloseText(reason: string | null, bufferLeft: number): { text: string; color: string } {
  switch (reason) {
    case "MET":                return { text: "Day met",                     color: "text-sage-600" };
    case "MISS_WITHIN_BUFFER": return { text: `Miss used · ${bufferLeft} left`, color: "text-peach-600" };
    case "RESET_TO_0":         return { text: "Reset — back to day 1",      color: "text-rust-600" };
    case "FELL_BACK_TO_20":    return { text: "Fell back to day 20",        color: "text-rust-600" };
    case "FELL_BACK_TO_40":    return { text: "Fell back to day 40",        color: "text-rust-600" };
    default:                   return { text: "No days closed yet",         color: "text-clay-400" };
  }
}

function BufferDots({ remaining, max }: { remaining: number; max: number }) {
  if (max === 0) return <p className="font-sans text-sm font-semibold text-clay-500">Zero tolerance</p>;
  const filledColor =
    remaining === max ? "bg-sage-500"
    : remaining > 0  ? "bg-peach-500"
    : "bg-rust-300";
  return (
    <div className="flex gap-2 items-center">
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={["w-4 h-4 rounded-full transition-colors duration-500", i < remaining ? filledColor : "bg-clay-200"].join(" ")}
        />
      ))}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-5 h-5 rounded-full border-2 border-blush-400 border-t-transparent animate-spin" />
    </div>
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
    async function load() {
      try {
        const p = await getFriendProgress(userId!);
        if (p === null) {
          setError("This friend hasn't started a challenge yet.");
        } else {
          setProgress(p);
        }
      } catch (err) {
        if (err instanceof ApiAuthError) { navigate("/login", { replace: true }); return; }
        if (err instanceof ApiForbiddenError) {
          setError("You need to be friends to see this.");
        } else {
          setError("Failed to load. Please refresh.");
        }
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [navigate, userId]);

  if (isLoading) return <Spinner />;

  if (error || !progress) {
    return (
      <div className="animate-rise flex flex-col gap-4">
        <button onClick={() => navigate("/friends")} className="font-sans text-sm text-clay-500 hover:text-clay-800 transition-colors self-start">
          ← Friends
        </button>
        <p className="font-sans text-base text-clay-500">{error ?? "Something went wrong."}</p>
      </div>
    );
  }

  const { currentStreak, currentTier, missBufferRemaining, bestStreak, lastStateChangeReason } = progress;
  const tier = TIER_META[currentTier - 1] ?? TIER_META[0];
  const close = lastCloseText(lastStateChangeReason, missBufferRemaining);

  return (
    <div className="animate-rise flex flex-col gap-6">

      {/* Back + name */}
      <div>
        <button onClick={() => navigate("/friends")} className="font-sans text-sm text-clay-500 hover:text-clay-800 transition-colors mb-3">
          ← Friends
        </button>
        <p className="text-caption font-semibold text-clay-400 tracking-widest uppercase mb-1">Progress</p>
        <h1 className="font-display text-3xl font-medium text-clay-950">{progress.displayName}</h1>
      </div>

      {/* Big streak */}
      <div>
        <p className="font-display text-stat font-medium text-clay-950 leading-none">{currentStreak}</p>
        <p className="font-sans text-base text-clay-500 mt-1">day streak</p>
      </div>

      {/* Tier + Buffer */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-paper border border-clay-200 shadow-soft px-4 py-4">
          <p className="text-caption font-semibold text-clay-400 uppercase tracking-widest mb-1">Tier</p>
          <p className="font-display text-xl font-medium text-clay-950">{tier.label}</p>
          <p className="font-sans text-sm text-clay-500 mt-0.5">{tier.range}</p>
        </div>
        <div className="rounded-xl bg-paper border border-clay-200 shadow-soft px-4 py-4">
          <p className="text-caption font-semibold text-clay-400 uppercase tracking-widest mb-2">Buffer</p>
          <BufferDots remaining={missBufferRemaining} max={tier.maxBuffer} />
          {tier.maxBuffer > 0 && (
            <p className="font-sans text-sm text-clay-500 mt-2">{missBufferRemaining} of {tier.maxBuffer} left</p>
          )}
        </div>
      </div>

      {/* Best streak */}
      <div className="rounded-xl bg-sage-100 border border-sage-300 px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-caption font-semibold text-sage-600 uppercase tracking-widest mb-1">Best streak</p>
          <p className="font-display text-3xl font-medium text-sage-600">{bestStreak}</p>
          <p className="font-sans text-sm text-clay-600 mt-0.5">days — never resets</p>
        </div>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-sage-500 flex-shrink-0" aria-hidden="true">
          <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" /><path d="M15 7a3 3 0 1 0-6 0c0 1.66.5 3 1.5 4L12 13l1.5-2c1-1 1.5-2.34 1.5-4z" />
        </svg>
      </div>

      {/* Last close */}
      <div className="rounded-xl bg-paper border border-clay-200 shadow-soft px-5 py-4">
        <p className="text-caption font-semibold text-clay-400 uppercase tracking-widest mb-1">Last update</p>
        <p className={`font-sans text-base font-semibold ${close.color}`}>{close.text}</p>
      </div>

      {/* Photos + Journal links */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to={`/friends/${userId}/photos`}
          className="rounded-xl bg-paper border border-clay-200 shadow-soft px-4 py-4 flex items-center justify-between hover:border-clay-300 transition-colors"
        >
          <p className="font-sans text-base font-semibold text-clay-950">Photos</p>
          <span className="font-sans text-base text-clay-400">→</span>
        </Link>
        <Link
          to={`/friends/${userId}/journal`}
          className="rounded-xl bg-paper border border-clay-200 shadow-soft px-4 py-4 flex items-center justify-between hover:border-clay-300 transition-colors"
        >
          <p className="font-sans text-base font-semibold text-clay-950">Journal</p>
          <span className="font-sans text-base text-clay-400">→</span>
        </Link>
      </div>

    </div>
  );
}
