"use client";

import type { Session } from "@/lib/types";
import { ModalityBadge, SessionTypeBadge } from "./Badge";
import { durationLabel, shortDate } from "@/lib/format";
import { zoneTextClass } from "@/lib/zones";

export default function SessionRow({
  session,
  selected,
  maxHR,
  onSelect,
}: {
  session: Session;
  selected: boolean;
  maxHR: number;
  onSelect: () => void;
}) {
  const avg = session.avg_heartrate ?? 0;
  return (
    <button
      onClick={onSelect}
      className={[
        "grid w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors",
        "grid-cols-[90px_1fr_auto_auto_auto]",
        selected ? "bg-[#FDF2F2]" : "hover:bg-gray-50",
      ].join(" ")}
    >
      <span className="tabular-nums text-xs text-gray-400">
        {shortDate(session.session_date)}
      </span>
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-semibold text-gray-900">
          {session.name}
        </span>
        <ModalityBadge modality={session.modality} />
      </span>
      <SessionTypeBadge type={session.session_type} />
      <span
        className={`tabular-nums text-right text-sm font-semibold ${zoneTextClass(
          avg,
          maxHR
        )}`}
      >
        {avg} bpm
      </span>
      <span className="tabular-nums text-right text-sm text-gray-400">
        {durationLabel(session.duration_seconds)}
      </span>
    </button>
  );
}
