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
import { ProgressPage } from "./pages/ProgressPage";
import { FriendsPage } from "./pages/FriendsPage";
import { FriendsAddPage } from "./pages/FriendsAddPage";
import { FriendProgressPage } from "./pages/FriendProgressPage";
import { JournalPage } from "./pages/JournalPage";
import { JournalComposePage } from "./pages/JournalComposePage";
import { FriendJournalPage } from "./pages/FriendJournalPage";
import { PhotoPage } from "./pages/PhotoPage";
import { PhotoUploadPage } from "./pages/PhotoUploadPage";
import { FriendPhotosPage } from "./pages/FriendPhotosPage";

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
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/photos" element={<PhotoPage />} />
              <Route path="/photos/upload" element={<PhotoUploadPage />} />
              <Route path="/journal" element={<JournalPage />} />
              <Route path="/journal/new" element={<JournalComposePage />} />
              <Route path="/journal/:id/edit" element={<JournalComposePage />} />
              <Route path="/friends" element={<FriendsPage />} />
              <Route path="/friends/add" element={<FriendsAddPage />} />
              <Route path="/friends/:userId" element={<FriendProgressPage />} />
              <Route path="/friends/:userId/photos" element={<FriendPhotosPage />} />
              <Route path="/friends/:userId/journal" element={<FriendJournalPage />} />
            </Route>
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Refine>
    </BrowserRouter>
  );
}
