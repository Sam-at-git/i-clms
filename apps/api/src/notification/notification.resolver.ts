import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationService } from './notification.service';
import { NotificationType, NotificationPriority, NotificationStatus } from '@prisma/client';
import {
  Notification,
  NotificationPreference,
  NotificationsResponse,
  CreateNotificationInput,
  CreateBulkNotificationsInput,
  UpdateNotificationPreferencesInput,
  SuccessResponse,
} from './dto/notification.dto';

// Register enums with GraphQL
const registerEnumType = require('@nestjs/graphql');
registerEnumType.registerEnumType(NotificationType, {
  name: 'NotificationType',
  description: '通知类型',
});

registerEnumType.registerEnumType(NotificationPriority, {
  name: 'NotificationPriority',
  description: '通知优先级',
});

registerEnumType.registerEnumType(NotificationStatus, {
  name: 'NotificationStatus',
  description: '通知状态',
});

@Resolver('Notification')
export class NotificationResolver {
  constructor(private notificationService: NotificationService) {}

  @Query(() => NotificationsResponse, { description: 'Get notifications for current user' })
  @UseGuards(GqlAuthGuard)
  async notifications(
    @CurrentUser() user: any,
    @Args('unreadOnly', { nullable: true, type: () => Boolean }) unreadOnly?: boolean,
    @Args('type', { nullable: true, type: () => NotificationType }) type?: NotificationType,
    @Args('limit', { nullable: true, type: () => Int }) limit?: number,
    @Args('offset', { nullable: true, type: () => Int }) offset?: number,
  ): Promise<NotificationsResponse> {
    return this.notificationService.findAll(user.id, {
      unreadOnly,
      type,
      limit,
      offset,
    }) as any;
  }

  @Query(() => Notification, { nullable: true, description: 'Get a single notification by ID' })
  @UseGuards(GqlAuthGuard)
  async notification(@CurrentUser() user: any, @Args('id') id: string): Promise<Notification | null> {
    return this.notificationService.findOne(id, user.id) as any;
  }

  @Query(() => Int, { description: 'Get unread notification count for current user' })
  @UseGuards(GqlAuthGuard)
  async notificationCount(@CurrentUser() user: any): Promise<number> {
    return this.notificationService.countUnread(user.id);
  }

  @Query(() => NotificationPreference, { description: 'Get notification preferences for current user' })
  @UseGuards(GqlAuthGuard)
  async notificationPreferences(@CurrentUser() user: any): Promise<NotificationPreference> {
    return this.notificationService.getPreferences(user.id) as any;
  }

  @Mutation(() => Notification, { description: 'Mark a notification as read' })
  @UseGuards(GqlAuthGuard)
  async markNotificationRead(@CurrentUser() user: any, @Args('id') id: string): Promise<Notification> {
    return this.notificationService.markAsRead(id, user.id) as any;
  }

  @Mutation(() => SuccessResponse, { description: 'Mark all notifications as read for current user' })
  @UseGuards(GqlAuthGuard)
  async markAllNotificationsRead(@CurrentUser() user: any): Promise<SuccessResponse> {
    await this.notificationService.markAllAsRead(user.id);
    return { success: true };
  }

  @Mutation(() => Notification, { description: 'Archive a notification' })
  @UseGuards(GqlAuthGuard)
  async archiveNotification(@CurrentUser() user: any, @Args('id') id: string): Promise<Notification> {
    return this.notificationService.archive(id, user.id) as any;
  }

  @Mutation(() => SuccessResponse, { description: 'Delete a notification' })
  @UseGuards(GqlAuthGuard)
  async deleteNotification(@CurrentUser() user: any, @Args('id') id: string): Promise<SuccessResponse> {
    await this.notificationService.remove(id, user.id);
    return { success: true };
  }

  @Mutation(() => NotificationPreference, { description: 'Update notification preferences' })
  @UseGuards(GqlAuthGuard)
  async updateNotificationPreferences(
    @CurrentUser() user: any,
    @Args('input') input: UpdateNotificationPreferencesInput,
  ): Promise<NotificationPreference> {
    return this.notificationService.updatePreferences(user.id, input) as any;
  }

  @Mutation(() => Notification, { description: 'Create a new notification' })
  @UseGuards(GqlAuthGuard)
  async createNotification(
    @Args('input') input: CreateNotificationInput,
    @CurrentUser() user: any,
  ): Promise<Notification> {
    return this.notificationService.createWithPreferenceCheck({
      type: input.type,
      priority: input.priority,
      title: input.title,
      message: input.message,
      link: input.link,
      userId: input.userId,
      metadata: input.metadata,
      expiresAt: input.expiresAt,
    }) as any;
  }

  @Mutation(() => SuccessResponse, { description: 'Create bulk notifications for multiple users' })
  @UseGuards(GqlAuthGuard)
  async createBulkNotifications(
    @Args('input') input: CreateBulkNotificationsInput,
    @CurrentUser() user: any,
  ): Promise<SuccessResponse> {
    await this.notificationService.createBulk({
      type: input.type,
      priority: input.priority,
      title: input.title,
      message: input.message,
      link: input.link,
      userIds: input.userIds,
      inApp: input.inApp,
      email: input.email,
      sms: input.sms,
      metadata: input.metadata,
      expiresAt: input.expiresAt,
    });
    return { success: true };
  }
}
