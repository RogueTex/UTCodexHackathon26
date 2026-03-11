"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  resetUiFeedStorageOnce,
  readUiFeedPosts,
  readUiFeedStatusByPostId,
  type UiFeedPost,
  type UiFeedStatusState,
  type UiFeedType,
  writeUiFeedStatusByPostId,
} from "@/lib/ui-feed-store";
import { buildOpenStreetMapUrls } from "@/lib/location-hints";

type FeedType = UiFeedType;
type FilterTab = "all" | "issues" | "announcements" | "urgent" | "near";

type FeedPost = UiFeedPost;

const PLACEHOLDER_POSTS: FeedPost[] = [
  {
    id: "2",
    type: "announcement",
    title: "Free pizza in GDC lobby - unclaimed boxes!",
    body: "CS event ended early. 4 boxes of pizza in GDC lobby.",
    postedAtIso: new Date("2026-03-10T19:46:00.000Z").toISOString(),
    postedLabel: "14 min ago",
    location: "GDC · Lobby 2.216",
    upvotes: 31,
    comments: 7,
    nearMe: true,
  },
  {
    id: "3",
    type: "issue",
    urgency: "medium",
    title: "Flickering lights in RLM 7th floor hallway",
    body: "Two fluorescent panels near the elevator bank flicker heavily at night.",
    postedAtIso: new Date("2026-03-10T18:50:00.000Z").toISOString(),
    postedLabel: "1 hr ago",
    location: "RLM · 7th Floor",
    upvotes: 11,
    comments: 1,
  },
  {
    id: "4",
    type: "both",
    title: "Water fountain out of service - UTC 2nd floor",
    body: "Ticket submitted. Use the fountain near the first-floor vending machines.",
    postedAtIso: new Date("2026-03-10T16:50:00.000Z").toISOString(),
    postedLabel: "3 hr ago",
    location: "UTC · 2nd Floor",
    upvotes: 8,
    comments: 3,
  },
];

function urgencyClasses(urgency?: FeedPost["urgency"]): string {
  if (urgency === "high") {
    return "bg-ut-urgentBg text-ut-urgent";
  }
  if (urgency === "medium") {
    return "bg-ut-mediumBg text-ut-medium";
  }
  return "bg-ut-greenBg text-ut-green";
}

function typeClasses(type: FeedType): string {
  if (type === "issue") {
    return "bg-[#FFF0E6] text-ut-burnt";
  }
  if (type === "announcement") {
    return "bg-ut-blueBg text-ut-blue";
  }
  return "bg-gradient-to-r from-[#FFF0E6] to-ut-blueBg text-ut-charcoal";
}

function typeLabel(type: FeedType): string {
  if (type === "issue") {
    return "🔧 Issue";
  }
  if (type === "announcement") {
    return "📢 Announcement";
  }
  return "🔧📢 Issue + Announcement";
}

function defaultStatus(type: FeedType): string {
  return type === "announcement" ? "Available" : "Open";
}

function statusOptions(type: FeedType): string[] {
  return type === "announcement" ? ["Available", "Closed"] : ["Open", "Resolved"];
}

function statusChipClasses(type: FeedType, status: string, active: boolean): string {
  const inactive = "border-ut-faint bg-ut-white text-ut-mid";
  if (!active) {
    return inactive;
  }

  if (type === "announcement") {
    return status === "Closed"
      ? "border-ut-charcoal bg-ut-charcoal text-white"
      : "border-ut-blue bg-ut-blue text-white";
  }

  return status === "Resolved"
    ? "border-ut-green bg-ut-green text-white"
    : "border-ut-burnt bg-ut-burnt text-white";
}

function formatTimestampLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

type MapBounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

function buildBounds(posts: FeedPost[]): MapBounds | undefined {
  const withCoords = posts.filter(
    (post) =>
      typeof post.latitude === "number" &&
      Number.isFinite(post.latitude) &&
      typeof post.longitude === "number" &&
      Number.isFinite(post.longitude),
  );
  if (withCoords.length === 0) {
    return undefined;
  }

  const latitudes = withCoords.map((post) => post.latitude as number);
  const longitudes = withCoords.map((post) => post.longitude as number);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latPad = Math.max((maxLat - minLat) * 0.25, 0.0012);
  const lngPad = Math.max((maxLng - minLng) * 0.25, 0.0012);

  return {
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLng: minLng - lngPad,
    maxLng: maxLng + lngPad,
  };
}

