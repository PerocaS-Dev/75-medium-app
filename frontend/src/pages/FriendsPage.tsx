import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useGetIdentity } from "@refinedev/core";
import {
  getFriends,
  getIncomingRequests,
  getOutgoingRequests,
  getUserProfile,
  getFriendProgress,
  lookupUserByEmail,
  sendFriendRequest,
  acceptRequest,
  declineRequest,
  removeFriend,
  ApiAuthError,
  type FriendshipResponse,
  type UserProfileResponse,
  type UserProgressResponse,
} from "../api";
import type { UserIdentity } from "../authProvider";
import {
  CHALLENGE_LENGTH,
  deriveState,
  STATE_META,
  avatarColor,
  initial,
  type FriendState,
} from "../friends";
import { PostsJournalFeed, PostsPhotoFeed, type FeedFriend } from "./FriendsPosts";

interface FriendEntry {
  friendship: FriendshipResponse;
  friendId: string;
  profile: UserProfileResponse | null;
  progress: UserProgressResponse | null;
}
interface PersonEntry {
  friendship: FriendshipResponse;
  personId: string;
  profile: UserProfileResponse | null;
}

type Tab = "stats" | "posts" | "circle";
type PostView = "journal" | "photos";

const SUBTITLE: Record<Tab, (n: number) => string> = {
  stats: (n) => `Your accountability circle · ${n}`,
  posts: () => "What friends chose to share",
  circle: () => "Add or remove who sees you",
};

// ── Small shared UI ───────────────────────────────────────────────────────────

function Avatar({ id, name, size = "h-11 w-11" }: { id: string; name: string; size?: string }) {
  return (
    <span
      className={`${size} ${avatarColor(id)} flex-shrink-0 rounded-full flex items-center justify-center font-sans font-semibold text-white`}
    >
      {initial(name)}
    </span>
  );
}

function StateDot({ state }: { state: FriendState }) {
  return <span className={`inline-block w-2 h-2 rounded-full ${STATE_META[state].dot}`} />;
}

