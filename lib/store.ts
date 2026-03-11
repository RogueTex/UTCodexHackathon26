import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  AssistantLocation,
  DashboardPayload,
  FixExtraction,
  FixTicket,
  ForumItem,
  SignalExtraction,
  SignalPost,
  buildAssistantDraftFromExtraction,
  normalizeAssistantLocation,
  normalizeFixExtraction,
  normalizeSignalExtraction,
} from "@/lib/types";

const storageDir = path.join(process.cwd(), "storage");
const storagePath = path.join(storageDir, "bevofix-store.json");

type RecordMetadata = {
  imagePreview?: string;
  capturedAt?: string;
  location?: AssistantLocation;
  tags?: string[];
  linkedGroupId?: string;
};

type StoredShape = {
  tickets?: unknown[];
  signals?: unknown[];
};

const seededData: DashboardPayload = {
  tickets: [
    {
      id: "fix-seed-1",
      mode: "fix",
      issue_type: "lighting / electrical",
      summary: "Flickering ceiling light near the collaborative study tables.",
      likely_location: "Welch Hall second floor",
      urgency: "high",
      suggested_team: "Electrical Services",
      confidence: 0.86,
      needs_user_confirmation: true,
      created_at: new Date("2026-03-10T17:15:00.000Z").toISOString(),
      captured_at: new Date("2026-03-10T17:12:00.000Z").toISOString(),
      status: "queued",
      tags: ["urgent", "facilities"],
      location: {
        text: "Welch Hall second floor",
        source: "inferred",
        confidence: "Estimated location",
      },
    },
  ],
  signals: [
    {
      id: "signal-seed-1",
      mode: "signal",
      title: "Open study seating in PCL",
      summary: "Several open tables are available on the quiet floor right now.",
      likely_location: "PCL fifth floor",
      expiration_time: "Tonight, 9:00 PM",
      confidence: 0.82,
      needs_user_confirmation: true,
      created_at: new Date("2026-03-10T17:30:00.000Z").toISOString(),
      captured_at: new Date("2026-03-10T17:24:00.000Z").toISOString(),
      status: "live",
      tags: ["study space"],
      location: {
        text: "PCL fifth floor",
        source: "inferred",
        confidence: "Estimated location",
      },
    },
  ],
  forum: [],
};

function buildForumItems(
  tickets: FixTicket[],
  signals: SignalPost[],
): ForumItem[] {
  const forum = [
    ...tickets.map<ForumItem>((ticket) => ({
      id: ticket.id,
      mode: "fix",
      title: ticket.issue_type,
      summary: ticket.summary,
      created_at: ticket.created_at,
      captured_at: ticket.captured_at,
      imagePreview: ticket.imagePreview,
      confidence: ticket.confidence,
      status: ticket.status,
      tags: ticket.tags,
      linked_group_id: ticket.linked_group_id,
      location: ticket.location,
    })),
    ...signals.map<ForumItem>((signal) => ({
      id: signal.id,
      mode: "signal",
      title: signal.title,
      summary: signal.summary,
      created_at: signal.created_at,
      captured_at: signal.captured_at,
      imagePreview: signal.imagePreview,
      confidence: signal.confidence,
      status: signal.status,
      tags: signal.tags,
      linked_group_id: signal.linked_group_id,
      location: signal.location,
    })),
  ];

  return forum.sort(
    (left, right) =>
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
  );
}

function normalizeStoredTicket(raw: unknown): FixTicket {
  const parsed = raw as Partial<FixTicket> | undefined;
  const extraction = normalizeFixExtraction(parsed);
  const fallbackDraft = buildAssistantDraftFromExtraction(extraction, {
    capturedAt:
      typeof parsed?.captured_at === "string" ? parsed.captured_at : undefined,
  });

  return {
    ...extraction,
    id:
      typeof parsed?.id === "string" && parsed.id.trim()
        ? parsed.id
        : `fix-${Date.now()}`,
    created_at:
      typeof parsed?.created_at === "string"
        ? parsed.created_at
        : new Date().toISOString(),
    captured_at:
      typeof parsed?.captured_at === "string"
        ? parsed.captured_at
        : fallbackDraft.captured_at,
    status:
      parsed?.status === "queued" || parsed?.status === "triaged" || parsed?.status === "new"
        ? parsed.status
        : extraction.urgency === "high"
          ? "triaged"
          : "new",
    imagePreview:
      typeof parsed?.imagePreview === "string" ? parsed.imagePreview : undefined,
    location: parsed?.location
      ? normalizeAssistantLocation(parsed.location)
      : fallbackDraft.location,
    tags: Array.isArray(parsed?.tags)
      ? parsed.tags.filter((tag): tag is string => typeof tag === "string")
      : fallbackDraft.tags,
    linked_group_id:
      typeof parsed?.linked_group_id === "string"
        ? parsed.linked_group_id
        : undefined,
  };
}

