import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGetIdentity } from "@refinedev/core";
import {
  getFriendJournals,
  getUserProfile,
  getReactions,
  addReaction,
  removeReaction,
  ApiAuthError,
  ApiForbiddenError,
  type JournalEntryResponse,
  type ReactionResponse,
} from "../api";
import type { UserIdentity } from "../authProvider";

const REACTION_EMOJIS: Record<string, string> = {
  LIKE: "👍", FIRE: "🔥", STRONG: "💪", LAUGH: "😄", CELEBRATE: "🎉", SAD: "😔",
};

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-5 h-5 rounded-full border-2 border-blush-400 border-t-transparent animate-spin" />
    </div>
  );
}

interface EntryCardProps {
  entry: JournalEntryResponse;
  myId: string | undefined;
}

function EntryCard({ entry, myId }: EntryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [reactions, setReactions] = useState<ReactionResponse[] | null>(null);
  const [loadingReactions, setLoadingReactions] = useState(false);
  const [reacting, setReacting] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const myReaction = reactions?.find((r) => r.userId === myId);

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

  const handleReact = async (type: string) => {
    if (reacting) return;
    setReacting(true);
    try {
      if (myReaction?.type === type) {
        await removeReaction(entry.id);
        setReactions((prev) => prev?.filter((r) => r.userId !== myId) ?? []);
      } else {
        const newR = await addReaction(entry.id, type);
        setReactions((prev) => [
          ...(prev ?? []).filter((r) => r.userId !== myId),
          newR,
        ]);
      }
    } catch {
      // ignore
    } finally {
      setReacting(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myReaction || !replyText.trim()) return;
    setSendingReply(true);
    try {
      const updated = await addReaction(entry.id, myReaction.type, replyText.trim());
      setReactions((prev) => [
        ...(prev ?? []).filter((r) => r.userId !== myId),
        updated,
      ]);
      setReplyText("");
    } catch {
      // ignore
    } finally {
      setSendingReply(false);
    }
  };

  const tally = (reactions ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.type] = (acc[r.type] ?? 0) + 1;
    return acc;
  }, {});

  const replies = (reactions ?? []).filter((r) => r.replyBody);

  return (
    <div className="rounded-xl bg-paper border border-clay-200 shadow-soft overflow-hidden">
      <button
        onClick={toggle}
        className="w-full text-left px-4 pt-3 pb-3 flex items-start justify-between gap-3"
      >
        <div className="min-w-0 flex-1">
          <p className="font-sans text-caption font-semibold text-clay-400 mb-1">
            {formatDate(entry.entryDate)}
          </p>
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

          {loadingReactions ? (
            <p className="font-sans text-caption text-clay-400">Loading reactions…</p>
          ) : (
            <>
              {/* Existing reactions tally */}
              {reactions && reactions.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(REACTION_EMOJIS)
                      .filter(([t]) => (tally[t] ?? 0) > 0)
                      .map(([t, emoji]) => (
                        <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-clay-100 font-sans text-sm text-clay-700">
                          {emoji} {tally[t]}
                        </span>
                      ))}
                  </div>
                  {replies.map((r) => (
                    <p key={r.id} className="font-sans text-sm text-clay-500">↩ "{r.replyBody}"</p>
                  ))}
                </div>
              )}

              {/* React buttons */}
              <div>
                <p className="text-caption font-semibold text-clay-400 uppercase tracking-widest mb-2">React</p>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(REACTION_EMOJIS).map(([type, emoji]) => (
                    <button
                      key={type}
                      onClick={() => handleReact(type)}
                      disabled={reacting}
                      className={[
                        "w-10 h-10 rounded-full text-lg flex items-center justify-center transition-colors border",
                        myReaction?.type === type
                          ? "bg-blush-100 border-blush-400"
                          : "bg-clay-50 border-clay-200 hover:bg-clay-100",
                        reacting ? "opacity-50" : "",
                      ].join(" ")}
                      aria-label={type}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reply input (only when I have a reaction) */}
              {myReaction && (
                <form onSubmit={handleReply} className="flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Add a reply…"
                    className="flex-1 h-10 rounded-lg border border-clay-200 bg-paper px-3 text-sm text-clay-950 shadow-soft outline-none placeholder:text-clay-400 focus:border-blush-400 transition"
                  />
                  <button
                    type="submit"
                    disabled={sendingReply || !replyText.trim()}
                    className="h-10 px-4 rounded-lg bg-blush-500 font-sans text-sm font-bold text-clay-950 shadow-soft hover:bg-blush-600 transition-colors disabled:opacity-50"
                  >
                    {sendingReply ? "…" : "Send"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function FriendJournalPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { data: identity } = useGetIdentity<UserIdentity>();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [entries, setEntries] = useState<JournalEntryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || !userId) return;
    ran.current = true;
    async function load() {
      try {
        const [profile, data] = await Promise.all([
          getUserProfile(userId!),
          getFriendJournals(userId!),
        ]);
        setDisplayName(profile?.displayName ?? "Friend");
        setEntries(data.sort((a, b) => b.entryDate.localeCompare(a.entryDate)));
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

  if (error) {
    return (
      <div className="animate-rise flex flex-col gap-4">
        <button onClick={() => navigate(`/friends/${userId}`)} className="font-sans text-sm text-clay-500 hover:text-clay-800 transition-colors self-start">
          ← Back
        </button>
        <p className="font-sans text-base text-clay-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="animate-rise flex flex-col gap-6">

      <div>
        <button
          onClick={() => navigate(`/friends/${userId}`)}
          className="font-sans text-sm text-clay-500 hover:text-clay-800 transition-colors mb-3"
        >
          ← Back
        </button>
        <p className="text-caption font-semibold text-clay-400 tracking-widest uppercase mb-1">Journal</p>
        <h1 className="font-display text-3xl font-medium text-clay-950">{displayName}</h1>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl bg-paper border border-clay-200 shadow-soft px-5 py-8 text-center">
          <p className="font-display text-xl font-medium text-clay-700">No shared entries</p>
          <p className="font-sans text-sm text-clay-500 mt-1">
            {displayName} hasn't shared any journal entries yet.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} myId={identity?.id} />
          ))}
        </div>
      )}

    </div>
  );
}
