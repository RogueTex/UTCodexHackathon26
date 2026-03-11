import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { DashboardPayload, FixExtraction, FixTicket, SignalExtraction, SignalPost } from "@/lib/types";

const storageDir = path.join(process.cwd(), "storage");
const storagePath = path.join(storageDir, "bevofix-store.json");

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
      status: "queued",
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
      status: "live",
    },
  ],
};

async function ensureStore(): Promise<DashboardPayload> {
  await mkdir(storageDir, { recursive: true });

  try {
    const raw = await readFile(storagePath, "utf8");
    return JSON.parse(raw) as DashboardPayload;
  } catch {
    await writeFile(storagePath, JSON.stringify(seededData, null, 2), "utf8");
    return seededData;
  }
}

async function saveStore(payload: DashboardPayload): Promise<void> {
  await mkdir(storageDir, { recursive: true });
  await writeFile(storagePath, JSON.stringify(payload, null, 2), "utf8");
}

export async function getDashboardData(): Promise<DashboardPayload> {
  return ensureStore();
}

export async function createFixTicket(extraction: FixExtraction): Promise<FixTicket> {
  const store = await ensureStore();
  const ticket: FixTicket = {
    ...extraction,
    id: `fix-${Date.now()}`,
    created_at: new Date().toISOString(),
    status: extraction.urgency === "high" ? "triaged" : "new",
  };

  store.tickets = [ticket, ...store.tickets];
  await saveStore(store);
  return ticket;
}

export async function createSignalPost(
  extraction: SignalExtraction,
): Promise<SignalPost> {
  const store = await ensureStore();
  const post: SignalPost = {
    ...extraction,
    id: `signal-${Date.now()}`,
    created_at: new Date().toISOString(),
    status:
      extraction.expiration_time.toLowerCase().includes("today") ||
      extraction.expiration_time.toLowerCase().includes("pm")
        ? "expiring"
        : "live",
  };

  store.signals = [post, ...store.signals];
  await saveStore(store);
  return post;
}
