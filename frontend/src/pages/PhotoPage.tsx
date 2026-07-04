import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useGetIdentity } from "@refinedev/core";
import {
  getMyPhotos,
  getPhotoSignedUrl,
  deletePhoto,
  recordPopiaConsent,
  ApiAuthError,
  type PhotoResponse,
} from "../api";
import type { UserIdentity } from "../authProvider";

interface PhotoEntry {
  photo: PhotoResponse;
  url: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-5 h-5 rounded-full border-2 border-blush-400 border-t-transparent animate-spin" />
    </div>
  );
}

function CameraAddIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function ProtectedImage({
  src,
  alt,
  className,
  onClick,
}: {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      onClick={onClick}
      style={{ WebkitTouchCallout: "none" as const, userSelect: "none", WebkitUserSelect: "none" as const }}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        className={className}
      />
    </div>
  );
}

function PopiaGate() {
  const [consenting, setConsenting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleConsent = async () => {
    setConsenting(true);
    setError(null);
    try {
      await recordPopiaConsent();
      window.location.reload();
    } catch {
      setError("Something went wrong. Please try again.");
      setConsenting(false);
    }
  };

  return (
    <div className="animate-rise flex flex-col gap-6">
      <div>
        <p className="text-caption font-semibold text-clay-400 uppercase tracking-widest mb-1">Photos &amp; Privacy</p>
        <h1 className="font-display text-3xl font-medium text-clay-950">Consent required</h1>
        <p className="font-sans text-base text-clay-600 mt-1">
          Before you can upload photos, we need your consent under South Africa's POPIA.
        </p>
      </div>

      <div className="rounded-xl bg-paper border border-clay-200 shadow-soft px-5 py-5 flex flex-col gap-4">
        <div>
          <p className="font-sans text-sm font-semibold text-clay-800 mb-1">What we store</p>
          <p className="font-sans text-sm text-clay-600">Your progress photos are stored securely on our servers. Each photo is Private (only you) or Friends (visible to your friends here).</p>
        </div>
        <div>
          <p className="font-sans text-sm font-semibold text-clay-800 mb-1">Watermarking</p>
          <p className="font-sans text-sm text-clay-600">Photos shared with friends are watermarked with the viewer's display name before delivery. Every view is traceable. This does not prevent screenshots technically, but creates an accountability record.</p>
        </div>
        <div>
          <p className="font-sans text-sm font-semibold text-clay-800 mb-1">Your obligations</p>
          <p className="font-sans text-sm text-clay-600 font-medium">Do not screenshot, save, or share other users' photos outside this app. Watermarks identify you as the viewer.</p>
        </div>
        <div>
          <p className="font-sans text-sm font-semibold text-clay-800 mb-1">Your rights</p>
          <p className="font-sans text-sm text-clay-600">You may delete any of your photos at any time. You can request full account deletion at any time.</p>
        </div>
      </div>

      {error && <p className="font-sans text-sm text-rust-600">{error}</p>}

      <button
        onClick={handleConsent}
        disabled={consenting}
        className="h-14 rounded-xl bg-blush-500 text-lg font-bold text-clay-950 shadow-soft transition hover:bg-blush-600 active:scale-[.99] disabled:opacity-50"
      >
        {consenting ? "Recording…" : "I understand and agree"}
      </button>

      <button
        onClick={() => navigate("/today")}
        className="font-sans text-sm text-clay-500 hover:text-clay-800 transition-colors text-center"
      >
        Not now
      </button>
    </div>
  );
}

export function PhotoPage() {
  const navigate = useNavigate();
  const { data: identity } = useGetIdentity<UserIdentity>();
  const [entries, setEntries] = useState<PhotoEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const loadedRef = useRef(false);

  const hasConsent = !!identity?.popiaConsentAt;

  useEffect(() => {
    if (!hasConsent || loadedRef.current) return;
    loadedRef.current = true;
    async function load() {
      setIsLoading(true);
      try {
        const photos = await getMyPhotos();
        const loaded = await Promise.all(
          photos.map(async (p) => ({ photo: p, url: await getPhotoSignedUrl(p.id) }))
        );
        loaded.sort((a, b) => b.photo.createdAt.localeCompare(a.photo.createdAt));
        setEntries(loaded);
      } catch (err) {
        if (err instanceof ApiAuthError) { navigate("/login", { replace: true }); return; }
        setError("Failed to load. Please refresh.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [hasConsent, navigate]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this photo? This cannot be undone.")) return;
    setDeletingIds((s) => new Set(s).add(id));
    try {
      await deletePhoto(id);
      setEntries((prev) => prev.filter((e) => e.photo.id !== id));
    } catch {
      // ignore
    } finally {
      setDeletingIds((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  };

  if (!identity) return <Spinner />;

  if (!hasConsent) return <PopiaGate />;

  return (
    <div className="animate-rise flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-medium text-clay-950">Photos</h1>
        <Link
          to="/photos/upload"
          className="flex items-center gap-1.5 h-9 px-4 rounded-pill bg-blush-500 font-sans text-sm font-bold text-clay-950 shadow-soft hover:bg-blush-600 transition-colors"
        >
          <CameraAddIcon />
          Upload
        </Link>
      </div>

      {error && <p className="font-sans text-sm text-rust-600">{error}</p>}

      {isLoading ? (
        <Spinner />
      ) : entries.length === 0 ? (
        <div className="rounded-xl bg-paper border border-clay-200 shadow-soft px-5 py-8 text-center">
          <p className="font-display text-xl font-medium text-clay-700">No photos yet</p>
          <p className="font-sans text-sm text-clay-500 mt-1">Upload your first progress photo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {entries.map((e) => (
            <div key={e.photo.id} className="flex flex-col gap-1.5">
              <div className="relative aspect-square rounded-xl overflow-hidden bg-clay-100">
                <ProtectedImage
                  src={e.url}
                  alt={e.photo.caption ?? "Progress photo"}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setLightbox(e.url)}
                />
                <span className={[
                  "absolute top-2 left-2 text-caption font-semibold px-2 py-0.5 rounded-full",
                  e.photo.audienceType === "FRIENDS"
                    ? "bg-blush-500/80 text-paper"
                    : "bg-clay-950/60 text-paper",
                ].join(" ")}>
                  {e.photo.audienceType === "FRIENDS" ? "Friends" : "Private"}
                </span>
                <button
                  onClick={() => handleDelete(e.photo.id)}
                  disabled={deletingIds.has(e.photo.id)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-clay-950/60 text-paper flex items-center justify-center font-sans text-base leading-none hover:bg-clay-950/80 transition-colors disabled:opacity-50"
                  aria-label="Delete photo"
                >
                  ×
                </button>
              </div>
              {e.photo.caption && (
                <p className="font-sans text-caption text-clay-700 truncate">{e.photo.caption}</p>
              )}
              <p className="font-sans text-caption text-clay-400">{formatDate(e.photo.createdAt)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
          onContextMenu={(e) => e.preventDefault()}
          style={{ WebkitTouchCallout: "none" as const, userSelect: "none" }}
        >
          <button
            className="absolute top-4 right-4 text-paper text-3xl font-light leading-none"
            onClick={() => setLightbox(null)}
            aria-label="Close"
          >
            ×
          </button>
          <img
            src={lightbox}
            alt="Progress photo"
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            className="max-w-full max-h-[90vh] object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

    </div>
  );
}
