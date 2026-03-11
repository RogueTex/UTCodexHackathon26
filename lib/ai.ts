import { readFile } from "node:fs/promises";
import path from "node:path";

import { Mode } from "@/lib/bevofix";
import { getExampleById } from "@/lib/demo-fixtures";
import { buildLocationHint, prefersMetadataLocation } from "@/lib/location-hints";
import { normalizeIssueType, resolveTeamFromIssue } from "@/lib/routing";
import {
  AnalyzeRequest,
  AnalyzeResponse,
  Extraction,
  normalizeExtraction,
} from "@/lib/types";

const WORKFLOW_LABELS = [
  "Triage Skill",
  "Extraction Skill",
  "Routing Skill",
  "Metadata Skill",
  "Validation Skill",
];

function logAnalyze(event: string, metadata: Record<string, unknown>): void {
  if (process.env.NODE_ENV === "test") {
    return;
  }
  console.info(`[bevofix:analyze] ${event} ${JSON.stringify(metadata)}`);
}

const LOCAL_REFERENCE_FILE = path.join(
  process.cwd(),
  "DataImages",
  "reference-embeddings.local.json",
);

type LocalReferenceEntry = {
  filename: string;
  mode: Mode;
  text: string;
  extraction: unknown;
};

type LocalReferenceMatch = {
  score: number;
  entry: LocalReferenceEntry;
};

let localReferenceCache: LocalReferenceEntry[] | null = null;

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function normalizeName(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function toTermFrequency(tokens: string[]): Map<string, number> {
  const frequency = new Map<string, number>();
  for (const token of tokens) {
    frequency.set(token, (frequency.get(token) ?? 0) + 1);
  }

  const total = tokens.length || 1;
  for (const [token, count] of frequency.entries()) {
    frequency.set(token, count / total);
  }

  return frequency;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let aNorm = 0;
  let bNorm = 0;

  for (const value of a.values()) {
    aNorm += value * value;
  }

  for (const [token, value] of b.entries()) {
    bNorm += value * value;
    dot += value * (a.get(token) ?? 0);
  }

  if (aNorm === 0 || bNorm === 0) {
    return 0;
  }

  return dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm));
}

async function getLocalReferences(): Promise<LocalReferenceEntry[]> {
  const localEmbeddingsEnabled =
    process.env.BEVOFIX_ENABLE_LOCAL_EMBEDDINGS === "1" ||
    process.env.NODE_ENV === "development";
  if (!localEmbeddingsEnabled) {
    return [];
  }

  if (localReferenceCache) {
    return localReferenceCache;
  }

  try {
    const raw = await readFile(LOCAL_REFERENCE_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      localReferenceCache = [];
      return localReferenceCache;
    }

    localReferenceCache = parsed
      .filter(
        (entry) =>
          typeof entry === "object" &&
          entry !== null &&
          "filename" in entry &&
          "mode" in entry &&
          "text" in entry &&
          "extraction" in entry &&
          typeof entry.filename === "string" &&
          (entry.mode === "fix" || entry.mode === "signal") &&
          typeof entry.text === "string",
      )
      .map((entry) => ({
        filename: entry.filename,
        mode: entry.mode,
        text: entry.text,
        extraction: entry.extraction,
      }));
  } catch {
    localReferenceCache = [];
  }

  return localReferenceCache;
}

async function matchLocalReferenceEmbedding(input: {
  mode: Mode;
  imageName?: string;
  notes?: string;
  caption?: string;
}): Promise<LocalReferenceMatch | null> {
  const references = await getLocalReferences();
  if (!references.length) {
    return null;
  }

  const queryText = [input.imageName, input.notes, input.caption]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(" ");
  if (!queryText.trim()) {
    return null;
  }

  const queryVector = toTermFrequency(tokenize(queryText));
  const queryName = normalizeName(input.imageName);
  let best: LocalReferenceMatch | null = null;

  for (const entry of references) {
    if (entry.mode !== input.mode) {
      continue;
    }

    const entryName = normalizeName(entry.filename);
    const entryVector = toTermFrequency(tokenize(`${entry.filename} ${entry.text}`));
    let score = cosineSimilarity(queryVector, entryVector);

    if (queryName && entryName && queryName === entryName) {
      score += 0.85;
    } else if (queryName && entryName && queryName.includes(entryName)) {
      score += 0.45;
    }

    if (!best || score > best.score) {
      best = { score, entry };
    }
  }

  if (!best || best.score < 0.24) {
    return null;
  }

  return best;
}

