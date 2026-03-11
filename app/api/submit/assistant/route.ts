import { NextResponse } from "next/server";

import { createFixTicket, createSignalPost } from "@/lib/store";
import {
  AssistantSubmissionResponse,
  draftToFixExtraction,
  draftToSignalExtraction,
  parseAssistantSubmission,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const submission = parseAssistantSubmission(body);
  const linkedGroupId =
    submission.action === "both" ? crypto.randomUUID() : undefined;

  const response: AssistantSubmissionResponse = {
    action: submission.action,
    linkedGroupId,
  };

  if (submission.action === "issue" || submission.action === "both") {
    const ticket = await createFixTicket(draftToFixExtraction(submission.draft), {
      imagePreview: submission.imagePreview,
      capturedAt: submission.draft.captured_at,
      location: submission.draft.location,
      tags: submission.draft.tags,
      linkedGroupId,
    });
    response.ticketId = ticket.id;
  }

  if (submission.action === "forum" || submission.action === "both") {
    const signal = await createSignalPost(
      draftToSignalExtraction(submission.draft),
      {
        imagePreview: submission.imagePreview,
        capturedAt: submission.draft.captured_at,
        location: submission.draft.location,
        tags: submission.draft.tags,
        linkedGroupId,
      },
    );
    response.signalId = signal.id;
  }

  return NextResponse.json(response);
}
