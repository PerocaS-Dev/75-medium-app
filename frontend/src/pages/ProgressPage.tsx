import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getActiveChallenge,
  getTasks,
  getTodayChecks,
  ApiAuthError,
  type ChallengeResponse,
} from "../api";

const TIER_META = [
  { tier: 1, label: "Tier 1", range: "Days 1–20",  maxBuffer: 0 },
  { tier: 2, label: "Tier 2", range: "Days 21–39", maxBuffer: 3 },
  { tier: 3, label: "Tier 3", range: "Days 40–64", maxBuffer: 3 },
  { tier: 4, label: "Tier 4", range: "Days 65–75", maxBuffer: 1 },
];

function lastCloseText(reason: string | null, bufferLeft: number): { text: string; color: string } {
  switch (reason) {
    case "MET":                return { text: "Day met",                    color: "text-sage-600" };
    case "MISS_WITHIN_BUFFER": return { text: `Miss used · ${bufferLeft} left`, color: "text-peach-600" };
    case "RESET_TO_0":         return { text: "Reset — back to day 1",     color: "text-rust-600" };
    case "FELL_BACK_TO_20":    return { text: "Fell back to day 20",       color: "text-rust-600" };
    case "FELL_BACK_TO_40":    return { text: "Fell back to day 40",       color: "text-rust-600" };
    default:                   return { text: "No days closed yet",        color: "text-clay-400" };
  }
}

function BufferDots({ remaining, max }: { remaining: number; max: number }) {
  if (max === 0) {
    return <p className="font-sans text-sm font-semibold text-clay-500">Zero tolerance</p>;
  }
  const filledColor =
    remaining === max ? "bg-sage-500"
    : remaining > 0  ? "bg-peach-500"
    : "bg-rust-300";

  return (
    <div className="flex gap-2 items-center">
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={[
            "w-4 h-4 rounded-full transition-colors duration-500",
            i < remaining ? filledColor : "bg-clay-200",
          ].join(" ")}
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

export function ProgressPage() {
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<ChallengeResponse | null>(null);
  const [todayDone, setTodayDone] = useState(0);
  const [todayTotal, setTodayTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    async function load() {
      try {
        const c = await getActiveChallenge();
        if (!c || c.status !== "ACTIVE") {
          navigate("/dashboard", { replace: true });
          return;
        }
        setChallenge(c);

        const [tasks, checks] = await Promise.all([
          getTasks(c.id),
          getTodayChecks(c.id),
        ]);
        setTodayTotal(tasks.length);
        setTodayDone(checks.length);
      } catch (err) {
        if (err instanceof ApiAuthError) { navigate("/login", { replace: true }); return; }
        setError("Failed to load. Please refresh.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [navigate]);

  if (isLoading) return <Spinner />;
  if (error) return <p className="font-sans text-sm text-rust-600">{error}</p>;
  if (!challenge) return null;

  const { currentStreak, currentTier, missBufferRemaining, bestStreak, lastStateChangeReason } = challenge;
  const tier = TIER_META[currentTier - 1] ?? TIER_META[0];
  const close = lastCloseText(lastStateChangeReason, missBufferRemaining);
  const todayAllDone = todayTotal > 0 && todayDone === todayTotal;

  const todayLabel = new Date().toLocaleDateString("en-ZA", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div className="animate-rise flex flex-col gap-6">

      {/* Big streak number */}
      <div>
        <p className="text-caption font-semibold text-clay-400 tracking-widest uppercase mb-1">
          {todayLabel}
        </p>
        <p className="font-display text-stat font-medium text-clay-950 leading-none">
          {currentStreak}
        </p>
        <p className="font-sans text-base text-clay-500 mt-1">day streak</p>
      </div>

      {/* Today's status — shown while day hasn't closed yet */}
      {todayTotal > 0 && (
        <div className={[
          "rounded-xl border px-4 py-3 flex items-center gap-3",
          todayAllDone
            ? "bg-sage-100 border-sage-300"
            : "bg-paper border-clay-200 shadow-soft",
        ].join(" ")}>
          <span className={[
            "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center",
            todayAllDone ? "bg-sage-500 border-sage-500" : "border-clay-300",
          ].join(" ")}>
            {todayAllDone && (
              <svg width="10" height="8" viewBox="0 0 12 10" fill="none" aria-hidden="true">
                <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <div>
            <p className={`font-sans text-sm font-semibold ${todayAllDone ? "text-sage-600" : "text-clay-700"}`}>
              {todayAllDone ? "Today complete — closes at midnight" : `Today: ${todayDone} of ${todayTotal} done`}
            </p>
            {todayAllDone && (
              <p className="font-sans text-caption text-clay-500 mt-0.5">Streak will advance to {currentStreak + 1} tonight</p>
            )}
          </div>
        </div>
      )}

      {/* Tier + Buffer side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-paper border border-clay-200 shadow-soft px-4 py-4">
          <p className="text-caption font-semibold text-clay-400 uppercase tracking-widest mb-1">
            Tier
          </p>
          <p className="font-display text-xl font-medium text-clay-950">{tier.label}</p>
          <p className="font-sans text-sm text-clay-500 mt-0.5">{tier.range}</p>
        </div>

        <div className="rounded-xl bg-paper border border-clay-200 shadow-soft px-4 py-4">
          <p className="text-caption font-semibold text-clay-400 uppercase tracking-widest mb-2">
            Buffer
          </p>
          <BufferDots remaining={missBufferRemaining} max={tier.maxBuffer} />
          {tier.maxBuffer > 0 && (
            <p className="font-sans text-sm text-clay-500 mt-2">
              {missBufferRemaining} of {tier.maxBuffer} left
            </p>
          )}
        </div>
      </div>

      {/* Best streak */}
      <div className="rounded-xl bg-sage-100 border border-sage-300 px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-caption font-semibold text-sage-600 uppercase tracking-widest mb-1">
            Best streak
          </p>
          <p className="font-display text-3xl font-medium text-sage-600">{bestStreak}</p>
          <p className="font-sans text-sm text-clay-600 mt-0.5">days — never resets</p>
        </div>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-sage-500 flex-shrink-0" aria-hidden="true">
          <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" />
          <path d="M15 7a3 3 0 1 0-6 0c0 1.66.5 3 1.5 4L12 13l1.5-2c1-1 1.5-2.34 1.5-4z" />
        </svg>
      </div>

      {/* Last close */}
      <div className="rounded-xl bg-paper border border-clay-200 shadow-soft px-5 py-4">
        <p className="text-caption font-semibold text-clay-400 uppercase tracking-widest mb-1">
          Last update
        </p>
        <p className={`font-sans text-base font-semibold ${close.color}`}>{close.text}</p>
      </div>

    </div>
  );
}
