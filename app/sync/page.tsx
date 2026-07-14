import TopBar from "@/components/TopBar";
import SyncView, { type SyncStatus } from "@/components/SyncView";
import { getSessions, getSyncEvents } from "@/lib/data";
import { getSummary } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getStoredTokens } from "@/lib/strava";

export const dynamic = "force-dynamic";

export default async function SyncPage() {
  const demo = !isSupabaseConfigured();
  const [sessions, syncEvents, summary, tokens] = await Promise.all([
    getSessions(),
    getSyncEvents(),
    getSummary(),
    demo ? Promise.resolve(null) : getStoredTokens(),
  ]);

  const status: SyncStatus = {
    connected: demo ? true : Boolean(tokens),
    demo,
    athleteName: demo ? "Demo athlete" : tokens ? `Athlete ${tokens.athlete_id}` : null,
    lastSyncAt: summary.last_sync_at,
    activitiesImported: sessions.length,
    hrStreams: sessions.length,
  };

  const nameById = new Map(sessions.map((s) => [s.id, s.name]));
  const events = syncEvents.map((e) => ({
    ...e,
    session_name: e.session_id ? nameById.get(e.session_id) : undefined,
  }));

  return (
    <>
      <TopBar
        title="Strava Sync"
        subtitle={status.connected ? "Connected · auto-sync enabled" : "Not connected"}
      />
      <div className="flex-1 overflow-auto">
        <SyncView status={status} events={events} />
      </div>
    </>
  );
}
