import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  getMyJournals,
  getReactions,
  deleteJournalEntry,
  ApiAuthError,
  type JournalEntryResponse,
  type ReactionResponse,
} from "../api";

const REACTION_EMOJIS: Record<string, string> = {
  LIKE: "👍", FIRE: "🔥", STRONG: "💪", LAUGH: "😄", CELEBRATE: "🎉", SAD: "😔",
};

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M8 2v12M2 8h12" />
    </svg>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-5 h-5 rounded-full border-2 border-blush-400 border-t-transparent animate-spin" />
    </div>
  );
}

function ReactionTally({ reactions }: { reactions: ReactionResponse[] }) {
  const tally = reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.type] = (acc[r.type] ?? 0) + 1;
    return acc;
  }, {});

  const types = Object.keys(REACTION_EMOJIS).filter((t) => (tally[t] ?? 0) > 0);
  const replies = reactions.filter((r) => r.replyBody);

  if (types.length === 0 && replies.length === 0) {
    return <p className="font-sans text-caption text-clay-400">No reactions yet</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {types.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {types.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-clay-100 font-sans text-sm text-clay-700">
              {REACTION_EMOJIS[t]} {tally[t]}
            </span>
          ))}
        </div>
      )}
      {replies.map((r) => (
        <p key={r.id} className="font-sans text-sm text-clay-500">↩ "{r.replyBody}"</p>
      ))}
    </div>
  );
}

interface EntryCardProps {
  entry: JournalEntryResponse;
  onDeleted: (id: string) => void;
}

function EntryCard({ entry, onDeleted }: EntryCardProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [reactions, setReactions] = useState<ReactionResponse[] | null>(null);
  const [loadingReactions, setLoadingReactions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const toggle = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && reactions === null) {
      setLoadingReactions(true);
      try {
        setReactions(await getReactions(entry.id));
      } catch {
        setReactions([]);
      } finally {
        setLoadingReactions(false);
      }
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this entry?")) return;
    setIsDeleting(true);
    try {
      await deleteJournalEntry(entry.id);
      onDeleted(entry.id);
    } catch {
      setIsDeleting(false);
    }
  };

  return (
    <div className="rounded-xl bg-paper border border-clay-200 shadow-soft overflow-hidden">
      <button
        onClick={toggle}
        className="w-full text-left px-4 pt-3 pb-3 flex items-start justify-between gap-3"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-sans text-caption font-semibold text-clay-400">
              {formatDate(entry.entryDate)}
            </span>
            <span className={`text-caption font-semibold px-2 py-0.5 rounded-full ${
              entry.audienceType === "FRIENDS"
                ? "bg-blush-100 text-blush-700"
                : "bg-clay-100 text-clay-500"
            }`}>
              {entry.audienceType === "FRIENDS" ? "Friends" : "Private"}
            </span>
          </div>
          <p className={`font-sans text-base text-clay-800 ${expanded ? "" : "line-clamp-2"}`}>
            {entry.body}
          </p>
        </div>
        <span className={`text-clay-400 flex-shrink-0 mt-0.5 transition-transform ${expanded ? "rotate-180" : ""}`}>
          ↓
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-4 border-t border-clay-100 pt-3">
          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/journal/${entry.id}/edit`, { state: { entry } })}
              className="font-sans text-sm text-clay-500 hover:text-clay-800 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="font-sans text-sm text-rust-500 hover:text-rust-700 transition-colors disabled:opacity-50"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
          </div>

          {/* Reactions */}
          <div>
            <p className="text-caption font-semibold text-clay-400 uppercase tracking-widest mb-2">
              Reactions
            </p>
            {loadingReactions ? (
              <p className="font-sans text-caption text-clay-400">Loading…</p>
            ) : reactions !== null ? (
              <ReactionTally reactions={reactions} />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export function JournalPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<JournalEntryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    async function load() {
      try {
        const data = await getMyJournals();
        setEntries(data.sort((a, b) => b.entryDate.localeCompare(a.entryDate)));
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

  return (
    <div className="animate-rise flex flex-col gap-6">

      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-medium text-clay-950">Journal</h1>
        <Link
          to="/journal/new"
          className="flex items-center gap-1.5 h-9 px-4 rounded-pill bg-blush-500 font-sans text-sm font-bold text-clay-950 shadow-soft hover:bg-blush-600 transition-colors"
        >
          <PlusIcon />
          New
        </Link>
      </div>

      {error && <p className="font-sans text-sm text-rust-600">{error}</p>}

      {entries.length === 0 ? (
        <div className="rounded-xl bg-paper border border-clay-200 shadow-soft px-5 py-8 text-center">
          <p className="font-display text-xl font-medium text-clay-700">No entries yet</p>
          <p className="font-sans text-sm text-clay-500 mt-1">
            Write your first entry to start tracking your journey.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onDeleted={(id) => setEntries((prev) => prev.filter((e) => e.id !== id))}
            />
          ))}
        </div>
      )}

    </div>
  );
}
