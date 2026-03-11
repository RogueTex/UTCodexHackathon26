"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useState } from "react";

import { assistantDraftStorageKey, StoredAssistantDraft } from "@/lib/assistant-flow";
import { Mode, PRODUCT_STATEMENT } from "@/lib/bevofix";
import { logMetadataEvent } from "@/lib/debug";
import { DEMO_EXAMPLES } from "@/lib/demo-fixtures";
import { PhotoMetadata, buildLocationHint } from "@/lib/location-hints";
import { AnalyzeResponse } from "@/lib/types";

type Props = {
  intent?: Mode;
};

const EXAMPLE_CHIPS = [
  { label: "Broken charger", exampleId: "fix-charger", notes: "Broken charger near the study tables." },
  { label: "Flickering light", notes: "Flickering light over a common study area." },
  { label: "Broken chair", notes: "Broken chair with a loose backrest in a study lounge." },
  { label: "Water dispenser issue", notes: "Water dispenser is leaking and the refill screen is blank." },
  { label: "Free pizza", exampleId: "signal-pizza", notes: "Free pizza at the Union until 2 PM." },
  { label: "Open study seating", notes: "Open study seating is available right now in the library." },
  { label: "Pop-up event", notes: "Pop-up campus event with student tables and signage." },
] as const;

