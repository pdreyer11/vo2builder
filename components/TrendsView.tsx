"use client";

import {
  Bar,
  BarChart,
  Cell,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Session } from "@/lib/types";
import { zone2Bounds } from "@/lib/zones";
import { durationLabel, shortDate } from "@/lib/format";

type Benchmark = { session: Session };

// Monday-of-week key for a YYYY-MM-DD date.
function weekStart(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  const day = (d.getUTCDay() + 6) % 7; // 0 = Monday
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

function DiamondShape(props: { cx?: number; cy?: number }) {
  const { cx = 0, cy = 0 } = props;
  const r = 6;
  return (
    <polygon
      points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`}
      fill="#E84545"
    />
  );
}

function TrendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: { label: string; hr: number; kind: string; result?: string } }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs shadow-md">
      <div className="font-semibold text-gray-800">{p.label}</div>
      {p.kind === "benchmark" ? (
        <div className="text-[#E84545]">Benchmark · {p.result}</div>
      ) : (
        <div className="tabular-nums text-blue-600">{p.hr} bpm avg</div>
      )}
    </div>
  );
}

export default function TrendsView({
  zone2,
  benchmarks,
  allSessions,
  maxHR,
}: {
  zone2: Session[];
  benchmarks: Benchmark[];
  allSessions: Session[];
  maxHR: number;
}) {
  const { floor, ceiling } = zone2Bounds(maxHR);

  // Zone 2 trend series (numeric x = day timestamp)
  const zone2Data = zone2.map((s) => ({
    x: new Date(s.session_date + "T00:00:00Z").getTime(),
    hr: s.avg_heartrate ?? 0,
    label: shortDate(s.session_date),
    kind: "zone2" as const,
  }));

  const benchmarkData = benchmarks.map((b) => ({
    x: new Date(b.session.session_date + "T00:00:00Z").getTime(),
    hr: b.session.avg_heartrate ?? 0,
    label: `${b.session.name} · ${shortDate(b.session.session_date)}`,
    kind: "benchmark" as const,
    result: durationLabel(b.session.duration_seconds),
  }));

  // Trend indicator: last 3 zone2 avg HR
  let trendLabel = "Not enough Zone 2 sessions yet.";
  let trendPositive = false;
  if (zone2.length >= 3) {
    const last3 = zone2.slice(-3);
    const delta =
      (last3[0].avg_heartrate ?? 0) - (last3[2].avg_heartrate ?? 0);
    if (delta > 0) {
      trendPositive = true;
      trendLabel = `↓ ${delta} bpm over ${last3.length} sessions`;
    } else if (delta === 0) {
      trendLabel = "Flat over last 3 sessions";
    } else {
      trendLabel = `↑ ${Math.abs(delta)} bpm over ${last3.length} sessions`;
    }
  }

  // Weekly volume
  const weekMap = new Map<string, number>();
  for (const s of allSessions) {
    const wk = weekStart(s.session_date);
    weekMap.set(wk, (weekMap.get(wk) ?? 0) + Math.round(s.duration_seconds / 60));
  }
  const currentWeek = weekStart(new Date().toISOString().slice(0, 10));
  const volumeData = Array.from(weekMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([wk, minutes]) => ({
      label: shortDate(wk),
      minutes,
      current: wk === currentWeek,
    }));

  const allX = [...zone2Data, ...benchmarkData].map((d) => d.x);
  const xDomain =
    allX.length > 0
      ? [Math.min(...allX) - 86400000, Math.max(...allX) + 86400000]
      : [0, 1];

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* Zone 2 HR trend */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-1 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900">
              Zone 2 Avg HR — over time
            </div>
            <div className="mt-0.5 text-xs text-gray-400">
              Primary aerobic adaptation signal · target: downward trend
            </div>
          </div>
          <div
            className={[
              "rounded-full px-3 py-1 text-xs font-semibold",
              trendPositive
                ? "bg-green-50 text-green-600"
                : "bg-gray-100 text-gray-500",
            ].join(" ")}
          >
            {trendLabel}
          </div>
        </div>

        {zone2Data.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-400">
            No Zone 2 sessions to plot.
          </p>
        ) : (
          <div className="mt-4 h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart margin={{ top: 12, right: 16, bottom: 4, left: -8 }}>
                <ReferenceArea
                  y1={floor}
                  y2={ceiling}
                  fill="#3B82F6"
                  fillOpacity={0.08}
                  ifOverflow="hidden"
                />
                <ReferenceLine
                  y={ceiling}
                  stroke="#3B82F6"
                  strokeDasharray="4 3"
                  strokeOpacity={0.5}
                  label={{
                    value: `${ceiling} bpm (Z2 ceil)`,
                    position: "insideTopLeft",
                    fill: "#3B82F6",
                    fontSize: 9,
                  }}
                />
                <ReferenceLine
                  y={floor}
                  stroke="#3B82F6"
                  strokeDasharray="4 3"
                  strokeOpacity={0.5}
                  label={{
                    value: `${floor} bpm (Z2 floor)`,
                    position: "insideBottomLeft",
                    fill: "#3B82F6",
                    fontSize: 9,
                  }}
                />
                <XAxis
                  dataKey="x"
                  type="number"
                  domain={xDomain}
                  scale="time"
                  tickFormatter={(v) =>
                    shortDate(new Date(v).toISOString().slice(0, 10))
                  }
                  stroke="#E5E7EB"
                  tick={{ fill: "#9CA3AF", fontSize: 10 }}
                />
                <YAxis
                  domain={[90, 160]}
                  stroke="#E5E7EB"
                  tick={{ fill: "#9CA3AF", fontSize: 10 }}
                  width={34}
                />
                <Tooltip content={<TrendTooltip />} />
                <Line
                  data={zone2Data}
                  dataKey="hr"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#3B82F6" }}
                  isAnimationActive={false}
                />
                <Scatter data={benchmarkData} dataKey="hr" shape={<DiamondShape />} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Weekly volume */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-1 text-sm font-semibold text-gray-900">
          Weekly Session Volume
        </div>
        <div className="mb-4 text-xs text-gray-400">Total minutes by week</div>
        {volumeData.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">
            No sessions this period.
          </p>
        ) : (
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={volumeData}
                margin={{ top: 8, right: 8, bottom: 4, left: -18 }}
              >
                <XAxis
                  dataKey="label"
                  stroke="#E5E7EB"
                  tick={{ fill: "#9CA3AF", fontSize: 10 }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#E5E7EB"
                  tick={{ fill: "#9CA3AF", fontSize: 10 }}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "#F3F4F6" }}
                  formatter={(v) => [`${v} min`, "Volume"]}
                />
                <Bar
                  dataKey="minutes"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                >
                  {volumeData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.current ? "#3B82F6" : "#BFDBFE"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
