"use client";

import { useState } from "react";
import type {
  Modality,
  SessionType,
  SessionWithDetail,
} from "@/lib/types";

const MODALITIES: { value: Modality; label: string }[] = [
  { value: "treadmill", label: "Treadmill" },
  { value: "rowing", label: "Rowing" },
  { value: "cycling", label: "Cycling" },
  { value: "outdoor_run", label: "Outdoor Run" },
];

const TYPES: { value: SessionType; label: string }[] = [
  { value: "zone2", label: "Zone 2" },
  { value: "intervals", label: "Intervals" },
  { value: "benchmark", label: "Benchmark" },
];

const inputCls =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-red-300";
const labelCls = "mb-1 block text-xs font-medium text-gray-600";

export default function AnnotationModal({
  session,
  onClose,
  onSaved,
}: {
  session: SessionWithDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const d = session.detail;
  const [modality, setModality] = useState<Modality>(session.modality);
  const [sessionType, setSessionType] = useState<SessionType>(
    session.session_type
  );
  const [notes, setNotes] = useState(session.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // modality-specific fields
  const [speedMph, setSpeedMph] = useState(d?.speed_mph?.toString() ?? "");
  const [inclinePct, setInclinePct] = useState(
    d?.incline_pct?.toString() ?? ""
  );
  const [avgSplit, setAvgSplit] = useState(d?.avg_split ?? "");
  const [avgPower, setAvgPower] = useState(
    d?.avg_power_watts?.toString() ?? ""
  );
  const [avgCadence, setAvgCadence] = useState(
    d?.avg_cadence_rpm?.toString() ?? ""
  );
  const [avgPace, setAvgPace] = useState(d?.avg_pace ?? "");
  const [routeNotes, setRouteNotes] = useState(d?.route_notes ?? "");

  const numOrNull = (v: string) =>
    v.trim() === "" ? null : Number(v);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      // 1. Session-level fields
      const sRes = await fetch(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_type: sessionType, notes }),
      });
      if (!sRes.ok) throw new Error("Failed to save session.");

      // 2. Modality detail — only the fields relevant to the modality.
      const detailPayload: Record<string, unknown> = {
        speed_mph: null,
        incline_pct: null,
        avg_split: null,
        avg_power_watts: null,
        avg_cadence_rpm: null,
        avg_pace: null,
        route_notes: null,
      };
      if (modality === "treadmill") {
        detailPayload.speed_mph = numOrNull(speedMph);
        detailPayload.incline_pct = numOrNull(inclinePct);
      } else if (modality === "rowing") {
        detailPayload.avg_split = avgSplit || null;
      } else if (modality === "cycling") {
        detailPayload.avg_power_watts = numOrNull(avgPower);
        detailPayload.avg_cadence_rpm = numOrNull(avgCadence);
      } else if (modality === "outdoor_run") {
        detailPayload.avg_pace = avgPace || null;
        detailPayload.route_notes = routeNotes || null;
      }

      const dRes = d
        ? await fetch(`/api/session-detail/${d.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(detailPayload),
          })
        : await fetch(`/api/session-detail`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              session_id: session.id,
              ...detailPayload,
            }),
          });
      if (!dRes.ok) throw new Error("Failed to save session detail.");

      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-auto rounded-xl border border-gray-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Edit session</h2>
            <p className="text-xs text-gray-400">{session.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {/* Modality */}
          <div>
            <label className={labelCls}>Modality</label>
            <select
              value={modality}
              onChange={(e) => setModality(e.target.value as Modality)}
              className={inputCls}
            >
              {MODALITIES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Modality-specific fields */}
          {modality === "treadmill" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Speed (mph)</label>
                <input
                  type="number"
                  step="0.1"
                  value={speedMph}
                  onChange={(e) => setSpeedMph(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Incline (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={inclinePct}
                  onChange={(e) => setInclinePct(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          )}
          {modality === "rowing" && (
            <div>
              <label className={labelCls}>Avg split (per 500m)</label>
              <input
                type="text"
                placeholder="2:08"
                value={avgSplit}
                onChange={(e) => setAvgSplit(e.target.value)}
                className={inputCls}
              />
            </div>
          )}
          {modality === "cycling" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Avg power (W)</label>
                <input
                  type="number"
                  value={avgPower}
                  onChange={(e) => setAvgPower(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Avg cadence (rpm)</label>
                <input
                  type="number"
                  value={avgCadence}
                  onChange={(e) => setAvgCadence(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          )}
          {modality === "outdoor_run" && (
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Avg pace (per mile)</label>
                <input
                  type="text"
                  placeholder="9:30"
                  value={avgPace}
                  onChange={(e) => setAvgPace(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Route notes</label>
                <input
                  type="text"
                  value={routeNotes}
                  onChange={(e) => setRouteNotes(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          )}

          {/* Session type segmented control */}
          <div>
            <label className={labelCls}>Session type</label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setSessionType(t.value)}
                  className={[
                    "rounded-lg border px-2 py-2 text-xs font-semibold transition-colors",
                    sessionType === t.value
                      ? "border-red-400 bg-red-50 text-red-600"
                      : "border-gray-200 text-gray-500 hover:bg-gray-50",
                  ].join(" ")}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
