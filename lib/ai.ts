import { PRODUCT_NAME } from "@/lib/bevofix";
import { logMetadataEvent } from "@/lib/debug";
import { getExampleById } from "@/lib/demo-fixtures";
import { buildLocationHint, prefersMetadataLocation } from "@/lib/location-hints";
import { matchReferenceEmbedding } from "@/lib/reference-embeddings";
import { normalizeIssueType, resolveTeamFromIssue } from "@/lib/routing";
import {
  AnalyzeRequest,
  AnalyzeResponse,
  AssistantDraft,
  DetectedType,
  Extraction,
  buildAssistantDraftFromExtraction,
  normalizeAssistantDraft,
  normalizeExtraction,
} from "@/lib/types";

const WORKFLOW_LABELS = [
  "Extraction Skill",
  "Routing Skill",
  "Publishing Skill",
  "Location Skill",
  "Validation Skill",
];

function inferDetectedType(request: AnalyzeRequest): DetectedType {
  if (request.mode === "signal") {
    return "broadcast";
  }
  if (request.mode === "fix") {
    return "issue";
  }

  const content = request.notes?.toLowerCase() ?? "";
  if (
    content.includes("pizza") ||
    content.includes("food") ||
    content.includes("study") ||
    content.includes("seating") ||
    content.includes("event") ||
    content.includes("open tables")
  ) {
    return "broadcast";
  }

  return "issue";
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

function applyLocationHint(
  draft: AssistantDraft,
  request: AnalyzeRequest,
  locationHint = buildLocationHint(request.photoMetadata),
): {
  draft: AssistantDraft;
  locationHint?: AnalyzeResponse["locationHint"];
} {
  if (!locationHint || !prefersMetadataLocation(draft.location.text)) {
    return { draft, locationHint };
  }

  const nextDraft = normalizeAssistantDraft({
    ...draft,
    captured_at: request.photoMetadata?.capturedAt ?? draft.captured_at,
    location: {
      text: locationHint.label,
      source: "metadata",
      confidence: "Exact metadata",
      latitude: locationHint.latitude,
      longitude: locationHint.longitude,
      precision: locationHint.precision,
      openStreetMapEmbedUrl: locationHint.openStreetMapEmbedUrl,
      openStreetMapLinkUrl: locationHint.openStreetMapLinkUrl,
    },
  });

  logMetadataEvent("metadata hint applied to assistant draft", {
    mode: request.mode,
    finalLocation: nextDraft.location.text,
  });

  return { draft: nextDraft, locationHint };
}

function resolveReferenceMode(request: AnalyzeRequest): "fix" | "signal" {
  if (request.mode === "fix" || request.mode === "signal") {
    return request.mode;
  }

  return inferDetectedType(request) === "broadcast" ? "signal" : "fix";
}

function buildFallbackResponse(request: AnalyzeRequest): AnalyzeResponse {
  const example = getExampleById(request.exampleId);
  const metadata = request.photoMetadata ?? example?.photoMetadata;
  const locationHint = buildLocationHint(metadata);
  const referenceMatch = matchReferenceEmbedding({
    mode: resolveReferenceMode(request),
    imageName: request.imageName,
    notes: request.notes,
  });

  logMetadataEvent("building fallback analysis", {
    mode: request.mode,
    exampleId: request.exampleId,
    hasMetadata: Boolean(metadata),
    metadataHint: locationHint?.label,
    referenceMatch: referenceMatch?.entry.filename,
    referenceScore: referenceMatch?.score,
  });

  if (referenceMatch) {
    const referenceDraft = buildAssistantDraftFromExtraction(referenceMatch.extraction, {
      locationHint,
      capturedAt: request.photoMetadata?.capturedAt,
    });
    const applied = applyLocationHint(referenceDraft, request, locationHint);

    return {
      draft: applied.draft,
      source: "fallback",
      workflowLabels: WORKFLOW_LABELS,
      locationHint: applied.locationHint,
      notice: `Local reference match used (${referenceMatch.entry.filename}) for a deterministic demo-safe result.`,
    };
  }

  if (example && (!request.mode || example.mode === request.mode)) {
    const extraction = normalizeExtraction(example.mode, example.fallbackExtraction);
    const seededDraft = buildAssistantDraftFromExtraction(extraction, {
      locationHint,
      capturedAt: request.photoMetadata?.capturedAt,
    });
    const applied = applyLocationHint(seededDraft, request, locationHint);

    return {
      draft: applied.draft,
      source: "fallback",
      workflowLabels: WORKFLOW_LABELS,
      locationHint: applied.locationHint,
      notice: locationHint
        ? "Fallback analysis used for a stable demo-safe result. Photo metadata provided a location hint."
        : "Fallback analysis used for a stable demo-safe result.",
    };
  }

  const detectedType = inferDetectedType(request);
  const extraction =
    detectedType === "issue"
      ? buildFallbackFix(request.notes)
      : buildFallbackSignal(request.notes);
  const genericDraft = buildAssistantDraftFromExtraction(extraction, {
    locationHint,
    capturedAt: request.photoMetadata?.capturedAt,
  });
  const applied = applyLocationHint(genericDraft, request, locationHint);

  return {
    draft: applied.draft,
    source: "fallback",
    workflowLabels: WORKFLOW_LABELS,
    locationHint: applied.locationHint,
    notice: locationHint
      ? "Fallback analysis used because no live model result was available. Photo metadata provided a location hint."
      : "Fallback analysis used because no live model result was available.",
  };
}

async function runLiveAnalysis(request: AnalyzeRequest): Promise<AnalyzeResponse | null> {
  const apiKey = request.runtimeApiKey?.trim() || process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4.1";

  if (!apiKey || !request.imageDataUrl) {
    logMetadataEvent("live analysis skipped", {
      reason: !apiKey ? "missing OPENAI_API_KEY" : "missing image data",
      hasPhotoMetadata: Boolean(request.photoMetadata),
    });
    return null;
  }

  const schemaHint = `{ "detected_type": "issue|broadcast", "summary": "...", "captured_at": "ISO datetime if known or current estimate", "confidence": 0.0, "needs_user_confirmation": true, "suggested_issue_type": "...", "suggested_urgency": "low|medium|high", "suggested_team": "...", "suggested_title": "...", "suggested_expiration_time": "...", "location": { "text": "...", "source": "inferred", "confidence": "Estimated location" }, "tags": ["..."] }`;

  const prompt = [
    `You are the ${PRODUCT_NAME} Extraction Skill.`,
    `Return only JSON matching this schema: ${schemaHint}`,
    "Focus on the primary actionable issue in the photo, not background objects.",
    "Inspect the uploaded image carefully for campus issues, useful student updates, readable signs, severity cues, and location clues.",
    "The UX is upload-first. Decide whether the photo is best treated as an issue or a broadcast, but still fill both issue and broadcast suggestion fields when possible.",
    "Be concise, campus-specific, and safe. If uncertain, use 'Needs confirmation'.",
    request.mode
      ? `Compatibility hint: the user entered through ${request.mode} mode, so bias the suggestions slightly toward that downstream action.`
      : "No downstream mode hint was provided. Infer the best fit from the photo and notes.",
    request.notes ? `Student notes: ${request.notes}` : "Student notes: none provided.",
    request.photoMetadata
      ? `Photo metadata GPS hint: ${request.photoMetadata.latitude}, ${request.photoMetadata.longitude}`
      : "Photo metadata GPS hint: unavailable.",
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt,
            },
            {
              type: "input_image",
              image_url: request.imageDataUrl,
            },
          ],
        },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(`Model request failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    output_text?: string;
    output?: Array<{
      content?: Array<{
        type?: string;
        text?: string;
      }>;
    }>;
  };

  const outputText =
    payload.output_text ||
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .find((contentItem) => contentItem.type === "output_text" && contentItem.text)
      ?.text;

  if (!outputText) {
    throw new Error("Model response missing output_text");
  }

  const sanitizedText = outputText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const draft = normalizeAssistantDraft(JSON.parse(sanitizedText));
  const applied = applyLocationHint(draft, request);

  return {
    draft: applied.draft,
    source: "live",
    workflowLabels: WORKFLOW_LABELS,
    locationHint: applied.locationHint,
    notice: applied.locationHint
      ? "Photo metadata contributed a location hint for review."
      : undefined,
  };
}

export async function analyzeSubmission(
  request: AnalyzeRequest,
): Promise<AnalyzeResponse> {
  try {
    const liveResponse = await runLiveAnalysis(request);
    if (liveResponse) {
      return liveResponse;
    }
  } catch {
    return buildFallbackResponse(request);
  }

  return buildFallbackResponse(request);
}
