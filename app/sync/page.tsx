import TopBar from "@/components/TopBar";
import SyncView, { type WahooStatus, type StravaStatus } from "@/components/SyncView";
import { getSessions, getSyncEvents } from "@/lib/data";
import { getStoredTokens } from "@/lib/strava";
import { getStoredWahooTokens } from "@/lib/wahoo";

export const dynamic = "force-dynamic";

export default async function SyncPage() {
  const [sessions, syncEvents, wahooTokens, stravaTokens] = await Promise.all([
    getSessions(),
    getSyncEvents(),
    getStoredWahooTokens(),
    getStoredTokens(),
  ]);

  const wahoo: WahooStatus = {
    connected: Boolean(wahooTokens),
    lastSyncAt: sessions.length > 0 ? sessions[0].created_at : null,
  };

  const strava: StravaStatus = {
    connected: Boolean(stravaTokens),
  };

  const nameById = new Map(sessions.map((s) => [s.id, s.name]));
  const events = syncEvents.map((e) => ({
    ...e,
    session_name: e.session_id ? nameById.get(e.session_id) : undefined,
  }));

  const subtitle = wahoo.connected
    ? "Wahoo connected · sync ready"
    : "Connect Wahoo or import a file";

  return (
    <>
      <TopBar title="Import" subtitle={subtitle} />
      <div className="flex-1 overflow-auto">
        <SyncView wahoo={wahoo} strava={strava} events={events} />
      </div>
    </>
  );
}
