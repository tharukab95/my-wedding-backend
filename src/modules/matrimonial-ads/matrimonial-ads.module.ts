import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatrimonialAdsController } from './matrimonial-ads.controller';
import { MatrimonialAdsService } from './matrimonial-ads.service';
import { UserResolverService } from '../../services/user-resolver.service';
import {
  MatrimonialAd,
  AdPhoto,
  AdHoroscope,
  User,
  LookingForPreferences,
  InterestRequest,
  Match,
} from '../../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MatrimonialAd,
      AdPhoto,
      AdHoroscope,
      User,
      LookingForPreferences,
      InterestRequest,
      Match,
    ]),
  ],
  controllers: [MatrimonialAdsController],
  providers: [MatrimonialAdsService, UserResolverService],
  exports: [MatrimonialAdsService],
})
export class MatrimonialAdsModule {}
