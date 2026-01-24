import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotificationType,
  NotificationPriority,
  NotificationStatus,
} from '@prisma/client';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a notification
   */
  async create(data: {
    type: NotificationType;
    priority?: NotificationPriority;
    title: string;
    message: string;
    link?: string;
    userId: string;
    inApp?: boolean;
    email?: boolean;
    sms?: boolean;
    metadata?: any;
    expiresAt?: Date;
  }) {
    return this.prisma.notification.create({
      data: {
        type: data.type,
        priority: data.priority || NotificationPriority.NORMAL,
        title: data.title,
        message: data.message,
        link: data.link,
        userId: data.userId,
        inApp: data.inApp !== false,
        email: data.email || false,
        sms: data.sms || false,
        metadata: data.metadata,
        expiresAt: data.expiresAt,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Create notifications for multiple users
   */
  async createBulk(data: {
    type: NotificationType;
    priority?: NotificationPriority;
    title: string;
    message: string;
    link?: string;
    userIds: string[];
    inApp?: boolean;
    email?: boolean;
    sms?: boolean;
    metadata?: any;
    expiresAt?: Date;
  }) {
    const notifications = await Promise.all(
      data.userIds.map((userId) =>
        this.create({
          type: data.type,
          priority: data.priority,
          title: data.title,
          message: data.message,
          link: data.link,
          userId,
          inApp: data.inApp,
          email: data.email,
          sms: data.sms,
          metadata: data.metadata,
          expiresAt: data.expiresAt,
        })
      )
    );

    return notifications;
  }

  /**
   * Find all notifications for a user
   */
  async findAll(userId: string, options: {
    unreadOnly?: boolean;
    type?: NotificationType;
    limit?: number;
    offset?: number;
  } = {}) {
    const where: any = { userId };

    if (options.unreadOnly) {
      where.status = NotificationStatus.SENT;
    }

    if (options.type) {
      where.type = options.type;
    }

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Find one notification by ID
   */
  async findOne(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    return notification;
  }

  /**
   * Count unread notifications for a user
   */
  async countUnread(userId: string) {
    return this.prisma.notification.count({
      where: {
        userId,
        status: NotificationStatus.SENT,
      },
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, userId: string) {
    // Verify ownership
    await this.findOne(id, userId);

    return this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        status: NotificationStatus.SENT,
      },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });
  }

  /**
   * Archive notification
   */
  async archive(id: string, userId: string) {
    // Verify ownership
    await this.findOne(id, userId);

    return this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.ARCHIVED,
      },
    });
  }

  /**
   * Delete notification
   */
  async remove(id: string, userId: string) {
    // Verify ownership
    await this.findOne(id, userId);

    await this.prisma.notification.delete({
      where: { id },
    });
  }

  /**
   * Clean up expired notifications
   */
  async cleanupExpired() {
    const now = new Date();

    return this.prisma.notification.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
        status: {
          not: NotificationStatus.ARCHIVED,
        },
      },
    });
  }

  /**
   * Get user notification preferences
   */
  async getPreferences(userId: string) {
    let preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    // Create default preferences if not exists
    if (!preferences) {
      preferences = await this.prisma.notificationPreference.create({
        data: { userId },
      });
    }

    return preferences;
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(userId: string, data: {
    enableInApp?: boolean;
    enableEmail?: boolean;
    enableSms?: boolean;
    contractExpiry?: boolean;
    paymentOverdue?: boolean;
    contractApproval?: boolean;
    milestoneDue?: boolean;
    riskAlert?: boolean;
    systemAnnouncement?: boolean;
    mention?: boolean;
    taskAssigned?: boolean;
    documentShared?: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
  }) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        ...data,
      },
      update: data,
    });
  }

  /**
   * Check if user should receive notification based on preferences
   */
  async shouldNotify(userId: string, type: NotificationType): Promise<{
    inApp: boolean;
    email: boolean;
    sms: boolean;
  }> {
    const preferences = await this.getPreferences(userId);

    // Check if notification type is enabled
    const typeEnabled = this.isTypeEnabled(preferences, type);

    return {
      inApp: preferences.enableInApp && typeEnabled,
      email: preferences.enableEmail && typeEnabled,
      sms: preferences.enableSms && typeEnabled,
    };
  }

  /**
   * Check if notification type is enabled in preferences
   */
  private isTypeEnabled(preferences: any, type: NotificationType): boolean {
    switch (type) {
      case NotificationType.CONTRACT_EXPIRY:
        return preferences.contractExpiry;
      case NotificationType.PAYMENT_OVERDUE:
        return preferences.paymentOverdue;
      case NotificationType.CONTRACT_APPROVAL:
        return preferences.contractApproval;
      case NotificationType.MILESTONE_DUE:
        return preferences.milestoneDue;
      case NotificationType.RISK_ALERT:
        return preferences.riskAlert;
      case NotificationType.SYSTEM_ANNOUNCEMENT:
        return preferences.systemAnnouncement;
      case NotificationType.MENTION:
        return preferences.mention;
      case NotificationType.TASK_ASSIGNED:
        return preferences.taskAssigned;
      case NotificationType.DOCUMENT_SHARED:
        return preferences.documentShared;
      default:
        return true;
    }
  }

  /**
   * Create notification with preference check
   */
  async createWithPreferenceCheck(data: {
    type: NotificationType;
    priority?: NotificationPriority;
    title: string;
    message: string;
    link?: string;
    userId: string;
    metadata?: any;
    expiresAt?: Date;
  }) {
    const shouldNotify = await this.shouldNotify(data.userId, data.type);

    if (!shouldNotify.inApp && !shouldNotify.email && !shouldNotify.sms) {
      // User has disabled this notification type
      return null;
    }

    return this.create({
      ...data,
      inApp: shouldNotify.inApp,
      email: shouldNotify.email,
      sms: shouldNotify.sms,
    });
  }
}
