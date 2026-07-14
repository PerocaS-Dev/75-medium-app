import { Navigate } from "react-router-dom";

/**
 * Legacy entry point. Setup is now optional and Today is the home base, so we no longer
 * auto-create a challenge or force the user to /setup — we simply forward to Today, which
 * handles every challenge state (none / pending / scheduled / active / ended).
 */
export function DashboardPage() {
  return <Navigate to="/today" replace />;
}
