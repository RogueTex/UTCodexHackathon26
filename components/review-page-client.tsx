"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { LocationDisplay } from "@/components/location-display";
import { assistantDraftStorageKey, StoredAssistantDraft } from "@/lib/assistant-flow";
import { Mode } from "@/lib/bevofix";
import {
  AssistantAction,
  AssistantDraft,
  AssistantSubmissionResponse,
  withManualLocation,
} from "@/lib/types";

type Props = {
  preferredMode?: Mode;
};

const ISSUE_TYPES = [
  "broken furniture",
  "lighting / electrical",
  "water dispenser",
  "charger station / computer issue",
  "wifi / internet",
  "cleanliness",
  "unknown",
] as const;

const ACTION_COPY: Record<
  AssistantAction,
  { title: string; description: string; tone: string }
> = {
  issue: {
    title: "Report as Issue",
    description: "Send the structured report into the local service queue.",
    tone: "issue",
  },
  forum: {
    title: "Broadcast to Forum",
    description: "Publish the observation as a useful campus update.",
    tone: "forum",
  },
  both: {
    title: "Do Both",
    description: "Create linked issue and forum records in one step.",
    tone: "both",
  },
};

function toSuggestedAction(mode: Mode | undefined): AssistantAction | undefined {
  if (mode === "fix") {
    return "issue";
  }
  if (mode === "signal") {
    return "forum";
  }
  return undefined;
}

