"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { LocationHint, PhotoMetadata } from "@/lib/location-hints";
import { MODE_COPY, Mode } from "@/lib/bevofix";
import {
  AnalysisSource,
  FixExtraction,
  SignalExtraction,
} from "@/lib/types";

type BaseDraft = {
  source: AnalysisSource;
  workflowLabels: string[];
  notice?: string;
  locationHint?: LocationHint;
  imagePreview?: string;
  imageName?: string;
  exampleId?: string;
  notes?: string;
  photoMetadata?: PhotoMetadata;
  analyzedAt: string;
};

type FixDraft = BaseDraft & {
  extraction: FixExtraction;
};

type SignalDraft = BaseDraft & {
  extraction: SignalExtraction;
};

type StoredDraft = FixDraft | SignalDraft;

type Props = {
  mode: Mode;
};

const storageKey = (mode: Mode) => `bevofix:draft:${mode}`;

export function ReviewPageClient({ mode }: Props) {
  const router = useRouter();
  const copy = MODE_COPY[mode];
  const [draft, setDraft] = useState<StoredDraft | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const raw = sessionStorage.getItem(storageKey(mode));
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as StoredDraft;
      setDraft(parsed);
    } catch {
      setDraft(null);
    }
  }, [mode]);

  const confidencePercent = useMemo(() => {
    if (!draft) {
      return 0;
    }
    return Math.round(draft.extraction.confidence * 100);
  }, [draft]);

  const fixExtraction =
    draft?.extraction.mode === "fix" ? draft.extraction : null;
  const signalExtraction =
    draft?.extraction.mode === "signal" ? draft.extraction : null;
  const locationHint = draft?.locationHint as LocationHint | undefined;

  function updateField(field: string, value: string | number | boolean) {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        extraction: {
          ...current.extraction,
          [field]: value,
        },
      } as StoredDraft;
    });
  }

  async function submitDraft() {
    if (!draft || !confirmed) {
      setError("Review the fields and confirm submission first.");
      return;
    }

    setSubmitting(true);
    setError(undefined);

    try {
      const endpoint = mode === "fix" ? "/api/submit/fix" : "/api/submit/signal";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draft.extraction),
      });

      if (!response.ok) {
        throw new Error("Submit failed");
      }

      const payload = (await response.json()) as { id: string };
      sessionStorage.removeItem(storageKey(mode));
      router.push(`/dashboard?submitted=${mode}&id=${payload.id}`);
    } catch {
      setError("Submission failed. The local store was not updated.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!draft) {
    return (
      <div className={`page mode-pane ${mode}`}>
        <section className="panel">
          <span className="eyebrow">Review required</span>
          <h1 className="panel-title">No analysis draft is ready yet</h1>
          <p className="supporting-copy">
            Start in {copy.label} to upload a photo and generate the structured
            review draft first.
          </p>
          <div className="button-row section-block">
            <Link
              href={`/report/${mode}`}
              className={`cta ${mode === "fix" ? "fix" : "signal"}`}
            >
              Go to upload
            </Link>
            <Link href="/" className="ghost-button">
              Back to landing
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={`page mode-pane ${mode}`}>
      <section className="panel">
        <div className="mode-header">
          <div>
            <span className="eyebrow">3. Review before submission</span>
            <h1 className="panel-title">AI draft, student confirmed</h1>
            <p className="lede">
              Every AI field stays editable before BevoFix creates the final
              local action.
            </p>
          </div>
          <span className="confidence-pill">Confidence {confidencePercent}%</span>
        </div>
        <div className="chips">
          {draft.workflowLabels.map((label) => (
            <span key={label} className="skill-pill">
              {label}
            </span>
          ))}
        </div>
        {draft.notice ? (
          <div className="banner warning section-block">
            <strong>Demo-safe analysis.</strong> {draft.notice}
          </div>
        ) : null}
        {locationHint ? (
          <div className="banner success section-block">
            <strong>Photo metadata detected.</strong> BevoFix found a location
            hint and surfaced it for review instead of treating it as exact
            truth.
          </div>
        ) : null}
      </section>

      <section className="review-grid section-block">
        <div className="panel">
          <span className="eyebrow">Editable structured fields</span>
          <div className="form-stack section-block">
            {mode === "fix" && fixExtraction ? (
              <>
                <div>
                  <label className="field-label" htmlFor="issue_type">
                    Issue type
                  </label>
                  <select
                    id="issue_type"
                    className="select-input"
                    value={fixExtraction.issue_type}
                    onChange={(event) => updateField("issue_type", event.target.value)}
                  >
                    <option>broken furniture</option>
                    <option>lighting / electrical</option>
                    <option>water dispenser</option>
                    <option>charger station / computer issue</option>
                    <option>wifi / internet</option>
                    <option>cleanliness</option>
                    <option>unknown</option>
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor="summary">
                    Summary
                  </label>
                  <textarea
                    id="summary"
                    className="textarea"
                    value={fixExtraction.summary}
                    onChange={(event) => updateField("summary", event.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="location">
                    Likely location
                  </label>
                  <input
                    id="location"
                    className="text-input"
                    value={fixExtraction.likely_location}
                    onChange={(event) =>
                      updateField("likely_location", event.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="urgency">
                    Urgency
                  </label>
                  <select
                    id="urgency"
                    className="select-input"
                    value={fixExtraction.urgency}
                    onChange={(event) => updateField("urgency", event.target.value)}
                  >
                    <option>low</option>
                    <option>medium</option>
                    <option>high</option>
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor="team">
                    Suggested team
                  </label>
                  <input
                    id="team"
                    className="text-input"
                    value={fixExtraction.suggested_team}
                    onChange={(event) =>
                      updateField("suggested_team", event.target.value)
                    }
                  />
                </div>
              </>
            ) : null}

            {mode === "signal" && signalExtraction ? (
              <>
                <div>
                  <label className="field-label" htmlFor="title">
                    Title
                  </label>
                  <input
                    id="title"
                    className="text-input"
                    value={signalExtraction.title}
                    onChange={(event) => updateField("title", event.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="summary">
                    Summary
                  </label>
                  <textarea
                    id="summary"
                    className="textarea"
                    value={signalExtraction.summary}
                    onChange={(event) => updateField("summary", event.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="location">
                    Likely location
                  </label>
                  <input
                    id="location"
                    className="text-input"
                    value={signalExtraction.likely_location}
                    onChange={(event) =>
                      updateField("likely_location", event.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="expiration_time">
                    Expiration time
                  </label>
                  <input
                    id="expiration_time"
                    className="text-input"
                    value={signalExtraction.expiration_time}
                    onChange={(event) =>
                      updateField("expiration_time", event.target.value)
                    }
                  />
                </div>
              </>
            ) : null}

            <div>
              <label className="field-label" htmlFor="confidence">
                Confidence
              </label>
              <input
                id="confidence"
                className="text-input"
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={draft.extraction.confidence}
                onChange={(event) =>
                  updateField("confidence", Number(event.target.value))
                }
              />
            </div>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              I reviewed the AI fields and want BevoFix to create the local
              {mode === "fix" ? " ticket" : " signal"}.
            </label>
          </div>
        </div>

        <aside className="panel">
          <span className="eyebrow">Submission preview</span>
          <h2 className="panel-title">
            {mode === "fix" ? "Local service ticket" : "Campus signal post"}
          </h2>

          <div className="preview-frame">
            {draft.imagePreview ? (
              <Image
                src={draft.imagePreview}
                alt="Draft preview"
                width={800}
                height={600}
                unoptimized={draft.imagePreview.startsWith("data:")}
              />
            ) : (
              <div className="preview-placeholder">No image preview available.</div>
            )}
          </div>

          <div className="analysis-card section-block">
            <div className="kv-list">
              {locationHint ? (
                <>
                  <div className="kv-row">
                    <span className="kv-key">Metadata hint</span>
                    <span className="kv-value">{locationHint.label}</span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-key">Coordinates</span>
                    <span className="kv-value">
                      {locationHint.latitude.toFixed(5)}, {locationHint.longitude.toFixed(5)}
                    </span>
                  </div>
                </>
              ) : null}
              <div className="kv-row">
                <span className="kv-key">Analysis source</span>
                <span className="kv-value">{draft.source}</span>
              </div>
              <div className="kv-row">
                <span className="kv-key">Needs confirmation</span>
                <span className="kv-value">
                  {draft.extraction.needs_user_confirmation ? "Yes" : "No"}
                </span>
              </div>
              <div className="kv-row">
                <span className="kv-key">Mode</span>
                <span className="kv-value">{copy.label}</span>
              </div>
            </div>
          </div>

          {locationHint ? (
            <div className="analysis-card section-block">
              <div className="mode-header">
                <div>
                  <span className="eyebrow">OpenStreetMap pin view</span>
                  <h3 className="panel-title" style={{ fontSize: "1.5rem" }}>
                    Metadata-based location preview
                  </h3>
                </div>
                <a
                  href={locationHint.openStreetMapLinkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="link-text"
                >
                  Open larger map
                </a>
              </div>
              <div className="map-frame section-block">
                <iframe
                  title="OpenStreetMap preview"
                  src={locationHint.openStreetMapEmbedUrl}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <p className="supporting-copy">
                This pin is a soft hint from photo metadata. The editable
                location field above remains the final source of truth.
              </p>
            </div>
          ) : null}

          <div className="button-row section-block">
            <button
              type="button"
              className={`cta ${mode === "fix" ? "fix" : "signal"}`}
              onClick={submitDraft}
              disabled={submitting}
            >
              {submitting
                ? "Submitting..."
                : mode === "fix"
                  ? "Create local ticket"
                  : "Publish local signal"}
            </button>
            <Link href={`/report/${mode}`} className="ghost-button">
              Back to analyze
            </Link>
          </div>

          {error ? (
            <div className="banner warning section-block">
              <strong>Submission blocked.</strong> {error}
            </div>
          ) : null}
        </aside>
      </section>
    </div>
  );
}
