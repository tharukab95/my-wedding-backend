import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { CronService } from './cron.service';
import { UserResolverService } from '../../services/user-resolver.service';
import { PricingPlan, Payment, MatrimonialAd, User } from '../../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PricingPlan,
      Payment,
      MatrimonialAd,
      User,
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, CronService, UserResolverService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
