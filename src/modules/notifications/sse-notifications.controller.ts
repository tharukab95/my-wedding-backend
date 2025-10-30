import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { FirebaseAuthGuard } from '../../guards/firebase-auth.guard';
import { CurrentUserId } from '../../decorators/current-user.decorator';
import { SseNotificationService } from '../../services/sse-notification.service';
import { UserResolverService } from '../../services/user-resolver.service';

@Controller('notifications')
export class SseNotificationsController {
  constructor(
    private sseService: SseNotificationService,
    private userResolverService: UserResolverService,
  ) {}

  @Get('stream')
  @UseGuards(FirebaseAuthGuard)
  streamNotifications(@CurrentUserId() userId: string, @Res() res: Response) {
    try {
      // userId here is the DB user id resolved by middleware
      if (!userId) {
        // Fallback: resolve via uid if needed (in rare cases)
        // But generally userId should always be set at this point
        return res.status(401).json({ error: 'User not resolved' });
      }

      this.sseService.addClient(userId, res);
    } catch (error) {
      console.error('Error setting up SSE connection:', error);
      res.status(500).json({ error: 'Failed to establish SSE connection' });
    }
  }

  @Get('status')
  @UseGuards(FirebaseAuthGuard)
  getConnectionStatus(@CurrentUserId() userId: string) {
    try {
      if (!userId) {
        return {
          success: false,
          error: 'User not resolved',
        };
      }

      return {
        success: true,
        data: {
          connected: this.sseService.isClientConnected(userId),
          totalConnections: this.sseService.getConnectedClientsCount(),
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get connection status',
      };
    }
  }
}
