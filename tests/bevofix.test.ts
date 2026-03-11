import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { POST as submitAssistant } from "../app/api/submit/assistant/route";
import { analyzeSubmission } from "../lib/ai";
import { buildLocationHint } from "../lib/location-hints";
import { normalizeIssueType, resolveTeamFromIssue } from "../lib/routing";
import { getDashboardData } from "../lib/store";
import {
  draftToFixExtraction,
  draftToSignalExtraction,
  normalizeAssistantDraft,
  normalizeFixExtraction,
  normalizeSignalExtraction,
  withManualLocation,
} from "../lib/types";

const storagePath = path.join(process.cwd(), "storage", "bevofix-store.json");

async function withTemporaryStore(run: () => Promise<void>) {
  let previousStore: string | null = null;

  await mkdir(path.dirname(storagePath), { recursive: true });

  try {
    previousStore = await readFile(storagePath, "utf8");
  } catch {
    previousStore = null;
  }

  await writeFile(
    storagePath,
    JSON.stringify({ tickets: [], signals: [] }, null, 2),
    "utf8",
  );

  try {
    await run();
  } finally {
    if (previousStore === null) {
      await writeFile(
        storagePath,
        JSON.stringify({ tickets: [], signals: [] }, null, 2),
        "utf8",
      );
    } else {
      await writeFile(storagePath, previousStore, "utf8");
    }
  }
}

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

test("assistant draft normalizes shared defaults and tags", () => {
  const draft = normalizeAssistantDraft({
    detected_type: "signal",
    summary: "",
    title: "Free pizza in the Union",
    tags: [],
    location: { text: "" },
  });

  assert.equal(draft.detected_type, "broadcast");
  assert.equal(draft.location.text, "Needs confirmation");
  assert.equal(draft.location.confidence, "Needs confirmation");
  assert.equal(draft.tags.includes("free food"), true);
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
  assert.equal(response.draft.detected_type, "issue");
  assert.equal(response.draft.suggested_issue_type, "charger station / computer issue");
  assert.equal(response.draft.location.text, "PCL first floor study area");
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
    notes: "Free pizza table",
    photoMetadata: {
      latitude: 30.28604,
      longitude: -97.7414,
      source: "exif",
    },
  });

  assert.equal(response.source, "fallback");
  assert.equal(response.draft.location.text, "Texas Union");
  assert.equal(response.draft.location.source, "metadata");
  assert.equal(response.locationHint?.source, "exif");

  if (previousKey) {
    process.env.OPENAI_API_KEY = previousKey;
  }
});

test("manual location override changes provenance without breaking conversions", () => {
  const draft = withManualLocation(
    normalizeAssistantDraft({
      detected_type: "issue",
      summary: "Broken chair by the window.",
      suggested_issue_type: "broken furniture",
      suggested_team: "Facilities",
      suggested_title: "Broken chair alert",
      suggested_expiration_time: "Today, 6:00 PM",
      location: {
        text: "PCL",
        source: "metadata",
        confidence: "Exact metadata",
      },
    }),
    "PCL second floor by the window",
  );

  assert.equal(draft.location.source, "manual");
  assert.equal(draft.location.text, "PCL second floor by the window");
  assert.equal(draftToFixExtraction(draft).likely_location, draft.location.text);
  assert.equal(draftToSignalExtraction(draft).likely_location, draft.location.text);
});

test("assistant submit route creates linked records and newest-first forum feed", async () => {
  await withTemporaryStore(async () => {
    const request = new Request("http://localhost/api/submit/assistant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "both",
        draft: {
          detected_type: "issue",
          summary: "Broken charger and a useful status note for students.",
          captured_at: "2026-03-10T18:00:00.000Z",
          confidence: 0.88,
          needs_user_confirmation: true,
          suggested_issue_type: "charger station / computer issue",
          suggested_urgency: "medium",
          suggested_team: "IT Support",
          suggested_title: "Charging station offline in PCL",
          suggested_expiration_time: "Tonight, 10:00 PM",
          location: {
            text: "PCL first floor",
            source: "manual",
            confidence: "Estimated location",
          },
          tags: ["it", "study space"],
        },
        imagePreview: "data:image/png;base64,bevofix",
      }),
    });

    const response = await submitAssistant(request);
    const payload = (await response.json()) as {
      ticketId?: string;
      signalId?: string;
      linkedGroupId?: string;
    };
    const dashboard = await getDashboardData();

    assert.ok(payload.ticketId);
    assert.ok(payload.signalId);
    assert.ok(payload.linkedGroupId);
    assert.equal(dashboard.forum.length, 2);
    assert.equal(
      dashboard.forum
        .slice(0, 2)
        .every((item) => item.id === payload.ticketId || item.id === payload.signalId),
      true,
    );
    assert.equal(
      new Date(dashboard.forum[0].created_at).getTime() >=
        new Date(dashboard.forum[1].created_at).getTime(),
      true,
    );
    assert.equal(dashboard.tickets[0].linked_group_id, payload.linkedGroupId);
    assert.equal(dashboard.signals[0].linked_group_id, payload.linkedGroupId);
  });
});
