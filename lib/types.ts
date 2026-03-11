import { z } from "zod";

import { Mode } from "@/lib/bevofix";
import { LocationHint, PhotoMetadata } from "@/lib/location-hints";
import { normalizeIssueType, resolveTeamFromIssue } from "@/lib/routing";

export const urgencyValues = ["low", "medium", "high"] as const;
export type Urgency = (typeof urgencyValues)[number];

export const analysisSourceValues = ["live", "fallback"] as const;
export type AnalysisSource = (typeof analysisSourceValues)[number];

export const detectedTypeValues = ["issue", "broadcast"] as const;
export type DetectedType = (typeof detectedTypeValues)[number];

export const locationSourceValues = ["metadata", "inferred", "manual"] as const;
export type LocationSource = (typeof locationSourceValues)[number];

export const locationConfidenceValues = [
  "Exact metadata",
  "Estimated location",
  "Needs confirmation",
] as const;
export type LocationConfidence = (typeof locationConfidenceValues)[number];

export const assistantActionValues = ["issue", "forum", "both"] as const;
export type AssistantAction = (typeof assistantActionValues)[number];

export type AssistantLocation = {
  text: string;
  source: LocationSource;
  confidence: LocationConfidence;
  latitude?: number;
  longitude?: number;
  precision?: LocationHint["precision"];
  openStreetMapEmbedUrl?: string;
  openStreetMapLinkUrl?: string;
};

export type AssistantDraft = {
  detected_type: DetectedType;
  summary: string;
  captured_at: string;
  confidence: number;
  needs_user_confirmation: boolean;
  suggested_issue_type: string;
  suggested_urgency: Urgency;
  suggested_team: string;
  suggested_title: string;
  suggested_expiration_time: string;
  location: AssistantLocation;
  tags: string[];
};

export type FixExtraction = {
  mode: "fix";
  issue_type: string;
  summary: string;
  likely_location: string;
  urgency: Urgency;
  suggested_team: string;
  confidence: number;
  needs_user_confirmation: boolean;
};

export type SignalExtraction = {
  mode: "signal";
  title: string;
  summary: string;
  likely_location: string;
  expiration_time: string;
  confidence: number;
  needs_user_confirmation: boolean;
};

export type Extraction = FixExtraction | SignalExtraction;

export type AnalyzeRequest = {
  mode?: Mode;
  imageDataUrl?: string;
  imageName?: string;
  notes?: string;
  exampleId?: string;
  photoMetadata?: PhotoMetadata;
};

export type AnalyzeResponse = {
  draft: AssistantDraft;
  source: AnalysisSource;
  workflowLabels: string[];
  notice?: string;
  locationHint?: LocationHint;
};

type ForumRecordShared = {
  imagePreview?: string;
  captured_at?: string;
  location: AssistantLocation;
  tags: string[];
  linked_group_id?: string;
};

export type FixTicket = FixExtraction &
  ForumRecordShared & {
    id: string;
    created_at: string;
    status: "new" | "queued" | "triaged";
  };

export type SignalPost = SignalExtraction &
  ForumRecordShared & {
    id: string;
    created_at: string;
    status: "live" | "expiring";
  };

export type ForumItem = {
  id: string;
  mode: Mode;
  title: string;
  summary: string;
  created_at: string;
  captured_at?: string;
  imagePreview?: string;
  confidence: number;
  status: string;
  tags: string[];
  linked_group_id?: string;
  location: AssistantLocation;
};

export type DashboardPayload = {
  tickets: FixTicket[];
  signals: SignalPost[];
  forum: ForumItem[];
};

export type AssistantSubmissionRequest = {
  action: AssistantAction;
  draft: AssistantDraft;
  imagePreview?: string;
};

export type AssistantSubmissionResponse = {
  action: AssistantAction;
  ticketId?: string;
  signalId?: string;
  linkedGroupId?: string;
};

const rawCommonSchema = {
  confidence: z.union([z.number(), z.string()]).optional(),
  needs_user_confirmation: z.boolean().optional(),
};

const rawFixSchema = z
  .object({
    mode: z.any().optional(),
    issue_type: z.string().optional(),
    summary: z.string().optional(),
    urgency: z.string().optional(),
    suggested_team: z.string().optional(),
    likely_location: z.string().optional(),
    ...rawCommonSchema,
  })
  .passthrough();

