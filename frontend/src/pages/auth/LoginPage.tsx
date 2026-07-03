import { useState } from "react";
import { useLogin } from "@refinedev/core";
import { Link, useNavigate } from "react-router-dom";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { mutateAsync: login, isPending } = useLogin<{ email: string; password: string }>();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const result = await login({ email, password });
    if (result.success) {
      navigate("/dashboard");
    } else {
      setErrorMsg(result.error?.message ?? "Something went wrong");
    }
  };

  const inputClass =
    "w-full border border-clay-200 rounded-sm px-4 py-3 font-sans text-base text-clay-950 bg-paper focus:outline-none focus:ring-2 focus:ring-blush-300 transition placeholder:text-clay-300";

  return (
    <div className="min-h-screen bg-clay-50 flex flex-col items-center justify-center px-gutter py-section">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10 animate-rise">
          <span className="inline-block font-sans text-xs text-clay-500 tracking-widest uppercase border border-clay-300 rounded-pill px-3 py-1 mb-6">
            75 Medium
          </span>
          <h1 className="font-display text-3xl text-clay-950 leading-tight">
            Welcome back.
          </h1>
          <p className="font-sans text-sm text-clay-400 mt-2">
            Pick up where you left off.
          </p>
        </div>

        <div className="bg-paper rounded-2xl shadow-soft p-8 animate-rise" style={{ animationDelay: "60ms" }}>
          {errorMsg && (
            <div className="bg-rust-100 text-rust-600 rounded-lg px-4 py-3 mb-5 font-sans text-sm">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block font-sans text-sm text-clay-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="w-full mt-2 bg-blush-500 hover:bg-blush-600 active:bg-blush-600 disabled:opacity-50 text-clay-950 font-sans font-medium py-3 rounded-md transition-colors"
            >
              {isPending ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="font-sans text-sm text-clay-400 text-center mt-6">
            No account?{" "}
            <Link to="/register" className="text-blush-600 hover:text-blush-500 font-medium transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
