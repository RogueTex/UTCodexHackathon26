import { NextResponse } from "next/server";

import { createFixTicket } from "@/lib/store";
import { parseFixSubmission } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const extraction = parseFixSubmission(body);
  const ticket = await createFixTicket(extraction);

  return NextResponse.json({ id: ticket.id, ticket });
}

