import Link from "next/link";

import {
  MODE_COPY,
  PRODUCT_CLOSING,
  PRODUCT_STATEMENT,
  PRODUCT_TAGLINE,
} from "@/lib/bevofix";

export default function HomePage() {
  return (
    <div className="page">
      <section className="hero-grid">
        <div className="hero-panel">
          <span className="eyebrow">Campus AI triage platform</span>
          <h1>Turn student photos into campus action.</h1>
          <p>{PRODUCT_STATEMENT}</p>
          <div className="hero-actions">
            <Link href="/report/fix" className="cta fix">
              Start Fix Mode
            </Link>
            <Link href="/report/signal" className="ghost-button">
              Start Signal Mode
            </Link>
          </div>
          <div className="stack section-block">
            <span>
              <strong>Codex workflow</strong> Triage, extract, validate, route
            </span>
            <span>
              <strong>Local-first</strong> Demo-safe mock persistence
            </span>
          </div>
        </div>

        <div className="panel">
          <span className="eyebrow">Judging position</span>
          <h2 className="panel-title">{PRODUCT_TAGLINE}</h2>
          <p className="supporting-copy">
            BevoFix stays focused on two clear actions: Fix Mode turns issue
            photos into routed local tickets, and Signal Mode turns useful
            campus photos into feed-ready updates.
          </p>
          <div className="chips">
            <span className="chip">Visible AI value</span>
            <span className="chip">3-minute demo safe</span>
            <span className="chip">UT-inspired visual system</span>
            <span className="chip">Impact-first story</span>
          </div>
          <p className="footer-note">{PRODUCT_CLOSING}</p>
        </div>
      </section>

      <section className="section-block">
        <div className="mode-grid">
          {Object.entries(MODE_COPY).map(([mode, copy]) => (
            <article
              key={mode}
              className={`mode-card ${mode === "fix" ? "fix-card" : "signal-card"}`}
            >
              <span className="eyebrow">{copy.label}</span>
              <h2>{copy.headline}</h2>
              <p>{copy.description}</p>
              <div className="chips">
                {mode === "fix" ? (
                  <>
                    <span className="chip">Urgency badges</span>
                    <span className="chip">Service queue routing</span>
                    <span className="chip">Editable AI ticket draft</span>
                  </>
                ) : (
                  <>
                    <span className="chip">Warm feed cards</span>
                    <span className="chip">Time-sensitive chips</span>
                    <span className="chip">Editable AI announcement draft</span>
                  </>
                )}
              </div>
              <div className="section-block">
                <Link
                  href={`/report/${mode}`}
                  className={`cta ${mode === "fix" ? "fix" : "signal"}`}
                >
                  {copy.primaryCta}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

