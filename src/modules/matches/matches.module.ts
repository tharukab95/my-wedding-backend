import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UserResolverService } from '../../services/user-resolver.service';
import {
  MatrimonialAd,
  Match,
  InterestRequest,
  User,
  AdPhoto,
  Notification,
} from '../../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MatrimonialAd,
      Match,
      InterestRequest,
      User,
      AdPhoto,
      Notification,
    ]),
  ],
  controllers: [MatchesController],
  providers: [MatchesService, NotificationsService, UserResolverService],
  exports: [MatchesService],
})
export class MatchesModule {}
