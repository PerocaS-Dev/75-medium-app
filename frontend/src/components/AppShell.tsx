import { useLogout, useGetIdentity } from "@refinedev/core";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import type { UserIdentity } from "../authProvider";

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

const TAB_ROUTES = ["/today", "/progress"];

export function AppShell() {
  const { mutateAsync: logout } = useLogout();
  const { data: identity } = useGetIdentity<UserIdentity>();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout({});
    navigate("/login");
  };

  const showTabs = TAB_ROUTES.includes(location.pathname);

  const tabCls = (path: string) => {
    const active = location.pathname === path;
    return [
      "flex flex-col items-center gap-1 px-6 py-2 transition-colors",
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
          </div>
        </nav>
      )}
    </div>
  );
}
