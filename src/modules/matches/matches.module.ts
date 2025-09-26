import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { UserResolverService } from '../../services/user-resolver.service';
import {
  MatrimonialAd,
  Match,
  InterestRequest,
  User,
  AdPhoto,
  ContactExchange,
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
    ]),
  ],
  controllers: [MatchesController],
  providers: [MatchesService, UserResolverService],
  exports: [MatchesService],
})
export class MatchesModule {}
