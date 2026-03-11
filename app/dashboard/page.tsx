import Link from "next/link";

import { PRODUCT_CLOSING } from "@/lib/bevofix";
import { getDashboardData } from "@/lib/store";

export const dynamic = "force-dynamic";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string; id?: string }>;
}) {
  const { submitted } = await searchParams;
  const dashboard = await getDashboardData();

  return (
    <div className="page">
      <section className="panel">
        <span className="eyebrow">4. Local campus operations view</span>
        <h1 className="panel-title">Dashboard updates immediately</h1>
        <p className="lede">
          The queue and feed below are fully local-first and ready for a live
          demo without campus integrations.
        </p>
        <div className="button-row">
          <Link href="/report/fix" className="cta fix">
            New Fix submission
          </Link>
          <Link href="/report/signal" className="ghost-button">
            New Signal submission
          </Link>
        </div>
        {submitted ? (
          <div className="banner success section-block">
            <strong>Submission complete.</strong> Your new{" "}
            {submitted === "fix" ? "Fix Mode ticket" : "Signal Mode post"} is
            now reflected in the local dashboard.
          </div>
        ) : null}
      </section>

      <section className="dashboard-grid section-block">
        <div className="panel">
          <span className="eyebrow">Fix queue</span>
          <h2 className="panel-title">Mock service tickets</h2>
          <div className="list-stack section-block">
            {dashboard.tickets.map((ticket) => (
              <article key={ticket.id} className="queue-card">
                <div className="ticket-head">
                  <div>
                    <h3 className="ticket-title">{ticket.issue_type}</h3>
                    <p className="meta-line">{ticket.summary}</p>
                  </div>
                  <span className={`status-badge ${ticket.urgency}`}>
                    {ticket.urgency}
                  </span>
                </div>
                <div className="chips section-block">
                  <span className="chip">{ticket.suggested_team}</span>
                  <span className="chip">{ticket.status}</span>
                  <span className="chip">{ticket.likely_location}</span>
                </div>
                <p className="meta-line">Logged {formatDate(ticket.created_at)}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="panel">
          <span className="eyebrow">Signal feed</span>
          <h2 className="panel-title">Useful campus updates</h2>
          <div className="list-stack section-block">
            {dashboard.signals.map((signal) => (
              <article key={signal.id} className="feed-card">
                <div className="feed-head">
                  <div>
                    <h3 className="feed-title">{signal.title}</h3>
                    <p className="meta-line">{signal.summary}</p>
                  </div>
                  <span className={`status-badge ${signal.status}`}>
                    {signal.status}
                  </span>
                </div>
                <div className="chips section-block">
                  <span className="chip">{signal.likely_location}</span>
                  <span className="chip">Expires {signal.expiration_time}</span>
                </div>
                <p className="meta-line">Published {formatDate(signal.created_at)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <p className="footer-note">{PRODUCT_CLOSING}</p>
    </div>
  );
}

