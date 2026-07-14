import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getActiveChallenge,
  ApiAuthError,
  type ChallengeResponse,
} from "../api";
import "../styles/momentum-progress.css";

const TIER_META = [
  { tier: 1, label: "Tier 1", range: "Days 1–20",  maxBuffer: 0, start: 1,  end: 20 },
  { tier: 2, label: "Tier 2", range: "Days 21–39", maxBuffer: 3, start: 21, end: 39 },
  { tier: 3, label: "Tier 3", range: "Days 40–64", maxBuffer: 3, start: 40, end: 64 },
  { tier: 4, label: "Tier 4", range: "Days 65–75", maxBuffer: 1, start: 65, end: 75 },
];

const CONFETTI_COUNT = 24;

function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: CONFETTI_COUNT }, (_, i) => (
        <span key={i} className="confetti__piece" />
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
  const [justCompleted, setJustCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    async function load() {
      try {
        const c = await getActiveChallenge();
        if (!c || (c.status !== "ACTIVE" && c.status !== "COMPLETED")) {
          // No active/completed challenge yet — render a friendly empty state instead of erroring.
          setChallenge(null);
          return;
        }
        if (c.status === "COMPLETED") {
          const key = `celebrated-${c.id}`;
          if (!sessionStorage.getItem(key)) {
            setJustCompleted(true);
            sessionStorage.setItem(key, "1");
          }
        }
        setChallenge(c);
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
  if (error) return <p className="font-sans text-sm text-rust-600 p-6">{error}</p>;
  if (!challenge) {
    return (
      <div className="animate-rise">
        <p className="text-caption font-semibold text-clay-400 tracking-widest uppercase mb-1">Progress</p>
        <h1 className="font-display text-3xl font-medium text-clay-950 mb-6">Nothing to track yet</h1>
        <div className="rounded-xl border border-clay-200 bg-paper shadow-soft px-6 py-8 text-center flex flex-col items-center gap-3">
          <p className="font-sans text-base text-clay-500 max-w-[300px]">
            Once you set up and start your challenge, your streak, tiers and buffer will show up here.
          </p>
          <button
            onClick={() => navigate("/today")}
            className="mt-2 h-12 rounded-xl bg-clay-100 px-6 font-sans font-semibold text-clay-700 hover:bg-clay-200 transition"
          >
            Go to Today
          </button>
        </div>
      </div>
    );
  }

  const { currentStreak, currentTier, missBufferRemaining, bestStreak, lastStateChangeReason } = challenge;
  const isComplete = challenge.status === "COMPLETED";

  const tierMeta = TIER_META[(currentTier - 1)] ?? TIER_META[3];
  const maxBuffer = tierMeta.maxBuffer;
  const isNoBuffer = !isComplete && maxBuffer > 0 && missBufferRemaining === 0;
  const isRecord = isComplete;

  const meterPct = isComplete ? 100 : Math.min(100, (currentStreak / 75) * 100);
  const meterPctStr = `${meterPct.toFixed(2)}%`;

  const tierBarPct = isComplete
    ? 100
    : Math.min(100, Math.max(0, (currentStreak - tierMeta.start) / (tierMeta.end - tierMeta.start) * 100));

  const hasFellBack = (
    lastStateChangeReason === "FELL_BACK_TO_40" ||
    lastStateChangeReason === "FELL_BACK_TO_20" ||
    lastStateChangeReason === "RESET_TO_0"
  ) && bestStreak > currentStreak;

  const tierHint = isComplete
    ? "All tiers cleared"
    : currentTier < 4
      ? `${tierMeta.end - currentStreak} days to Tier ${currentTier + 1}`
      : null;

  const bufferHint = maxBuffer === 0
    ? null
    : isComplete
      ? `${missBufferRemaining} of ${maxBuffer} left · ${maxBuffer - missBufferRemaining} save${maxBuffer - missBufferRemaining === 1 ? "" : "s"} used`
      : isNoBuffer
        ? `0 of ${maxBuffer} — a miss now resets you`
        : `${missBufferRemaining} of ${maxBuffer} saves ready`;

  const rootClass = [
    "momentum",
    isNoBuffer ? "momentum--no-buffer" : "",
    isComplete ? "momentum--complete" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={rootClass}>
      {isComplete && justCompleted && <Confetti />}

      {isComplete && (
        <div className="momentum__ribbon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          All 75 days complete
        </div>
      )}

      <div className="momentum__hero">
        <span className="momentum__count">{currentStreak}</span>
        <span className="momentum__of">/75</span>
        <span className={[
          "momentum__status",
          isNoBuffer ? "momentum__status--danger" : "",
          isComplete ? "momentum__status--complete" : "",
        ].filter(Boolean).join(" ")}>
          {isComplete ? "Complete" : isNoBuffer ? "No safety net" : "On a roll"}
        </span>
      </div>
      <p className="momentum__label">
        {isComplete ? "days — you did the whole thing" : "day streak"}
      </p>

      <div className="momentum__meter">
        <div className="momentum__meter-fill" style={{ width: meterPctStr }} />
        <div className="momentum__marker" style={{ left: meterPctStr }}>
          <div className="momentum__spark">
            {isComplete ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--sage-600)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="var(--peach-600)" aria-hidden="true">
                <path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" />
              </svg>
            )}
          </div>
        </div>
      </div>
      <div className="momentum__scale">
        <span>Day 1</span>
        <span className="momentum__scale-end">
          {isComplete ? "Day 75 · reached" : "Day 75 · finish"}
        </span>
      </div>

      <div className="momentum__cards">
        <div className="mcard">
          <div className="mcard__label">Tier</div>
          <div className="tier__row">
            <div className={`tier__badge${currentTier === 4 ? " tier__badge--4" : ""}`}>
              {currentTier}
            </div>
            <div>
              <div className="tier__name">{tierMeta.label}</div>
              <div className="tier__range">{tierMeta.range}</div>
            </div>
          </div>
          <div className="tier__bar">
            <div className="tier__bar-fill" style={{ width: `${tierBarPct.toFixed(2)}%` }} />
          </div>
          {tierHint && (
            <div className={`tier__hint${isComplete ? " tier__hint--done" : ""}`}>
              {tierHint}
            </div>
          )}
        </div>

        <div className={`mcard${isNoBuffer ? " buffer--empty" : ""}`}>
          <div className="mcard__label">Buffer</div>
          {maxBuffer === 0 ? (
            <div className="buffer__pips" style={{ marginTop: "14px" }}>
              <p style={{ fontSize: "12px", color: "var(--clay-500)", fontWeight: 600 }}>Zero tolerance</p>
            </div>
          ) : (
            <>
              <div className="buffer__pips">
                {Array.from({ length: maxBuffer }, (_, i) => (
                  <span
                    key={i}
                    className={`buffer__pip${i >= missBufferRemaining ? " buffer__pip--empty" : ""}`}
                  />
                ))}
              </div>
              {bufferHint && (
                <div className={`buffer__hint${isNoBuffer ? " buffer__hint--danger" : ""}`}>
                  {bufferHint}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className={`best${isRecord ? " best--record" : ""}`}>
        <div className="best__medal">{bestStreak}</div>
        <div className="best__body">
          <div className="best__label">
            Best streak
            {isRecord && <span className="best__tag">New record</span>}
          </div>
          <div className="best__value">{bestStreak} days</div>
          <div className="best__sub">
            {isRecord
              ? "a perfect run — never resets"
              : hasFellBack
                ? "your record — fell back"
                : "your record — never resets"}
          </div>
        </div>
        <svg className="best__trophy" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" />
        </svg>
      </div>
    </div>
  );
}
