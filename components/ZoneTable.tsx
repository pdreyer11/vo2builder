"use client";

import { useMemo, useState } from "react";
import { computeZones } from "@/lib/zones";

export default function ZoneTable({ initialMaxHR }: { initialMaxHR: number }) {
  const [maxHR, setMaxHR] = useState(initialMaxHR);
  const [input, setInput] = useState(String(initialMaxHR));
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const zones = useMemo(() => computeZones(maxHR), [maxHR]);

  async function handleUpdate() {
    const parsed = Number(input);
    if (!parsed || parsed < 100 || parsed > 240) return;
    setMaxHR(parsed); // client-side recalculation is immediate
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max_heartrate: parsed }),
      });
      setSavedAt("saved");
    } finally {
      setSaving(false);
    }
  }

  const cols = "grid grid-cols-[48px_90px_110px_1fr_130px] items-center gap-0";

  return (
    <div className="flex flex-col gap-4">
      {/* Max HR setting */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-1 text-sm font-semibold text-gray-900">
          Max Heart Rate
        </div>
        <div className="mb-4 max-w-xl text-xs text-gray-400">
          All zone boundaries are derived from this value. Self-reported —
          confirm with a peak reading from a hard interval session.
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="number"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setSavedAt(null);
            }}
            className="w-28 rounded-lg border border-gray-200 px-4 py-2 text-lg font-semibold tabular-nums text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <span className="text-sm text-gray-400">bpm</span>
          <button
            onClick={handleUpdate}
            disabled={saving}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
          >
            {saving ? "Updating…" : "Update zones"}
          </button>
          {savedAt && (
            <span className="text-xs font-medium text-green-600">Saved</span>
          )}
        </div>
      </div>

      {/* Zone table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div
          className={`${cols} border-b border-gray-100 bg-gray-50 px-5 py-2.5`}
        >
          {["Zone", "Range", "% Max", "Label", "Purpose"].map((h) => (
            <span
              key={h}
              className="text-xs font-semibold uppercase tracking-wide text-gray-500"
            >
              {h}
            </span>
          ))}
        </div>
        {zones.map((z) => {
          const isZ2 = z.key === "z2";
          return (
            <div
              key={z.key}
              className={`${cols} border-b border-gray-100 px-5 py-3.5 last:border-b-0 ${
                isZ2 ? "bg-blue-50" : ""
              }`}
            >
              <span
                className="text-sm font-bold"
                style={{ color: z.color }}
              >
                {z.label}
              </span>
              <span
                className={`tabular-nums text-sm ${
                  isZ2 ? "font-semibold" : "text-gray-700"
                }`}
                style={isZ2 ? { color: z.color } : undefined}
              >
                {z.rangeLabel}
              </span>
              <span
                className={`text-sm ${
                  isZ2 ? "font-semibold text-blue-500" : "text-gray-400"
                }`}
              >
                {z.pctLabel}
              </span>
              <span
                className={`text-sm ${
                  isZ2 ? "font-semibold text-gray-700" : "text-gray-700"
                }`}
              >
                {z.name}
              </span>
              <span
                className={`text-xs ${
                  isZ2 ? "font-semibold text-blue-500" : "text-gray-400"
                }`}
              >
                {z.purpose}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
