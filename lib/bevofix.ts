export const PRODUCT_NAME = "BevoFix";
export const PRODUCT_STATEMENT =
  "BevoFix is a campus AI triage platform that turns student photos into action.";
export const PRODUCT_TAGLINE = "Turn student photos into campus action.";
export const PRODUCT_CLOSING =
  "BevoFix helps students leave campus better than they found it.";

export const MODES = ["fix", "signal"] as const;
export type Mode = (typeof MODES)[number];

export const MODE_COPY: Record<
  Mode,
  {
    label: string;
    headline: string;
    description: string;
    primaryCta: string;
    accent: string;
  }
> = {
  fix: {
    label: "Fix Mode",
    headline: "Report campus issues to campus services.",
    description:
      "Turn a photo of a broken charger, flickering light, broken chair, or water dispenser into a routed mock service ticket.",
    primaryCta: "Start Fix Mode",
    accent: "fix",
  },
  signal: {
    label: "Signal Mode",
    headline: "Share useful campus announcements.",
    description:
      "Turn a photo of free pizza, open seating, or a pop-up event into a local campus feed update.",
    primaryCta: "Start Signal Mode",
    accent: "signal",
  },
};

export function isMode(value: string): value is Mode {
  return MODES.includes(value as Mode);
}

