import { prisma } from "@/lib/db";
import { NotificationType } from "@prisma/client";

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  link?: string,
) {
  return prisma.notification.create({
    data: { userId, type, title, body, link: link ?? null },
  });
}

export async function createJobAlert(
  userId: string,
  jobTitle: string,
  company: string,
) {
  return createNotification(
    userId,
    NotificationType.JOB_ALERT,
    "New job match",
    `A new ${jobTitle} position at ${company} matches your profile.`,
  );
}

export async function createLearningReminder(userId: string, message: string) {
  return createNotification(
    userId,
    NotificationType.LEARNING_REMINDER,
    "Learning reminder",
    message,
  );
}

export async function createWeeklySummary(userId: string, summary: string) {
  return createNotification(
    userId,
    NotificationType.WEEKLY_SUMMARY,
    "Weekly summary",
    summary,
  );
}
