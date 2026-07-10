import { useState } from "react";
import { useLogin } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { InstallHint } from "../../components/InstallHint";
import "./auth-page.css";

type Tab = "signin" | "register";

function EyeIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

const inputClass =
  "h-[52px] rounded-lg border border-clay-200 bg-paper px-4 text-base text-clay-950 shadow-soft outline-none " +
  "placeholder:text-clay-400 focus:border-blush-400 focus:shadow-ring transition";

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg bg-rust-50 border border-rust-200 px-4 py-3 text-sm text-rust-600">
      {msg}
    </div>
  );
}

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      {error && <ErrorBanner msg={error} />}

      <label className="flex flex-col gap-1.5">
        <span className="text-caption font-semibold text-clay-600">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="you@email.com"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-caption font-semibold text-clay-600">Password</span>
        <div className="relative flex items-center">
          <input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className={inputClass + " w-full pr-11"}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? "Hide password" : "Show password"}
            className="absolute right-2 flex h-[34px] w-[34px] items-center justify-center text-clay-500 hover:text-clay-700"
          >
            <EyeIcon />
          </button>
        </div>
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 h-14 rounded-xl bg-blush-500 text-lg font-bold text-clay-950 shadow-soft transition hover:bg-blush-600 active:scale-[.99] disabled:opacity-50"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

function RegisterForm() {
  const navigate = useNavigate();
  const { mutateAsync: login } = useLogin<{ email: string; password: string }>();
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
      const loginResult = await login({ email: form.email, password: form.password });
      if (!loginResult.success) {
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      {error && <ErrorBanner msg={error} />}

      <label className="flex flex-col gap-1.5">
        <span className="text-caption font-semibold text-clay-600">Name</span>
        <input
          type="text"
          value={form.displayName}
          onChange={set("displayName")}
          required
          autoComplete="name"
          placeholder="What should friends call you?"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-caption font-semibold text-clay-600">Time zone</span>
        <input
          type="text"
          value={form.timeZone}
          onChange={set("timeZone")}
          required
          placeholder="e.g. Africa/Johannesburg"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-caption font-semibold text-clay-600">Email</span>
        <input
          type="email"
          value={form.email}
          onChange={set("email")}
          required
          autoComplete="email"
          placeholder="you@email.com"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-caption font-semibold text-clay-600">Password</span>
        <div className="relative flex items-center">
          <input
            type={showPw ? "text" : "password"}
            value={form.password}
            onChange={set("password")}
            required
            autoComplete="new-password"
            minLength={8}
            placeholder="••••••••"
            className={inputClass + " w-full pr-11"}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? "Hide password" : "Show password"}
            className="absolute right-2 flex h-[34px] w-[34px] items-center justify-center text-clay-500 hover:text-clay-700"
          >
            <EyeIcon />
          </button>
        </div>
      </label>

      <button
        type="submit"
        disabled={isLoading}
        className="mt-2 h-14 rounded-xl bg-blush-500 text-lg font-bold text-clay-950 shadow-soft transition hover:bg-blush-600 active:scale-[.99] disabled:opacity-50"
      >
        {isLoading ? "Creating account…" : "Start my 75 days"}
      </button>
    </form>
  );
}

export function AuthPage({ initialTab }: { initialTab: Tab }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>(initialTab);

  const switchTab = (t: Tab) => {
    setTab(t);
    navigate(t === "signin" ? "/login" : "/register", { replace: true });
  };

  const isSignUp = tab === "register";

  const tabBtn = (active: boolean) =>
    "flex-1 h-[38px] rounded-pill text-sm font-bold transition " +
    (active ? "bg-paper text-clay-950 shadow-soft" : "bg-transparent text-clay-500");

  return (
    <div className="min-h-screen bg-clay-50 font-sans text-clay-950 md:flex">
      {/* Brand panel — visible on md+ */}
      <aside
        className="relative hidden overflow-hidden md:flex md:w-[44%] md:flex-col md:justify-between p-12"
        style={{ background: "linear-gradient(155deg, var(--blush-300), var(--lilac-300))" }}
      >
        <div className="font-display text-2xl font-semibold text-clay-950">
          75 <span className="italic">Medium</span>
        </div>
        <div>
          <h1 className="font-display text-[40px] font-medium leading-[1.06] text-clay-950">
            75 days.<br />Your rules.<br /><span className="italic">Your people, watching.</span>
          </h1>
          <p className="mt-4 max-w-[320px] text-base leading-relaxed text-clay-800">
            The accountability-first tracker. Show up daily, alongside friends who can see you do it.
          </p>
        </div>
        <div />
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 items-center justify-center px-6 py-16 md:p-10">
        <div className="w-full max-w-[380px]">
          {/* Mobile brand mark */}
          <div className="mb-8 flex flex-col items-center gap-4 md:hidden">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-xl shadow-lift"
              style={{ background: "linear-gradient(150deg, var(--blush-400), var(--lilac-400))" }}
            >
              <span className="font-display text-3xl font-semibold text-white">75</span>
            </div>
          </div>

          <h2 className="font-display text-3xl font-medium text-clay-950">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h2>
          <p className="mt-1 mb-6 text-base text-clay-600">
            {isSignUp ? "Design your next 75 days in a minute." : "Pick up where you left off."}
          </p>

          {/* Segmented toggle */}
          <div className="mb-5 flex rounded-pill bg-clay-100 p-1">
            <button type="button" onClick={() => switchTab("signin")} className={tabBtn(!isSignUp)}>
              Sign in
            </button>
            <button type="button" onClick={() => switchTab("register")} className={tabBtn(isSignUp)}>
              Create account
            </button>
          </div>

          {tab === "signin" ? <SignInForm /> : <RegisterForm />}

          <p className="mt-6 text-center text-caption leading-relaxed text-clay-500">
            By continuing you agree to the{" "}
            <a href="#terms" className="font-semibold text-clay-700">Terms</a> &amp;{" "}
            <a href="#privacy" className="font-semibold text-clay-700">Privacy</a>. POPIA-compliant.
          </p>

          <InstallHint />
        </div>
      </main>
    </div>
  );
}