function buildFallbackFix(notes: string | undefined): Extraction {
  const issueType = normalizeIssueType(notes);
  return normalizeExtraction("fix", {
    issue_type: issueType,
    summary:
      notes?.trim() ||
      "Campus issue detected from the uploaded photo and ready for review.",
    likely_location: "Needs confirmation",
    urgency:
      notes?.toLowerCase().includes("flicker") || notes?.toLowerCase().includes("sparks")
        ? "high"
        : "medium",
    suggested_team: resolveTeamFromIssue(issueType),
    confidence: 0.66,
    needs_user_confirmation: true,
  });
}

function buildFallbackSignal(notes: string | undefined): Extraction {
  const hint = notes?.trim();
  return normalizeExtraction("signal", {
    title: hint ? `Campus signal: ${hint}` : "Useful campus update",
    summary:
      hint ||
      "A useful student-facing campus update is ready to publish into the local feed.",
    likely_location: "Needs confirmation",
    expiration_time:
      hint?.toLowerCase().includes("today") || hint?.toLowerCase().includes("pm")
        ? hint
        : "Today, 5:00 PM",
    confidence: 0.62,
    needs_user_confirmation: true,
  });
}

async function buildFallbackResponse(request: AnalyzeRequest): Promise<AnalyzeResponse> {
  const startedAt = Date.now();
  const example = getExampleById(request.exampleId);
  const metadata = request.photoMetadata ?? example?.photoMetadata;
  const locationHint = buildLocationHint(metadata);
  if (example && example.mode === request.mode) {
    const extraction = normalizeExtraction(request.mode, example.fallbackExtraction);
    if (locationHint && prefersMetadataLocation(extraction.likely_location)) {
      extraction.likely_location = locationHint.label;
    }

    return {
      extraction,
      source: "fallback",
      workflowLabels: WORKFLOW_LABELS,
      locationHint,
      notice: locationHint
        ? "Fallback analysis used for a stable demo-safe result. Photo metadata provided a location hint."
        : "Fallback analysis used for a stable demo-safe result.",
    };
  }

  const localRefStartedAt = Date.now();
  const localReferenceMatch = await matchLocalReferenceEmbedding({
    mode: request.mode,
    imageName: request.imageName,
    notes: request.notes,
  });
  const localRefMs = Date.now() - localRefStartedAt;
  if (localReferenceMatch) {
    const extraction = normalizeExtraction(
      request.mode,
      localReferenceMatch.entry.extraction,
    );
    if (locationHint && prefersMetadataLocation(extraction.likely_location)) {
      extraction.likely_location = locationHint.label;
    }

    return {
      extraction,
      source: "fallback",
      workflowLabels: WORKFLOW_LABELS,
      locationHint,
      notice: locationHint
        ? `Fallback + local reference match (${localReferenceMatch.entry.filename}) with metadata hint.`
        : `Fallback + local reference match (${localReferenceMatch.entry.filename}).`,
    };
  }

  const extraction =
    request.mode === "fix"
      ? buildFallbackFix(request.notes)
      : buildFallbackSignal(request.notes);
  if (locationHint && prefersMetadataLocation(extraction.likely_location)) {
    extraction.likely_location = locationHint.label;
  }

  const response: AnalyzeResponse = {
    extraction,
    source: "fallback",
    workflowLabels: WORKFLOW_LABELS,
    locationHint,
    notice: locationHint
      ? "Fallback analysis used because no live model result was available. Photo metadata provided a location hint."
      : "Fallback analysis used because no live model result was available.",
  };
  logAnalyze("fallback_complete", {
    mode: request.mode,
    imageName: request.imageName ?? "n/a",
    totalMs: Date.now() - startedAt,
    localReferenceMatchMs: localRefMs,
    localReferenceMatched: Boolean(localReferenceMatch),
  });
  return response;
}

