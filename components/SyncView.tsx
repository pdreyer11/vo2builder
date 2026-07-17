"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { VO2BuilderEvent } from "@/lib/types";
import { relativeTime, timestampLabel } from "@/lib/format";
import FileImport from "./FileImport";

export type WahooStatus = {
  connected: boolean;
  lastSyncAt: string | null;
};

export type StravaStatus = {
  connected: boolean;
};

const EVENT_LABELS: Record<string, string> = {
  session_created: "imported",
  hr_stream_attached: "HR stream attached",
};

export default function SyncView({
  wahoo,
  strava,
  events,
}: {
  wahoo: WahooStatus;
  strava: StravaStatus;
  events: (VO2BuilderEvent & { session_name?: string })[];
}) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number } | null>(null);

  async function handleWahooSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/wahoo/sync", { method: "POST" });
      const json = await res.json();
      setSyncResult({ synced: json.synced ?? 0 });
      router.refresh();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Wahoo card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900">Wahoo</div>
            <div className="mt-0.5 text-xs text-gray-400">
              Import workouts from your Wahoo device
            </div>
          </div>
          {wahoo.connected ? (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm font-semibold text-green-600">Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-gray-300" />
              <span className="text-sm font-semibold text-gray-400">Not connected</span>
            </div>
          )}
        </div>

        {wahoo.connected ? (
          <div>
            {wahoo.lastSyncAt && (
              <div className="mb-3 text-xs text-gray-400">
                Last sync {relativeTime(wahoo.lastSyncAt)}
              </div>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={handleWahooSync}
                disabled={syncing}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {syncing ? "Syncing…" : "Sync now"}
              </button>
              {syncResult && (
                <span className="text-sm text-gray-500">
                  {syncResult.synced === 0
                    ? "Already up to date"
                    : `${syncResult.synced} workout${syncResult.synced > 1 ? "s" : ""} imported`}
                </span>
              )}
            </div>
          </div>
        ) : (
          <a
            href="/api/wahoo/authorize"
            className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Connect Wahoo
          </a>
        )}
      </div>

      {/* File import card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-4">
          <div className="text-sm font-semibold text-gray-900">File Import</div>
          <div className="mt-0.5 text-xs text-gray-400">
            Import a .fit or .gpx file from any device
          </div>
        </div>
        <FileImport />
      </div>

      {/* Strava card — tertiary */}
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-6 opacity-60">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              Strava
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                Requires subscription
              </span>
            </div>
            <div className="mt-0.5 text-xs text-gray-400">
              Strava API access requires a paid Strava subscription
            </div>
          </div>
          {strava.connected && (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm font-semibold text-green-600">Connected</span>
            </div>
          )}
        </div>
        {!strava.connected && (
          <button
            disabled
            className="rounded-lg bg-red-400 px-4 py-2 text-sm font-semibold text-white opacity-50 cursor-not-allowed"
          >
            Connect Strava
          </button>
        )}
      </div>

      {/* Sync log */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-4 text-sm font-semibold text-gray-900">Recent Import Events</div>
        {events.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">No imports yet.</p>
        ) : (
          <div className="flex flex-col">
            {events.map((e, i) => {
              const points =
                typeof e.payload?.data_points === "number" ? e.payload.data_points : null;
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
                        ? `${points.toLocaleString()} data points`
                        : e.event_type === "session_created"
                        ? `source: ${String(e.payload?.source ?? "unknown")}`
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
