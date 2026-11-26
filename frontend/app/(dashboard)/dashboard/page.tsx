import { DashboardView } from "@/components/dashboard/dashboard-view";

// Server component: the token is in localStorage, so the client view passes it
// to the verified server action that scopes every query to the signed-in user.
export default function DashboardPage() {
  return <DashboardView />;
}
