// Small display formatters shared across components.

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// "2026-07-10" -> "Jul 10"
export function shortDate(iso: string): string {
  const [, m, d] = iso.split("T")[0].split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${d}`;
}

// "2026-07-10" -> "Jul 10, 2026"
export function longDate(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${d}, ${y}`;
}

// 1800 -> "30 min"
export function durationLabel(seconds: number): string {
  return `${Math.round(seconds / 60)} min`;
}

// ISO timestamp -> "Jul 10, 9:32 AM"
export function timestampLabel(iso: string | null): string {
  if (!iso) return "—";
  const dt = new Date(iso);
  const time = dt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${shortDate(iso)}, ${time}`;
}

// "2 min ago" style relative label.
export function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
