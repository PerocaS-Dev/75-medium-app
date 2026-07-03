import type { AuthProvider } from "@refinedev/core";

export interface UserIdentity {
  id: string;
  email: string;
  displayName: string;
  timeZone: string;
  popiaConsentAt: string | null;
}

export const authProvider: AuthProvider = {
  login: async ({ email, password }: { email: string; password: string }) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      return {
        success: false,
        error: { name: "Login failed", message: "Invalid email or password" },
      };
    }
    return { success: true };
  },

  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    return { success: true, redirectTo: "/login" };
  },

  check: async () => {
    const res = await fetch("/api/auth/me");
    if (!res.ok) return { authenticated: false, redirectTo: "/login" };
    return { authenticated: true };
  },

  getIdentity: async (): Promise<UserIdentity | null> => {
    const res = await fetch("/api/auth/me");
    if (!res.ok) return null;
    return res.json();
  },

  onError: async (error) => {
    if (error?.status === 401) return { logout: true };
    return { error };
  },
};
