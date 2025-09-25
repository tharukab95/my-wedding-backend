/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { PaymentsService } from './payments.service';
import { FirebaseAuthGuard } from '../../guards/firebase-auth.guard';
import { User } from '../../decorators/user.decorator';
import type { AuthenticatedUser } from '../../decorators/user.decorator';
import { ApiResponse } from '../../dto/common.dto';
import { UserResolverService } from '../../services/user-resolver.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly userResolverService: UserResolverService,
  ) {}

  @Get('pricing-plans')
  async getPricingPlans(): Promise<ApiResponse<any>> {
    const plans = await this.paymentsService.getAllPricingPlans();
    return {
      success: true,
      data: plans,
    };
  }

  @Get('pricing-plans/:id')
  async getPricingPlan(@Param('id') id: string): Promise<ApiResponse<any>> {
    const plan = await this.paymentsService.getPricingPlanById(id);
    return {
      success: true,
      data: plan,
    };
  }

  @Get('checkout/:pricingPlanId')
  @UseGuards(FirebaseAuthGuard)
  async createCheckout(
    @Param('pricingPlanId') pricingPlanId: string,
    @User() user: AuthenticatedUser,
  ): Promise<ApiResponse<any>> {
    // Resolve Firebase UID to internal user ID
    const resolvedUser = await this.userResolverService.findOrCreateUser(
      user.uid,
      user.phoneNumber,
    );

    const result = await this.paymentsService.createCheckoutSession(
      pricingPlanId,
      resolvedUser.id, // Use internal user ID
    );

    return {
      success: true,
      data: result,
    };
  }

  @Post('webhook')
  async handleWebhook(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    try {
      await this.paymentsService.handleWebhook(req.body);
      res.status(200).json({ status: 'success' });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(400).json({ status: 'error', message: error.message });
    }
  }

  @Get('history')
  @UseGuards(FirebaseAuthGuard)
  async getPaymentHistory(
    @User() user: AuthenticatedUser,
  ): Promise<ApiResponse<any>> {
    // Resolve Firebase UID to internal user ID
    const resolvedUser = await this.userResolverService.findOrCreateUser(
      user.uid,
      user.phoneNumber,
    );

    const payments = await this.paymentsService.getPaymentHistory(
      resolvedUser.id,
    );
    return {
      success: true,
      data: payments,
    };
  }
}
