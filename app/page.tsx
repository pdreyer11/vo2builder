import LogView from "@/components/LogView";
import { getSessions, getSettings, getSummary } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function LogPage() {
  const [sessions, settings, summary] = await Promise.all([
    getSessions(),
    getSettings(),
    getSummary(),
  ]);

  return (
    <LogView
      initialSessions={sessions}
      maxHR={settings.max_heartrate}
      lastSyncAt={summary.last_sync_at}
    />
  );
}