const rawSignalSchema = z
  .object({
    mode: z.any().optional(),
    title: z.string().optional(),
    summary: z.string().optional(),
    likely_location: z.string().optional(),
    expiration_time: z.string().optional(),
    ...rawCommonSchema,
  })
  .passthrough();

const rawAssistantLocationSchema = z
  .object({
    text: z.string().optional(),
    source: z.string().optional(),
    confidence: z.string().optional(),
    latitude: z.union([z.number(), z.string()]).optional(),
    longitude: z.union([z.number(), z.string()]).optional(),
    precision: z.enum(["landmark", "campus-area", "coordinates"]).optional(),
    openStreetMapEmbedUrl: z.string().optional(),
    openStreetMapLinkUrl: z.string().optional(),
  })
  .passthrough();

const rawAssistantSchema = z
  .object({
    detected_type: z.string().optional(),
    summary: z.string().optional(),
    captured_at: z.string().optional(),
    suggested_issue_type: z.string().optional(),
    suggested_urgency: z.string().optional(),
    suggested_team: z.string().optional(),
    suggested_title: z.string().optional(),
    suggested_expiration_time: z.string().optional(),
    tags: z.array(z.string()).optional(),
    likely_location: z.string().optional(),
    location: rawAssistantLocationSchema.optional(),
    title: z.string().optional(),
    issue_type: z.string().optional(),
    urgency: z.string().optional(),
    expiration_time: z.string().optional(),
    ...rawCommonSchema,
  })
  .passthrough();

function clampConfidence(value: unknown, fallback = 0.64): number {
  const numeric = typeof value === "string" ? Number(value) : value;
  if (typeof numeric !== "number" || Number.isNaN(numeric)) {
    return fallback;
  }
  return Math.min(1, Math.max(0, numeric));
}

function parseCoordinate(value: unknown): number | undefined {
  const numeric = typeof value === "string" ? Number(value) : value;
  if (typeof numeric !== "number" || Number.isNaN(numeric)) {
    return undefined;
  }
  return numeric;
}

function normalizeLocationText(value: string | undefined): string {
  return value && value.trim() ? value.trim() : "Needs confirmation";
}

function normalizeUrgency(value: string | undefined): Urgency {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "high" || normalized === "medium" || normalized === "low") {
    return normalized;
  }
  return "medium";
}

function normalizeDetectedType(value: string | undefined): DetectedType {
  const normalized = (value ?? "").trim().toLowerCase();
  if (
    normalized === "broadcast" ||
    normalized === "signal" ||
    normalized === "forum" ||
    normalized === "announcement"
  ) {
    return "broadcast";
  }
  return "issue";
}

function normalizeLocationSource(
  value: string | undefined,
  text: string,
): LocationSource {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "metadata") {
    return "metadata";
  }
  if (normalized === "manual") {
    return "manual";
  }
  if (text === "Needs confirmation") {
    return "inferred";
  }
  return "inferred";
}

function normalizeLocationConfidence(
  value: string | undefined,
  source: LocationSource,
  text: string,
): LocationConfidence {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized.includes("exact")) {
    return "Exact metadata";
  }
  if (normalized.includes("estimated")) {
    return "Estimated location";
  }
  if (normalized.includes("confirm")) {
    return "Needs confirmation";
  }
  if (source === "metadata") {
    return "Exact metadata";
  }
  return text === "Needs confirmation"
    ? "Needs confirmation"
    : "Estimated location";
}

function normalizeTag(value: string): string {
  return value.trim().toLowerCase();
}

function uniqueTags(tags: string[]): string[] {
  return [...new Set(tags.map(normalizeTag).filter(Boolean))];
}

function inferForumTags(title: string, summary: string): string[] {
  const content = `${title} ${summary}`.toLowerCase();
  const tags: string[] = [];
  if (content.includes("pizza") || content.includes("food")) {
    tags.push("free food");
  }
  if (content.includes("study") || content.includes("seating") || content.includes("table")) {
    tags.push("study space");
  }
  if (content.includes("event") || content.includes("pop-up") || content.includes("popup")) {
    tags.push("event");
  }
  return tags;
}

