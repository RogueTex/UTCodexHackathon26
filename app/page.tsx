import { ReportPageClient } from "@/components/report-page-client";
import { isMode } from "@/lib/bevofix";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string }>;
}) {
  const { intent } = await searchParams;

  return <ReportPageClient intent={intent && isMode(intent) ? intent : undefined} />;
}
