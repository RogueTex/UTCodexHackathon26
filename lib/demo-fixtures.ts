import { Mode } from "@/lib/bevofix";

export const DEMO_EXAMPLES = [
  {
    id: "fix-charger",
    mode: "fix" as Mode,
    title: "Broken charger station",
    description: "PCL study area charger spot with a dead screen and loose cable.",
    imagePath: "/demo/fix-charger.svg",
    photoMetadata: {
      latitude: 30.28282,
      longitude: -97.73812,
      source: "seeded-demo" as const,
    },
    fallbackExtraction: {
      mode: "fix",
      issue_type: "charger station / computer issue",
      summary:
        "Charging station is not powering devices and the kiosk screen appears unresponsive.",
      likely_location: "PCL first floor study area",
      urgency: "medium",
      suggested_team: "IT Support",
      confidence: 0.9,
      needs_user_confirmation: true,
    },
  },
  {
    id: "signal-pizza",
    mode: "signal" as Mode,
    title: "Free pizza pop-up",
    description: "Free pizza sign outside the Union until 2 PM.",
    imagePath: "/demo/signal-pizza.svg",
    photoMetadata: {
      latitude: 30.28605,
      longitude: -97.74142,
      source: "seeded-demo" as const,
    },
    fallbackExtraction: {
      mode: "signal",
      title: "Free pizza at the Union",
      summary:
        "Student org table has free pizza available near the Union while supplies last.",
      likely_location: "Texas Union south entrance",
      expiration_time: "Today, 2:00 PM",
      confidence: 0.92,
      needs_user_confirmation: true,
    },
  },
] as const;

export function getExampleById(exampleId: string | undefined) {
  return DEMO_EXAMPLES.find((example) => example.id === exampleId);
}
