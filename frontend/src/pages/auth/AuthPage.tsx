import { useState } from "react";
import { useLogin } from "@refinedev/core";
import { useNavigate } from "react-router-dom";

type Tab = "signin" | "register";

// ── Icons ──────────────────────────────────────────────────────────────────

function EyeOpen() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeClosed() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// ── Brand mark ─────────────────────────────────────────────────────────────

function BrandIcon({ size = "lg" }: { size?: "sm" | "lg" }) {
  const dims = size === "sm" ? "w-10 h-10 rounded-xl" : "w-16 h-16 rounded-2xl";
  const text = size === "sm" ? "text-xl" : "text-2xl";
  return (
    <div className={`${dims} bg-gradient-to-br from-blush-300 to-lilac-400 flex items-center justify-center flex-shrink-0`}>
      <span className={`font-display ${text} text-white font-semibold`}>75</span>
    </div>
  );
}

// ── Desktop left panel ─────────────────────────────────────────────────────

function LeftPanel() {
  return (
    <div className="hidden md:flex md:w-[42%] lg:w-[440px] bg-gradient-to-b from-blush-200 to-lilac-300 flex-col p-12 min-h-screen">
      <div className="flex items-center gap-3">
        <BrandIcon size="sm" />
        <span className="font-display text-lg text-clay-950">
          75 <em className="italic text-blush-600">Medium</em>
        </span>
      </div>
      <div className="mt-auto">
        <h2 className="font-display text-[2.5rem] leading-[1.1] text-clay-950 mb-6">
          75 days.<br />
          Your rules.<br />
          <em className="italic">Your people,<br />watching.</em>
        </h2>
        <p className="font-sans text-base text-clay-700 leading-relaxed max-w-[280px]">
          The accountability-first tracker. Show up daily, alongside friends who can see you do it.
        </p>
      </div>
    </div>
  );
}

// ── Shared input class ─────────────────────────────────────────────────────

const inputClass =
  "w-full bg-white rounded-xl px-4 py-3.5 font-sans text-base text-clay-950 " +
  "placeholder:text-clay-300 border border-clay-100 " +
  "focus:outline-none focus:ring-2 focus:ring-blush-300 focus:border-transparent transition";

// ── Error banner ───────────────────────────────────────────────────────────

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div className="bg-rust-100 text-rust-600 rounded-lg px-4 py-3 font-sans text-sm">
      {msg}
    </div>
  );
}

// ── Sign-in form ───────────────────────────────────────────────────────────

