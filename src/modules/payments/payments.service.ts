/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import md5 from 'crypto-js/md5';
import { PricingPlan, Payment, MatrimonialAd, User } from '../../entities';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PricingPlan)
    private pricingPlanRepository: Repository<PricingPlan>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(MatrimonialAd)
    private matrimonialAdRepository: Repository<MatrimonialAd>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
  ) {}

  async getAllPricingPlans(): Promise<PricingPlan[]> {
    return this.pricingPlanRepository.find({
      where: { isActive: true },
      order: { price: 'ASC' },
    });
  }

  async getPricingPlanById(id: string): Promise<PricingPlan> {
    const plan = await this.pricingPlanRepository.findOne({
      where: { id, isActive: true },
    });

    if (!plan) {
      throw new NotFoundException('Pricing plan not found');
    }

    return plan;
  }

  async createCheckoutSession(
    pricingPlanId: string,
    userId: string,
  ): Promise<any> {
    // Get pricing plan
    const pricingPlan = await this.getPricingPlanById(pricingPlanId);

    // Get user
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Find user's matrimonial ad
    const ad = await this.matrimonialAdRepository.findOne({
      where: { userId: userId },
    });

    if (!ad) {
      throw new NotFoundException('Matrimonial ad not found for this user');
    }

    // Check if ad is submitted and ready for payment
    if (!ad.submittedAt) {
      throw new BadRequestException('Ad must be submitted before payment');
    }

    if (ad.status === 'active') {
      throw new BadRequestException('Ad is already active and paid');
    }

    // Generate order ID
    const orderId = this.generateOrderId();

    // Calculate amount (with discount if applicable)
    const originalAmount = pricingPlan.price;
    const finalAmount = pricingPlan.getDiscountedPrice();
    const discountPercentage = pricingPlan.isDiscountActive()
      ? pricingPlan.discountPercentage
      : null;

    // Create payment record
    const payment = this.paymentRepository.create({
      orderId,
      userId,
      adId: ad.id,
      pricingPlanId,
      amount: finalAmount,
      originalAmount: discountPercentage ? originalAmount : null,
      discountPercentage,
      currency: pricingPlan.currency,
      status: 'pending',
    });

    await this.paymentRepository.save(payment);

    // Generate PayHere checkout data
    const checkoutData = this.generatePayHereCheckoutData(
      orderId,
      finalAmount,
      pricingPlan.currency,
      user,
      pricingPlan,
      ad.id,
    );

    return {
      paymentId: payment.id,
      orderId,
      checkoutData,
      pricingPlan: {
        id: pricingPlan.id,
        name: pricingPlan.name,
        duration: pricingPlan.duration,
        price: originalAmount,
        discountedPrice: finalAmount,
        discountPercentage,
        currency: pricingPlan.currency,
        features: pricingPlan.features,
        popular: pricingPlan.popular,
      },
    };
  }

  private generateOrderId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `FP${timestamp}${random}`;
  }

  private generatePayHereCheckoutData(
    orderId: string,
    amount: number,
    currency: string,
    user: User,
    pricingPlan: PricingPlan,
    adId: string,
  ): any {
    const merchantId = this.configService.get<string>('PAYHERE_MERCHANT_ID');
    const merchantSecret = this.configService.get<string>(
      'PAYHERE_MERCHANT_SECRET',
    );

    if (!merchantId || !merchantSecret) {
      throw new BadRequestException('PayHere configuration missing');
    }

    // Format amount for hash generation
    const amountFormatted = parseFloat(amount.toString())
      .toLocaleString('en-us', { minimumFractionDigits: 2 })
      .replaceAll(',', '');

    // Generate hash
    const hashedSecret = md5(merchantSecret || '')
      .toString()
      .toUpperCase();
    const hash = md5(
      merchantId + orderId + amountFormatted + currency + hashedSecret,
    )
      .toString()
      .toUpperCase();

    return {
      merchant_id: merchantId,
      return_url: 'https://4b354f52fbe2.ngrok-free.app/en/search',
      cancel_url:
        'https://4b354f52fbe2.ngrok-free.app/en/create-matrimonial-ad',
      notify_url: 'https://4b354f52fbe2.ngrok-free.app/api/payments/webhook',
      first_name: user.phoneNumber || 'User', // Using phone as fallback
      last_name: '',
      email: user.phoneNumber
        ? `${user.phoneNumber}@temp.com`
        : 'user@temp.com', // Dummy email
      phone: user.phoneNumber || '',
      address: '',
      city: '',
      country: 'Sri Lanka',
      order_id: orderId,
      items: pricingPlan.name,
      currency: currency,
      amount: amountFormatted,
      hash: hash,
      custom1: user.id, // userId
      custom2: adId, // adId for identifying the ad
    };
  }

  async handleWebhook(payload: any): Promise<void> {
    console.log('handleWebhook', payload);
    // Verify signature
    if (!this.verifyPayHereSignature(payload)) {
      throw new BadRequestException('Invalid signature');
    }

    const orderId = payload.order_id; // Get orderId from PayHere response
    const payment = await this.paymentRepository.findOne({
      where: { orderId },
      relations: ['pricingPlan', 'ad', 'user'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Update payment record
    payment.payherePaymentId = payload.payment_id;
    payment.payhereMethod = payload.method;
    payment.payhereResponse = payload;

    if (payload.status_code === '2') {
      // Payment successful
      payment.status = 'completed';
      payment.paidAt = new Date();

      // Calculate expiry date
      const durationInDays = payment.pricingPlan.getDurationInDays();
      payment.expiresAt = new Date();
      payment.expiresAt.setDate(payment.expiresAt.getDate() + durationInDays);

      // Update ad status to active
      await this.matrimonialAdRepository.update(payment.adId, {
        status: 'active',
        expiresAt: payment.expiresAt,
      });
    } else {
      // Payment failed
      payment.status = 'failed';
      payment.failureReason = payload.status_message || 'Payment failed';
    }

    await this.paymentRepository.save(payment);
  }

  private verifyPayHereSignature(payload: any): boolean {
    const merchantSecret = this.configService.get<string>(
      'PAYHERE_MERCHANT_SECRET',
    );
    const hashedSecret = md5(merchantSecret || '')
      .toString()
      .toUpperCase();

    const expectedHash = md5(
      payload.merchant_id +
        payload.order_id +
        payload.payhere_amount +
        payload.payhere_currency +
        payload.status_code +
        hashedSecret,
    )
      .toString()
      .toUpperCase();

    return payload.md5sig === expectedHash;
  }

  async getPaymentHistory(userId: string): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: { userId },
      relations: ['pricingPlan', 'ad'],
      order: { createdAt: 'DESC' },
    });
  }

  async checkAndUpdateExpiredAds(): Promise<void> {
    const now = new Date();

    // Find ads that have expired
    const expiredAds = await this.matrimonialAdRepository
      .createQueryBuilder('ad')
      .where('ad.expiresAt <= :now', { now })
      .andWhere('ad.status = :status', { status: 'active' })
      .getMany();

    // Update expired ads
    for (const ad of expiredAds) {
      await this.matrimonialAdRepository.update(ad.id, {
        status: 'expired',
      });
    }

    console.log(`Updated ${expiredAds.length} expired ads`);
  }
}
