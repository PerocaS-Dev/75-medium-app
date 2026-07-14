import { useEffect, useState } from "react";
import { useLogout, useGetIdentity } from "@refinedev/core";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import type { UserIdentity } from "../authProvider";
import { getUnreadNotificationCount } from "../api";

function ChecklistIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function StreakIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function JournalIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function FriendsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

const TAB_PREFIXES = ["/today", "/progress", "/photos", "/journal", "/friends", "/notifications"];
const UNREAD_POLL_MS = 45_000;

export function AppShell() {
  const { mutateAsync: logout } = useLogout();
  const { data: identity } = useGetIdentity<UserIdentity>();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout({});
    navigate("/login");
  };

  // Unread notification badge: poll gently, refresh on navigation, and optimistically
  // clear when the feed is open (opening it marks everything read server-side).
  const [unread, setUnread] = useState(0);
  const onFeed = location.pathname === "/notifications";
  useEffect(() => {
    let alive = true;
    const refresh = () => {
      if (location.pathname === "/notifications") { setUnread(0); return; }
      getUnreadNotificationCount().then((c) => { if (alive) setUnread(c); }).catch(() => {});
    };
    refresh();
    const t = setInterval(refresh, UNREAD_POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, [location.pathname]);

  const showTabs = TAB_PREFIXES.some(
    (p) => location.pathname === p || location.pathname.startsWith(p + "/")
  );

  const tabCls = (path: string) => {
    const active = location.pathname === path || location.pathname.startsWith(path + "/");
    return [
      "flex flex-col items-center gap-1 px-2 py-2 transition-colors",
      active ? "text-clay-950" : "text-clay-400 hover:text-clay-600",
    ].join(" ");
  };

  return (
    <div className="min-h-screen bg-clay-50 flex flex-col">
      <header className="bg-paper border-b border-clay-200 shadow-soft sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-gutter h-14 flex items-center justify-between">
          <Link to="/dashboard" className="font-display text-lg text-clay-950 tracking-tight">
            75 Medium
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to="/notifications"
              aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
              className={`relative transition-colors ${onFeed ? "text-clay-950" : "text-clay-500 hover:text-clay-800"}`}
            >
              <BellIcon />
              {unread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-pill bg-blush-500 text-white text-[10px] font-bold flex items-center justify-center shadow-soft">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            {identity?.displayName && (
              <span className="font-sans text-sm text-clay-500 hidden sm:block">
                {identity.displayName}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="font-sans text-sm text-clay-500 hover:text-clay-800 transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className={`flex-1 max-w-2xl mx-auto w-full px-gutter py-section ${showTabs ? "pb-24" : ""}`}>
        <Outlet />
      </main>

      {showTabs && (
        <nav className="fixed bottom-0 left-0 right-0 bg-paper border-t border-clay-200 shadow-soft z-10">
          <div className="max-w-2xl mx-auto flex justify-around">
            <Link to="/today" className={tabCls("/today")}>
              <ChecklistIcon />
              <span className="text-caption font-semibold">Today</span>
            </Link>
            <Link to="/progress" className={tabCls("/progress")}>
              <StreakIcon />
              <span className="text-caption font-semibold">Progress</span>
            </Link>
            <Link to="/photos" className={tabCls("/photos")}>
              <CameraIcon />
              <span className="text-caption font-semibold">Photos</span>
            </Link>
            <Link to="/journal" className={tabCls("/journal")}>
              <JournalIcon />
              <span className="text-caption font-semibold">Journal</span>
            </Link>
            <Link to="/friends" className={tabCls("/friends")}>
              <FriendsIcon />
              <span className="text-caption font-semibold">Friends</span>
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
}
