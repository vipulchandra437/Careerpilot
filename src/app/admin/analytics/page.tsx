import { requireAdmin } from "@/lib/auth-helpers";
import { EnhancedAnalyticsView } from "@/components/admin/enhanced-analytics-view";

export const metadata = { title: "Admin Analytics" };

export default async function AdminAnalyticsPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Platform-wide usage and score trends.</p>
      </div>
      <EnhancedAnalyticsView />
    </div>
  );
}
