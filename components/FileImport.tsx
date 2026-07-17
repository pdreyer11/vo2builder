"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@/lib/types";

type ImportState =
  | { status: "idle" }
  | { status: "dragging" }
  | { status: "uploading" }
  | { status: "success"; session: Session }
  | { status: "error"; message: string };

export default function FileImport() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<ImportState>({ status: "idle" });

  async function upload(file: File) {
    setState({ status: "uploading" });
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/import", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setState({ status: "success", session: json.session });
      router.refresh();
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
    else setState({ status: "idle" });
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) upload(file);
  }

  if (state.status === "success") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6">
        <div className="mb-1 text-sm font-semibold text-green-800">Import successful</div>
        <div className="text-xs text-green-700">
          {state.session.name} · {state.session.session_date}
        </div>
        <div className="mt-4 flex gap-3">
          <a
            href="/"
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700"
          >
            View in Log
          </a>
          <button
            onClick={() => setState({ status: "idle" })}
            className="rounded-lg border border-green-300 px-4 py-2 text-sm font-semibold text-green-700 transition-colors hover:bg-green-100"
          >
            Import another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setState({ status: "dragging" }); }}
      onDragLeave={() => setState({ status: "idle" })}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
        state.status === "dragging"
          ? "border-blue-400 bg-blue-50"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".fit,.gpx"
        className="hidden"
        onChange={onFileChange}
      />
      {state.status === "uploading" ? (
        <div className="text-sm text-gray-500">Uploading…</div>
      ) : state.status === "error" ? (
        <div>
          <div className="text-sm font-medium text-red-600">{state.message}</div>
          <div className="mt-1 text-xs text-gray-400">Click to try again</div>
        </div>
      ) : (
        <>
          <div className="text-sm font-medium text-gray-700">
            Drop a .fit or .gpx file here
          </div>
          <div className="mt-1 text-xs text-gray-400">or click to browse</div>
        </>
      )}
    </div>
  );
}
