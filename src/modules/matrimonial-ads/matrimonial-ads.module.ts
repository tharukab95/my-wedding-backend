import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatrimonialAdsController } from './matrimonial-ads.controller';
import { MatrimonialAdsService } from './matrimonial-ads.service';
import {
  MatrimonialAd,
  AdPhoto,
  AdHoroscope,
  User,
  LookingForPreferences,
} from '../../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MatrimonialAd,
      AdPhoto,
      AdHoroscope,
      User,
      LookingForPreferences,
    ]),
  ],
  controllers: [MatrimonialAdsController],
  providers: [MatrimonialAdsService],
  exports: [MatrimonialAdsService],
})
export class MatrimonialAdsModule {}
