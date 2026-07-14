"use client";

import {
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { computeZones, zone2Bounds } from "@/lib/zones";
import type { HRSamplePoint, SessionType } from "@/lib/types";

type HRTraceChartProps = {
  data: HRSamplePoint[]; // time in seconds from session start
  maxHR: number;
  sessionType: SessionType;
};

type TooltipEntry = { value: number; payload: { t: number; hr: number } };

function TraceTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
}) {
  if (!active || !payload || !payload.length) return null;
  const { t, hr } = payload[0].payload;
  const mins = Math.floor(t / 60);
  const secs = Math.round(t % 60);
  return (
    <div className="rounded-md border border-gray-700 bg-gray-800 px-2.5 py-1.5 text-xs shadow-lg">
      <div className="tabular-nums font-semibold text-white">{hr} bpm</div>
      <div className="tabular-nums text-gray-400">
        {mins}:{String(secs).padStart(2, "0")} elapsed
      </div>
    </div>
  );
}

export default function HRTraceChart({
  data,
  maxHR,
  sessionType,
}: HRTraceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[160px] items-center justify-center rounded-lg bg-gray-800 text-sm text-gray-500">
        HR stream loading…
      </div>
    );
  }

  const chartData = data.map((p) => ({ t: p.time, hr: p.heartrate }));
  const maxT = chartData[chartData.length - 1].t;
  const yMin = 60;
  const yMax = maxHR + 10;
  const zones = computeZones(maxHR);
  const { floor, ceiling } = zone2Bounds(maxHR);

  return (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 6, right: 8, bottom: 4, left: 4 }}
        >
          {/* Zone bands behind the trace */}
          {zones.map((z) => {
            const y1 = Math.max(z.low, yMin);
            const y2 = z.key === "z5" ? yMax : Math.min(z.high, yMax);
            if (y2 <= y1) return null;
            return (
              <ReferenceArea
                key={z.key}
                y1={y1}
                y2={y2}
                fill={z.color}
                fillOpacity={0.15}
                stroke="none"
                ifOverflow="hidden"
              />
            );
          })}

          {/* Z2 floor / ceiling dashed reference lines */}
          <ReferenceLine
            y={ceiling}
            stroke="#3B82F6"
            strokeDasharray="4 3"
            strokeOpacity={0.7}
            label={{
              value: `Z2 ceil ${ceiling}`,
              position: "insideTopRight",
              fill: "#93C5FD",
              fontSize: 9,
            }}
          />
          <ReferenceLine
            y={floor}
            stroke="#3B82F6"
            strokeDasharray="4 3"
            strokeOpacity={0.7}
            label={{
              value: `Z2 floor ${floor}`,
              position: "insideBottomRight",
              fill: "#93C5FD",
              fontSize: 9,
            }}
          />

          <XAxis
            dataKey="t"
            type="number"
            domain={[0, maxT]}
            tickFormatter={(v) => `${Math.round(v / 60)}m`}
            stroke="#4B5563"
            tick={{ fill: "#9CA3AF", fontSize: 10 }}
            tickLine={false}
          />
          <YAxis
            domain={[yMin, yMax]}
            stroke="#4B5563"
            tick={{ fill: "#9CA3AF", fontSize: 10 }}
            tickLine={false}
            width={38}
          />
          <Tooltip
            content={<TraceTooltip />}
            cursor={{ stroke: "#6B7280", strokeDasharray: "3 3" }}
          />

          <Line
            type="monotone"
            dataKey="hr"
            stroke="#FFFFFF"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            name={sessionType}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
