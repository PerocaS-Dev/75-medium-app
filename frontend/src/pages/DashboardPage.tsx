import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getActiveChallenge, createChallenge } from "../api";

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-5 h-5 rounded-full border-2 border-blush-400 border-t-transparent animate-spin" />
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    async function route() {
      try {
        let challenge = await getActiveChallenge();

        if (!challenge) {
          challenge = await createChallenge();
        }

        if (challenge.status === "PENDING") {
          navigate("/setup", { replace: true });
        } else if (challenge.status === "ACTIVE") {
          navigate("/today", { replace: true });
        } else {
          setError("Your challenge has ended. New challenges coming soon.");
        }
      } catch {
        setError("Something went wrong. Please refresh.");
      }
    }
    route();
  }, [navigate]);

  if (error) {
    return (
      <div className="animate-rise">
        <p className="font-sans text-base text-clay-500">{error}</p>
      </div>
    );
  }

  return <Spinner />;
}