function inferIssueTags(
  issueType: string,
  team: string,
  urgency: Urgency,
  summary: string,
): string[] {
  const tags: string[] = [];
  const lowerTeam = team.toLowerCase();
  if (urgency === "high") {
    tags.push("urgent");
  }
  if (lowerTeam.includes("facilities")) {
    tags.push("facilities");
  }
  if (lowerTeam.includes("it")) {
    tags.push("it");
  }
  if (lowerTeam.includes("network")) {
    tags.push("network");
  }
  if (issueType.includes("charger") || summary.toLowerCase().includes("charger")) {
    tags.push("it");
  }
  return tags;
}

export function normalizeFixExtraction(input: unknown): FixExtraction {
  const raw = rawFixSchema.safeParse(input).success
    ? rawFixSchema.parse(input)
    : {};
  const issueType = normalizeIssueType(raw.issue_type);

  return {
    mode: "fix",
    issue_type: issueType,
    summary:
      raw.summary?.trim() ||
      "Campus equipment issue reported and ready for student confirmation.",
    likely_location: normalizeLocationText(raw.likely_location),
    urgency: normalizeUrgency(raw.urgency),
    suggested_team: raw.suggested_team?.trim() || resolveTeamFromIssue(issueType),
    confidence: clampConfidence(raw.confidence),
    needs_user_confirmation: raw.needs_user_confirmation ?? true,
  };
}

export function normalizeSignalExtraction(input: unknown): SignalExtraction {
  const raw = rawSignalSchema.safeParse(input).success
    ? rawSignalSchema.parse(input)
    : {};

  return {
    mode: "signal",
    title: raw.title?.trim() || "Campus update ready to publish",
    summary:
      raw.summary?.trim() ||
      "Useful campus update detected. Review the details before publishing.",
    likely_location: normalizeLocationText(raw.likely_location),
    expiration_time: raw.expiration_time?.trim() || "Needs confirmation",
    confidence: clampConfidence(raw.confidence),
    needs_user_confirmation: raw.needs_user_confirmation ?? true,
  };
}

export function normalizeExtraction(mode: Mode, input: unknown): Extraction {
  return mode === "fix"
    ? normalizeFixExtraction(input)
    : normalizeSignalExtraction(input);
}

export function normalizeAssistantLocation(input: unknown): AssistantLocation {
  const raw = rawAssistantLocationSchema.safeParse(input).success
    ? rawAssistantLocationSchema.parse(input)
    : {};
  const text = normalizeLocationText(raw.text);
  const source = normalizeLocationSource(raw.source, text);

  return {
    text,
    source,
    confidence: normalizeLocationConfidence(raw.confidence, source, text),
    latitude: parseCoordinate(raw.latitude),
    longitude: parseCoordinate(raw.longitude),
    precision: raw.precision,
    openStreetMapEmbedUrl: raw.openStreetMapEmbedUrl,
    openStreetMapLinkUrl: raw.openStreetMapLinkUrl,
  };
}

export function normalizeAssistantDraft(input: unknown): AssistantDraft {
  const raw = rawAssistantSchema.safeParse(input).success
    ? rawAssistantSchema.parse(input)
    : {};
  const issueType = normalizeIssueType(raw.suggested_issue_type ?? raw.issue_type);
  const location = normalizeAssistantLocation({
    text: raw.location?.text ?? raw.likely_location,
    source: raw.location?.source,
    confidence: raw.location?.confidence,
    latitude: raw.location?.latitude,
    longitude: raw.location?.longitude,
    precision: raw.location?.precision,
    openStreetMapEmbedUrl: raw.location?.openStreetMapEmbedUrl,
    openStreetMapLinkUrl: raw.location?.openStreetMapLinkUrl,
  });
  const title =
    raw.suggested_title?.trim() || raw.title?.trim() || "Campus update ready to publish";
  const summary =
    raw.summary?.trim() ||
    "Campus photo analyzed and ready for student review before action.";
  const urgency = normalizeUrgency(raw.suggested_urgency ?? raw.urgency);
  const team = raw.suggested_team?.trim() || resolveTeamFromIssue(issueType);
  const tags = raw.tags?.length
    ? uniqueTags(raw.tags)
    : uniqueTags([
        ...inferIssueTags(issueType, team, urgency, summary),
        ...inferForumTags(title, summary),
      ]);

  return {
    detected_type: normalizeDetectedType(raw.detected_type),
    summary,
    captured_at: raw.captured_at?.trim() || new Date().toISOString(),
    confidence: clampConfidence(raw.confidence),
    needs_user_confirmation: raw.needs_user_confirmation ?? true,
    suggested_issue_type: issueType,
    suggested_urgency: urgency,
    suggested_team: team,
    suggested_title: title,
    suggested_expiration_time:
      raw.suggested_expiration_time?.trim() ||
      raw.expiration_time?.trim() ||
      "Needs confirmation",
    location,
    tags,
  };
}

