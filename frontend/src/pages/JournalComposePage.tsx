import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  createJournalEntry,
  updateJournalEntry,
  ApiAuthError,
  type JournalEntryResponse,
} from "../api";

function today(): string {
  return new Date().toISOString().split("T")[0];
}

export function JournalComposePage() {
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const isEdit = !!id;
  const existingEntry = location.state?.entry as JournalEntryResponse | undefined;

  const [body, setBody] = useState(existingEntry?.body ?? "");
  const [entryDate, setEntryDate] = useState(existingEntry?.entryDate ?? today());
  const [audienceType, setAudienceType] = useState<"SELF" | "FRIENDS">(
    existingEntry?.audienceType ?? "SELF"
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isEdit && !existingEntry) {
    navigate("/journal", { replace: true });
    return null;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      if (isEdit && id) {
        await updateJournalEntry(id, body.trim(), audienceType);
      } else {
        await createJournalEntry(body.trim(), entryDate, audienceType);
      }
      navigate("/journal");
    } catch (err) {
      if (err instanceof ApiAuthError) { navigate("/login", { replace: true }); return; }
      setError("Couldn't save. Please try again.");
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-rise flex flex-col gap-6">

      <div>
        <button
          onClick={() => navigate("/journal")}
          className="font-sans text-sm text-clay-500 hover:text-clay-800 transition-colors mb-3"
        >
          ← Journal
        </button>
        <h1 className="font-display text-3xl font-medium text-clay-950">
          {isEdit ? "Edit entry" : "New entry"}
        </h1>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-5">

        {/* Date (only editable on new entries) */}
        {!isEdit && (
          <label className="flex flex-col gap-1.5">
            <span className="text-caption font-semibold text-clay-600">Date</span>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              required
              className="h-[52px] rounded-lg border border-clay-200 bg-paper px-4 text-base text-clay-950 shadow-soft outline-none focus:border-blush-400 focus:shadow-ring transition"
            />
          </label>
        )}

        {/* Body */}
        <label className="flex flex-col gap-1.5">
          <span className="text-caption font-semibold text-clay-600">Entry</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={8}
            placeholder="What happened today?"
            className="rounded-lg border border-clay-200 bg-paper px-4 py-3 text-base text-clay-950 shadow-soft outline-none placeholder:text-clay-400 focus:border-blush-400 focus:shadow-ring transition resize-none"
          />
        </label>

        {/* Visibility toggle */}
        <div className="flex flex-col gap-1.5">
          <span className="text-caption font-semibold text-clay-600">Visibility</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAudienceType("SELF")}
              className={[
                "flex-1 h-11 rounded-lg font-sans text-sm font-semibold transition-colors border",
                audienceType === "SELF"
                  ? "bg-clay-950 text-paper border-clay-950"
                  : "bg-paper text-clay-600 border-clay-200 hover:border-clay-400",
              ].join(" ")}
            >
              Private
            </button>
            <button
              type="button"
              onClick={() => setAudienceType("FRIENDS")}
              className={[
                "flex-1 h-11 rounded-lg font-sans text-sm font-semibold transition-colors border",
                audienceType === "FRIENDS"
                  ? "bg-blush-500 text-clay-950 border-blush-500"
                  : "bg-paper text-clay-600 border-clay-200 hover:border-clay-400",
              ].join(" ")}
            >
              Friends
            </button>
          </div>
          <p className="font-sans text-caption text-clay-400">
            {audienceType === "FRIENDS"
              ? "Friends can see this entry and react."
              : "Only you can see this entry."}
          </p>
        </div>

        {error && <p className="font-sans text-sm text-rust-600">{error}</p>}

        <button
          type="submit"
          disabled={isSaving || !body.trim()}
          className="h-14 rounded-xl bg-blush-500 text-lg font-bold text-clay-950 shadow-soft transition hover:bg-blush-600 active:scale-[.99] disabled:opacity-50"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>

      </form>
    </div>
  );
}
