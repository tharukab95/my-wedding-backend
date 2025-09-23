import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import {
  MatrimonialAd,
  Match,
  Interest,
  User,
  AdPhoto,
} from '../../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MatrimonialAd,
      Match,
      Interest,
      User,
      AdPhoto,
    ]),
  ],
  controllers: [MatchesController],
  providers: [MatchesService],
  exports: [MatchesService],
})
export class MatchesModule {}
