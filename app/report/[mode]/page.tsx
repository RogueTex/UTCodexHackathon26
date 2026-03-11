import { notFound } from "next/navigation";

import { ReportPageClient } from "@/components/report-page-client";
import { isMode } from "@/lib/bevofix";

export default async function ReportModePage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;

  if (!isMode(mode)) {
    notFound();
  }

  return <ReportPageClient intent={mode} />;
}