function StreakBar({ streak, state }: { streak: number; state: FriendState }) {
  const pct = Math.min(100, Math.round((streak / CHALLENGE_LENGTH) * 100));
  return (
    <div className="h-2 rounded-pill bg-clay-100 overflow-hidden">
      <div className={`h-full rounded-pill ${STATE_META[state].bar} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-pill bg-clay-100 p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={[
              "flex-1 h-9 rounded-pill font-sans text-sm font-semibold transition-colors",
              active ? "bg-paper text-clay-950 shadow-soft" : "text-clay-500 hover:text-clay-700",
            ].join(" ")}
          >
            {o.label}
          </button>
        );
      })}
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

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M8 2v12M2 8h12" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

// ── Stats tab ─────────────────────────────────────────────────────────────────

interface StreakDatum {
  friendId: string;
  name: string;
  streak: number;
  state: FriendState;
}

function AggregateChart({ data }: { data: StreakDatum[] }) {
  const [active, setActive] = useState<FriendState | null>(null);

  const groups: { state: FriendState; label: string; names: string[] }[] = [
    { state: "on-track", label: "Keeping up", names: [] },
    { state: "buffer-low", label: "Missed a day", names: [] },
    { state: "fell-back", label: "Fell back", names: [] },
  ];
  for (const d of data) {
    const g = groups.find((x) => x.state === d.state);
    if (g) g.names.push(d.name);
  }
  const maxCount = Math.max(1, ...groups.map((g) => g.names.length));
  const activeGroup = groups.find((g) => g.state === active);

  return (
    <div className="rounded-2xl bg-paper border border-clay-200 shadow-soft px-5 py-5">
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-caption font-semibold text-clay-400 uppercase tracking-widest">This week</p>
        <p className="font-sans text-caption text-clay-400 truncate max-w-[55%] text-right">
          {activeGroup && activeGroup.names.length > 0 ? activeGroup.names.join(", ") : "hover a bar for who"}
        </p>
      </div>
      <div className="flex items-end justify-around gap-4 h-36">
        {groups.map((g) => {
          const count = g.names.length;
          const h = count === 0 ? 8 : Math.round((count / maxCount) * 104) + 16;
          return (
            <button
              key={g.state}
              onMouseEnter={() => setActive(g.state)}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive((a) => (a === g.state ? null : g.state))}
              className="flex-1 flex flex-col items-center justify-end gap-2 h-full"
            >
              <span className="font-display text-2xl font-medium text-clay-950">{count}</span>
              <span
                className={`w-full max-w-[64px] rounded-lg transition-all ${STATE_META[g.state].bar} ${active && active !== g.state ? "opacity-40" : ""}`}
                style={{ height: `${h}px` }}
              />
              <span className="font-sans text-caption text-clay-500 text-center">{g.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StreakRow({ datum }: { datum: StreakDatum }) {
  const meta = STATE_META[datum.state];
  return (
    <Link
      to={`/friends/${datum.friendId}`}
      className="flex items-center gap-3.5 rounded-2xl bg-paper border border-clay-200 shadow-soft px-4 py-3.5 hover:border-clay-300 transition-colors"
    >
      <Avatar id={datum.friendId} name={datum.name} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-sans text-base font-semibold text-clay-950 truncate">
            {datum.name}
            <span className={`font-normal ${meta.text} ml-2 inline-flex items-center gap-1.5`}>
              <StateDot state={datum.state} />
              {meta.label}
            </span>
          </p>
          <p className="font-display text-2xl font-medium text-clay-950 leading-none flex-shrink-0">
            {datum.streak}
            <span className="font-sans text-caption text-clay-400 ml-1 align-top">DAYS</span>
          </p>
        </div>
        <div className="mt-2">
          <StreakBar streak={datum.streak} state={datum.state} />
        </div>
      </div>
    </Link>
  );
}

function QuietCard({ friends, onInvite }: { friends: StreakDatum[]; onInvite: () => void }) {
  const first = friends[0];
  const bodyNames =
    friends.length === 0
      ? null
      : friends.length === 1
        ? friends[0].name
        : `${friends[0].name} and ${friends[1].name}`;
  return (
    <div className="rounded-2xl bg-paper border border-clay-200 shadow-soft px-6 py-8 text-center">
      <div className="flex items-center justify-center mb-5">
        {first ? (
          <Avatar id={first.friendId} name={first.name} size="h-12 w-12" />
        ) : (
          <span className="h-12 w-12 rounded-full bg-clay-200 flex items-center justify-center text-clay-400">
            <PlusIcon />
          </span>
        )}
        <span className="h-8 w-8 -ml-2 rounded-full bg-clay-100 border-2 border-paper flex items-center justify-center text-clay-400">
          <PlusIcon />
        </span>
        <span className="h-11 w-11 -ml-2 rounded-full border-2 border-dashed border-clay-300" />
      </div>
      <p className="font-display text-2xl font-medium text-clay-950">Your circle is quiet</p>
      <p className="font-sans text-base text-clay-600 mt-2 max-w-xs mx-auto">
        {bodyNames ? (
          <>
            You're doing the 75 with <span className="font-semibold text-clay-800">{bodyNames}</span> so far.
            Accountability sticks when a few people can see you show up.
          </>
        ) : (
          <>Accountability sticks when a few people can see you show up. Invite someone to do the 75 alongside you.</>
        )}
      </p>
      <button
        onClick={onInvite}
        className="mt-5 inline-flex items-center gap-2 h-12 px-6 rounded-pill bg-blush-500 font-sans text-base font-bold text-clay-950 shadow-soft hover:bg-blush-600 transition-colors"
      >
        <PlusIcon />
        Invite a friend
      </button>
    </div>
  );
}

function StatsTab({ data, onInvite }: { data: StreakDatum[]; onInvite: () => void }) {
  const full = data.length >= 3;
  return (
    <div className="flex flex-col gap-6">
      {full ? <AggregateChart data={data} /> : <QuietCard friends={data} onInvite={onInvite} />}

      {data.length > 0 && (
        <section>
          {full && (
            <div className="flex items-baseline justify-between mb-3">
              <p className="text-caption font-semibold text-clay-400 uppercase tracking-widest">Current streaks</p>
              <p className="font-sans text-caption text-clay-400">tap for detail</p>
            </div>
          )}
          <div className="flex flex-col gap-2.5">
            {data.map((d) => (
              <StreakRow key={d.friendId} datum={d} />
            ))}
          </div>
        </section>
      )}

      {!full && (
        <p className="font-sans text-caption text-clay-400 text-center px-6">
          Invites are private — friends only see each other's progress once both accept.
        </p>
      )}
    </div>
  );
}

// ── Circle tab ────────────────────────────────────────────────────────────────

interface CircleProps {
  friends: FriendEntry[];
  incoming: PersonEntry[];
  pending: PersonEntry[];
  busyIds: Set<string>;
  onInvite: (email: string) => Promise<string | null>;
  onAccept: (e: PersonEntry) => void;
  onDecline: (e: PersonEntry) => void;
  onCancel: (e: PersonEntry) => void;
  onRemove: (e: FriendEntry) => void;
}

function CircleTab(props: CircleProps) {
  const { friends, incoming, pending, busyIds } = props;
  const [email, setEmail] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const submitInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || inviteBusy) return;
    setInviteBusy(true);
    setInviteMsg(null);
    const err = await props.onInvite(email.trim());
    if (err) {
      setInviteMsg({ ok: false, text: err });
    } else {
      setInviteMsg({ ok: true, text: "Invite sent" });
      setEmail("");
    }
    setInviteBusy(false);
  };

  const share = async () => {
    const url = window.location.origin;
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: "75 Medium", text: "Do the 75 with me on 75 Medium", url });
      } catch {
        /* user cancelled */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Add a friend */}
      <div className="rounded-2xl bg-paper border border-clay-200 shadow-soft p-4">
        <p className="text-caption font-semibold text-clay-400 uppercase tracking-widest mb-3">Add a friend</p>
        <form onSubmit={submitInvite} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setInviteMsg(null);
            }}
            placeholder="Their email"
            className="flex-1 h-12 min-w-0 rounded-lg border border-clay-200 bg-clay-50 px-4 text-base text-clay-950 outline-none placeholder:text-clay-400 focus:border-blush-400 focus:shadow-ring transition"
          />
          <button
            type="submit"
            disabled={inviteBusy || !email.trim()}
            className="h-12 px-5 rounded-lg bg-blush-500 font-sans text-base font-bold text-clay-950 shadow-soft hover:bg-blush-600 transition-colors disabled:opacity-50"
          >
            {inviteBusy ? "…" : "Invite"}
          </button>
        </form>
        <button
          onClick={share}
          className="mt-2 w-full h-12 rounded-lg bg-clay-50 border border-clay-200 flex items-center justify-center gap-2 font-sans text-base font-semibold text-clay-700 hover:bg-clay-100 transition-colors"
        >
          <LinkIcon />
          {shareCopied ? "Link copied" : "Share invite link"}
        </button>
        {inviteMsg && (
          <p className={`font-sans text-sm mt-2 ${inviteMsg.ok ? "text-sage-600" : "text-rust-600"}`}>
            {inviteMsg.text}
          </p>
        )}
      </div>

      {/* Incoming requests */}
      {incoming.length > 0 && (
        <section>
          <p className="text-caption font-semibold text-clay-400 uppercase tracking-widest mb-3">
            Requests · {incoming.length}
          </p>
          <div className="flex flex-col gap-2.5">
            {incoming.map((e) => (
              <div key={e.friendship.id} className="flex items-center gap-3 rounded-2xl bg-paper border border-clay-200 shadow-soft px-4 py-3">
                <Avatar id={e.personId} name={e.profile?.displayName ?? "?"} size="h-10 w-10" />
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-base font-semibold text-clay-950 truncate">
                    {e.profile?.displayName ?? "Unknown user"}
                  </p>
                  <p className="font-sans text-caption text-clay-500">wants to join your circle</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => props.onAccept(e)}
                    disabled={busyIds.has(e.friendship.id)}
                    className="h-8 px-3 rounded-pill bg-sage-500 font-sans text-sm font-bold text-white hover:bg-sage-600 transition-colors disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => props.onDecline(e)}
                    disabled={busyIds.has(e.friendship.id)}
                    className="h-8 px-3 rounded-pill bg-clay-100 font-sans text-sm font-bold text-clay-700 hover:bg-clay-200 transition-colors disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pending (outgoing) */}
      {pending.length > 0 && (
        <section>
          <p className="text-caption font-semibold text-clay-400 uppercase tracking-widest mb-3">
            Pending · {pending.length}
          </p>
          <div className="flex flex-col gap-2.5">
            {pending.map((e) => (
              <div key={e.friendship.id} className="flex items-center gap-3 rounded-2xl border border-dashed border-clay-300 px-4 py-3">
                <Avatar id={e.personId} name={e.profile?.displayName ?? "?"} size="h-10 w-10" />
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-base font-semibold text-clay-950 truncate">
                    {e.profile?.displayName ?? "Invited"}
                  </p>
                  <p className="font-sans text-caption text-clay-400">Invite sent · awaiting reply</p>
                </div>
                <button
                  onClick={() => props.onCancel(e)}
                  disabled={busyIds.has(e.friendship.id)}
                  className="h-8 px-3 rounded-pill bg-clay-100 font-sans text-sm font-bold text-clay-600 hover:bg-clay-200 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Your circle */}
      <section>
        <p className="text-caption font-semibold text-clay-400 uppercase tracking-widest mb-3">
          Your circle · {friends.length}
        </p>
        {friends.length === 0 ? (
          <p className="font-sans text-sm text-clay-400">No one yet — invite someone above.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {friends.map((f) => {
              const state = deriveState(f.progress);
              const meta = STATE_META[state];
              const name = f.profile?.displayName ?? "Unknown";
              return (
                <div key={f.friendship.id} className="flex items-center gap-3 rounded-2xl bg-paper border border-clay-200 shadow-soft px-4 py-3">
                  <Avatar id={f.friendId} name={name} size="h-10 w-10" />
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-base font-semibold text-clay-950 truncate flex items-center gap-2">
                      {name}
                      <StateDot state={state} />
                    </p>
                    <p className="font-sans text-caption text-clay-500">
                      {f.progress ? `Day ${f.progress.currentStreak} · ${meta.label}` : "No active challenge"}
                    </p>
                  </div>
                  <button
                    onClick={() => props.onRemove(f)}
                    disabled={busyIds.has(f.friendship.id)}
                    aria-label={`Remove ${name}`}
                    className="h-8 w-8 rounded-full bg-clay-100 flex items-center justify-center text-clay-500 hover:bg-rust-100 hover:text-rust-600 transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <path d="M3 3l10 10M13 3L3 13" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export function FriendsPage() {
  const navigate = useNavigate();
  const { data: identity } = useGetIdentity<UserIdentity>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [incoming, setIncoming] = useState<PersonEntry[]>([]);
  const [pending, setPending] = useState<PersonEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const ran = useRef(false);

  const myId = identity?.id;
  const tab = (searchParams.get("tab") as Tab) || "stats";
  const postView = (searchParams.get("view") as PostView) || "journal";

  const setTab = (t: Tab) => setSearchParams(t === "stats" ? {} : { tab: t }, { replace: true });
  const setPostView = (v: PostView) => setSearchParams({ tab: "posts", view: v }, { replace: true });

  useEffect(() => {
    if (ran.current || !myId) return;
    ran.current = true;
    (async () => {
      try {
        const [rawFriends, rawIncoming, rawPending] = await Promise.all([
          getFriends(),
          getIncomingRequests(),
          getOutgoingRequests(),
        ]);

        const friendEntries = await Promise.all(
          rawFriends.map(async (f) => {
            const friendId = f.requesterId === myId ? f.addresseeId : f.requesterId;
            const [profile, progress] = await Promise.all([
              getUserProfile(friendId),
              getFriendProgress(friendId).catch(() => null),
            ]);
            return { friendship: f, friendId, profile, progress } as FriendEntry;
          })
        );
        const incomingEntries = await Promise.all(
          rawIncoming.map(async (r) => ({
            friendship: r,
            personId: r.requesterId,
            profile: await getUserProfile(r.requesterId).catch(() => null),
          }))
        );
        const pendingEntries = await Promise.all(
          rawPending.map(async (r) => ({
            friendship: r,
            personId: r.addresseeId,
            profile: await getUserProfile(r.addresseeId).catch(() => null),
          }))
        );

        setFriends(friendEntries);
        setIncoming(incomingEntries);
        setPending(pendingEntries);
      } catch (err) {
        if (err instanceof ApiAuthError) {
          navigate("/login", { replace: true });
          return;
        }
        setError("Failed to load. Please refresh.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [navigate, myId]);

  const withBusy = (id: string, fn: () => Promise<void>) => async () => {
    if (busyIds.has(id)) return;
    setBusyIds((s) => new Set(s).add(id));
    try {
      await fn();
    } finally {
      setBusyIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  };

  // Sorted streak data for the Stats tab.
  const streakData: StreakDatum[] = useMemo(
    () =>
      friends
        .map((f) => ({
          friendId: f.friendId,
          name: f.profile?.displayName ?? "Unknown",
          streak: f.progress?.currentStreak ?? 0,
          state: deriveState(f.progress),
        }))
        .sort((a, b) => b.streak - a.streak),
    [friends]
  );

  const feedFriends: FeedFriend[] = useMemo(
    () =>
      friends.map((f) => ({
        id: f.friendId,
        name: f.profile?.displayName ?? "Unknown",
        day: f.progress?.currentStreak ?? 0,
      })),
    [friends]
  );

  // ── mutations (update local state → aggregate + graph recompute live) ────────
  const handleInvite = async (email: string): Promise<string | null> => {
    try {
      const found = await lookupUserByEmail(email);
      if (!found) return "No account found with that email.";
      if (found.id === myId) return "That's you.";
      const fs = await sendFriendRequest(found.id);
      setPending((prev) => [...prev, { friendship: fs, personId: found.id, profile: found }]);
      return null;
    } catch (err) {
      if (err instanceof ApiAuthError) {
        navigate("/login", { replace: true });
        return "Session expired.";
      }
      return "Couldn't send — you may already be connected or a request is pending.";
    }
  };

  const handleAccept = (e: PersonEntry) =>
    withBusy(e.friendship.id, async () => {
      await acceptRequest(e.friendship.id);
      setIncoming((prev) => prev.filter((r) => r.friendship.id !== e.friendship.id));
      const progress = await getFriendProgress(e.personId).catch(() => null);
      setFriends((prev) => [
        ...prev,
        {
          friendship: { ...e.friendship, status: "ACCEPTED" },
          friendId: e.personId,
          profile: e.profile,
          progress,
        },
      ]);
    })();

  const handleDecline = (e: PersonEntry) =>
    withBusy(e.friendship.id, async () => {
      await declineRequest(e.friendship.id);
      setIncoming((prev) => prev.filter((r) => r.friendship.id !== e.friendship.id));
    })();

  const handleCancel = (e: PersonEntry) =>
    withBusy(e.friendship.id, async () => {
      await removeFriend(e.friendship.id);
      setPending((prev) => prev.filter((r) => r.friendship.id !== e.friendship.id));
    })();

  const handleRemove = (e: FriendEntry) =>
    withBusy(e.friendship.id, async () => {
      await removeFriend(e.friendship.id);
      setFriends((prev) => prev.filter((f) => f.friendship.id !== e.friendship.id));
    })();

  if (isLoading) return <Spinner />;

  return (
    <div className="animate-rise flex flex-col gap-5">
      <div>
        <h1 className="font-display text-3xl font-medium text-clay-950">Friends</h1>
        <p className="font-sans text-base text-clay-500 mt-0.5">{SUBTITLE[tab](friends.length)}</p>
      </div>

      <Segmented<Tab>
        options={[
          { value: "stats", label: "Stats" },
          { value: "posts", label: "Posts" },
          { value: "circle", label: "Circle" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {error && <p className="font-sans text-sm text-rust-600">{error}</p>}

      {tab === "stats" && <StatsTab data={streakData} onInvite={() => setTab("circle")} />}

      {tab === "posts" && (
        <div className="flex flex-col gap-5">
          <Segmented<PostView>
            options={[
              { value: "journal", label: "Journal" },
              { value: "photos", label: "Photos" },
            ]}
            value={postView}
            onChange={setPostView}
          />
          {postView === "journal" ? (
            <PostsJournalFeed key="journal" friends={feedFriends} myId={myId} />
          ) : (
            <PostsPhotoFeed key="photos" friends={feedFriends} myId={myId} />
          )}
        </div>
      )}

      {tab === "circle" && (
        <CircleTab
          friends={friends}
          incoming={incoming}
          pending={pending}
          busyIds={busyIds}
          onInvite={handleInvite}
          onAccept={handleAccept}
          onDecline={handleDecline}
          onCancel={handleCancel}
          onRemove={handleRemove}
        />
      )}
    </div>
  );
}