export function ReportPageClient({ intent }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string>();
  const [imageName, setImageName] = useState<string>();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [selectedExampleId, setSelectedExampleId] = useState<string>();
  const [photoMetadata, setPhotoMetadata] = useState<PhotoMetadata>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : undefined;
      setImageDataUrl(result);
      setPreviewUrl(result);
      setImageName(file.name);
      setSelectedExampleId(undefined);
      setError(undefined);
    };
    reader.readAsDataURL(file);

    logMetadataEvent("file selected for EXIF parsing", {
      fileName: file.name,
      fileType: file.type,
      fileSizeBytes: file.size,
    });

    try {
      const exifr = await import("exifr");
      const parsed = (await exifr.parse(file, {
        gps: true,
        tiff: true,
        exif: true,
      })) as
        | {
            latitude?: number;
            longitude?: number;
            lat?: number;
            lon?: number;
            DateTimeOriginal?: string | Date;
          }
        | undefined;
      const latitude = parsed?.latitude ?? parsed?.lat;
      const longitude = parsed?.longitude ?? parsed?.lon;

      if (typeof latitude === "number" && typeof longitude === "number") {
        const metadata = {
          latitude,
          longitude,
          capturedAt: parsed?.DateTimeOriginal
            ? new Date(parsed.DateTimeOriginal).toISOString()
            : undefined,
          source: "exif",
        } satisfies PhotoMetadata;
        setPhotoMetadata(metadata);
        logMetadataEvent("gps metadata extracted from uploaded photo", {
          latitude: metadata.latitude,
          longitude: metadata.longitude,
          capturedAt: metadata.capturedAt,
          inferredLocation: buildLocationHint(metadata)?.label,
        });
      } else {
        setPhotoMetadata(undefined);
        logMetadataEvent("uploaded photo had no GPS metadata");
      }
    } catch (metadataError) {
      setPhotoMetadata(undefined);
      logMetadataEvent("exif parsing failed", {
        error:
          metadataError instanceof Error
            ? metadataError.message
            : String(metadataError),
      });
    }
  }

  function chooseExample(exampleId: string, nextNotes?: string) {
    const example = DEMO_EXAMPLES.find((item) => item.id === exampleId);
    if (!example) {
      return;
    }

    setSelectedExampleId(exampleId);
    setPreviewUrl(example.imagePath);
    setImageDataUrl(undefined);
    setImageName(undefined);
    setPhotoMetadata(example.photoMetadata);
    setNotes(nextNotes ?? example.description);
    setError(undefined);

    logMetadataEvent("seeded demo metadata selected", {
      exampleId,
      locationHint: buildLocationHint(example.photoMetadata)?.label,
      latitude: example.photoMetadata.latitude,
      longitude: example.photoMetadata.longitude,
    });
  }

  function applyExampleChip(label: string) {
    const chip = EXAMPLE_CHIPS.find((item) => item.label === label);
    if (!chip) {
      return;
    }

    if ("exampleId" in chip && chip.exampleId) {
      chooseExample(chip.exampleId, chip.notes);
      return;
    }

    setNotes(chip.notes);
    setError(undefined);
  }

  async function runAnalysis() {
    if (!previewUrl && !selectedExampleId) {
      setError("Upload a photo or pick a demo image before running analysis.");
      return;
    }

    setLoading(true);
    setError(undefined);

    try {
      logMetadataEvent("sending analyze request", {
        mode: intent,
        exampleId: selectedExampleId,
        hasPhotoMetadata: Boolean(photoMetadata),
        latitude: photoMetadata?.latitude,
        longitude: photoMetadata?.longitude,
      });

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: intent,
          imageDataUrl,
          imageName,
          notes,
          exampleId: selectedExampleId,
          photoMetadata,
        }),
      });

      if (!response.ok) {
        throw new Error("Analyze request failed");
      }

      const payload = (await response.json()) as AnalyzeResponse;
      logMetadataEvent("analyze response received", {
        source: payload.source,
        detectedType: payload.draft.detected_type,
        extractedLocation: payload.draft.location.text,
        metadataHint: payload.locationHint?.label,
      });

      const storedDraft: StoredAssistantDraft = {
        ...payload,
        imagePreview: previewUrl,
        imageName,
        exampleId: selectedExampleId,
        notes,
        photoMetadata,
        analyzedAt: new Date().toISOString(),
        preferredMode: intent,
      };

      sessionStorage.setItem(
        assistantDraftStorageKey,
        JSON.stringify(storedDraft),
      );
      router.push(intent ? `/review/${intent}` : "/review");
    } catch {
      setError("Analysis failed. Use a demo image or try another upload.");
    } finally {
      setLoading(false);
    }
  }

  const locationHint = photoMetadata ? buildLocationHint(photoMetadata) : undefined;

  return (
    <div className="assistant-page">
      <section className="assistant-layout">
        <div className="assistant-column">
          <div className="message-stack">
            <article className="message-card assistant-message">
              <div className="message-avatar">BF</div>
              <div className="message-body">
                <span className="eyebrow">BevoFix assistant</span>
                <h1>Upload a campus issue or useful campus update.</h1>
                <p>{PRODUCT_STATEMENT}</p>
                <div className="chip-row">
                  <span className="chip">Image upload first</span>
                  <span className="chip">Editable AI draft</span>
                  <span className="chip">Local-first demo flow</span>
                  {intent ? (
                    <span className="chip accent-chip">
                      Compatibility hint: {intent === "fix" ? "Issue flow" : "Forum flow"}
                    </span>
                  ) : null}
                </div>
              </div>
            </article>

            {previewUrl ? (
              <article className="message-card user-message">
                <div className="message-avatar">You</div>
                <div className="message-body">
                  <div className="message-media">
                    <Image
                      src={previewUrl}
                      alt="Campus upload preview"
                      width={880}
                      height={620}
                      unoptimized={previewUrl.startsWith("data:")}
                    />
                  </div>
                  <div className="message-meta">
                    <strong>{imageName ?? "Demo image selected"}</strong>
                    <span>{notes || "No extra context added yet."}</span>
                  </div>
                </div>
              </article>
            ) : null}
          </div>

          <section className="composer-card">
            <div className="composer-header">
              <div>
                <span className="eyebrow">Step 1</span>
                <h2>Start the BevoFix workflow</h2>
                <p>Upload one clear photo, add optional context, then let the assistant draft the next action.</p>
              </div>
              <Link href="/forum" className="ghost-button">
                View Open Forum
              </Link>
            </div>

            <div className="composer-grid">
              <div className="composer-main">
                <label className="upload-dropzone" htmlFor="photo-upload">
                  <span className="eyebrow">Primary action</span>
                  <strong>Upload campus photo</strong>
                  <span>Images stay local-first for this hackathon demo.</span>
                </label>
                <input
                  id="photo-upload"
                  className="sr-only"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />

                <div className="field-group">
                  <label className="field-label" htmlFor="notes">
                    Extra context
                  </label>
                  <textarea
                    id="notes"
                    className="text-area"
                    placeholder="Upload a campus issue or useful campus update."
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </div>

                <div className="field-group">
                  <span className="field-label">Example prompts</span>
                  <div className="chip-row">
                    {EXAMPLE_CHIPS.map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        className="chip-button"
                        onClick={() => applyExampleChip(chip.label)}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="composer-actions">
                  <button
                    type="button"
                    className="cta"
                    onClick={runAnalysis}
                    disabled={loading}
                  >
                    {loading ? "Analyzing..." : "Run BevoFix analysis"}
                  </button>
                  <span className="hint-text">
                    The assistant will extract fields, show confidence, then let you choose the final action.
                  </span>
                </div>
              </div>

              <div className="composer-side">
                <div className="support-card">
                  <span className="eyebrow">Location workflow</span>
                  <h3>Best-available location</h3>
                  <p>
                    {photoMetadata
                      ? "BevoFix found photo metadata and will surface it as a review hint, not as exact truth."
                      : "No metadata yet. The review step will keep location editable and honest."}
                  </p>
                  {locationHint ? (
                    <div className="chip-row">
                      <span className="chip">{locationHint.label}</span>
                      <span className="chip">Exact metadata</span>
                    </div>
                  ) : (
                    <div className="chip-row">
                      <span className="chip">Needs confirmation</span>
                    </div>
                  )}
                </div>

                <div className="support-card">
                  <span className="eyebrow">Demo images</span>
                  <div className="demo-example-list">
                    {DEMO_EXAMPLES.map((example) => (
                      <button
                        type="button"
                        key={example.id}
                        className={`demo-example-card ${selectedExampleId === example.id ? "active" : ""}`}
                        onClick={() => chooseExample(example.id)}
                      >
                        <Image
                          src={example.imagePath}
                          alt={example.title}
                          width={220}
                          height={160}
                        />
                        <div>
                          <strong>{example.title}</strong>
                          <p>{example.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="support-card">
                  <span className="eyebrow">Visible Codex workflows</span>
                  <div className="workflow-list">
                    <span className="chip">Extraction</span>
                    <span className="chip">Routing</span>
                    <span className="chip">Publishing</span>
                    <span className="chip">Location</span>
                    <span className="chip">Validation</span>
                  </div>
                </div>
              </div>
            </div>

            {error ? (
              <div className="banner warning">
                <strong>Analysis blocked.</strong> {error}
              </div>
            ) : null}
          </section>
        </div>

        <aside className="assistant-rail">
          <div className="rail-card">
            <span className="eyebrow">Demo flow</span>
            <ol className="step-list">
              <li>Upload a campus photo</li>
              <li>Review the assistant draft</li>
              <li>Report it, broadcast it, or do both</li>
              <li>See the result in the Open Forum</li>
            </ol>
          </div>

          <div className="rail-card">
            <span className="eyebrow">Tonight&apos;s guardrails</span>
            <p>No auth, no real integrations, no malformed AI output reaching the UI.</p>
          </div>
        </aside>
      </section>
    </div>
  );
}
