import { ForumPage } from "@/components/forum-page";

export const dynamic = "force-dynamic";

export default async function OpenForumPage({
  searchParams,
}: {
  searchParams: Promise<{
    submitted?: string;
    ticketId?: string;
    signalId?: string;
    linked?: string;
  }>;
}) {
  const params = await searchParams;
  return <ForumPage {...params} />;
}
