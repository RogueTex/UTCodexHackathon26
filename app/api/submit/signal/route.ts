import { NextResponse } from "next/server";

import { createSignalPost } from "@/lib/store";
import { parseSignalSubmission } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const extraction = parseSignalSubmission(body);
  const post = await createSignalPost(extraction);

  return NextResponse.json({ id: post.id, post });
}

