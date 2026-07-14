import TopBar from "@/components/TopBar";
import ZoneTable from "@/components/ZoneTable";
import { getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ZonesPage() {
  const settings = await getSettings();

  return (
    <>
      <TopBar
        title="HR Zones"
        subtitle={`Calibrated to max HR ${settings.max_heartrate} bpm`}
      />
      <div className="flex-1 overflow-auto p-6">
        <ZoneTable initialMaxHR={settings.max_heartrate} />
      </div>
    </>
  );
}
