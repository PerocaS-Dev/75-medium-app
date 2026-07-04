import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getFriendPhotos,
  getPhotoSignedUrl,
  getUserProfile,
  ApiAuthError,
  ApiForbiddenError,
  type PhotoResponse,
} from "../api";

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

export function FriendPhotosPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [entries, setEntries] = useState<PhotoEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || !userId) return;
    ran.current = true;
    async function load() {
      try {
        const [profile, photos] = await Promise.all([
          getUserProfile(userId!),
          getFriendPhotos(userId!),
        ]);
        setDisplayName(profile?.displayName ?? "Friend");
        const loaded = await Promise.all(
          photos.map(async (p) => ({ photo: p, url: await getPhotoSignedUrl(p.id) }))
        );
        loaded.sort((a, b) => b.photo.createdAt.localeCompare(a.photo.createdAt));
        setEntries(loaded);
      } catch (err) {
        if (err instanceof ApiAuthError) { navigate("/login", { replace: true }); return; }
        if (err instanceof ApiForbiddenError) {
          setError("You need to be friends to see this.");
        } else {
          setError("Failed to load. Please refresh.");
        }
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [navigate, userId]);

  if (isLoading) return <Spinner />;

  if (error) {
    return (
      <div className="animate-rise flex flex-col gap-4">
        <button onClick={() => navigate(`/friends/${userId}`)} className="font-sans text-sm text-clay-500 hover:text-clay-800 transition-colors self-start">
          ← Back
        </button>
        <p className="font-sans text-base text-clay-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="animate-rise flex flex-col gap-6">

      <div>
        <button
          onClick={() => navigate(`/friends/${userId}`)}
          className="font-sans text-sm text-clay-500 hover:text-clay-800 transition-colors mb-3"
        >
          ← Back
        </button>
        <p className="text-caption font-semibold text-clay-400 uppercase tracking-widest mb-1">Photos</p>
        <h1 className="font-display text-3xl font-medium text-clay-950">{displayName}</h1>
      </div>

      <p className="font-sans text-caption text-clay-400 -mt-3">
        Photos are watermarked with your name. Do not screenshot or share.
      </p>

      {entries.length === 0 ? (
        <div className="rounded-xl bg-paper border border-clay-200 shadow-soft px-5 py-8 text-center">
          <p className="font-display text-xl font-medium text-clay-700">No shared photos</p>
          <p className="font-sans text-sm text-clay-500 mt-1">
            {displayName} hasn't shared any photos yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {entries.map((e) => (
            <div key={e.photo.id} className="flex flex-col gap-1.5">
              <div className="aspect-square rounded-xl overflow-hidden bg-clay-100">
                <ProtectedImage
                  src={e.url}
                  alt={e.photo.caption ?? "Progress photo"}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setLightbox(e.url)}
                />
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
