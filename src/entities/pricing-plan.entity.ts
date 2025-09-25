import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity('pricing_plans')
export class PricingPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  duration: string; // e.g., "2 weeks", "1 month", "2 months"

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number; // Store as decimal for calculations

  @Column({ type: 'varchar', default: 'LKR' })
  currency: string;

  @Column({ type: 'json' })
  features: string[];

  @Column({ default: false })
  popular: boolean;

  @Column({ default: true })
  isActive: boolean;

  // Discount fields
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  discountPercentage: number | null; // e.g., 10.00 for 10%

  @Column({ type: 'timestamp', nullable: true })
  discountStartDate: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  discountEndDate: Date | null;

  @Column({ type: 'text', nullable: true })
  discountDescription: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany('Payment', 'pricingPlan')
  payments: any[];

  // Helper method to get discounted price
  getDiscountedPrice(): number {
    if (this.discountPercentage && this.isDiscountActive()) {
      const discountAmount = (this.price * this.discountPercentage) / 100;
      return this.price - discountAmount;
    }
    return this.price;
  }

  // Helper method to check if discount is active
  isDiscountActive(): boolean {
    if (
      !this.discountPercentage ||
      !this.discountStartDate ||
      !this.discountEndDate
    ) {
      return false;
    }

    const now = new Date();
    return now >= this.discountStartDate && now <= this.discountEndDate;
  }

  // Helper method to get duration in days
  getDurationInDays(): number {
    const duration = this.duration.toLowerCase();
    if (duration.includes('week')) {
      const weeks = parseInt(duration.match(/\d+/)?.[0] || '1');
      return weeks * 7;
    } else if (duration.includes('month')) {
      const months = parseInt(duration.match(/\d+/)?.[0] || '1');
      return months * 30; // Approximate
    }
    return 30; // Default to 30 days
  }
}