function inferLikelyLocation(value: string): string | undefined {
  const normalized = value.toLowerCase();
  if (normalized.includes("pcl") || normalized.includes("perry-castaneda")) {
    return "PCL study area";
  }
  if (normalized.includes("texas union") || normalized.includes("union")) {
    return "Texas Union";
  }
  if (normalized.includes("welch")) {
    return "Welch Hall";
  }
  if (normalized.includes("gregory")) {
    return "Gregory Gym";
  }
  if (normalized.includes("main mall")) {
    return "Main Mall";
  }
  if (normalized.includes("jester")) {
    return "Jester Residence Hall";
  }
  return undefined;
}

function decodeImageDataUrl(
  imageDataUrl: string,
): { mimeType: string; bytes: Uint8Array } | null {
  const match = imageDataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) {
    return null;
  }
  const mimeType = match[1];
  const binaryBuffer = Buffer.from(match[2], "base64");
  if (!binaryBuffer.length) {
    return null;
  }
  const bytes = new Uint8Array(binaryBuffer.length);
  bytes.set(binaryBuffer);
  return { mimeType, bytes };
}

function extractCaption(payload: unknown): string | undefined {
  if (Array.isArray(payload)) {
    const detections = payload
      .filter(
        (entry) =>
          typeof entry === "object" &&
          entry !== null &&
          "label" in entry &&
          typeof entry.label === "string",
      )
      .map((entry) => ({
        label: entry.label.trim(),
        score:
          "score" in entry && typeof entry.score === "number" ? entry.score : undefined,
      }))
      .filter((entry) => entry.label.length > 0)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    if (detections.length > 0) {
      const topLabels = Array.from(
        new Set(
          detections
            .filter((entry) => entry.score === undefined || entry.score >= 0.35)
            .slice(0, 4)
            .map((entry) => entry.label),
        ),
      );
      if (topLabels.length > 0) {
        return `Detected objects: ${topLabels.join(", ")}.`;
      }
    }

    const generated = payload.find(
      (entry) =>
        typeof entry === "object" &&
        entry !== null &&
        "generated_text" in entry &&
        typeof entry.generated_text === "string",
    ) as { generated_text: string } | undefined;
    return generated?.generated_text?.trim();
  }

  if (
    typeof payload === "object" &&
    payload !== null &&
    "generated_text" in payload &&
    typeof payload.generated_text === "string"
  ) {
    return payload.generated_text.trim();
  }

  return undefined;
}

function buildLiveFixExtraction(
  caption: string | undefined,
  notes: string | undefined,
): Extraction {
  const summaryFromCaption = caption
    ? `Photo appears to show: ${caption}.`
    : "Campus issue detected from the uploaded photo and ready for review.";
  const summary = notes?.trim() || summaryFromCaption;
  const combinedText = `${caption ?? ""} ${notes ?? ""}`.trim();
  const normalizedCombinedText = combinedText.toLowerCase();
  const issueType = normalizeIssueType(combinedText || notes);
  const likelyLocation = inferLikelyLocation(combinedText) || "Needs confirmation";
  const urgency = /(sparks?|smoke|fire|leak|flood|danger|hazard|crack|broken)/.test(
    normalizedCombinedText,
  )
    ? "high"
    : "medium";

  return normalizeExtraction("fix", {
    issue_type: issueType,
    summary,
    likely_location: likelyLocation,
    urgency,
    suggested_team: resolveTeamFromIssue(issueType),
    confidence: caption ? 0.74 : 0.64,
    needs_user_confirmation: true,
  });
}

function buildLiveSignalExtraction(
  caption: string | undefined,
  notes: string | undefined,
): Extraction {
  const summaryFromCaption = caption
    ? `Photo appears to show: ${caption}.`
    : "A useful student-facing campus update is ready to publish into the local feed.";
  const summary = notes?.trim() || summaryFromCaption;
  const combinedText = `${caption ?? ""} ${notes ?? ""}`.trim();
  const likelyLocation = inferLikelyLocation(combinedText) || "Needs confirmation";
  const timeHintPresent = /\b(today|tonight|tomorrow|\d{1,2}(:\d{2})?\s?(am|pm))\b/i.test(
    notes ?? "",
  );

  return normalizeExtraction("signal", {
    title: notes?.trim() ? `Campus signal: ${notes.trim()}` : "Campus signal ready to publish",
    summary,
    likely_location: likelyLocation,
    expiration_time: timeHintPresent && notes?.trim() ? notes.trim() : "Today, 5:00 PM",
    confidence: caption ? 0.72 : 0.62,
    needs_user_confirmation: true,
  });
}

