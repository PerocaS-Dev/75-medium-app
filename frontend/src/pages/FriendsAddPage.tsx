import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { lookupUserByEmail, sendFriendRequest, ApiAuthError, type UserProfileResponse } from "../api";

export function FriendsAddPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [found, setFound] = useState<UserProfileResponse | null | "not-found">(null);
  const [isLooking, setIsLooking] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFound(null);
    setSent(false);
    setIsLooking(true);
    try {
      const result = await lookupUserByEmail(email.trim());
      setFound(result ?? "not-found");
    } catch (err) {
      if (err instanceof ApiAuthError) { navigate("/login", { replace: true }); return; }
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLooking(false);
    }
  };

  const handleSend = async () => {
    if (!found || found === "not-found") return;
    setIsSending(true);
    setError(null);
    try {
      await sendFriendRequest(found.id);
      setSent(true);
    } catch (err) {
      if (err instanceof ApiAuthError) { navigate("/login", { replace: true }); return; }
      setError("Couldn't send request — you may already be friends or a request is pending.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="animate-rise flex flex-col gap-6">

      {/* Back + header */}
      <div>
        <button
          onClick={() => navigate("/friends")}
          className="font-sans text-sm text-clay-500 hover:text-clay-800 transition-colors mb-3"
        >
          ← Friends
        </button>
        <h1 className="font-display text-3xl font-medium text-clay-950">Add a friend</h1>
        <p className="font-sans text-base text-clay-600 mt-1">Enter their email address to find them.</p>
      </div>

      {/* Search form */}
      <form onSubmit={handleLookup} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-caption font-semibold text-clay-600">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setFound(null); setSent(false); }}
            required
            placeholder="friend@email.com"
            className="h-[52px] rounded-lg border border-clay-200 bg-paper px-4 text-base text-clay-950 shadow-soft outline-none placeholder:text-clay-400 focus:border-blush-400 focus:shadow-ring transition"
          />
        </label>
        <button
          type="submit"
          disabled={isLooking || !email.trim()}
          className="h-14 rounded-xl bg-blush-500 text-lg font-bold text-clay-950 shadow-soft transition hover:bg-blush-600 active:scale-[.99] disabled:opacity-50"
        >
          {isLooking ? "Searching…" : "Find"}
        </button>
      </form>

      {/* Result */}
      {found === "not-found" && (
        <div className="rounded-xl bg-paper border border-clay-200 shadow-soft px-5 py-4">
          <p className="font-sans text-base text-clay-500">No account found with that email.</p>
        </div>
      )}

      {found && found !== "not-found" && (
        <div className="rounded-xl bg-paper border border-clay-200 shadow-soft px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-sans text-base font-semibold text-clay-950">{found.displayName}</p>
            <p className="font-sans text-caption text-clay-500 mt-0.5">{email.trim()}</p>
          </div>
          {sent ? (
            <span className="font-sans text-sm font-semibold text-sage-600">Request sent ✓</span>
          ) : (
            <button
              onClick={handleSend}
              disabled={isSending}
              className="h-9 px-4 rounded-pill bg-blush-500 font-sans text-sm font-bold text-clay-950 shadow-soft hover:bg-blush-600 transition-colors disabled:opacity-50 flex-shrink-0"
            >
              {isSending ? "Sending…" : "Add friend"}
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="font-sans text-sm text-rust-600">{error}</p>
      )}

    </div>
  );
}
