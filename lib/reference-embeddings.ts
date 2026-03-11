import { Mode } from "@/lib/bevofix";
import { normalizeIssueType, resolveTeamFromIssue } from "@/lib/routing";
import { Extraction, normalizeExtraction } from "@/lib/types";

type ReferenceEntry = {
  filename: string;
  mode: Mode;
  text: string;
  extraction: Extraction;
};

type MatchInput = {
  mode: Mode;
  imageName?: string;
  notes?: string;
  caption?: string;
};

export type ReferenceMatch = {
  score: number;
  entry: ReferenceEntry;
  extraction: Extraction;
};

const REFERENCE_ENTRIES: ReferenceEntry[] = [
  {
    filename: "ceiling-collapse-at-ut-austin-s-norman-hackerman-building-prompts-evacuation.jpg",
    mode: "fix",
    text: "norman hackerman building ceiling collapsed room unusable december 24 2025 1pm careful evacuation",
    extraction: normalizeExtraction("fix", {
      issue_type: "broken furniture",
      summary:
        "Ceiling collapsed in the Norman Hackerman building and the room is unusable. Please avoid the area until resolved.",
      likely_location: "Norman Hackerman Building",
      urgency: "high",
      suggested_team: resolveTeamFromIssue("broken furniture"),
      confidence: 0.92,
      needs_user_confirmation: true,
    }),
  },
  {
    filename: "first-50-free-food-playabowl.jpg",
    mode: "signal",
    text: "free acai bowls first 50 people line mlk location 8am onwards february 28 2026",
    extraction: normalizeExtraction("signal", {
      title: "Free acai bowls at MLK location",
      summary:
        "First 50 people in line at the MLK location can get free acai bowls starting at 8:00 AM.",
      likely_location: "MLK location",
      expiration_time: "February 28, 2026 8:00 AM onwards",
      confidence: 0.91,
      needs_user_confirmation: true,
    }),
  },
  {
    filename: "free-boba.jpg",
    mode: "signal",
    text: "free boba outside mccombs north entrance between 1pm 2pm students january 23 2025",
    extraction: normalizeExtraction("signal", {
      title: "Free boba outside McCombs North Entrance",
      summary:
        "Free boba is being offered outside the McCombs North Entrance for all students between 1:00 PM and 2:00 PM.",
      likely_location: "McCombs North Entrance",
      expiration_time: "January 23, 2025 2:00 PM",
      confidence: 0.92,
      needs_user_confirmation: true,
    }),
  },
  {
    filename: "free-candy-snacks.jpg",
    mode: "signal",
    text: "free swedish snacks speedway between 4pm 5pm monday february 22 2026",
    extraction: normalizeExtraction("signal", {
      title: "Free Swedish snacks on Speedway",
      summary:
        "Free Swedish snacks are available on Speedway between 4:00 PM and 5:00 PM.",
      likely_location: "Speedway",
      expiration_time: "Monday, February 22, 2026 5:00 PM",
      confidence: 0.89,
      needs_user_confirmation: true,
    }),
  },
  {
    filename: "Why is there a hole in Dean Keeton _ r_UTAustin.png",
    mode: "fix",
    text: "huge pothole dean keeton near ut law school avoid driving bikes march 4 2026 3pm unresolved",
    extraction: normalizeExtraction("fix", {
      issue_type: normalizeIssueType("pothole road hazard"),
      summary:
        "Large pothole on Dean Keeton near UT Law School. Cars and bikes should avoid the area until repaired.",
      likely_location: "Dean Keeton near UT Law School",
      urgency: "high",
      suggested_team: resolveTeamFromIssue(normalizeIssueType("pothole road hazard")),
      confidence: 0.93,
      needs_user_confirmation: true,
    }),
  },
  {
    filename: "Dim_Lights_PCL.jpeg",
    mode: "fix",
    text: "dim lights pcl library second floor flickering not suitable studying march 2 2026 4pm",
    extraction: normalizeExtraction("fix", {
      issue_type: normalizeIssueType("dim lights flickering"),
      summary:
        "Lights are dim and flickering on the 2nd floor of PCL Library, making the study area unsuitable.",
      likely_location: "PCL Library 2nd floor",
      urgency: "high",
      suggested_team: resolveTeamFromIssue(normalizeIssueType("dim lights flickering")),
      confidence: 0.92,
      needs_user_confirmation: true,
    }),
  },
  {
    filename: "clogged_toilet.jpg",
    mode: "fix",
    text: "toilets pcl out of order repeatedly clogged since 3pm today restroom unusable overflow risk",
    extraction: normalizeExtraction("fix", {
      issue_type: normalizeIssueType("cleanliness clogged toilet"),
      summary:
        "Toilets in PCL have been out of order and repeatedly clogged since 3:00 PM today. Restroom service is needed.",
      likely_location: "PCL restrooms",
      urgency: "high",
      suggested_team: resolveTeamFromIssue(normalizeIssueType("cleanliness clogged toilet")),
      confidence: 0.95,
      needs_user_confirmation: true,
    }),
  },
  {
    filename: "I-35 Fire Near UT Austin.jpeg",
    mode: "signal",
    text: "large fire i35 near ut austin heavy smoke active fire trucks avoid area road impacts emergency response",
    extraction: normalizeExtraction("signal", {
      title: "Large fire near UT Austin on I-35",
      summary:
        "There is a major fire with heavy smoke near I-35 by UT Austin. Avoid the area and expect traffic disruptions.",
      likely_location: "I-35 near UT Austin",
      expiration_time: "Today, 11:59 PM",
      confidence: 0.9,
      needs_user_confirmation: true,
    }),
  },
  {
    filename: "power-socket-pcl-floor3-broken.jpg",
    mode: "fix",
    text: "broken power socket pcl floor 3 outlet not usable students cannot charge devices electrical maintenance needed",
    extraction: normalizeExtraction("fix", {
      issue_type: normalizeIssueType("lighting / electrical"),
      summary:
        "A power outlet on PCL floor 3 appears damaged and unusable for charging devices. Electrical maintenance is needed.",
      likely_location: "PCL floor 3",
      urgency: "medium",
      suggested_team: resolveTeamFromIssue(normalizeIssueType("lighting / electrical")),
      confidence: 0.93,
      needs_user_confirmation: true,
    }),
  },
];

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
  "get",
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

  for (const [key, value] of b.entries()) {
    bNorm += value * value;
    dot += value * (a.get(key) ?? 0);
  }

  if (aNorm === 0 || bNorm === 0) {
    return 0;
  }

  return dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm));
}

function buildQueryText(input: MatchInput): string {
  return [input.imageName, input.notes, input.caption]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(" ");
}

export function matchReferenceEmbedding(input: MatchInput): ReferenceMatch | null {
  if (!input.imageName && !input.caption) {
    return null;
  }

  const queryText = buildQueryText(input);
  if (!queryText.trim()) {
    return null;
  }

  const queryVector = toTermFrequency(tokenize(queryText));
  const candidates = REFERENCE_ENTRIES.filter((entry) => entry.mode === input.mode);
  let best: { score: number; entry: ReferenceEntry } | null = null;

  for (const entry of candidates) {
    const entryVector = toTermFrequency(tokenize(`${entry.filename} ${entry.text}`));
    const score = cosineSimilarity(queryVector, entryVector);
    if (!best || score > best.score) {
      best = { score, entry };
    }
  }

  if (!best || best.score < 0.21) {
    return null;
  }

  return {
    score: best.score,
    entry: best.entry,
    extraction: best.entry.extraction,
  };
}
