"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { VO2BuilderEvent } from "@/lib/types";
import { relativeTime, timestampLabel } from "@/lib/format";

export type SyncStatus = {
  connected: boolean;
  demo: boolean;
  athleteName: string | null;
  lastSyncAt: string | null;
  activitiesImported: number;
  hrStreams: number;
};

const EVENT_LABELS: Record<string, string> = {
  session_created: "imported",
  hr_stream_attached: "HR stream attached",
};

export default function SyncView({
  status,
  events,
}: {
  status: SyncStatus;
  events: (VO2BuilderEvent & { session_name?: string })[];
}) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      await fetch("/api/strava/sync", { method: "POST" });
      router.refresh();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Strava connection card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900">
              Strava Connection
            </div>
            <div className="mt-0.5 text-xs text-gray-400">
              Activities synced automatically on Strava upload
            </div>
          </div>
          {status.connected ? (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm font-semibold text-green-600">
                {status.demo ? "Connected (demo)" : "Connected"}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-gray-300" />
              <span className="text-sm font-semibold text-gray-400">
                Not connected
              </span>
            </div>
          )}
        </div>

        {status.connected ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-gray-50 px-4 py-3">
                <div className="mb-1 text-xs text-gray-400">Athlete</div>
                <div className="text-sm font-semibold text-gray-900">
                  {status.athleteName ?? "You"}
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 px-4 py-3">
                <div className="mb-1 text-xs text-gray-400">
                  Activities imported
                </div>
                <div className="tabular-nums text-sm font-semibold text-gray-900">
                  {status.activitiesImported}
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 px-4 py-3">
                <div className="mb-1 text-xs text-gray-400">HR streams</div>
                <div className="tabular-nums text-sm font-semibold text-gray-900">
                  {status.hrStreams} / {status.activitiesImported}
                </div>
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-400">
              Last sync {relativeTime(status.lastSyncAt)}
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
              >
                {syncing ? "Syncing…" : "Sync now"}
              </button>
            </div>
          </>
        ) : (
          <a
            href="/api/strava/authorize"
            className="inline-block rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600"
          >
            Connect Strava
          </a>
        )}
      </div>

      {/* Sync log */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-4 text-sm font-semibold text-gray-900">
          Recent Sync Events
        </div>
        {events.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">
            No sync events yet.
          </p>
        ) : (
          <div className="flex flex-col">
            {events.map((e, i) => {
              const points =
                typeof e.payload?.data_points === "number"
                  ? e.payload.data_points
                  : null;
              const name =
                e.session_name ??
                (typeof e.payload?.name === "string" ? e.payload.name : "Session");
              return (
                <div
                  key={e.id}
                  className={`flex items-center justify-between py-2.5 ${
                    i < events.length - 1 ? "border-b border-gray-100" : ""
                  }`}
                >
                  <div>
                    <div className="text-sm font-medium text-gray-800">
                      {name} {EVENT_LABELS[e.event_type] ?? e.event_type}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-400">
                      {e.event_type === "hr_stream_attached" && points
                        ? `HR stream attached · ${points.toLocaleString()} data points`
                        : e.event_type === "session_created"
                        ? "Activity imported from Strava"
                        : ""}
                    </div>
                  </div>
                  <span className="tabular-nums text-xs text-gray-400">
                    {timestampLabel(e.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
