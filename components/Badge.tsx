import type { Modality, SessionType } from "@/lib/types";

const base =
  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-[0.02em]";

const SESSION_TYPE_STYLES: Record<SessionType, string> = {
  zone2: "bg-blue-50 text-blue-600",
  intervals: "bg-orange-50 text-orange-600",
  benchmark: "bg-red-50 text-red-500",
};

const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  zone2: "Zone 2",
  intervals: "Intervals",
  benchmark: "Benchmark",
};

const MODALITY_STYLES: Record<Modality, string> = {
  treadmill: "bg-slate-100 text-slate-600",
  rowing: "bg-green-50 text-green-600",
  cycling: "bg-violet-50 text-violet-600",
  outdoor_run: "bg-orange-50 text-orange-700",
};

const MODALITY_LABELS: Record<Modality, string> = {
  treadmill: "Treadmill",
  rowing: "Rowing",
  cycling: "Cycling",
  outdoor_run: "Outdoor Run",
};

export function SessionTypeBadge({ type }: { type: SessionType }) {
  return (
    <span className={`${base} ${SESSION_TYPE_STYLES[type]}`}>
      {SESSION_TYPE_LABELS[type]}
    </span>
  );
}

export function ModalityBadge({ modality }: { modality: Modality }) {
  return (
    <span className={`${base} ${MODALITY_STYLES[modality]}`}>
      {MODALITY_LABELS[modality]}
    </span>
  );
}

export { SESSION_TYPE_LABELS, MODALITY_LABELS };
