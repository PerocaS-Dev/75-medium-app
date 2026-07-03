import { useGetIdentity } from "@refinedev/core";
import type { UserIdentity } from "../authProvider";

export function DashboardPage() {
  const { data: identity } = useGetIdentity<UserIdentity>();

  return (
    <div className="animate-rise">
      <p className="font-sans text-sm text-clay-400 tracking-widest uppercase mb-1">
        Dashboard
      </p>
      <h1 className="font-display text-3xl text-clay-950 mb-4">
        Hey, {identity?.displayName ?? "…"}
      </h1>
      <p className="font-sans text-base text-clay-500">
        Your challenge is waiting. More coming soon.
      </p>
    </div>
  );
}