function normalizeStoredSignal(raw: unknown): SignalPost {
  const parsed = raw as Partial<SignalPost> | undefined;
  const extraction = normalizeSignalExtraction(parsed);
  const fallbackDraft = buildAssistantDraftFromExtraction(extraction, {
    capturedAt:
      typeof parsed?.captured_at === "string" ? parsed.captured_at : undefined,
  });

  return {
    ...extraction,
    id:
      typeof parsed?.id === "string" && parsed.id.trim()
        ? parsed.id
        : `signal-${Date.now()}`,
    created_at:
      typeof parsed?.created_at === "string"
        ? parsed.created_at
        : new Date().toISOString(),
    captured_at:
      typeof parsed?.captured_at === "string"
        ? parsed.captured_at
        : fallbackDraft.captured_at,
    status:
      parsed?.status === "live" || parsed?.status === "expiring"
        ? parsed.status
        : extraction.expiration_time.toLowerCase().includes("today") ||
            extraction.expiration_time.toLowerCase().includes("pm")
          ? "expiring"
          : "live",
    imagePreview:
      typeof parsed?.imagePreview === "string" ? parsed.imagePreview : undefined,
    location: parsed?.location
      ? normalizeAssistantLocation(parsed.location)
      : fallbackDraft.location,
    tags: Array.isArray(parsed?.tags)
      ? parsed.tags.filter((tag): tag is string => typeof tag === "string")
      : fallbackDraft.tags,
    linked_group_id:
      typeof parsed?.linked_group_id === "string"
        ? parsed.linked_group_id
        : undefined,
  };
}

function normalizeStore(payload: StoredShape): DashboardPayload {
  const tickets = Array.isArray(payload.tickets)
    ? payload.tickets.map(normalizeStoredTicket)
    : seededData.tickets;
  const signals = Array.isArray(payload.signals)
    ? payload.signals.map(normalizeStoredSignal)
    : seededData.signals;

  return {
    tickets,
    signals,
    forum: buildForumItems(tickets, signals),
  };
}

async function ensureStore(): Promise<DashboardPayload> {
  await mkdir(storageDir, { recursive: true });

  try {
    const raw = await readFile(storagePath, "utf8");
    return normalizeStore(JSON.parse(raw) as StoredShape);
  } catch {
    const payload = {
      ...seededData,
      forum: buildForumItems(seededData.tickets, seededData.signals),
    };
    await writeFile(storagePath, JSON.stringify(payload, null, 2), "utf8");
    return payload;
  }
}

async function saveStore(payload: DashboardPayload): Promise<void> {
  await mkdir(storageDir, { recursive: true });
  const nextPayload = {
    ...payload,
    forum: buildForumItems(payload.tickets, payload.signals),
  };
  await writeFile(storagePath, JSON.stringify(nextPayload, null, 2), "utf8");
}

export async function getDashboardData(): Promise<DashboardPayload> {
  return ensureStore();
}

export async function getForumItems(): Promise<ForumItem[]> {
  const store = await ensureStore();
  return store.forum;
}

export async function createFixTicket(
  extraction: FixExtraction,
  metadata: RecordMetadata = {},
): Promise<FixTicket> {
  const store = await ensureStore();
  const fallbackDraft = buildAssistantDraftFromExtraction(extraction, {
    capturedAt: metadata.capturedAt,
  });
  const ticket: FixTicket = {
    ...extraction,
    id: `fix-${Date.now()}`,
    created_at: new Date().toISOString(),
    captured_at: metadata.capturedAt ?? fallbackDraft.captured_at,
    status: extraction.urgency === "high" ? "triaged" : "new",
    imagePreview: metadata.imagePreview,
    location: metadata.location ?? fallbackDraft.location,
    tags: metadata.tags ?? fallbackDraft.tags,
    linked_group_id: metadata.linkedGroupId,
  };

  store.tickets = [ticket, ...store.tickets];
  store.forum = buildForumItems(store.tickets, store.signals);
  await saveStore(store);
  return ticket;
}

export async function createSignalPost(
  extraction: SignalExtraction,
  metadata: RecordMetadata = {},
): Promise<SignalPost> {
  const store = await ensureStore();
  const fallbackDraft = buildAssistantDraftFromExtraction(extraction, {
    capturedAt: metadata.capturedAt,
  });
  const post: SignalPost = {
    ...extraction,
    id: `signal-${Date.now()}`,
    created_at: new Date().toISOString(),
    captured_at: metadata.capturedAt ?? fallbackDraft.captured_at,
    status:
      extraction.expiration_time.toLowerCase().includes("today") ||
      extraction.expiration_time.toLowerCase().includes("pm")
        ? "expiring"
        : "live",
    imagePreview: metadata.imagePreview,
    location: metadata.location ?? fallbackDraft.location,
    tags: metadata.tags ?? fallbackDraft.tags,
    linked_group_id: metadata.linkedGroupId,
  };

  store.signals = [post, ...store.signals];
  store.forum = buildForumItems(store.tickets, store.signals);
  await saveStore(store);
  return post;
}
