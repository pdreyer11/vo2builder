import { NextRequest, NextResponse } from "next/server";
import { createSession, insertEvent, upsertHRStream } from "@/lib/data";
import { parseFit, parseGpx } from "@/lib/parsers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const ext = file.name.split(".").pop()?.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    let parsed;
    if (ext === "fit") {
      parsed = await parseFit(buffer);
    } else if (ext === "gpx") {
      parsed = parseGpx(buffer);
    } else {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const session = await createSession({
      name: parsed.name,
      session_date: parsed.session_date,
      modality: parsed.modality,
      session_type: "zone2",
      duration_seconds: parsed.duration_seconds,
      avg_heartrate: parsed.avg_heartrate || null,
      max_heartrate: parsed.peak_heartrate || null,
    });

    await insertEvent(session.id, "session_created", {
      name: session.name,
      source: "file_import",
    });

    if (parsed.hrStream.length > 0) {
      await upsertHRStream(session.id, parsed.hrStream, parsed.resolution);
      await insertEvent(session.id, "hr_stream_attached", {
        data_points: parsed.hrStream.length,
        resolution: parsed.resolution,
      });
    }

    return NextResponse.json({ session });
  } catch (err) {
    console.error("Import error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import failed" },
      { status: 500 }
    );
  }
}
