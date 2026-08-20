import { requireUser } from "@/lib/auth-helpers";
import { NotificationList } from "@/components/notifications/notification-list";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser();
  return <NotificationList userId={user.id} />;
}
