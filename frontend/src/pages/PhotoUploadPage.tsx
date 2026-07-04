import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGetIdentity } from "@refinedev/core";
import { uploadPhoto, ApiAuthError, ApiForbiddenError } from "../api";
import type { UserIdentity } from "../authProvider";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png"]);

export function PhotoUploadPage() {
  const navigate = useNavigate();
  const { data: identity } = useGetIdentity<UserIdentity>();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [audienceType, setAudienceType] = useState<"SELF" | "FRIENDS">("SELF");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);

  if (identity && !identity.popiaConsentAt) {
    navigate("/photos", { replace: true });
    return null;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ALLOWED_TYPES.has(f.type.toLowerCase())) {
      setError("Only JPEG and PNG images are accepted.");
      return;
    }
    setError(null);
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      await uploadPhoto(file, caption.trim() || undefined, audienceType);
      navigate("/photos");
    } catch (err) {
      if (err instanceof ApiAuthError) { navigate("/login", { replace: true }); return; }
      if (err instanceof ApiForbiddenError) {
        navigate("/photos", { replace: true });
        return;
      }
      setError("Upload failed. Check your connection and try again.");
      setIsUploading(false);
    }
  };

  return (
    <div className="animate-rise flex flex-col gap-6">

      <div>
        <button
          onClick={() => navigate("/photos")}
          className="font-sans text-sm text-clay-500 hover:text-clay-800 transition-colors mb-3"
        >
          ← Photos
        </button>
        <h1 className="font-display text-3xl font-medium text-clay-950">Upload photo</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* File picker */}
        <label className="flex flex-col gap-1.5">
          <span className="text-caption font-semibold text-clay-600">Photo</span>
          {preview ? (
            <div className="relative rounded-xl overflow-hidden bg-clay-100">
              <img src={preview} alt="Preview" className="w-full max-h-72 object-contain" />
              <button
                type="button"
                onClick={() => { setFile(null); if (preview) URL.revokeObjectURL(preview); setPreview(null); }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-clay-950/60 text-paper flex items-center justify-center font-sans text-base leading-none"
              >
                ×
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-40 rounded-xl border-2 border-dashed border-clay-200 bg-paper cursor-pointer hover:border-blush-400 transition-colors">
              <span className="font-sans text-base text-clay-400 mb-1">Tap to choose a photo</span>
              <span className="font-sans text-caption text-clay-400">JPEG or PNG</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          )}
        </label>

        {/* Caption */}
        <label className="flex flex-col gap-1.5">
          <span className="text-caption font-semibold text-clay-600">Caption (optional)</span>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Day 23 — feeling strong"
            className="h-[52px] rounded-lg border border-clay-200 bg-paper px-4 text-base text-clay-950 shadow-soft outline-none placeholder:text-clay-400 focus:border-blush-400 focus:shadow-ring transition"
          />
        </label>

        {/* Visibility */}
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
              ? "Friends can see this photo. It will be watermarked with their name."
              : "Only you can see this photo."}
          </p>
        </div>

        {error && <p className="font-sans text-sm text-rust-600">{error}</p>}

        <button
          type="submit"
          disabled={isUploading || !file}
          className="h-14 rounded-xl bg-blush-500 text-lg font-bold text-clay-950 shadow-soft transition hover:bg-blush-600 active:scale-[.99] disabled:opacity-50"
        >
          {isUploading ? "Uploading…" : "Upload"}
        </button>

      </form>
    </div>
  );
}
