import { useEffect, useRef, useState } from "react";
import {
  getFriendJournals,
  getFriendPhotos,
  getPhotoSignedUrl,
  getReactions,
  addReaction,
  removeReaction,
  getPhotoReactions,
  addPhotoReaction,
  removePhotoReaction,
  ApiAuthError,
  type JournalEntryResponse,
  type PhotoResponse,
  type ReactionResponse,
  type PhotoReactionResponse,
} from "../api";
import { avatarColor, initial, relativeTime } from "../friends";

// Minimal friend descriptor the feeds need to fetch + label posts.
export interface FeedFriend {
  id: string;
  name: string;
  day: number;
}

const REACTIONS: { type: string; emoji: string; label: string }[] = [
  { type: "LIKE", emoji: "❤️", label: "Like" },
  { type: "FIRE", emoji: "🔥", label: "Fire" },
  { type: "STRONG", emoji: "💪", label: "Strong" },
  { type: "CELEBRATE", emoji: "🎉", label: "Celebrate" },
  { type: "LAUGH", emoji: "😄", label: "Laugh" },
  { type: "SAD", emoji: "😔", label: "Sad" },
];

function Avatar({ id, name, size = "h-10 w-10" }: { id: string; name: string; size?: string }) {
  return (
    <span className={`${size} ${avatarColor(id)} flex-shrink-0 rounded-full flex items-center justify-center font-sans font-semibold text-white`}>
      {initial(name)}
    </span>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-5 h-5 rounded-full border-2 border-blush-400 border-t-transparent animate-spin" />
    </div>
  );
}

function PublicBadge({ tone = "sage" }: { tone?: "sage" | "onImage" }) {
  const cls = tone === "onImage" ? "bg-black/25 text-white backdrop-blur-sm" : "bg-sage-100 text-sage-600";
  return <span className={`rounded-pill px-2.5 py-0.5 text-caption font-semibold ${cls}`}>Public</span>;
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-shrink-0">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

/** Row of emoji reaction buttons. Highlights the viewer's current pick; shows per-emoji counts. */
function ReactionBar({
  counts,
  current,
  disabled,
  onPick,
}: {
  counts: Record<string, number>;
  current: string | null;
  disabled?: boolean;
  onPick: (type: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {REACTIONS.map((r) => {
        const n = counts[r.type] ?? 0;
        const mine = current === r.type;
        return (
          <button
            key={r.type}
            onClick={() => onPick(r.type)}
            disabled={disabled}
            aria-label={r.label}
            aria-pressed={mine}
            className={[
              "h-8 rounded-pill px-2.5 flex items-center gap-1 text-sm transition-colors disabled:opacity-50",
              mine ? "bg-blush-100 ring-1 ring-blush-300" : "bg-clay-50 hover:bg-clay-100",
            ].join(" ")}
          >
            <span className="text-base leading-none">{r.emoji}</span>
            {n > 0 && <span className={`font-sans text-caption ${mine ? "text-blush-600" : "text-clay-500"}`}>{n}</span>}
          </button>
        );
      })}
    </div>
  );
}

function tallies(reactions: { type: string }[]): Record<string, number> {
  return reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.type] = (acc[r.type] ?? 0) + 1;
    return acc;
  }, {});
}

// ── Journal feed ────────────────────────────────────────────────────────────

interface JournalItem {
  entry: JournalEntryResponse;
  friend: FeedFriend;
  reactions: ReactionResponse[];
}

