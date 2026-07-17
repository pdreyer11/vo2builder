import type { HRSamplePoint, Modality, StreamResolution } from "./types";

export type ParsedImport = {
  name: string;
  session_date: string;
  duration_seconds: number;
  avg_heartrate: number;
  peak_heartrate: number;
  modality: Modality;
  hrStream: HRSamplePoint[];
  resolution: StreamResolution;
};

export async function parseFit(buffer: Buffer): Promise<ParsedImport> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const FitParser = require("fit-file-parser").default ?? require("fit-file-parser");
  return new Promise((resolve, reject) => {
    const parser = new FitParser({ force: true, speedUnit: "mph" });
    parser.parse(buffer, (err: Error | null, data: Record<string, unknown>) => {
      if (err) return reject(err);

      const records = (data.records as Record<string, unknown>[] | undefined) ?? [];
      const sessions = (data.sessions as Record<string, unknown>[] | undefined) ?? [];

      const hrPoints: HRSamplePoint[] = records
        .filter((r) => r.heart_rate != null && r.timestamp != null)
        .map((r, i) => ({
          time: i * 5,
          heartrate: Number(r.heart_rate),
        }));

      const sess = sessions[0] ?? {};
      const duration =
        typeof sess.total_elapsed_time === "number"
          ? Math.round(sess.total_elapsed_time)
          : hrPoints.length * 5;

      const hrs = hrPoints.map((p) => p.heartrate);
      const avg_heartrate =
        hrs.length > 0 ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : 0;
      const peak_heartrate = hrs.length > 0 ? Math.max(...hrs) : 0;

      const sport = String(sess.sport ?? "cycling").toLowerCase();
      const modality: Modality =
        sport === "rowing" ? "rowing"
          : sport === "running" ? "outdoor_run"
          : sport === "cycling" ? "cycling"
          : "cycling";

      const dateStr =
        typeof sess.start_time === "string"
          ? sess.start_time.slice(0, 10)
          : new Date().toISOString().slice(0, 10);

      resolve({
        name: `${modality} ${dateStr}`,
        session_date: dateStr,
        duration_seconds: duration,
        avg_heartrate,
        peak_heartrate,
        modality,
        hrStream: hrPoints,
        resolution: "high",
      });
    });
  });
}

export function parseGpx(buffer: Buffer): ParsedImport {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { XMLParser } = require("fast-xml-parser");
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    transformTagName: (tag: string) => tag.replace(/^.*:/, ""),
  });
  const xml = parser.parse(buffer.toString("utf-8"));

  const gpx = xml.gpx ?? {};
  const trk = Array.isArray(gpx.trk) ? gpx.trk[0] : (gpx.trk ?? {});
  const trksegs = Array.isArray(trk.trkseg) ? trk.trkseg : [trk.trkseg ?? {}];

  const points: { time: number; hr: number }[] = [];
  let startMs: number | null = null;

  for (const seg of trksegs) {
    const trkpts = Array.isArray(seg.trkpt) ? seg.trkpt : [seg.trkpt].filter(Boolean);
    for (const pt of trkpts) {
      if (!pt) continue;
      const ext = pt.extensions ?? {};
      const tpx = ext.TrackPointExtension ?? ext.tpx ?? {};
      const hrRaw = tpx.hr ?? tpx.HeartRateBpm?.Value ?? tpx["gpxtpx:hr"];
      if (hrRaw == null) continue;
      const hr = Number(hrRaw);
      if (!Number.isFinite(hr)) continue;

      const timeStr = pt.time ?? pt["@_time"];
      const ms = timeStr ? new Date(timeStr).getTime() : null;
      if (ms == null || isNaN(ms)) continue;
      if (startMs == null) startMs = ms;
      points.push({ time: Math.round((ms - startMs) / 1000), hr });
    }
  }

  const hrs = points.map((p) => p.hr);
  const avg_heartrate =
    hrs.length > 0 ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : 0;
  const peak_heartrate = hrs.length > 0 ? Math.max(...hrs) : 0;
  const duration_seconds = points.length > 0 ? points[points.length - 1].time : 0;

  const name = String(trk.name ?? gpx["@_creator"] ?? "GPX import");
  const timeSrc =
    (Array.isArray(trksegs[0]?.trkpt) ? trksegs[0].trkpt[0]?.time : null) ??
    new Date().toISOString();
  const session_date = String(timeSrc).slice(0, 10);

  return {
    name,
    session_date,
    duration_seconds,
    avg_heartrate,
    peak_heartrate,
    modality: "outdoor_run",
    hrStream: points.map((p) => ({ time: p.time, heartrate: p.hr })),
    resolution: "high",
  };
}
