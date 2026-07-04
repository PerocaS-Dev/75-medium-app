import { Refine, useIsAuthenticated } from "@refinedev/core";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { authProvider } from "./authProvider";
import { dataProvider } from "./dataProvider";
import { AppShell } from "./components/AppShell";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { SetupPage } from "./pages/SetupPage";
import { TodayPage } from "./pages/TodayPage";

function Spinner() {
  return (
    <div className="min-h-screen bg-clay-50 flex items-center justify-center">
      <div className="w-5 h-5 rounded-full border-2 border-blush-400 border-t-transparent animate-spin" />
    </div>
  );
}

function ProtectedRoute() {
  const { data, isLoading } = useIsAuthenticated();
  if (isLoading) return <Spinner />;
  if (!data?.authenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function PublicRoute() {
  const { data, isLoading } = useIsAuthenticated();
  if (isLoading) return <Spinner />;
  if (data?.authenticated) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Refine
        dataProvider={dataProvider}
        authProvider={authProvider}
        options={{ disableTelemetry: true }}
      >
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/setup" element={<SetupPage />} />
              <Route path="/today" element={<TodayPage />} />
            </Route>
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Refine>
    </BrowserRouter>
  );
}
