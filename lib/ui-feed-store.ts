export type UiFeedType = "issue" | "announcement" | "both";

export type UiFeedPost = {
  id: string;
  type: UiFeedType;
  urgency?: "high" | "medium" | "low";
  title: string;
  body: string;
  postedAtIso: string;
  postedLabel: string;
  location: string;
  upvotes: number;
  comments: number;
  nearMe?: boolean;
  hasImage?: boolean;
  imageDataUrl?: string;
  latitude?: number;
  longitude?: number;
  openStreetMapEmbedUrl?: string;
  openStreetMapLinkUrl?: string;
};

export type UiFeedStatusState = {
  status: string;
  statusChangedAtIso?: string;
};

const UI_FEED_POSTS_KEY = "bevofix:ui-feed-posts";
const UI_FEED_STATUS_KEY = "bevofix:ui-feed-status";
const UI_FEED_DEMO_RESET_KEY = "bevofix:ui-feed-demo-reset-v1";

function parseJson<T>(value: string | null): T | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

export function readUiFeedPosts(): UiFeedPost[] {
  if (!canUseStorage()) {
    return [];
  }

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(UI_FEED_POSTS_KEY);
  } catch {
    return [];
  }
  const parsed = parseJson<UiFeedPost[]>(raw);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed;
}

export function writeUiFeedPosts(posts: UiFeedPost[]): void {
  if (!canUseStorage()) {
    return;
  }
  try {
    window.localStorage.setItem(UI_FEED_POSTS_KEY, JSON.stringify(posts));
  } catch {
    // Ignore storage write failures so UI actions can still continue.
  }
}

export function prependUiFeedPost(post: UiFeedPost): void {
  const existing = readUiFeedPosts();
  writeUiFeedPosts([post, ...existing]);
}

export function readUiFeedStatusByPostId(): Record<string, UiFeedStatusState> {
  if (!canUseStorage()) {
    return {};
  }

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(UI_FEED_STATUS_KEY);
  } catch {
    return {};
  }
  const parsed = parseJson<Record<string, UiFeedStatusState>>(raw);
  if (!parsed || typeof parsed !== "object") {
    return {};
  }

  return parsed;
}

export function writeUiFeedStatusByPostId(
  statuses: Record<string, UiFeedStatusState>,
): void {
  if (!canUseStorage()) {
    return;
  }
  try {
    window.localStorage.setItem(UI_FEED_STATUS_KEY, JSON.stringify(statuses));
  } catch {
    // Ignore storage write failures so UI actions can still continue.
  }
}

export function resetUiFeedStorageOnce(): void {
  if (!canUseStorage()) {
    return;
  }
  let alreadyReset = false;
  try {
    alreadyReset = window.localStorage.getItem(UI_FEED_DEMO_RESET_KEY) === "done";
  } catch {
    return;
  }
  if (alreadyReset) {
    return;
  }

  try {
    window.localStorage.removeItem(UI_FEED_POSTS_KEY);
    window.localStorage.removeItem(UI_FEED_STATUS_KEY);
    window.localStorage.setItem(UI_FEED_DEMO_RESET_KEY, "done");
  } catch {
    // Ignore storage reset failures.
  }
}