export function ReviewPageClient({ preferredMode }: Props) {
  const router = useRouter();
  const [record, setRecord] = useState<StoredAssistantDraft | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState<AssistantAction | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const raw = sessionStorage.getItem(assistantDraftStorageKey);
    if (!raw) {
      setRecord(null);
      return;
    }

    try {
      setRecord(JSON.parse(raw) as StoredAssistantDraft);
    } catch {
      setRecord(null);
    }
  }, []);

  function updateDraft(nextDraft: AssistantDraft) {
    setRecord((current) => (current ? { ...current, draft: nextDraft } : current));
  }

  function updateField<Field extends keyof AssistantDraft>(
    field: Field,
    value: AssistantDraft[Field],
  ) {
    setRecord((current) =>
      current
        ? {
            ...current,
            draft: {
              ...current.draft,
              [field]: value,
            },
          }
        : current,
    );
  }

  function updateLocation(text: string) {
    setRecord((current) =>
      current ? { ...current, draft: withManualLocation(current.draft, text) } : current,
    );
  }

  async function submitAction(action: AssistantAction) {
    if (!record || !confirmed) {
      setError("Review the draft and confirm before submitting.");
      return;
    }

    setSubmitting(action);
    setError(undefined);

    try {
      const response = await fetch("/api/submit/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          draft: record.draft,
          imagePreview: record.imagePreview,
        }),
      });

      if (!response.ok) {
        throw new Error("Submit failed");
      }

      const payload = (await response.json()) as AssistantSubmissionResponse;
      sessionStorage.removeItem(assistantDraftStorageKey);

      const params = new URLSearchParams({ submitted: payload.action });
      if (payload.ticketId) {
        params.set("ticketId", payload.ticketId);
      }
      if (payload.signalId) {
        params.set("signalId", payload.signalId);
      }
      if (payload.linkedGroupId) {
        params.set("linked", payload.linkedGroupId);
      }

      router.push(`/forum?${params.toString()}`);
    } catch {
      setError("Submission failed. The local forum was not updated.");
    } finally {
      setSubmitting(null);
    }
  }

  if (!record) {
    return (
      <div className="review-page">
        <section className="empty-panel">
          <span className="eyebrow">Review required</span>
          <h1>No BevoFix draft is ready yet.</h1>
          <p>Start from the upload-first assistant and generate an analysis draft first.</p>
          <div className="composer-actions">
            <Link href="/" className="cta">
              Go to assistant
            </Link>
            <Link href="/forum" className="ghost-button">
              Open Forum
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const draft = record.draft;
  const confidencePercent = Math.round(draft.confidence * 100);
  const recommendedAction =
    toSuggestedAction(preferredMode) ?? toSuggestedAction(record.preferredMode);

  return (
    <div className="review-page">
      <section className="review-hero">
        <div>
          <span className="eyebrow">Step 2</span>
          <h1>Review the assistant draft before BevoFix takes action.</h1>
          <p>
            The analysis stays editable. Fix Mode and Signal Mode now appear as downstream actions instead of entry screens.
          </p>
        </div>
        <div className="chip-row">
          <span className="chip">Detected {draft.detected_type}</span>
          <span className="chip">Confidence {confidencePercent}%</span>
          <span className="chip">Source {record.source}</span>
        </div>
      </section>

      <section className="conversation-thread">
        <article className="message-card user-message">
          <div className="message-avatar">You</div>
          <div className="message-body">
            {record.imagePreview ? (
              <div className="message-media">
                <Image
                  src={record.imagePreview}
                  alt="Uploaded campus photo"
                  width={880}
                  height={620}
                  unoptimized={record.imagePreview.startsWith("data:")}
                />
              </div>
            ) : null}
            <div className="message-meta">
              <strong>{record.imageName ?? "Campus photo"}</strong>
              <span>{record.notes || "No extra context provided."}</span>
            </div>
          </div>
        </article>

        <article className="message-card assistant-message">
          <div className="message-avatar">BF</div>
          <div className="message-body">
            <span className="eyebrow">Assistant analysis</span>
            <h2>{draft.detected_type === "issue" ? "Likely service issue" : "Likely campus broadcast"}</h2>
            <p>{draft.summary}</p>
            <div className="chip-row">
              {record.workflowLabels.map((label) => (
                <span key={label} className="chip">
                  {label}
                </span>
              ))}
            </div>
            {record.notice ? (
              <div className="banner warning">
                <strong>Demo-safe analysis.</strong> {record.notice}
              </div>
            ) : null}
          </div>
        </article>
      </section>

      <section className="review-layout">
        <div className="editor-column">
          <div className="editor-card">
            <div className="card-heading">
              <div>
                <span className="eyebrow">Shared fields</span>
                <h3>Editable extraction</h3>
              </div>
            </div>

            <div className="editor-grid">
              <div className="field-group">
                <label className="field-label" htmlFor="detected_type">
                  Detected type
                </label>
                <select
                  id="detected_type"
                  className="text-input"
                  value={draft.detected_type}
                  onChange={(event) =>
                    updateField("detected_type", event.target.value as AssistantDraft["detected_type"])
                  }
                >
                  <option value="issue">issue</option>
                  <option value="broadcast">broadcast</option>
                </select>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="captured_at">
                  Timestamp
                </label>
                <input
                  id="captured_at"
                  className="text-input"
                  value={draft.captured_at}
                  onChange={(event) => updateField("captured_at", event.target.value)}
                />
              </div>

              <div className="field-group full-width">
                <label className="field-label" htmlFor="summary">
                  Summary
                </label>
                <textarea
                  id="summary"
                  className="text-area"
                  value={draft.summary}
                  onChange={(event) => updateField("summary", event.target.value)}
                />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="location">
                  Likely location
                </label>
                <input
                  id="location"
                  className="text-input"
                  value={draft.location.text}
                  onChange={(event) => updateLocation(event.target.value)}
                />
              </div>

              <div className="field-group">
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
                  value={draft.confidence}
                  onChange={(event) =>
                    updateField("confidence", Number(event.target.value))
                  }
                />
              </div>
            </div>
          </div>

          <div className="dual-edit-grid">
            <div className="editor-card issue-card-surface">
              <div className="card-heading">
                <div>
                  <span className="eyebrow">Issue route</span>
                  <h3>Fix Mode fields</h3>
                </div>
                <span className="chip">Operational</span>
              </div>

              <div className="editor-grid">
                <div className="field-group">
                  <label className="field-label" htmlFor="issue_type">
                    Issue type
                  </label>
                  <select
                    id="issue_type"
                    className="text-input"
                    value={draft.suggested_issue_type}
                    onChange={(event) =>
                      updateField("suggested_issue_type", event.target.value)
                    }
                  >
                    {ISSUE_TYPES.map((issueType) => (
                      <option key={issueType} value={issueType}>
                        {issueType}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="issue_urgency">
                    Urgency
                  </label>
                  <select
                    id="issue_urgency"
                    className="text-input"
                    value={draft.suggested_urgency}
                    onChange={(event) =>
                      updateField(
                        "suggested_urgency",
                        event.target.value as AssistantDraft["suggested_urgency"],
                      )
                    }
                  >
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                  </select>
                </div>

                <div className="field-group full-width">
                  <label className="field-label" htmlFor="issue_team">
                    Suggested team
                  </label>
                  <input
                    id="issue_team"
                    className="text-input"
                    value={draft.suggested_team}
                    onChange={(event) =>
                      updateField("suggested_team", event.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            <div className="editor-card forum-card-surface">
              <div className="card-heading">
                <div>
                  <span className="eyebrow">Forum route</span>
                  <h3>Signal Mode fields</h3>
                </div>
                <span className="chip">Community</span>
              </div>

              <div className="editor-grid">
                <div className="field-group full-width">
                  <label className="field-label" htmlFor="signal_title">
                    Title
                  </label>
                  <input
                    id="signal_title"
                    className="text-input"
                    value={draft.suggested_title}
                    onChange={(event) =>
                      updateField("suggested_title", event.target.value)
                    }
                  />
                </div>

                <div className="field-group full-width">
                  <label className="field-label" htmlFor="signal_expiration">
                    Expiration
                  </label>
                  <input
                    id="signal_expiration"
                    className="text-input"
                    value={draft.suggested_expiration_time}
                    onChange={(event) =>
                      updateField("suggested_expiration_time", event.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="decision-column">
          <div className="support-card">
            <span className="eyebrow">Location workflow</span>
            <LocationDisplay location={draft.location} showMap />
            {draft.location.openStreetMapLinkUrl ? (
              <a
                href={draft.location.openStreetMapLinkUrl}
                target="_blank"
                rel="noreferrer"
                className="link-text"
              >
                Open larger map
              </a>
            ) : null}
          </div>

          <div className="support-card">
            <span className="eyebrow">Confirmation</span>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              I reviewed this draft and want BevoFix to create the final local action.
            </label>
            <p className="hint-text">
              Review is required. Manual location edits stay visible as manual, and fallback output remains editable.
            </p>
          </div>

          <div className="action-panel">
            <div className="card-heading">
              <div>
                <span className="eyebrow">Step 3</span>
                <h3>Choose the final action</h3>
              </div>
            </div>

            {(["issue", "forum", "both"] as const).map((action) => (
              <button
                key={action}
                type="button"
                className={`action-card ${ACTION_COPY[action].tone} ${recommendedAction === action ? "recommended" : ""}`}
                onClick={() => submitAction(action)}
                disabled={Boolean(submitting)}
              >
                <strong>{ACTION_COPY[action].title}</strong>
                <span>{ACTION_COPY[action].description}</span>
                {recommendedAction === action ? (
                  <span className="action-note">Recommended for this entry point</span>
                ) : null}
                {submitting === action ? (
                  <span className="action-note">Submitting...</span>
                ) : null}
              </button>
            ))}

            <div className="chip-row">
              {draft.tags.map((tag) => (
                <span key={tag} className="chip">
                  {tag}
                </span>
              ))}
            </div>

            <div className="composer-actions">
              <Link href="/" className="ghost-button">
                Back to upload
              </Link>
              <Link href="/forum" className="ghost-button">
                Open Forum
              </Link>
            </div>
          </div>

          {error ? (
            <div className="banner warning">
              <strong>Submission blocked.</strong> {error}
            </div>
          ) : null}
        </aside>
      </section>
    </div>
  );
}
