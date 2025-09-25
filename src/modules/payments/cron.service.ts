/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentsService } from './payments.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredAds() {
    this.logger.log('Running daily check for expired ads...');

    try {
      await this.paymentsService.checkAndUpdateExpiredAds();
      this.logger.log('Expired ads check completed successfully');
    } catch (error) {
      this.logger.error('Error checking expired ads:', error);
    }
  }
}
