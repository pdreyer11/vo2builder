"use client";

import { useState } from "react";
import type { SessionWithDetail } from "@/lib/types";
import { SessionTypeBadge } from "./Badge";
import HRTraceChart from "./HRTraceChart";
import { durationLabel, longDate } from "@/lib/format";
import { MODALITY_LABELS } from "./Badge";
import { pctOfMax, zoneForHR } from "@/lib/zones";

function StatBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-gray-800 px-3 py-3">
      <div className="mb-1 text-xs text-gray-500">{label}</div>
      {children}
    </div>
  );
}

function ModalityFields({ session }: { session: SessionWithDetail }) {
  const d = session.detail;
  if (!d) {
    return (
      <p className="text-xs text-gray-500">
        No detail annotated. Use “Edit session” to add modality data.
      </p>
    );
  }
  const boxes: { label: string; value: string; accent?: string }[] = [];
  switch (session.modality) {
    case "treadmill":
      if (d.speed_mph != null)
        boxes.push({ label: "Speed", value: `${d.speed_mph} mph` });
      if (d.incline_pct != null)
        boxes.push({ label: "Incline", value: `${d.incline_pct}%` });
      break;
    case "rowing":
      if (d.avg_split)
        boxes.push({ label: "Avg Split", value: `${d.avg_split} /500m` });
      break;
    case "cycling":
      if (d.avg_power_watts != null)
        boxes.push({ label: "Avg Power", value: `${d.avg_power_watts} W` });
      if (d.avg_cadence_rpm != null)
        boxes.push({ label: "Avg Cadence", value: `${d.avg_cadence_rpm} rpm` });
      break;
    case "outdoor_run":
      if (d.avg_pace)
        boxes.push({ label: "Avg Pace", value: `${d.avg_pace} /mi` });
      if (d.route_notes)
        boxes.push({ label: "Route", value: d.route_notes });
      break;
  }
  if (!boxes.length) {
    return (
      <p className="text-xs text-gray-500">No modality detail for this session.</p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {boxes.map((b) => (
        <div key={b.label} className="rounded-lg bg-gray-800 px-3 py-3">
          <div className="mb-1 text-xs text-gray-500">{b.label}</div>
          <div className="tabular-nums text-sm font-semibold text-white">
            {b.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SessionDetailPanel({
  session,
  maxHR,
  onEdit,
  onNotesSaved,
}: {
  session: SessionWithDetail;
  maxHR: number;
  onEdit: () => void;
  onNotesSaved: (notes: string) => void;
}) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(session.notes ?? "");

  const avg = session.avg_heartrate ?? 0;
  const peak = session.max_heartrate ?? 0;
  const avgZone = zoneForHR(avg, maxHR);
  const peakZone = zoneForHR(peak, maxHR);

  async function saveNotes() {
    setEditingNotes(false);
    if (notes === (session.notes ?? "")) return;
    await fetch(`/api/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    onNotesSaved(notes);
  }

  const sectionLabel =
    "mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="dark-scroll rounded-xl bg-[#111827] p-6">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <div className="text-base font-bold text-white">{session.name}</div>
          <div className="mt-1 text-xs text-gray-400">
            {longDate(session.session_date)} ·{" "}
            {durationLabel(session.duration_seconds)} ·{" "}
            {MODALITY_LABELS[session.modality]}
          </div>
        </div>
        <SessionTypeBadge type={session.session_type} />
      </div>

      {/* HR stats */}
      <div className="mb-4 grid grid-cols-2 gap-2.5">
        <StatBox label="Avg HR">
          <div
            className="tabular-nums text-[28px] font-bold leading-none"
            style={{ color: avgZone.color }}
          >
            {avg}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            bpm · {avgZone.label} {avgZone.name}
          </div>
        </StatBox>
        <StatBox label="Peak HR">
          <div
            className="tabular-nums text-[28px] font-bold leading-none"
            style={{ color: peakZone.color }}
          >
            {peak}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            bpm · {pctOfMax(peak, maxHR)}% max
          </div>
        </StatBox>
      </div>

      {/* HR Trace */}
      <div className="mb-4">
        <div className={sectionLabel}>HR Trace</div>
        <div className="rounded-xl bg-gray-900 p-2">
          <HRTraceChart
            data={session.hr_stream?.data ?? []}
            maxHR={maxHR}
            sessionType={session.session_type}
          />
        </div>
      </div>

      {/* Modality fields */}
      <div className="mb-4">
        <div className={sectionLabel}>Session Detail</div>
        <ModalityFields session={session} />
      </div>

      {/* Notes (editable inline) */}
      <div className="mb-4">
        <div className={sectionLabel}>Notes</div>
        {editingNotes ? (
          <textarea
            autoFocus
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
            rows={3}
            className="dark-scroll w-full resize-none rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm leading-relaxed text-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400/50"
          />
        ) : (
          <p
            onClick={() => setEditingNotes(true)}
            className="cursor-text text-sm leading-relaxed text-gray-400 hover:text-gray-300"
          >
            {notes || "Click to add notes."}
          </p>
        )}
      </div>

      <button
        onClick={onEdit}
        className="w-full rounded-lg border border-gray-700 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800"
      >
        Edit session
      </button>
    </div>
  );
}
