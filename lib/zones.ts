// Zone boundary calculations derived from a single confirmed max HR.
//
// Boundaries (per engineering spec):
//   Z1 < 60% max
//   Z2 60–70%
//   Z3 70–80%
//   Z4 80–90%
//   Z5 > 90%

import type { HRSamplePoint } from "./types";

export type ZoneKey = "z1" | "z2" | "z3" | "z4" | "z5";

export type Zone = {
  key: ZoneKey;
  label: string; // Z1..Z5
  name: string; // Recovery, Aerobic base, ...
  purpose: string;
  color: string; // hex
  lowPct: number; // fraction of max (inclusive lower bound)
  highPct: number; // fraction of max (exclusive upper bound)
  low: number; // bpm, rounded
  high: number; // bpm, rounded
  pctLabel: string; // "60–70%"
  rangeLabel: string; // "115–134"
};

const ZONE_DEFS: Omit<Zone, "low" | "high" | "rangeLabel">[] = [
  {
    key: "z1",
    label: "Z1",
    name: "Recovery",
    purpose: "Warm-up, cool-down",
    color: "#22C55E",
    lowPct: 0,
    highPct: 0.6,
    pctLabel: "< 60%",
  },
  {
    key: "z2",
    label: "Z2",
    name: "Aerobic base",
    purpose: "Primary target",
    color: "#3B82F6",
    lowPct: 0.6,
    highPct: 0.7,
    pctLabel: "60–70%",
  },
  {
    key: "z3",
    label: "Z3",
    name: "Tempo",
    purpose: "Steady-state",
    color: "#EAB308",
    lowPct: 0.7,
    highPct: 0.8,
    pctLabel: "70–80%",
  },
  {
    key: "z4",
    label: "Z4",
    name: "Threshold",
    purpose: "Intervals",
    color: "#F97316",
    lowPct: 0.8,
    highPct: 0.9,
    pctLabel: "80–90%",
  },
  {
    key: "z5",
    label: "Z5",
    name: "VO2 Max",
    purpose: "Peak efforts",
    color: "#E84545",
    lowPct: 0.9,
    highPct: 1,
    pctLabel: "> 90%",
  },
];

export function computeZones(maxHR: number): Zone[] {
  return ZONE_DEFS.map((z, i) => {
    const low = Math.round(maxHR * z.lowPct);
    const high = Math.round(maxHR * z.highPct);
    let rangeLabel: string;
    if (i === 0) rangeLabel = `< ${high}`;
    else if (i === ZONE_DEFS.length - 1) rangeLabel = `> ${low}`;
    else rangeLabel = `${low}–${high}`;
    return { ...z, low, high, rangeLabel };
  });
}

// Zone 2 floor/ceiling — used for the trend band and HR trace reference lines.
export function zone2Bounds(maxHR: number): { floor: number; ceiling: number } {
  return {
    floor: Math.round(maxHR * 0.6),
    ceiling: Math.round(maxHR * 0.7),
  };
}

// Which zone a given bpm falls into. Returns the zone color/key.
export function zoneForHR(hr: number, maxHR: number): Zone {
  const zones = computeZones(maxHR);
  const pct = hr / maxHR;
  for (const z of zones) {
    if (pct < z.highPct) return z;
  }
  return zones[zones.length - 1];
}

// Tailwind text color class for an avg/peak HR value, by zone.
export function zoneTextClass(hr: number, maxHR: number): string {
  const key = zoneForHR(hr, maxHR).key;
  const map: Record<ZoneKey, string> = {
    z1: "text-[#22C55E]",
    z2: "text-[#3B82F6]",
    z3: "text-[#EAB308]",
    z4: "text-[#F97316]",
    z5: "text-[#E84545]",
  };
  return map[key];
}

// Percentage of max, rounded — e.g. "96% max".
export function pctOfMax(hr: number, maxHR: number): number {
  return Math.round((hr / maxHR) * 100);
}

// Average heart rate over a stream (used when deriving stats client-side).
export function avgOfStream(data: HRSamplePoint[]): number | null {
  if (!data.length) return null;
  const sum = data.reduce((a, p) => a + p.heartrate, 0);
  return Math.round(sum / data.length);
}
