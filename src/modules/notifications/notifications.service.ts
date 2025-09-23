import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../entities/notification.entity';
import { ErrorCodes } from '../../dto/common.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  async getNotifications(userId: string, page: number = 1, limit: number = 20) {
    const query = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC');

    const total = await query.getCount();

    const notifications = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async markAsRead(notificationId: string) {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException({
        code: ErrorCodes.NOTIFICATION_NOT_FOUND,
        message: 'Notification not found',
      });
    }

    await this.notificationRepository.update(notificationId, {
      isRead: true,
      readAt: new Date(),
    });

    return {
      notificationId,
      isRead: true,
      readAt: new Date(),
    };
  }

  async markAllAsRead(userId: string) {
    const result = await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return {
      userId,
      updatedCount: result.affected || 0,
      readAt: new Date(),
    };
  }

  async createNotification(
    userId: string,
    type: 'match' | 'interest' | 'message' | 'system',
    title: string,
    message: string,
    metadata?: any
  ) {
    const notification = this.notificationRepository.create({
      userId,
      type,
      title,
      message,
      metadata,
      isRead: false,
    });

    return await this.notificationRepository.save(notification);
  }
}
