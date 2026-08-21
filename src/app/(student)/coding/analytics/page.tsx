import { requireUser } from "@/lib/auth-helpers";
import { CodingAnalytics } from "@/components/coding/coding-analytics";

export const metadata = { title: "Coding Analytics" };

export default async function CodingAnalyticsPage() {
  await requireUser();
  return (
    <div className="px-4 py-6">
      <CodingAnalytics />
    </div>
  );
}
