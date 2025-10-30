import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnifiedNotificationsController } from './unified-notifications.controller';
import { UnifiedNotificationsService } from './unified-notifications.service';
import { SseNotificationsController } from './sse-notifications.controller';
import { UserResolverService } from '../../services/user-resolver.service';
import { NotificationCountService } from '../../services/notification-count.service';
import {
  User,
  InterestRequest,
  Match,
  MatchRead,
  InterestRequestRead,
} from '../../entities';
import { SseModule } from '../sse/sse.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      InterestRequest,
      Match,
      MatchRead,
      InterestRequestRead,
    ]),
    SseModule,
  ],
  controllers: [UnifiedNotificationsController, SseNotificationsController],
  providers: [
    UnifiedNotificationsService,
    UserResolverService,
    NotificationCountService,
  ],
  exports: [UnifiedNotificationsService, NotificationCountService],
})
export class NotificationsModule {}
