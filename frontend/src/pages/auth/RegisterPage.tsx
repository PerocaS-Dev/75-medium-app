import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

type Step = "account" | "consent";

interface FormData {
  displayName: string;
  email: string;
  password: string;
  timeZone: string;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("account");
  const [form, setForm] = useState<FormData>({
    displayName: "",
    email: "",
    password: "",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleAccountSubmit = async (e: React.FormEvent) => {
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
        setError("Registration failed. Please try again.");
        return;
      }
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      if (!loginRes.ok) {
        setError("Account created but sign-in failed — please log in manually.");
        navigate("/login");
        return;
      }
      setStep("consent");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConsent = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/popia-consent", { method: "POST" });
      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        return;
      }
      navigate("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    "w-full border border-clay-200 rounded-sm px-4 py-3 font-sans text-base text-clay-950 bg-paper focus:outline-none focus:ring-2 focus:ring-blush-300 transition placeholder:text-clay-300";

  if (step === "consent") {
    return (
      <div className="min-h-screen bg-clay-50 flex flex-col items-center justify-center px-gutter py-section">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10 animate-rise">
            <span className="inline-block font-sans text-xs text-clay-500 tracking-widest uppercase border border-clay-300 rounded-pill px-3 py-1 mb-6">
              75 Medium
            </span>
            <h1 className="font-display text-3xl text-clay-950">One quick thing.</h1>
            <p className="font-sans text-sm text-clay-400 mt-2">
              Before your 75 days begin.
            </p>
          </div>

          <div className="bg-paper rounded-2xl shadow-soft p-8 animate-rise" style={{ animationDelay: "60ms" }}>
            {error && (
              <div className="bg-rust-100 text-rust-600 rounded-lg px-4 py-3 mb-5 font-sans text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div className="bg-clay-50 rounded-lg p-4">
                <p className="font-sans text-sm font-medium text-clay-800 mb-1">What we store</p>
                <p className="font-sans text-sm text-clay-500 leading-relaxed">
                  Your email, display name, challenge progress, journals, and photos — only what you put in.
                </p>
              </div>
              <div className="bg-clay-50 rounded-lg p-4">
                <p className="font-sans text-sm font-medium text-clay-800 mb-1">Who sees it</p>
                <p className="font-sans text-sm text-clay-500 leading-relaxed">
                  Only you by default. You explicitly choose what friends can see.
                </p>
              </div>
              <div className="bg-clay-50 rounded-lg p-4">
                <p className="font-sans text-sm font-medium text-clay-800 mb-1">Your rights (POPIA)</p>
                <p className="font-sans text-sm text-clay-500 leading-relaxed">
                  You can request a full export or deletion of your data at any time.
                </p>
              </div>
            </div>

            <button
              onClick={handleConsent}
              disabled={isLoading}
              className="w-full bg-blush-500 hover:bg-blush-600 active:bg-blush-600 disabled:opacity-50 text-clay-950 font-sans font-medium py-3 rounded-md transition-colors"
            >
              {isLoading ? "Saving…" : "I understand and agree"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-clay-50 flex flex-col items-center justify-center px-gutter py-section">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10 animate-rise">
          <span className="inline-block font-sans text-xs text-clay-500 tracking-widest uppercase border border-clay-300 rounded-pill px-3 py-1 mb-6">
            75 Medium
          </span>
          <h1 className="font-display text-3xl text-clay-950 leading-tight">
            Your 75 days start here.
          </h1>
          <p className="font-sans text-sm text-clay-400 mt-2">
            Set up your account in seconds.
          </p>
        </div>

        <div className="bg-paper rounded-2xl shadow-soft p-8 animate-rise" style={{ animationDelay: "60ms" }}>
          {error && (
            <div className="bg-rust-100 text-rust-600 rounded-lg px-4 py-3 mb-5 font-sans text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleAccountSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block font-sans text-sm text-clay-700 mb-1.5">
                Display name
              </label>
              <input
                type="text"
                value={form.displayName}
                onChange={set("displayName")}
                required
                autoComplete="name"
                placeholder="How friends will see you"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block font-sans text-sm text-clay-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={set("email")}
                required
                autoComplete="email"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block font-sans text-sm text-clay-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={set("password")}
                required
                autoComplete="new-password"
                minLength={8}
                placeholder="8+ characters"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block font-sans text-sm text-clay-700 mb-1.5">
                Time zone
                <span className="text-clay-400 font-normal ml-1 text-xs">(auto-detected)</span>
              </label>
              <input
                type="text"
                value={form.timeZone}
                onChange={set("timeZone")}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-blush-500 hover:bg-blush-600 active:bg-blush-600 disabled:opacity-50 text-clay-950 font-sans font-medium py-3 rounded-md transition-colors"
            >
              {isLoading ? "Creating account…" : "Continue"}
            </button>
          </form>

          <p className="font-sans text-sm text-clay-400 text-center mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-blush-600 hover:text-blush-500 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
