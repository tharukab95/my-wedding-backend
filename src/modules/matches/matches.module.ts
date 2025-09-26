import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { PersonalizedFeedService } from './personalized-feed.service';
import { UserResolverService } from '../../services/user-resolver.service';
import {
  MatrimonialAd,
  Match,
  InterestRequest,
  User,
  AdPhoto,
  ContactExchange,
  UserAdInteraction,
} from '../../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MatrimonialAd,
      Match,
      InterestRequest,
      User,
      AdPhoto,
      ContactExchange,
      UserAdInteraction,
    ]),
  ],
  controllers: [MatchesController],
  providers: [MatchesService, PersonalizedFeedService, UserResolverService],
  exports: [MatchesService, PersonalizedFeedService],
})
export class MatchesModule {}