function buildEmbedUrl(bounds: MapBounds): string {
  const bbox = [
    bounds.minLng,
    bounds.minLat,
    bounds.maxLng,
    bounds.maxLat,
  ]
    .map((value) => value.toFixed(6))
    .join("%2C");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`;
}

function getMarkerPosition(post: FeedPost, bounds: MapBounds): { left: string; top: string } {
  const lat = post.latitude as number;
  const lng = post.longitude as number;
  const xRange = bounds.maxLng - bounds.minLng || 1;
  const yRange = bounds.maxLat - bounds.minLat || 1;
  const x = ((lng - bounds.minLng) / xRange) * 100;
  const y = ((bounds.maxLat - lat) / yRange) * 100;

  return {
    left: `${Math.max(4, Math.min(96, x))}%`,
    top: `${Math.max(6, Math.min(94, y))}%`,
  };
}

export function CommunityFeedPage() {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [submittedPosts, setSubmittedPosts] = useState<FeedPost[]>([]);
  const [statusByPostId, setStatusByPostId] = useState<Record<string, UiFeedStatusState>>({});

  useEffect(() => {
    resetUiFeedStorageOnce();
    setSubmittedPosts(readUiFeedPosts());
    setStatusByPostId(readUiFeedStatusByPostId());
  }, []);

  const allPosts = useMemo(() => {
    const sortedSubmitted = [...submittedPosts].sort(
      (a, b) => new Date(b.postedAtIso).getTime() - new Date(a.postedAtIso).getTime(),
    );
    return [...sortedSubmitted, ...PLACEHOLDER_POSTS];
  }, [submittedPosts]);

  const latestSubmittedPost = useMemo(() => {
    return [...submittedPosts].sort(
      (a, b) => new Date(b.postedAtIso).getTime() - new Date(a.postedAtIso).getTime(),
    )[0];
  }, [submittedPosts]);

  const filteredPosts = useMemo(() => {
    if (filter === "all") {
      return allPosts;
    }
    if (filter === "issues") {
      return allPosts.filter((post) => post.type === "issue" || post.type === "both");
    }
    if (filter === "announcements") {
      return allPosts.filter((post) => post.type === "announcement" || post.type === "both");
    }
    if (filter === "urgent") {
      return allPosts.filter((post) => post.urgency === "high");
    }
    return allPosts.filter((post) => post.nearMe);
  }, [allPosts, filter]);

  const overviewLocation =
    submittedPosts.length > 0
      ? latestSubmittedPost?.location
      : PLACEHOLDER_POSTS[0]?.location ?? "Campus";
  const coordinatePosts = useMemo(
    () =>
      submittedPosts.filter(
        (post) =>
          typeof post.latitude === "number" &&
          Number.isFinite(post.latitude) &&
          typeof post.longitude === "number" &&
          Number.isFinite(post.longitude),
      ),
    [submittedPosts],
  );
  const mapBounds = useMemo(() => buildBounds(coordinatePosts), [coordinatePosts]);
  const campusMap = useMemo(() => buildOpenStreetMapUrls(30.2849, -97.7369), []);
  const mapEmbedUrl = mapBounds ? buildEmbedUrl(mapBounds) : campusMap.openStreetMapEmbedUrl;
  const overviewMapLink = latestSubmittedPost?.openStreetMapLinkUrl ?? campusMap.openStreetMapLinkUrl;

  function setPostStatus(post: FeedPost, status: string) {
    const isClosedState = status === "Resolved" || status === "Closed";
    const next: UiFeedStatusState = {
      status,
      statusChangedAtIso: isClosedState ? new Date().toISOString() : undefined,
    };

    setStatusByPostId((current) => {
      const updated = { ...current, [post.id]: next };
      writeUiFeedStatusByPostId(updated);
      return updated;
    });
  }

  return (
    <div className="min-h-screen bg-ut-cream px-6 pb-28">
      <div className="mx-auto max-w-[680px]">
        <div className="sticky top-0 z-20 bg-ut-cream/95 py-4 backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-display text-2xl font-black text-ut-charcoal">
              Bevo<span className="text-ut-burnt">Fix</span>
            </div>
            <Link
              href="/landing"
              className="rounded-full bg-ut-burnt px-4 py-2 text-xs font-bold text-white transition hover:bg-ut-burntHover"
            >
              + Post
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              { id: "all", label: "All" },
              { id: "issues", label: "🔧 Issues" },
              { id: "announcements", label: "📢 Announcements" },
              { id: "urgent", label: "🔴 Urgent" },
              { id: "near", label: "📍 Near Me" },
            ].map((tab) => {
              const active = filter === tab.id;
              const activeClass =
                tab.id === "issues"
                  ? "bg-ut-burnt text-white border-ut-burnt"
                  : tab.id === "announcements"
                    ? "bg-ut-blue text-white border-ut-blue"
                    : "bg-ut-charcoal text-white border-ut-charcoal";

              return (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id as FilterTab)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold ${
                    active
                      ? activeClass
                      : "border-ut-faint bg-ut-white text-ut-mid hover:border-ut-mid"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <section className="relative mt-5 overflow-hidden rounded-ut shadow-utMd">
          {mapEmbedUrl ? (
            <div className="relative h-64 bg-ut-white">
              <iframe
                title="Latest reported location map"
                src={mapEmbedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-full w-full border-0"
              />
              {mapBounds
                ? coordinatePosts.map((post) => {
                    const markerPosition = getMarkerPosition(post, mapBounds);
                    const isLatest = post.id === latestSubmittedPost?.id;
                    return (
                      <div
                        key={`marker-${post.id}`}
                        className="pointer-events-none absolute -translate-x-1/2 -translate-y-full"
                        style={{ left: markerPosition.left, top: markerPosition.top }}
                        title={post.location}
                      >
                        <div
                          className={`flex h-7 w-7 rotate-[-45deg] items-center justify-center rounded-[50%_50%_50%_0] text-[10px] font-extrabold text-white shadow-[0_3px_10px_rgba(0,0,0,0.3)] ${
                            isLatest
                              ? "bg-ut-charcoal"
                              : post.type === "announcement"
                                ? "bg-ut-blue"
                                : "bg-ut-burnt"
                          }`}
                        >
                          <span className="rotate-45">{isLatest ? "★" : "•"}</span>
                        </div>
                      </div>
                    );
                  })
                : null}
              <div className="absolute bottom-2 right-2 rounded bg-white/85 px-2 py-0.5 text-[10px] font-semibold text-ut-mid">
                © OpenStreetMap contributors
              </div>
            </div>
          ) : null}
          <div className="border-t border-white/60 bg-white/70 px-4 py-3 backdrop-blur">
            <p className="text-[10px] font-bold uppercase tracking-[2px] text-ut-mid">
              Latest reported location
            </p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold text-ut-charcoal">📍 {overviewLocation}</p>
              {overviewMapLink ? (
                <a
                  href={overviewMapLink}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-full border border-ut-faint bg-ut-white px-3 py-1 text-[10px] font-bold uppercase tracking-[1px] text-ut-mid transition hover:border-ut-mid"
                >
                  Open Map
                </a>
              ) : null}
            </div>
          </div>
        </section>

        <p className="mb-3 mt-7 text-[11px] font-bold uppercase tracking-[3px] text-ut-mid">
          Recent posts
        </p>

        <section className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
          {filteredPosts.map((post) => {
            const persistedStatus = statusByPostId[post.id];
            const selectedStatus = persistedStatus?.status ?? defaultStatus(post.type);
            const statusTime = persistedStatus?.statusChangedAtIso;
            const options = statusOptions(post.type);

            return (
              <article
                key={post.id}
                className="cursor-pointer rounded-ut border border-transparent bg-ut-white p-5 shadow-utSm transition hover:border-ut-faint hover:shadow-utMd"
              >
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-[1.5px] ${typeClasses(post.type)}`}>
                      {typeLabel(post.type)}
                    </span>
                    {post.urgency ? (
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[1px] ${urgencyClasses(post.urgency)}`}>
                        {post.urgency}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1">
                    {options.map((statusOption) => (
                      <button
                        key={`${post.id}-${statusOption}`}
                        type="button"
                        onClick={() => setPostStatus(post, statusOption)}
                        className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[1px] transition ${statusChipClasses(
                          post.type,
                          statusOption,
                          statusOption === selectedStatus,
                        )}`}
                      >
                        {statusOption}
                      </button>
                    ))}
                  </div>
                </div>

                <h3 className="mb-2 font-display text-xl font-bold leading-tight text-ut-charcoal">
                  {post.title}
                </h3>
                <p className="mb-3 text-sm leading-6 text-ut-mid">{post.body}</p>

                {post.hasImage ? (
                  post.imageDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.imageDataUrl}
                      alt={post.title}
                      className="mb-3 h-36 w-full rounded-utSm object-cover"
                    />
                  ) : (
                    <div className="mb-3 flex h-36 items-center justify-center rounded-utSm bg-gradient-to-br from-[#2D2520] to-[#4A3525]">
                      <span className="text-4xl opacity-20">🪑</span>
                    </div>
                  )
                ) : null}

                <div className="mb-3 grid grid-cols-1 gap-1 text-xs font-medium text-ut-mid sm:grid-cols-2">
                  <span>Posted: {post.postedLabel}</span>
                  {statusTime ? (
                    <span>
                      {post.type === "announcement" ? "Closed" : "Resolved"}: {formatTimestampLabel(statusTime)}
                    </span>
                  ) : (
                    <span className="text-ut-mid/70">No closure timestamp yet</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-ut-mid">📍 {post.location}</span>
                  <div className="flex items-center gap-2">
                    <button className="rounded-md px-2 py-1 text-xs font-semibold text-ut-mid hover:bg-ut-creamDark">
                      ▲ {post.upvotes}
                    </button>
                    <button className="rounded-md px-2 py-1 text-xs font-semibold text-ut-mid hover:bg-ut-creamDark">
                      💬 {post.comments}
                    </button>
                    <button className="rounded-md px-2 py-1 text-xs font-semibold text-ut-mid hover:bg-ut-creamDark">
                      🔗
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>

      <Link
        href="/landing"
        className="fixed bottom-6 right-6 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-ut-burnt text-2xl text-white shadow-[0_8px_24px_rgba(192,80,26,0.5)] transition hover:scale-105 hover:bg-ut-burntHover"
        aria-label="Create new post"
      >
        📸
      </Link>
    </div>
  );
}
