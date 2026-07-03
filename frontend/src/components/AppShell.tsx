import { useLogout, useGetIdentity } from "@refinedev/core";
import { Outlet, Link, useNavigate } from "react-router-dom";
import type { UserIdentity } from "../authProvider";

export function AppShell() {
  const { mutateAsync: logout } = useLogout();
  const { data: identity } = useGetIdentity<UserIdentity>();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout({});
    navigate("/login");
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
      <main className="flex-1 max-w-2xl mx-auto w-full px-gutter py-section">
        <Outlet />
      </main>
    </div>
  );
}
