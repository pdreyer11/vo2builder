import TopBar from "@/components/TopBar";
import TrendsView from "@/components/TrendsView";
import {
  getBenchmarks,
  getSessions,
  getSettings,
  getZone2Trend,
} from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function TrendsPage() {
  const [zone2, benchmarks, allSessions, settings] = await Promise.all([
    getZone2Trend(),
    getBenchmarks(),
    getSessions(),
    getSettings(),
  ]);

  return (
    <>
      <TopBar
        title="Trends"
        subtitle={`Zone 2 HR progression · ${zone2.length} sessions`}
      />
      <div className="flex-1 overflow-auto">
        <TrendsView
          zone2={zone2}
          benchmarks={benchmarks}
          allSessions={allSessions}
          maxHR={settings.max_heartrate}
        />
      </div>
    </>
  );
}
