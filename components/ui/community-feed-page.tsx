"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type FeedType = "issue" | "announcement" | "both";
type FilterTab = "all" | "issues" | "announcements" | "urgent" | "near";

type FeedPost = {
  id: string;
  type: FeedType;
  urgency?: "high" | "medium" | "low";
  title: string;
  body: string;
  time: string;
  location: string;
  upvotes: number;
  comments: number;
  nearMe?: boolean;
  hasImage?: boolean;
};

const POSTS: FeedPost[] = [
  {
    id: "1",
    type: "issue",
    urgency: "high",
    title: "Broken chair leg in PCL 3rd floor study area",
    body: "Chair leg is cracked and poses a fall risk. Right side, near the window row. About 3 chairs affected.",
    time: "2 min ago",
    location: "PCL Library · 3rd Floor",
    upvotes: 4,
    comments: 2,
    nearMe: true,
    hasImage: true,
  },
  {
    id: "2",
    type: "announcement",
    title: "Free pizza in GDC lobby - unclaimed boxes!",
    body: "CS event ended early. 4 boxes of pizza in GDC lobby.",
    time: "14 min ago",
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
    time: "1 hr ago",
    location: "RLM · 7th Floor",
    upvotes: 11,
    comments: 1,
  },
  {
    id: "4",
    type: "both",
    title: "Water fountain out of service - UTC 2nd floor",
    body: "Ticket submitted. Use the fountain near the first-floor vending machines.",
    time: "3 hr ago",
    location: "UTC · 2nd Floor",
    upvotes: 8,
    comments: 3,
  },
];

type Pin = {
  id: string;
  type: "issue" | "announcement" | "cluster";
  top: string;
  left: string;
  label: string;
};

const MAP_PINS: Pin[] = [
  { id: "p1", type: "issue", top: "42%", left: "48%", label: "!" },
  { id: "p2", type: "announcement", top: "30%", left: "20%", label: "📢" },
  { id: "p3", type: "cluster", top: "55%", left: "68%", label: "3" },
  { id: "p4", type: "issue", top: "20%", left: "72%", label: "!" },
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

function pinHeadClasses(type: Pin["type"]): string {
  if (type === "issue") {
    return "bg-ut-burnt";
  }
  if (type === "announcement") {
    return "bg-ut-blue";
  }
  return "h-8 w-8 rounded-full bg-ut-charcoal rotate-0";
}

export function CommunityFeedPage() {
  const [filter, setFilter] = useState<FilterTab>("all");

  const filteredPosts = useMemo(() => {
    if (filter === "all") {
      return POSTS;
    }
    if (filter === "issues") {
      return POSTS.filter((post) => post.type === "issue" || post.type === "both");
    }
    if (filter === "announcements") {
      return POSTS.filter(
        (post) => post.type === "announcement" || post.type === "both",
      );
    }
    if (filter === "urgent") {
      return POSTS.filter((post) => post.urgency === "high");
    }
    return POSTS.filter((post) => post.nearMe);
  }, [filter]);

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
          <div className="map-grid relative h-64 bg-gradient-to-br from-[#D0E8D0] via-[#B8D8B8] to-[#C0DCC0]">
            <div className="absolute inset-x-0 top-[45%] h-[18px] bg-white/75" />
            <div className="absolute inset-y-0 left-[30%] w-3 bg-white/60" />
            <div className="absolute inset-y-0 left-[65%] w-2.5 bg-white/50" />
            <div className="absolute bottom-0 left-1/2 h-[60%] w-2 -rotate-[20deg] bg-white/40" />
            <div className="absolute left-[10%] top-[10%] h-[22%] w-[18%] rounded bg-white/30" />
            <div className="absolute left-[35%] top-[10%] h-[28%] w-[22%] rounded bg-white/30" />
            <div className="absolute left-[10%] top-[58%] h-[20%] w-[14%] rounded bg-white/30" />
            <div className="absolute left-[70%] top-[58%] h-[25%] w-[20%] rounded bg-white/30" />

            {MAP_PINS.map((pin) => (
              <div
                key={pin.id}
                className="absolute -translate-x-1/2 -translate-y-full"
                style={{ top: pin.top, left: pin.left }}
              >
                <div
                  className={`flex h-7 w-7 rotate-[-45deg] items-center justify-center rounded-[50%_50%_50%_0] text-xs font-extrabold text-white shadow-[0_3px_10px_rgba(0,0,0,0.25)] ${pinHeadClasses(
                    pin.type,
                  )}`}
                >
                  <span className={pin.type === "cluster" ? "rotate-0" : "rotate-45"}>
                    {pin.label}
                  </span>
                </div>
              </div>
            ))}

            <div className="absolute bottom-2 right-2 rounded bg-white/85 px-2 py-0.5 text-[10px] font-semibold text-ut-mid">
              © OpenStreetMap contributors
            </div>
          </div>
        </section>

        <p className="mb-3 mt-7 text-[11px] font-bold uppercase tracking-[3px] text-ut-mid">
          Recent posts
        </p>

        <section className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
          {filteredPosts.map((post) => (
            <article
              key={post.id}
              className="cursor-pointer rounded-ut border border-transparent bg-ut-white p-5 shadow-utSm transition hover:border-ut-faint hover:shadow-utMd"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-[1.5px] ${typeClasses(post.type)}`}>
                    {typeLabel(post.type)}
                  </span>
                  {post.urgency ? (
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[1px] ${urgencyClasses(post.urgency)}`}>
                      {post.urgency}
                    </span>
                  ) : null}
                </div>
                <span className="font-mono text-[11px] text-ut-mid">{post.time}</span>
              </div>

              <h3 className="mb-2 font-display text-xl font-bold leading-tight text-ut-charcoal">
                {post.title}
              </h3>
              <p className="mb-3 text-sm leading-6 text-ut-mid">{post.body}</p>

              {post.hasImage ? (
                <div className="mb-3 flex h-36 items-center justify-center rounded-utSm bg-gradient-to-br from-[#2D2520] to-[#4A3525]">
                  <span className="text-4xl opacity-20">🪑</span>
                </div>
              ) : null}

              <div className="flex items-center justify-between">
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
          ))}
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
