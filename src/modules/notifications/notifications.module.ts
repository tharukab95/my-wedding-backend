import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnifiedNotificationsController } from './unified-notifications.controller';
import { UnifiedNotificationsService } from './unified-notifications.service';
import { UserResolverService } from '../../services/user-resolver.service';
import { User, InterestRequest, Match } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([User, InterestRequest, Match])],
  controllers: [UnifiedNotificationsController],
  providers: [UnifiedNotificationsService, UserResolverService],
  exports: [UnifiedNotificationsService],
})
export class NotificationsModule {}
