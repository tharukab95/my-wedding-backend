import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  orderId: string; // FP{some digits}

  @Column()
  userId: string;

  @Column()
  adId: string;

  @Column()
  pricingPlanId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  originalAmount: number | null; // Amount before discount

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  discountPercentage: number | null;

  @Column({ type: 'varchar', default: 'LKR' })
  currency: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending',
  })
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';

  @Column({ type: 'varchar', nullable: true })
  payherePaymentId: string | null;

  @Column({ type: 'varchar', nullable: true })
  payhereMethod: string | null; // Payment method used

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null; // When the ad will expire

  @Column({ type: 'text', nullable: true })
  failureReason: string | null;

  @Column({ type: 'json', nullable: true })
  payhereResponse: any | null; // Store full PayHere response

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne('User')
  @JoinColumn({ name: 'userId' })
  user: any;

  @ManyToOne('MatrimonialAd')
  @JoinColumn({ name: 'adId' })
  ad: any;

  @ManyToOne('PricingPlan')
  @JoinColumn({ name: 'pricingPlanId' })
  pricingPlan: any;
}
