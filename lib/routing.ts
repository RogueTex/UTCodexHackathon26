export const ISSUE_TYPES = [
  "broken furniture",
  "lighting / electrical",
  "water dispenser",
  "charger station / computer issue",
  "wifi / internet",
  "cleanliness",
  "unknown",
] as const;

export type IssueType = (typeof ISSUE_TYPES)[number];

export const ISSUE_TEAM_MAP: Record<IssueType, string> = {
  "broken furniture": "Facilities",
  "lighting / electrical": "Electrical Services",
  "water dispenser": "Facilities",
  "charger station / computer issue": "IT Support",
  "wifi / internet": "Network Services",
  cleanliness: "Custodial",
  unknown: "Campus Operations",
};

export function normalizeIssueType(value: string | undefined): IssueType {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) {
    return "unknown";
  }

  if (
    normalized.includes("chair") ||
    normalized.includes("desk") ||
    normalized.includes("furniture")
  ) {
    return "broken furniture";
  }

  if (
    normalized.includes("light") ||
    normalized.includes("electrical") ||
    normalized.includes("flicker")
  ) {
    return "lighting / electrical";
  }

  if (normalized.includes("water")) {
    return "water dispenser";
  }

  if (
    normalized.includes("charger") ||
    normalized.includes("computer") ||
    normalized.includes("monitor")
  ) {
    return "charger station / computer issue";
  }

  if (normalized.includes("wifi") || normalized.includes("internet")) {
    return "wifi / internet";
  }

  if (
    normalized.includes("trash") ||
    normalized.includes("clean") ||
    normalized.includes("spill")
  ) {
    return "cleanliness";
  }

  return ISSUE_TYPES.find((issueType) => issueType === normalized) ?? "unknown";
}

export function resolveTeamFromIssue(issueType: IssueType): string {
  return ISSUE_TEAM_MAP[issueType];
}

