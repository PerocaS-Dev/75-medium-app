import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getNotifications,
  markNotificationsRead,
  ApiAuthError,
  type NotificationResponse,
} from "../api";
import { REACTION_EMOJI, relativeTime } from "../friends";

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-5 h-5 rounded-full border-2 border-blush-400 border-t-transparent animate-spin" />
    </div>
  );
}

// Where a tapped notification navigates — deep-links straight to the relevant content.
function targetPath(n: NotificationResponse): string {
  switch (n.type) {
    case "JOURNAL_REACTION":
    case "JOURNAL_COMMENT":
      return n.targetId ? `/journal?entry=${n.targetId}` : "/journal";
    case "PHOTO_REACTION":
      return n.targetId ? `/photos?photo=${n.targetId}` : "/photos";
    case "FRIEND_REQUEST":
      return "/friends?tab=circle";
    case "FRIEND_ACCEPT":
      return `/friends/${n.actorId}`;
  }
}

function emojiFor(n: NotificationResponse): string {
  return n.reactionType ? REACTION_EMOJI[n.reactionType] ?? "❤️" : "";
}

// The "what happened" line. Who is bolded separately; this returns the trailing text.
function actionText(n: NotificationResponse): string {
  switch (n.type) {
    case "JOURNAL_REACTION":
      return `reacted ${emojiFor(n)} to your journal entry`;
    case "JOURNAL_COMMENT":
      return "commented on your journal entry";
    case "PHOTO_REACTION":
      return `reacted ${emojiFor(n)} to your photo`;
    case "FRIEND_REQUEST":
      return "sent you a friend request";
    case "FRIEND_ACCEPT":
      return "accepted your friend request";
  }
}

function Avatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-display text-base font-semibold text-white"
      style={{ background: "linear-gradient(150deg, var(--blush-400), var(--lilac-400))" }}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    async function load() {
      try {
        const list = await getNotifications();
        setItems(list);
        // Opening the feed = viewing them. Clear unread (badge follows on next poll/nav).
        if (list.some((n) => !n.read)) {
          markNotificationsRead().catch(() => {});
        }
      } catch (err) {
        if (err instanceof ApiAuthError) { navigate("/login", { replace: true }); return; }
        setError("Failed to load notifications. Please refresh.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [navigate]);

  if (isLoading) return <Spinner />;

  return (
    <div className="animate-rise">
      <p className="text-caption font-semibold text-clay-400 tracking-widest uppercase mb-1">Activity</p>
      <h1 className="font-display text-3xl font-medium text-clay-950 mb-6">Notifications</h1>

      {error && <p className="font-sans text-sm text-rust-600 mb-4">{error}</p>}

      {!error && items.length === 0 && (
        <div className="rounded-xl border border-clay-200 bg-paper shadow-soft px-6 py-10 text-center flex flex-col items-center gap-2">
          <BellGlyph />
          <h2 className="font-display text-xl font-medium text-clay-950 mt-1">No notifications yet</h2>
          <p className="font-sans text-sm text-clay-500 max-w-[280px]">
            When friends react to your photos or journals, or send you a friend request, it'll show up here.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {items.map((n) => (
          <button
            key={n.id}
            onClick={() => navigate(targetPath(n))}
            className={[
              "flex items-start gap-3 w-full text-left rounded-xl border px-4 py-3.5 shadow-soft transition-all active:scale-[.99]",
              n.read ? "bg-paper border-clay-200 hover:border-clay-300" : "bg-blush-100/60 border-blush-200 hover:border-blush-300",
            ].join(" ")}
          >
            <Avatar name={n.actorDisplayName} />
            <div className="min-w-0 flex-1">
              <p className="font-sans text-sm text-clay-800 leading-snug">
                <span className="font-semibold text-clay-950">{n.actorDisplayName}</span>{" "}
                {actionText(n)}
              </p>
              {n.preview && (
                <p className="mt-0.5 font-sans text-sm text-clay-600 italic line-clamp-2">
                  “{n.preview}”
                </p>
              )}
              <p className="mt-1 font-sans text-caption text-clay-400">{relativeTime(n.createdAt)}</p>
            </div>
            {!n.read && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blush-500" aria-label="unread" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function BellGlyph() {
  return (
    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-clay-100 text-clay-400">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    </span>
  );
}
