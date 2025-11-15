import { InsertNotification, notifications } from "@shared/schema";
import { db } from "./db";

export interface CreateNotificationParams {
  organizationId: number;
  userId: number;
  title: string;
  message: string;
  type: "appointment_reminder" | "lab_result" | "prescription_alert" | "system_alert" | "payment_due" | "message" | "patient_update";
  priority?: "low" | "normal" | "high" | "critical";
  actionUrl?: string;
  metadata?: {
    patientId?: number;
    patientName?: string;
    appointmentId?: number;
    prescriptionId?: number;
    urgency?: "low" | "medium" | "high" | "critical";
    department?: string;
    icon?: string;
    color?: string;
  };
  scheduledFor?: Date;
  expiresAt?: Date;
}

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    const notificationData: InsertNotification = {
      organizationId: params.organizationId,
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      priority: params.priority || "normal",
      status: "unread",
      isActionable: !!params.actionUrl,
      actionUrl: params.actionUrl,
      metadata: params.metadata,
      scheduledFor: params.scheduledFor,
      expiresAt: params.expiresAt,
    };

    await db.insert(notifications).values(notificationData);
    console.log(`[Notification Created] Type: ${params.type}, User: ${params.userId}, Title: ${params.title}`);
  } catch (error) {
    console.error("[Notification Error] Failed to create notification:", error);
  }
}

export async function createBulkNotifications(notificationsList: CreateNotificationParams[]): Promise<void> {
  try {
    const notificationDataList: InsertNotification[] = notificationsList.map(params => ({
      organizationId: params.organizationId,
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      priority: params.priority || "normal",
      status: "unread",
      isActionable: !!params.actionUrl,
      actionUrl: params.actionUrl,
      metadata: params.metadata,
      scheduledFor: params.scheduledFor,
      expiresAt: params.expiresAt,
    }));

    await db.insert(notifications).values(notificationDataList);
    console.log(`[Bulk Notifications Created] Count: ${notificationsList.length}`);
  } catch (error) {
    console.error("[Notification Error] Failed to create bulk notifications:", error);
  }
}

export function getAppointmentReminderDate(appointmentDate: Date, hoursBefore: number = 24): Date {
  const reminderDate = new Date(appointmentDate);
  reminderDate.setHours(reminderDate.getHours() - hoursBefore);
  return reminderDate;
}
