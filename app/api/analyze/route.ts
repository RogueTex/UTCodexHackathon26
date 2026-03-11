import { NextResponse } from "next/server";

import { analyzeSubmission } from "@/lib/ai";
import { isMode } from "@/lib/bevofix";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const startedAt = Date.now();
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

  if (process.env.NODE_ENV !== "test") {
    console.info(
      `[bevofix:route] analyze_start ${JSON.stringify({
        mode: body.mode,
        imageName: body.imageName ?? "n/a",
        hasImageDataUrl: Boolean(body.imageDataUrl),
        hasExampleId: Boolean(body.exampleId),
      })}`,
    );
  }

  const analysis = await analyzeSubmission({
    mode: body.mode,
    imageDataUrl: body.imageDataUrl,
    imageName: body.imageName,
    notes: body.notes,
    exampleId: body.exampleId,
    photoMetadata: body.photoMetadata,
  });

  if (process.env.NODE_ENV !== "test") {
    console.info(
      `[bevofix:route] analyze_complete ${JSON.stringify({
        mode: body.mode,
        imageName: body.imageName ?? "n/a",
        source: analysis.source,
        totalMs: Date.now() - startedAt,
      })}`,
    );
  }

  return NextResponse.json(analysis);
}