function SignInForm() {
  const { mutateAsync: login, isPending } = useLogin<{ email: string; password: string }>();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = await login({ email, password });
    if (result.success) {
      navigate("/dashboard");
    } else {
      setError(result.error?.message ?? "Invalid email or password");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-6">
      {error && <ErrorBanner msg={error} />}

      <div className="flex flex-col gap-1.5">
        <label className="font-sans text-sm text-clay-700">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="you@email.com"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="font-sans text-sm text-clay-700">Password</label>
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className={inputClass + " pr-12"}
          />
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            tabIndex={-1}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-clay-400 hover:text-clay-600 transition-colors"
          >
            {showPw ? <EyeClosed /> : <EyeOpen />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full mt-1 bg-blush-500 hover:bg-blush-600 active:scale-[0.98] disabled:opacity-50 text-clay-950 font-sans font-bold py-4 rounded-pill transition-all text-base"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

// ── Register form ──────────────────────────────────────────────────────────

function RegisterForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: "",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (regRes.status === 409) {
        setError("An account with that email already exists.");
        return;
      }
      if (!regRes.ok) {
        setError("Something went wrong. Please try again.");
        return;
      }
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      if (!loginRes.ok) {
        navigate("/login");
        return;
      }
      await fetch("/api/auth/popia-consent", { method: "POST" });
      navigate("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-6">
      {error && <ErrorBanner msg={error} />}

      <div className="flex flex-col gap-1.5">
        <label className="font-sans text-sm text-clay-700">Name</label>
        <input
          type="text"
          value={form.displayName}
          onChange={set("displayName")}
          required
          autoComplete="name"
          placeholder="What should friends call you?"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="font-sans text-sm text-clay-700">Email</label>
        <input
          type="email"
          value={form.email}
          onChange={set("email")}
          required
          autoComplete="email"
          placeholder="you@email.com"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="font-sans text-sm text-clay-700">Password</label>
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            value={form.password}
            onChange={set("password")}
            required
            autoComplete="new-password"
            minLength={8}
            placeholder="••••••••"
            className={inputClass + " pr-12"}
          />
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            tabIndex={-1}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-clay-400 hover:text-clay-600 transition-colors"
          >
            {showPw ? <EyeClosed /> : <EyeOpen />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full mt-1 bg-blush-500 hover:bg-blush-600 active:scale-[0.98] disabled:opacity-50 text-clay-950 font-sans font-bold py-4 rounded-pill transition-all text-base"
      >
        {isLoading ? "Creating account…" : "Start my 75 days"}
      </button>
    </form>
  );
}

// ── Tab switcher ───────────────────────────────────────────────────────────

function TabSwitcher({ tab, switchTab }: { tab: Tab; switchTab: (t: Tab) => void }) {
  return (
    <div className="flex bg-clay-100 rounded-pill p-1">
      {(["signin", "register"] as Tab[]).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => switchTab(t)}
          className={[
            "flex-1 py-2.5 rounded-pill font-sans text-sm font-semibold transition-all",
            tab === t
              ? "bg-white shadow-soft text-clay-950"
              : "text-clay-500 hover:text-clay-700",
          ].join(" ")}
        >
          {t === "signin" ? "Sign in" : "Create account"}
        </button>
      ))}
    </div>
  );
}

// ── POPIA footer ───────────────────────────────────────────────────────────

function POPIAText() {
  return (
    <p className="font-sans text-xs text-clay-400 text-center mt-6 leading-relaxed">
      By continuing you agree to our{" "}
      <span className="font-semibold text-clay-600">Terms</span>{" "}
      &amp;{" "}
      <span className="font-semibold text-clay-600">Privacy</span>.{" "}
      POPIA-compliant.
    </p>
  );
}

// ── AuthPage ───────────────────────────────────────────────────────────────

export function AuthPage({ initialTab }: { initialTab: Tab }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>(initialTab);

  const switchTab = (t: Tab) => {
    setTab(t);
    navigate(t === "signin" ? "/login" : "/register", { replace: true });
  };

  const heading =
    tab === "signin"
      ? { title: "Welcome back", sub: "Pick up where you left off." }
      : { title: "Create account", sub: "Design your 75 in a minute." };

  return (
    <div className="min-h-screen flex">
      <LeftPanel />

      {/* Right panel — full width on mobile, flex-1 on desktop */}
      <div className="flex-1 flex flex-col items-center justify-center bg-clay-50 md:bg-paper px-6 py-10 md:px-16">

        {/* Mobile brand (hidden on desktop) */}
        <div className="md:hidden text-center mb-8">
          <div className="flex justify-center mb-3">
            <BrandIcon size="lg" />
          </div>
          <h1 className="font-display text-2xl text-clay-950 mb-1">
            75 <span className="italic text-blush-500">Medium</span>
          </h1>
          <p className="font-sans text-sm text-clay-400">{heading.sub}</p>
        </div>

        <div className="w-full max-w-sm md:max-w-md">
          {/* Desktop heading (hidden on mobile) */}
          <div className="hidden md:block mb-8">
            <h1 className="font-display text-3xl text-clay-950 mb-1">{heading.title}</h1>
            <p className="font-sans text-sm text-clay-500">{heading.sub}</p>
          </div>

          <TabSwitcher tab={tab} switchTab={switchTab} />

          {tab === "signin" ? <SignInForm /> : <RegisterForm />}

          <POPIAText />
        </div>
      </div>
    </div>
  );
}