export function draftToFixExtraction(draft: AssistantDraft): FixExtraction {
  return normalizeFixExtraction({
    issue_type: draft.suggested_issue_type,
    summary: draft.summary,
    likely_location: draft.location.text,
    urgency: draft.suggested_urgency,
    suggested_team: draft.suggested_team,
    confidence: draft.confidence,
    needs_user_confirmation: draft.needs_user_confirmation,
  });
}

export function draftToSignalExtraction(draft: AssistantDraft): SignalExtraction {
  return normalizeSignalExtraction({
    title: draft.suggested_title,
    summary: draft.summary,
    likely_location: draft.location.text,
    expiration_time: draft.suggested_expiration_time,
    confidence: draft.confidence,
    needs_user_confirmation: draft.needs_user_confirmation,
  });
}

export function parseFixSubmission(input: unknown): FixExtraction {
  return normalizeFixExtraction(input);
}

export function parseSignalSubmission(input: unknown): SignalExtraction {
  return normalizeSignalExtraction(input);
}

export function parseAssistantSubmission(input: unknown): AssistantSubmissionRequest {
  const payload = input as Partial<AssistantSubmissionRequest> | null;
  const action = assistantActionValues.includes(payload?.action as AssistantAction)
    ? (payload?.action as AssistantAction)
    : "issue";

  return {
    action,
    draft: normalizeAssistantDraft(payload?.draft),
    imagePreview:
      typeof payload?.imagePreview === "string" ? payload.imagePreview : undefined,
  };
}

export function buildAssistantDraftFromExtraction(
  extraction: Extraction,
  options?: {
    locationHint?: LocationHint;
    capturedAt?: string;
    tags?: string[];
  },
): AssistantDraft {
  const locationText = extraction.likely_location;
  const location =
    options?.locationHint && locationText === options.locationHint.label
      ? normalizeAssistantLocation({
          text: options.locationHint.label,
          source: "metadata",
          confidence: "Exact metadata",
          latitude: options.locationHint.latitude,
          longitude: options.locationHint.longitude,
          precision: options.locationHint.precision,
          openStreetMapEmbedUrl: options.locationHint.openStreetMapEmbedUrl,
          openStreetMapLinkUrl: options.locationHint.openStreetMapLinkUrl,
        })
      : normalizeAssistantLocation({
          text: locationText,
          source: "inferred",
          confidence:
            locationText === "Needs confirmation"
              ? "Needs confirmation"
              : "Estimated location",
        });

  if (extraction.mode === "fix") {
    return normalizeAssistantDraft({
      detected_type: "issue",
      summary: extraction.summary,
      captured_at: options?.capturedAt,
      confidence: extraction.confidence,
      needs_user_confirmation: extraction.needs_user_confirmation,
      suggested_issue_type: extraction.issue_type,
      suggested_urgency: extraction.urgency,
      suggested_team: extraction.suggested_team,
      suggested_title: `Campus issue: ${extraction.issue_type}`,
      suggested_expiration_time: "Needs confirmation",
      location,
      tags:
        options?.tags ??
        inferIssueTags(
          extraction.issue_type,
          extraction.suggested_team,
          extraction.urgency,
          extraction.summary,
        ),
    });
  }

  return normalizeAssistantDraft({
    detected_type: "broadcast",
    summary: extraction.summary,
    captured_at: options?.capturedAt,
    confidence: extraction.confidence,
    needs_user_confirmation: extraction.needs_user_confirmation,
    suggested_issue_type: "unknown",
    suggested_urgency: "low",
    suggested_team: "Campus Operations",
    suggested_title: extraction.title,
    suggested_expiration_time: extraction.expiration_time,
    location,
    tags: options?.tags ?? inferForumTags(extraction.title, extraction.summary),
  });
}

export function withManualLocation(
  draft: AssistantDraft,
  text: string,
): AssistantDraft {
  return {
    ...draft,
    location: {
      text: normalizeLocationText(text),
      source: "manual",
      confidence:
        text.trim() === "" ? "Needs confirmation" : "Estimated location",
      latitude: undefined,
      longitude: undefined,
    },
  };
}
