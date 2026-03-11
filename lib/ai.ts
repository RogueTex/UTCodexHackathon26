import { PRODUCT_NAME } from "@/lib/bevofix";
import { getExampleById } from "@/lib/demo-fixtures";
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
  "Validation Skill",
];

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

function buildFallbackResponse(request: AnalyzeRequest): AnalyzeResponse {
  const example = getExampleById(request.exampleId);
  if (example && example.mode === request.mode) {
    return {
      extraction: normalizeExtraction(request.mode, example.fallbackExtraction),
      source: "fallback",
      workflowLabels: WORKFLOW_LABELS,
      notice: "Fallback analysis used for a stable demo-safe result.",
    };
  }

  return {
    extraction:
      request.mode === "fix"
        ? buildFallbackFix(request.notes)
        : buildFallbackSignal(request.notes),
    source: "fallback",
    workflowLabels: WORKFLOW_LABELS,
    notice: "Fallback analysis used because no live model result was available.",
  };
}

async function runLiveAnalysis(request: AnalyzeRequest): Promise<AnalyzeResponse | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  if (!apiKey || !request.imageDataUrl) {
    return null;
  }

  const schemaHint =
    request.mode === "fix"
      ? '{ "mode": "fix", "issue_type": "...", "summary": "...", "likely_location": "...", "urgency": "low|medium|high", "suggested_team": "...", "confidence": 0.0, "needs_user_confirmation": true }'
      : '{ "mode": "signal", "title": "...", "summary": "...", "likely_location": "...", "expiration_time": "...", "confidence": 0.0, "needs_user_confirmation": true }';

  const prompt = [
    `You are the ${PRODUCT_NAME} Extraction Skill.`,
    `Return only JSON matching this schema: ${schemaHint}`,
    "Be concise, campus-specific, and safe. If uncertain, use 'Needs confirmation'.",
    request.notes ? `Student notes: ${request.notes}` : "Student notes: none provided.",
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
    }),
  });

  if (!response.ok) {
    throw new Error(`Model request failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    output_text?: string;
  };
  const rawText = payload.output_text;

  if (!rawText) {
    throw new Error("Model response missing output_text");
  }

  return {
    extraction: normalizeExtraction(request.mode, JSON.parse(rawText)),
    source: "live",
    workflowLabels: WORKFLOW_LABELS,
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

