import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useGetIdentity } from "@refinedev/core";
import {
  getFriends,
  getIncomingRequests,
  getUserProfile,
  getFriendProgress,
  acceptRequest,
  declineRequest,
  removeFriend,
  ApiAuthError,
  type FriendshipResponse,
  type UserProfileResponse,
  type UserProgressResponse,
} from "../api";
import type { UserIdentity } from "../authProvider";

interface FriendEntry {
  friendship: FriendshipResponse;
  friendId: string;
  profile: UserProfileResponse | null;
  progress: UserProgressResponse | null;
}

interface RequestEntry {
  friendship: FriendshipResponse;
  profile: UserProfileResponse | null;
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

function TierDot({ tier }: { tier: number }) {
  const colors = ["", "bg-clay-300", "bg-blush-400", "bg-lilac-400", "bg-sage-500"];
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${colors[tier] ?? "bg-clay-300"}`} />
  );
}

export function FriendsPage() {
  const navigate = useNavigate();
  const { data: identity } = useGetIdentity<UserIdentity>();
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [requests, setRequests] = useState<RequestEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const ran = useRef(false);

  const myId = identity?.id;

  useEffect(() => {
    if (ran.current || !myId) return;
    ran.current = true;
    async function load() {
      try {
        const [rawFriends, rawRequests] = await Promise.all([
          getFriends(),
          getIncomingRequests(),
        ]);

        // Resolve friend IDs and fetch profiles + progress in parallel
        const friendEntries: FriendEntry[] = await Promise.all(
          rawFriends.map(async (f) => {
            const friendId = f.requesterId === myId ? f.addresseeId : f.requesterId;
            const [profile, progress] = await Promise.all([
              getUserProfile(friendId),
              getFriendProgress(friendId).catch(() => null),
            ]);
            return { friendship: f, friendId, profile, progress };
          })
        );

        // Fetch requester profiles for incoming requests
        const requestEntries: RequestEntry[] = await Promise.all(
          rawRequests.map(async (r) => {
            const profile = await getUserProfile(r.requesterId).catch(() => null);
            return { friendship: r, profile };
          })
        );

        setFriends(friendEntries);
        setRequests(requestEntries);
      } catch (err) {
        if (err instanceof ApiAuthError) { navigate("/login", { replace: true }); return; }
        setError("Failed to load. Please refresh.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [navigate, myId]);

  const withPending = (id: string, fn: () => Promise<void>) => async () => {
    if (pendingIds.has(id)) return;
    setPendingIds((s) => new Set(s).add(id));
    try { await fn(); } finally {
      setPendingIds((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  };

  const handleAccept = (entry: RequestEntry) =>
    withPending(entry.friendship.id, async () => {
      await acceptRequest(entry.friendship.id);
      setRequests((prev) => prev.filter((r) => r.friendship.id !== entry.friendship.id));
      // Add to friends list with profile
      const friendId = entry.friendship.requesterId;
      const progress = await getFriendProgress(friendId).catch(() => null);
      setFriends((prev) => [
        ...prev,
        { friendship: { ...entry.friendship, status: "ACCEPTED" }, friendId, profile: entry.profile, progress },
      ]);
    })();

  const handleDecline = (entry: RequestEntry) =>
    withPending(entry.friendship.id, async () => {
      await declineRequest(entry.friendship.id);
      setRequests((prev) => prev.filter((r) => r.friendship.id !== entry.friendship.id));
    })();

  const handleRemove = (entry: FriendEntry) =>
    withPending(entry.friendship.id, async () => {
      await removeFriend(entry.friendship.id);
      setFriends((prev) => prev.filter((f) => f.friendship.id !== entry.friendship.id));
    })();

  if (isLoading) return <Spinner />;

  return (
    <div className="animate-rise flex flex-col gap-6">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-medium text-clay-950">Friends</h1>
        <Link
          to="/friends/add"
          className="flex items-center gap-1.5 h-9 px-4 rounded-pill bg-blush-500 font-sans text-sm font-bold text-clay-950 shadow-soft hover:bg-blush-600 transition-colors"
        >
          <PlusIcon />
          Add
        </Link>
      </div>

      {error && <p className="font-sans text-sm text-rust-600">{error}</p>}

      {/* Incoming requests */}
      {requests.length > 0 && (
        <section>
          <p className="text-caption font-semibold text-clay-400 uppercase tracking-widest mb-3">
            Requests ({requests.length})
          </p>
          <div className="flex flex-col gap-2">
            {requests.map((entry) => (
              <div
                key={entry.friendship.id}
                className="flex items-center gap-3 rounded-xl bg-paper border border-clay-200 shadow-soft px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-base font-semibold text-clay-950 truncate">
                    {entry.profile?.displayName ?? "Unknown user"}
                  </p>
                  <p className="font-sans text-caption text-clay-500">wants to be friends</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleAccept(entry)}
                    disabled={pendingIds.has(entry.friendship.id)}
                    className="h-8 px-3 rounded-pill bg-sage-500 font-sans text-sm font-bold text-white hover:bg-sage-600 transition-colors disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleDecline(entry)}
                    disabled={pendingIds.has(entry.friendship.id)}
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

      {/* Friends list */}
      <section>
        {friends.length > 0 ? (
          <>
            <p className="text-caption font-semibold text-clay-400 uppercase tracking-widest mb-3">
              Friends ({friends.length})
            </p>
            <div className="flex flex-col gap-2">
              {friends.map((entry) => (
                <div
                  key={entry.friendship.id}
                  className="flex items-center gap-3 rounded-xl bg-paper border border-clay-200 shadow-soft px-4 py-3"
                >
                  <Link to={`/friends/${entry.friendId}`} className="flex-1 min-w-0 flex items-center gap-3">
                    <div className="min-w-0">
                      <p className="font-sans text-base font-semibold text-clay-950 truncate">
                        {entry.profile?.displayName ?? "Unknown"}
                      </p>
                      {entry.progress ? (
                        <p className="font-sans text-caption text-clay-500 flex items-center gap-1.5 mt-0.5">
                          <TierDot tier={entry.progress.currentTier} />
                          Day {entry.progress.currentStreak} · Tier {entry.progress.currentTier}
                        </p>
                      ) : (
                        <p className="font-sans text-caption text-clay-400 mt-0.5">No active challenge</p>
                      )}
                    </div>
                  </Link>
                  <button
                    onClick={() => handleRemove(entry)}
                    disabled={pendingIds.has(entry.friendship.id)}
                    className="flex-shrink-0 font-sans text-caption text-clay-400 hover:text-rust-600 transition-colors disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          requests.length === 0 && (
            <div className="rounded-xl bg-paper border border-clay-200 shadow-soft px-5 py-8 text-center">
              <p className="font-display text-xl font-medium text-clay-700">No friends yet</p>
              <p className="font-sans text-sm text-clay-500 mt-1">Add someone to see their progress alongside yours.</p>
            </div>
          )
        )}
      </section>

    </div>
  );
}
