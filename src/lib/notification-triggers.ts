import { prisma } from "@/lib/db";
import { NotificationType } from "@prisma/client";
import { createNotification } from "@/lib/notifications";
import { logger } from "@/lib/logger";

type NotificationPref = {
  jobAlerts: boolean;
  learningReminders: boolean;
  interviewReminders: boolean;
  weeklySummary: boolean;
  system: boolean;
};

async function getPreferences(userId: string): Promise<NotificationPref | null> {
  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId },
    select: {
      jobAlerts: true,
      learningReminders: true,
      interviewReminders: true,
      weeklySummary: true,
      system: true,
      quietHoursStart: true,
      quietHoursEnd: true,
    },
  });
  if (!prefs) return null;
  if (isQuietHours(prefs.quietHoursStart, prefs.quietHoursEnd)) return null;
  return prefs;
}

function isQuietHours(start: string | null, end: string | null): boolean {
  if (!start || !end) return false;
  const now = new Date();
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

async function hasRecentDuplicate(
  userId: string,
  type: NotificationType,
  title: string,
  withinMinutes = 60,
): Promise<boolean> {
  const cutoff = new Date(Date.now() - withinMinutes * 60 * 1000);
  const existing = await prisma.notification.findFirst({
    where: {
      userId,
      type,
      title,
      createdAt: { gte: cutoff },
    },
    select: { id: true },
  });
  return !!existing;
}

export async function triggerJobMatch(userId: string, jobTitle: string, company: string) {
  try {
    const prefs = await getPreferences(userId);
    if (!prefs || !prefs.jobAlerts) return;
    const title = "New job match";
    if (await hasRecentDuplicate(userId, NotificationType.JOB_ALERT, title)) return;
    await createNotification(
      userId,
      NotificationType.JOB_ALERT,
      title,
      `A new ${jobTitle} position at ${company} matches your profile.`,
    );
  } catch (error) {
    logger.error("triggerJobMatch failed", { userId }, error);
  }
}

export async function triggerScoreChange(
  userId: string,
  category: string,
  oldScore: number,
  newScore: number,
) {
  try {
    const prefs = await getPreferences(userId);
    if (!prefs || !prefs.system) return;
    const diff = newScore - oldScore;
    const direction = diff > 0 ? "increased" : "decreased";
    const title = `Your ${category.toLowerCase()} score changed`;
    if (await hasRecentDuplicate(userId, NotificationType.SYSTEM, title)) return;
    await createNotification(
      userId,
      NotificationType.SYSTEM,
      title,
      `Your ${category} score has ${direction} from ${Math.round(oldScore)} to ${Math.round(newScore)}.`,
      "/dashboard",
    );
  } catch (error) {
    logger.error("triggerScoreChange failed", { userId }, error);
  }
}

export async function triggerOverdueTask(
  userId: string,
  taskTitle: string,
  roadmapTitle: string,
) {
  try {
    const prefs = await getPreferences(userId);
    if (!prefs || !prefs.learningReminders) return;
    const title = "Overdue learning task";
    if (await hasRecentDuplicate(userId, NotificationType.LEARNING_REMINDER, title)) return;
    await createNotification(
      userId,
      NotificationType.LEARNING_REMINDER,
      title,
      `Task "${taskTitle}" in "${roadmapTitle}" is overdue.`,
      "/roadmap",
    );
  } catch (error) {
    logger.error("triggerOverdueTask failed", { userId }, error);
  }
}

export async function triggerInterviewReminder(
  userId: string,
  company: string,
  type: string,
  date: Date,
) {
  try {
    const prefs = await getPreferences(userId);
    if (!prefs || !prefs.interviewReminders) return;
    const title = "Interview completed";
    if (await hasRecentDuplicate(userId, NotificationType.INTERVIEW_REMINDER, title)) return;
    const dateStr = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    await createNotification(
      userId,
      NotificationType.INTERVIEW_REMINDER,
      title,
      `Your ${type} interview${company ? ` at ${company}` : ""} on ${dateStr} has been completed.`,
      "/interview",
    );
  } catch (error) {
    logger.error("triggerInterviewReminder failed", { userId }, error);
  }
}

export async function generateWeeklyDigest(userId: string) {
  try {
    const prefs = await getPreferences(userId);
    if (!prefs || !prefs.weeklySummary) return;
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [submissions, interviews] = await Promise.all([
      prisma.codingSubmission.findMany({
        where: { userId, createdAt: { gte: oneWeekAgo } },
        select: { status: true },
      }),
      prisma.interview.findMany({
        where: { userId, createdAt: { gte: oneWeekAgo } },
        select: { status: true, score: true },
      }),
    ]);

    const solved = submissions.filter((s) => s.status === "ACCEPTED").length;
    const completedInterviews = interviews.filter((i) => i.status === "COMPLETED").length;
    const avgScore =
      interviews.length > 0
        ? Math.round(
            interviews.reduce((sum, i) => sum + (i.score ?? 0), 0) / interviews.length,
          )
        : 0;

    const parts: string[] = [];
    if (solved > 0) parts.push(`${solved} problem${solved > 1 ? "s" : ""} solved`);
    if (completedInterviews > 0)
      parts.push(
        `${completedInterviews} interview${completedInterviews > 1 ? "s" : ""} completed (avg score: ${avgScore})`,
      );

    const summary = parts.length > 0 ? parts.join(", ") + "." : "No activity this week.";

    const title = "Weekly summary";
    if (await hasRecentDuplicate(userId, NotificationType.WEEKLY_SUMMARY, title, 60 * 24)) return;
    await createNotification(
      userId,
      NotificationType.WEEKLY_SUMMARY,
      title,
      summary,
      "/dashboard",
    );
  } catch (error) {
    logger.error("generateWeeklyDigest failed", { userId }, error);
  }
}
