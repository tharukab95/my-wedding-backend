import { Module } from '@nestjs/common';
import { SseNotificationService } from '../../services/sse-notification.service';

@Module({
  providers: [SseNotificationService],
  exports: [SseNotificationService],
})
export class SseModule {}
