import { notFound } from "next/navigation";

import { ReviewPageClient } from "@/components/review-page-client";
import { isMode } from "@/lib/bevofix";

export default async function ReviewModePage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;

  if (!isMode(mode)) {
    notFound();
  }

  return <ReviewPageClient mode={mode} />;
}

