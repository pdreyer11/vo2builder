"use client";

import { useEffect, useState } from "react";
import type { Session, SessionWithDetail } from "@/lib/types";
import SessionRow from "./SessionRow";
import SessionDetailPanel from "./SessionDetailPanel";
import AnnotationModal from "./AnnotationModal";
import TopBar from "./TopBar";
import { relativeTime } from "@/lib/format";

export default function LogView({
  initialSessions,
  maxHR,
  lastSyncAt,
}: {
  initialSessions: Session[];
  maxHR: number;
  lastSyncAt: string | null;
}) {
  const [sessions, setSessions] = useState(initialSessions);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSessions[0]?.id ?? null
  );
  const [detail, setDetail] = useState<SessionWithDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let active = true;
    setLoadingDetail(true);
    fetch(`/api/sessions/${selectedId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active) setDetail(data);
      })
      .finally(() => active && setLoadingDetail(false));
    return () => {
      active = false;
    };
  }, [selectedId]);

  async function refreshDetail() {
    if (!selectedId) return;
    const r = await fetch(`/api/sessions/${selectedId}`);
    if (r.ok) {
      const data: SessionWithDetail = await r.json();
      setDetail(data);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === data.id
            ? { ...s, session_type: data.session_type, notes: data.notes }
            : s
        )
      );
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await fetch("/api/strava/sync", { method: "POST" });
      const r = await fetch("/api/sessions");
      if (r.ok) setSessions(await r.json());
    } finally {
      setSyncing(false);
    }
  }

  return (
    <>
      <TopBar
        title="Session Log"
        subtitle={`${sessions.length} sessions · last sync ${relativeTime(
          lastSyncAt
        )}`}
        action={
          <button
            onClick={handleSync}
            disabled={syncing}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
          >
            {syncing ? "Syncing…" : "Sync Strava"}
          </button>
        }
      />

      <div className="flex flex-1 gap-6 overflow-auto p-6">
        {/* Left: session list */}
        <div className="min-w-0 flex-1">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="grid grid-cols-[90px_1fr_auto_auto_auto] gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Date
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Session
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Type
              </span>
              <span className="text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Avg HR
              </span>
              <span className="text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Duration
              </span>
            </div>
            {sessions.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-gray-400">
                No sessions yet. Sync Strava to import activities.
              </p>
            ) : (
              sessions.map((s) => (
                <SessionRow
                  key={s.id}
                  session={s}
                  selected={s.id === selectedId}
                  maxHR={maxHR}
                  onSelect={() => setSelectedId(s.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right: detail panel */}
        <div className="w-[360px] flex-shrink-0">
          {!selectedId ? (
            <div className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center text-sm text-gray-400">
              Select a session to view detail.
            </div>
          ) : loadingDetail && !detail ? (
            <div className="rounded-xl bg-[#111827] px-6 py-16 text-center text-sm text-gray-500">
              Loading session…
            </div>
          ) : detail ? (
            <SessionDetailPanel
              key={detail.id}
              session={detail}
              maxHR={maxHR}
              onEdit={() => setModalOpen(true)}
              onNotesSaved={(notes) => {
                setSessions((prev) =>
                  prev.map((s) =>
                    s.id === detail.id ? { ...s, notes } : s
                  )
                );
                setDetail((d) => (d ? { ...d, notes } : d));
              }}
            />
          ) : null}
        </div>
      </div>

      {modalOpen && detail && (
        <AnnotationModal
          session={detail}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            refreshDetail();
          }}
        />
      )}
    </>
  );
}
