import assert from "node:assert/strict";
import test from "node:test";

import { analyzeSubmission } from "../lib/ai";
import { buildLocationHint } from "../lib/location-hints";
import { normalizeIssueType, resolveTeamFromIssue } from "../lib/routing";
import {
  normalizeFixExtraction,
  normalizeSignalExtraction,
} from "../lib/types";

test("fix extraction falls back to safe defaults", () => {
  const extraction = normalizeFixExtraction({
    issue_type: "Broken chair",
    confidence: 3,
    urgency: "critical",
  });

  assert.equal(extraction.issue_type, "broken furniture");
  assert.equal(extraction.urgency, "medium");
  assert.equal(extraction.confidence, 1);
  assert.equal(extraction.likely_location, "Needs confirmation");
  assert.equal(extraction.suggested_team, "Facilities");
});

test("signal extraction clamps empty fields into demo-safe values", () => {
  const extraction = normalizeSignalExtraction({
    title: "",
    summary: "",
    confidence: -2,
  });

  assert.equal(extraction.title, "Campus update ready to publish");
  assert.equal(extraction.summary.includes("Useful campus update"), true);
  assert.equal(extraction.confidence, 0);
  assert.equal(extraction.expiration_time, "Needs confirmation");
});

test("routing maps fix categories to the expected teams", () => {
  assert.equal(normalizeIssueType("broken desk"), "broken furniture");
  assert.equal(resolveTeamFromIssue("wifi / internet"), "Network Services");
  assert.equal(normalizeIssueType("mystery"), "unknown");
});

test("analysis uses seeded fallback when no live model is configured", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const response = await analyzeSubmission({
    mode: "fix",
    exampleId: "fix-charger",
  });

  assert.equal(response.source, "fallback");
  assert.equal(response.extraction.mode, "fix");
  assert.equal(response.extraction.issue_type, "charger station / computer issue");
  assert.equal(response.extraction.likely_location, "PCL first floor study area");
  assert.equal(response.locationHint?.label, "PCL study area");
  assert.equal(response.workflowLabels.includes("Validation Skill"), true);

  if (previousKey) {
    process.env.OPENAI_API_KEY = previousKey;
  }
});

test("metadata coordinates resolve to a campus landmark hint", () => {
  const hint = buildLocationHint({
    latitude: 30.28604,
    longitude: -97.7414,
    source: "exif",
  });

  assert.equal(hint?.label, "Texas Union");
  assert.equal(hint?.precision, "landmark");
  assert.equal(hint?.openStreetMapEmbedUrl.includes("openstreetmap.org"), true);
});

test("analysis uses uploaded metadata as location hint for weak fallback output", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const response = await analyzeSubmission({
    mode: "signal",
    notes: "Free pizza table",
    photoMetadata: {
      latitude: 30.28604,
      longitude: -97.7414,
      source: "exif",
    },
  });

  assert.equal(response.source, "fallback");
  assert.equal(response.extraction.likely_location, "Texas Union");
  assert.equal(response.locationHint?.source, "exif");

  if (previousKey) {
    process.env.OPENAI_API_KEY = previousKey;
  }
});
