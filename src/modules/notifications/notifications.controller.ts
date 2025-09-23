import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { GetNotificationsQueryDto } from '../../dto/notifications.dto';
import { ApiResponse } from '../../dto/common.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get(':userId')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getNotifications(
    @Param('userId') userId: string,
    @Query() query: GetNotificationsQueryDto,
  ): Promise<ApiResponse<any>> {
    try {
      const result = await this.notificationsService.getNotifications(
        userId,
        query.page,
        query.limit,
      );
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: error.code || 'INTERNAL_SERVER_ERROR',
          message: error.message || 'An error occurred',
        },
      };
    }
  }

  @Put(':notificationId/read')
  async markAsRead(
    @Param('notificationId') notificationId: string,
  ): Promise<ApiResponse<any>> {
    try {
      const result = await this.notificationsService.markAsRead(notificationId);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: error.code || 'INTERNAL_SERVER_ERROR',
          message: error.message || 'An error occurred',
        },
      };
    }
  }

  @Put(':userId/read-all')
  async markAllAsRead(
    @Param('userId') userId: string,
  ): Promise<ApiResponse<any>> {
    try {
      const result = await this.notificationsService.markAllAsRead(userId);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: error.code || 'INTERNAL_SERVER_ERROR',
          message: error.message || 'An error occurred',
        },
      };
    }
  }
}
