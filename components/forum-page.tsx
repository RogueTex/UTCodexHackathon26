import Link from "next/link";

import { LocationDisplay } from "@/components/location-display";
import { PRODUCT_CLOSING } from "@/lib/bevofix";
import { getDashboardData } from "@/lib/store";

type Props = {
  submitted?: string;
  ticketId?: string;
  signalId?: string;
  linked?: string;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function buildBanner(submitted: string | undefined): string | null {
  if (submitted === "both") {
    return "BevoFix created linked issue and forum records from the same photo.";
  }
  if (submitted === "issue") {
    return "BevoFix sent the photo into the local issue queue.";
  }
  if (submitted === "forum") {
    return "BevoFix published the campus update into the Open Forum.";
  }
  return null;
}

export async function ForumPage({ submitted, linked }: Props) {
  const dashboard = await getDashboardData();
  const banner = buildBanner(submitted);

  return (
    <div className="forum-page">
      <section className="forum-header">
        <div>
          <span className="eyebrow">Open Forum</span>
          <h1>Campus action, newest first.</h1>
          <p>
            The Open Forum merges reported issues and community broadcasts into one local-first campus feed.
          </p>
        </div>
        <div className="forum-actions">
          <Link href="/" className="cta">
            New upload
          </Link>
          <div className="chip-row">
            <span className="chip">{dashboard.tickets.length} issues</span>
            <span className="chip">{dashboard.signals.length} broadcasts</span>
          </div>
        </div>
      </section>

      {banner ? (
        <div className="banner success">
          <strong>Submission complete.</strong> {banner}
          {linked ? <span> Linked group: {linked.slice(0, 8)}</span> : null}
        </div>
      ) : null}

      <section className="forum-feed">
        {dashboard.forum.map((item) => (
          <article
            key={item.id}
            className={`forum-card ${item.mode === "fix" ? "issue-card" : "broadcast-card"}`}
          >
            <div className="forum-card-top">
              <div>
                <span className="eyebrow">
                  {item.mode === "fix" ? "Issue report" : "Campus broadcast"}
                </span>
                <h2>{item.title}</h2>
              </div>
              <span className={`status-badge ${item.status}`}>
                {item.status}
              </span>
            </div>

            <div className="forum-card-body">
              <div className="forum-media-frame">
                {item.imagePreview ? (
                  <img src={item.imagePreview} alt={item.title} />
                ) : (
                  <div className="forum-media-placeholder">
                    <span>{item.mode === "fix" ? "Issue" : "Forum"}</span>
                  </div>
                )}
              </div>

              <div className="forum-copy">
                <p>{item.summary}</p>
                <div className="chip-row">
                  {item.tags.map((tag) => (
                    <span key={tag} className="chip">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="forum-meta">
                  <span>Posted {formatDate(item.created_at)}</span>
                  {item.captured_at ? <span>Observed {formatDate(item.captured_at)}</span> : null}
                </div>
              </div>
            </div>

            <LocationDisplay location={item.location} compact />
          </article>
        ))}
      </section>

      <p className="footer-note">{PRODUCT_CLOSING}</p>
    </div>
  );
}