function JournalCard({
  item,
  myId,
  nameOf,
  onReact,
  onReply,
  onRemoveComment,
}: {
  item: JournalItem;
  myId: string | undefined;
  nameOf: (id: string) => string;
  onReact: (type: string) => Promise<void>;
  onReply: (text: string) => Promise<void>;
  onRemoveComment: () => Promise<void>;
}) {
  const { entry, friend, reactions } = item;
  const [busy, setBusy] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState("");

  const mine = reactions.find((r) => r.userId === myId) ?? null;
  const comments = reactions.filter((r) => r.replyBody);

  const react = async (type: string) => {
    if (busy || !myId) return;
    setBusy(true);
    try {
      await onReact(type);
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !draft.trim()) return;
    setBusy(true);
    try {
      await onReply(draft.trim());
      setDraft("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="rounded-2xl bg-paper border border-clay-200 shadow-soft px-5 py-4">
      <div className="flex items-center gap-3">
        <Avatar id={friend.id} name={friend.name} />
        <div className="flex-1 min-w-0">
          <p className="font-sans text-base font-semibold text-clay-950 truncate">
            {friend.name}
            <span className="font-normal text-clay-400"> · Day {friend.day}</span>
          </p>
          <p className="font-sans text-caption text-clay-400">{relativeTime(entry.createdAt)}</p>
        </div>
        <PublicBadge />
      </div>

      <p className="font-display text-lg text-clay-800 mt-3 whitespace-pre-wrap">{entry.body}</p>

      <div className="mt-3 pt-3 border-t border-clay-100 flex flex-col gap-3">
        <ReactionBar counts={tallies(reactions)} current={mine?.type ?? null} disabled={busy || !myId} onPick={react} />

        <button
          onClick={() => setShowComments((s) => !s)}
          className="self-start font-sans text-sm text-clay-500 hover:text-clay-700 transition-colors"
        >
          {comments.length > 0 ? `${comments.length} comment${comments.length === 1 ? "" : "s"}` : "Add a comment"}
          {showComments ? " ▾" : " ▸"}
        </button>

        {showComments && (
          <div className="flex flex-col gap-3">
            {comments.map((c) => (
              <div key={c.id} className="flex items-start gap-2.5">
                <Avatar id={c.userId} name={nameOf(c.userId)} size="h-8 w-8" />
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-sm">
                    <span className="font-semibold text-clay-800">{nameOf(c.userId)}</span>
                    <span className="text-clay-700"> {c.replyBody}</span>
                  </p>
                  {c.userId === myId && (
                    <button
                      onClick={() => onRemoveComment()}
                      disabled={busy}
                      className="font-sans text-caption text-clay-400 hover:text-rust-600 transition-colors mt-0.5"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}

            {myId && (
              <form onSubmit={submit} className="flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={mine?.replyBody ? "Update your comment…" : "Add a comment…"}
                  className="flex-1 h-10 min-w-0 rounded-lg border border-clay-200 bg-clay-50 px-3 text-sm text-clay-950 outline-none placeholder:text-clay-400 focus:border-blush-400 focus:shadow-ring transition"
                />
                <button
                  type="submit"
                  disabled={busy || !draft.trim()}
                  className="h-10 px-4 rounded-lg bg-blush-500 font-sans text-sm font-bold text-clay-950 shadow-soft hover:bg-blush-600 transition-colors disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export function PostsJournalFeed({ friends, myId }: { friends: FeedFriend[]; myId: string | undefined }) {
  const [items, setItems] = useState<JournalItem[] | null>(null);
  const ran = useRef(false);

  const nameOf = (id: string) => (id === myId ? "You" : friends.find((f) => f.id === id)?.name ?? "A friend");

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (friends.length === 0) {
      setItems([]);
      return;
    }
    (async () => {
      try {
        const perFriend = await Promise.all(
          friends.map(async (f) => {
            const entries = await getFriendJournals(f.id).catch(() => []);
            return entries.map((entry) => ({ entry, friend: f }));
          })
        );
        const flat = perFriend.flat().sort((a, b) => b.entry.createdAt.localeCompare(a.entry.createdAt));
        const withReactions = await Promise.all(
          flat.map(async ({ entry, friend }) => ({
            entry,
            friend,
            reactions: await getReactions(entry.id).catch(() => []),
          }))
        );
        setItems(withReactions);
      } catch (err) {
        if (err instanceof ApiAuthError) return;
        setItems([]);
      }
    })();
  }, [friends, myId]);

  const patch = (entryId: string, reactions: ReactionResponse[]) =>
    setItems((prev) => prev!.map((i) => (i.entry.id === entryId ? { ...i, reactions } : i)));

  const upsertMine = (item: JournalItem, r: ReactionResponse) => [
    ...item.reactions.filter((x) => x.userId !== myId),
    r,
  ];

  const makeReact = (item: JournalItem) => async (type: string) => {
    const mine = item.reactions.find((r) => r.userId === myId);
    if (mine?.type === type) {
      await removeReaction(item.entry.id);
      patch(item.entry.id, item.reactions.filter((r) => r.userId !== myId));
    } else {
      const r = await addReaction(item.entry.id, type, mine?.replyBody ?? undefined);
      patch(item.entry.id, upsertMine(item, r));
    }
  };

  const makeReply = (item: JournalItem) => async (text: string) => {
    const mine = item.reactions.find((r) => r.userId === myId);
    const r = await addReaction(item.entry.id, mine?.type ?? "LIKE", text);
    patch(item.entry.id, upsertMine(item, r));
  };

  const makeRemoveComment = (item: JournalItem) => async () => {
    const mine = item.reactions.find((r) => r.userId === myId);
    if (!mine) return;
    // Keep the reaction, clear only the reply text.
    const r = await addReaction(item.entry.id, mine.type, undefined);
    patch(item.entry.id, upsertMine(item, r));
  };

  if (items === null) return <Spinner />;

  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-paper border border-clay-200 shadow-soft px-5 py-8 text-center">
        <p className="font-display text-xl text-clay-700">Nothing shared yet</p>
        <p className="font-sans text-sm text-clay-500 mt-1">Public journal entries from your circle will appear here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <JournalCard
          key={item.entry.id}
          item={item}
          myId={myId}
          nameOf={nameOf}
          onReact={makeReact(item)}
          onReply={makeReply(item)}
          onRemoveComment={makeRemoveComment(item)}
        />
      ))}
      <p className="font-sans text-caption text-clay-400 text-center mt-1">
        Only entries friends mark <span className="font-semibold">public</span> show up here.
      </p>
    </div>
  );
}

// ── Photo feed ────────────────────────────────────────────────────────────────

interface PhotoItem {
  photo: PhotoResponse;
  friend: FeedFriend;
  url: string | null;
  reactions: PhotoReactionResponse[];
}

function PhotoTile({ item, myId, onOpen }: { item: PhotoItem; myId: string | undefined; onOpen: () => void }) {
  const { photo, friend, url, reactions } = item;
  const [broken, setBroken] = useState(false);
  const mine = reactions.some((r) => r.userId === myId);
  return (
    <button onClick={onOpen} className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-soft text-left">
      <div className={`absolute inset-0 ${avatarColor(friend.id)} opacity-40`} />
      {url && !broken && (
        <img
          src={url}
          alt={photo.caption ?? `${friend.name}'s photo`}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          onError={() => setBroken(true)}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
      <div className="absolute top-2.5 left-2.5">
        <PublicBadge tone="onImage" />
      </div>
      <div className="absolute top-2.5 right-2.5">
        <span className={`rounded-pill px-2 py-0.5 text-caption font-semibold flex items-center gap-1 backdrop-blur-sm ${mine ? "bg-blush-500/90 text-white" : "bg-black/25 text-white"}`}>
          ❤️ {reactions.length}
        </span>
      </div>
      <div className="absolute bottom-3 left-3 right-3">
        <p className="font-sans text-base font-semibold text-white drop-shadow-sm">{friend.name}</p>
        <p className="font-sans text-caption text-white/85 drop-shadow-sm">Day {friend.day}</p>
      </div>
    </button>
  );
}

function PhotoModal({
  item,
  myId,
  onReact,
  onClose,
}: {
  item: PhotoItem;
  myId: string | undefined;
  onReact: (type: string) => Promise<void>;
  onClose: () => void;
}) {
  const { photo, friend, url, reactions } = item;
  const [broken, setBroken] = useState(false);
  const [busy, setBusy] = useState(false);
  const mine = reactions.find((r) => r.userId === myId) ?? null;

  const react = async (type: string) => {
    if (busy || !myId) return;
    setBusy(true);
    try {
      await onReact(type);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-clay-950/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-paper shadow-lift overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="relative aspect-[3/4]">
          <div className={`absolute inset-0 ${avatarColor(friend.id)} opacity-40`} />
          {url && !broken && (
            <img src={url} alt={photo.caption ?? `${friend.name}'s photo`} className="absolute inset-0 h-full w-full object-cover" onError={() => setBroken(true)} />
          )}
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-sm"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-3">
          <div>
            <p className="font-sans text-base font-semibold text-clay-950">
              {friend.name}
              <span className="font-normal text-clay-400"> · Day {friend.day}</span>
            </p>
            {photo.caption && <p className="font-sans text-sm text-clay-600 mt-0.5">{photo.caption}</p>}
          </div>
          <ReactionBar counts={tallies(reactions)} current={mine?.type ?? null} disabled={busy || !myId} onPick={react} />
        </div>
      </div>
    </div>
  );
}

export function PostsPhotoFeed({ friends, myId }: { friends: FeedFriend[]; myId: string | undefined }) {
  const [items, setItems] = useState<PhotoItem[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (friends.length === 0) {
      setItems([]);
      return;
    }
    (async () => {
      try {
        const perFriend = await Promise.all(
          friends.map(async (f) => {
            const photos = await getFriendPhotos(f.id).catch(() => []);
            return photos.map((photo) => ({ photo, friend: f }));
          })
        );
        const flat = perFriend.flat().sort((a, b) => b.photo.createdAt.localeCompare(a.photo.createdAt));
        const full = await Promise.all(
          flat.map(async ({ photo, friend }) => ({
            photo,
            friend,
            url: await getPhotoSignedUrl(photo.id).catch(() => null),
            reactions: await getPhotoReactions(photo.id).catch(() => []),
          }))
        );
        setItems(full);
      } catch (err) {
        if (err instanceof ApiAuthError) return;
        setItems([]);
      }
    })();
  }, [friends]);

  const makeReact = (item: PhotoItem) => async (type: string) => {
    const mine = item.reactions.find((r) => r.userId === myId);
    let reactions: PhotoReactionResponse[];
    if (mine?.type === type) {
      await removePhotoReaction(item.photo.id);
      reactions = item.reactions.filter((r) => r.userId !== myId);
    } else {
      const r = await addPhotoReaction(item.photo.id, type);
      reactions = [...item.reactions.filter((x) => x.userId !== myId), r];
    }
    setItems((prev) => prev!.map((i) => (i.photo.id === item.photo.id ? { ...i, reactions } : i)));
  };

  if (items === null) return <Spinner />;

  const open = items.find((i) => i.photo.id === openId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2.5 rounded-2xl bg-sage-100 px-4 py-3">
        <span className="text-sage-600 mt-0.5">
          <LockIcon />
        </span>
        <p className="font-sans text-sm text-clay-700">
          <span className="font-semibold">Public-to-friends only.</span> You only ever see photos a friend deliberately shared with the circle — private ones never appear.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl bg-paper border border-clay-200 shadow-soft px-5 py-8 text-center">
          <p className="font-display text-xl text-clay-700">No shared photos yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => (
            <PhotoTile key={item.photo.id} item={item} myId={myId} onOpen={() => setOpenId(item.photo.id)} />
          ))}
        </div>
      )}

      {open && <PhotoModal item={open} myId={myId} onReact={makeReact(open)} onClose={() => setOpenId(null)} />}
    </div>
  );
}
