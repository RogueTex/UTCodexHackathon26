import { z } from "zod";

import { Mode } from "@/lib/bevofix";
import { normalizeIssueType, resolveTeamFromIssue } from "@/lib/routing";

export const urgencyValues = ["low", "medium", "high"] as const;
export type Urgency = (typeof urgencyValues)[number];

export const analysisSourceValues = ["live", "fallback"] as const;
export type AnalysisSource = (typeof analysisSourceValues)[number];

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
  mode: Mode;
  imageDataUrl?: string;
  imageName?: string;
  notes?: string;
  exampleId?: string;
};

export type AnalyzeResponse = {
  extraction: Extraction;
  source: AnalysisSource;
  workflowLabels: string[];
  notice?: string;
};

export type FixTicket = FixExtraction & {
  id: string;
  created_at: string;
  status: "new" | "queued" | "triaged";
};

export type SignalPost = SignalExtraction & {
  id: string;
  created_at: string;
  status: "live" | "expiring";
};

export type DashboardPayload = {
  tickets: FixTicket[];
  signals: SignalPost[];
};

const rawCommonSchema = {
  likely_location: z.string().optional(),
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
    ...rawCommonSchema,
  })
  .passthrough();

const rawSignalSchema = z
  .object({
    mode: z.any().optional(),
    title: z.string().optional(),
    summary: z.string().optional(),
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

function normalizeLocation(value: string | undefined): string {
  return value && value.trim() ? value.trim() : "Needs confirmation";
}

function normalizeUrgency(value: string | undefined): Urgency {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "high" || normalized === "medium" || normalized === "low") {
    return normalized;
  }
  return "medium";
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
    likely_location: normalizeLocation(raw.likely_location),
    urgency: normalizeUrgency(raw.urgency),
    suggested_team:
      raw.suggested_team?.trim() || resolveTeamFromIssue(issueType),
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
    likely_location: normalizeLocation(raw.likely_location),
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

export function parseFixSubmission(input: unknown): FixExtraction {
  return normalizeFixExtraction(input);
}

export function parseSignalSubmission(input: unknown): SignalExtraction {
  return normalizeSignalExtraction(input);
}

