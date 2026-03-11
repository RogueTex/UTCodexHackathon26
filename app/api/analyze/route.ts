import { NextResponse } from "next/server";

import { analyzeSubmission } from "@/lib/ai";
import { isMode } from "@/lib/bevofix";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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

  if (!body.mode || !isMode(body.mode)) {
    return NextResponse.json({ error: "Invalid mode." }, { status: 400 });
  }

  const analysis = await analyzeSubmission({
    mode: body.mode,
    imageDataUrl: body.imageDataUrl,
    imageName: body.imageName,
    notes: body.notes,
    exampleId: body.exampleId,
    photoMetadata: body.photoMetadata,
  });

  return NextResponse.json(analysis);
}
