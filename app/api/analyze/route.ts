import { NextResponse } from "next/server";

import { analyzeSubmission } from "@/lib/ai";
import { isMode } from "@/lib/bevofix";
import { logMetadataEvent } from "@/lib/debug";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const runtimeApiKey = request.headers.get("x-openai-api-key")?.trim() || undefined;
  const body = (await request.json()) as {
    mode?: string;
    imageDataUrl?: string;
    imageName?: string;
    notes?: string;
    exampleId?: string;
    photoMetadata?: {
      latitude: number;
      longitude: number;
      capturedAt?: string;
      source: "exif" | "seeded-demo";
    };
  };

  if (body.mode && !isMode(body.mode)) {
    return NextResponse.json({ error: "Invalid mode." }, { status: 400 });
  }

  const mode = body.mode && isMode(body.mode) ? body.mode : undefined;

  logMetadataEvent("analyze route received request", {
    mode,
    exampleId: body.exampleId,
    hasPhotoMetadata: Boolean(body.photoMetadata),
    latitude: body.photoMetadata?.latitude,
    longitude: body.photoMetadata?.longitude,
  });

  const analysis = await analyzeSubmission({
    mode,
    imageDataUrl: body.imageDataUrl,
    imageName: body.imageName,
    notes: body.notes,
    exampleId: body.exampleId,
    photoMetadata: body.photoMetadata,
    runtimeApiKey,
  });

  logMetadataEvent("analyze route returning response", {
    mode,
    source: analysis.source,
    detectedType: analysis.draft.detected_type,
    extractedLocation: analysis.draft.location.text,
    metadataHint: analysis.locationHint?.label,
  });

  return NextResponse.json(analysis);
}
