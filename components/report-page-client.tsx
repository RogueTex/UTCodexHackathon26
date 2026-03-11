"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChangeEvent, useMemo, useState } from "react";

import { MODE_COPY, Mode, PRODUCT_STATEMENT } from "@/lib/bevofix";
import { DEMO_EXAMPLES } from "@/lib/demo-fixtures";
import { PhotoMetadata, buildLocationHint } from "@/lib/location-hints";
import { AnalyzeResponse } from "@/lib/types";

type StoredDraft = AnalyzeResponse & {
  imagePreview?: string;
  imageName?: string;
  exampleId?: string;
  notes?: string;
  photoMetadata?: PhotoMetadata;
  analyzedAt: string;
};

type Props = {
  mode: Mode;
};

const storageKey = (mode: Mode) => `bevofix:draft:${mode}`;

export function ReportPageClient({ mode }: Props) {
  const router = useRouter();
  const copy = MODE_COPY[mode];
  const examples = useMemo(
    () => DEMO_EXAMPLES.filter((example) => example.mode === mode),
    [mode],
  );
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
        setPhotoMetadata({
          latitude,
          longitude,
          capturedAt: parsed?.DateTimeOriginal
            ? new Date(parsed.DateTimeOriginal).toISOString()
            : undefined,
          source: "exif",
        });
      } else {
        setPhotoMetadata(undefined);
      }
    } catch {
      setPhotoMetadata(undefined);
    }
  }

  function chooseExample(exampleId: string, imagePath: string) {
    const example = DEMO_EXAMPLES.find((item) => item.id === exampleId);
    setSelectedExampleId(exampleId);
    setPreviewUrl(imagePath);
    setImageDataUrl(undefined);
    setImageName(undefined);
    setPhotoMetadata(example?.photoMetadata);
    setError(undefined);
  }

  async function runAnalysis() {
    if (!previewUrl && !selectedExampleId) {
      setError("Add a photo or choose a seeded demo example first.");
      return;
    }

    setLoading(true);
    setError(undefined);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode,
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
      const draft: StoredDraft = {
        ...payload,
        imagePreview: previewUrl,
        imageName,
        exampleId: selectedExampleId,
        notes,
        photoMetadata,
        analyzedAt: new Date().toISOString(),
      };
      sessionStorage.setItem(storageKey(mode), JSON.stringify(draft));
      router.push(`/review/${mode}`);
    } catch {
      setError("Analysis failed. Use a seeded example or try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`page mode-pane ${mode}`}>
      <section className="panel">
        <div className="mode-header">
          <div>
            <span className="eyebrow">{copy.label}</span>
            <h1 className="panel-title">{copy.headline}</h1>
            <p className="lede">{copy.description}</p>
          </div>
          <span className="mode-pill">{copy.label}</span>
        </div>
        <div className="stack">
          <span>
            <strong>Product framing</strong> {PRODUCT_STATEMENT}
          </span>
        </div>
      </section>

      <section className="workbench-grid section-block">
        <div className="panel">
          <span className="eyebrow">1. Upload photo</span>
          <h2 className="panel-title">Start with one clear campus photo</h2>
          <p className="supporting-copy">
            Keep the flow simple: one photo, optional context, then AI analysis.
          </p>

          <div className="upload-area section-block">
            <label className="field-label" htmlFor="photo-upload">
              Upload image
            </label>
            <input
              id="photo-upload"
              className="upload-input"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>

          <div className="section-block">
            <label className="field-label" htmlFor="notes">
              Optional student context
            </label>
            <textarea
              id="notes"
              className="textarea"
              placeholder={
                mode === "fix"
                  ? "Example: Charger spot near the window is not working."
                  : "Example: Free pizza in the Union until 2 PM."
              }
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          <div className="section-block">
            <div className="analysis-card">
              <strong>Photo metadata location hint</strong>
              <p className="supporting-copy">
                {photoMetadata
                  ? `GPS metadata detected. BevoFix can use it as a review-only location hint.`
                  : "No GPS metadata detected yet. The app will safely fall back to manual confirmation."}
              </p>
              {photoMetadata ? (
                <div className="chips">
                  <span className="chip">
                    {buildLocationHint(photoMetadata)?.label ?? "Coordinates detected"}
                  </span>
                  <span className="chip">
                    {photoMetadata.latitude.toFixed(5)}, {photoMetadata.longitude.toFixed(5)}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="section-block">
            <span className="field-label">Seeded demo examples</span>
            <div className="example-grid">
              {examples.map((example) => (
                <button
                  type="button"
                  key={example.id}
                  className={`example-card ${selectedExampleId === example.id ? "active" : ""}`}
                  onClick={() => chooseExample(example.id, example.imagePath)}
                >
                  <Image
                    src={example.imagePath}
                    alt={example.title}
                    width={240}
                    height={180}
                  />
                  <div style={{ textAlign: "left" }}>
                    <strong>{example.title}</strong>
                    <p className="supporting-copy">{example.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="panel">
          <span className="eyebrow">2. Analyze with Codex workflows</span>
          <h2 className="panel-title">AI turns the photo into structured action</h2>
          <div className="chips">
            <span className="skill-pill">Triage Skill</span>
            <span className="skill-pill">Extraction Skill</span>
            <span className="skill-pill">Validation Skill</span>
          </div>

          <div className="preview-frame">
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt="Upload preview"
                width={800}
                height={600}
                unoptimized={previewUrl.startsWith("data:")}
              />
            ) : (
              <div className="preview-placeholder">
                Choose an image or a seeded example to generate the review draft.
              </div>
            )}
          </div>

          <div className="section-block">
            <button
              type="button"
              className={`cta ${mode === "fix" ? "fix" : "signal"}`}
              onClick={runAnalysis}
              disabled={loading}
            >
              {loading ? "Analyzing..." : "Run AI analysis"}
            </button>
          </div>

          <div className="analysis-card section-block">
            <strong>What happens next</strong>
            <div className="kv-list section-block">
              <div className="kv-row">
                <span className="kv-key">Extract</span>
                <span className="kv-value">Structured fields from the photo</span>
              </div>
              <div className="kv-row">
                <span className="kv-key">Validate</span>
                <span className="kv-value">Safe defaults and confidence clamp</span>
              </div>
              <div className="kv-row">
                <span className="kv-key">Review</span>
                <span className="kv-value">Student edits before submission</span>
              </div>
            </div>
          </div>

          {error ? (
            <div className="banner warning section-block">
              <strong>Analysis blocked.</strong> {error}
            </div>
          ) : null}
        </aside>
      </section>
    </div>
  );
}