async function runLiveAnalysis(request: AnalyzeRequest): Promise<AnalyzeResponse | null> {
  const startedAt = Date.now();
  const apiKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_API_KEY;
  const model = process.env.HUGGINGFACE_VISION_MODEL || "facebook/detr-resnet-50";

  if (!apiKey || !request.imageDataUrl) {
    logAnalyze("live_skipped", {
      mode: request.mode,
      imageName: request.imageName ?? "n/a",
      reason: !apiKey ? "missing_hf_key" : "missing_image_data_url",
    });
    return null;
  }

  const decodedImage = decodeImageDataUrl(request.imageDataUrl);
  if (!decodedImage) {
    logAnalyze("live_skipped", {
      mode: request.mode,
      imageName: request.imageName ?? "n/a",
      reason: "invalid_data_url",
    });
    return null;
  }

  const hfStartedAt = Date.now();
  const response = await fetch(
    `https://router.huggingface.co/hf-inference/models/${encodeURIComponent(model)}`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": decodedImage.mimeType,
        Authorization: `Bearer ${apiKey}`,
      },
      body: decodedImage.bytes as unknown as BodyInit,
    },
  );
  const hfMs = Date.now() - hfStartedAt;

  if (!response.ok) {
    throw new Error(`Model request failed with ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  const caption = extractCaption(payload);
  const localRefStartedAt = Date.now();
  const localReferenceMatch = await matchLocalReferenceEmbedding({
    mode: request.mode,
    imageName: request.imageName,
    notes: request.notes,
    caption,
  });
  const localRefMs = Date.now() - localRefStartedAt;
  const extraction = localReferenceMatch
    ? normalizeExtraction(request.mode, localReferenceMatch.entry.extraction)
    : request.mode === "fix"
      ? buildLiveFixExtraction(caption, request.notes)
      : buildLiveSignalExtraction(caption, request.notes);
  const locationHint = buildLocationHint(request.photoMetadata);
  if (locationHint && prefersMetadataLocation(extraction.likely_location)) {
    extraction.likely_location = locationHint.label;
  }

  const responsePayload: AnalyzeResponse = {
    extraction,
    source: "live",
    workflowLabels: WORKFLOW_LABELS,
    locationHint,
    notice: localReferenceMatch
      ? locationHint
        ? `Live analysis + local reference match (${localReferenceMatch.entry.filename}) with metadata hint.`
        : `Live analysis + local reference match (${localReferenceMatch.entry.filename}).`
      : locationHint
        ? "Live analysis used. Photo metadata contributed a location hint for review."
        : "Live analysis used.",
  };
  logAnalyze("live_complete", {
    mode: request.mode,
    imageName: request.imageName ?? "n/a",
    model,
    hfMs,
    localReferenceMatchMs: localRefMs,
    localReferenceMatched: Boolean(localReferenceMatch),
    source: responsePayload.source,
    totalMs: Date.now() - startedAt,
  });
  return responsePayload;
}

export async function analyzeSubmission(
  request: AnalyzeRequest,
): Promise<AnalyzeResponse> {
  const startedAt = Date.now();
  try {
    const liveResponse = await runLiveAnalysis(request);
    if (liveResponse) {
      logAnalyze("request_complete", {
        mode: request.mode,
        imageName: request.imageName ?? "n/a",
        source: liveResponse.source,
        totalMs: Date.now() - startedAt,
      });
      return liveResponse;
    }
  } catch (error) {
    logAnalyze("live_error", {
      mode: request.mode,
      imageName: request.imageName ?? "n/a",
      message: error instanceof Error ? error.message : String(error),
      totalMs: Date.now() - startedAt,
    });
    const fallbackAfterError = await buildFallbackResponse(request);
    logAnalyze("request_complete", {
      mode: request.mode,
      imageName: request.imageName ?? "n/a",
      source: fallbackAfterError.source,
      totalMs: Date.now() - startedAt,
      fallbackReason: "live_error",
    });
    return fallbackAfterError;
  }

  const fallbackResponse = await buildFallbackResponse(request);
  logAnalyze("request_complete", {
    mode: request.mode,
    imageName: request.imageName ?? "n/a",
    source: fallbackResponse.source,
    totalMs: Date.now() - startedAt,
    fallbackReason: "live_not_available",
  });
  return fallbackResponse;
}
