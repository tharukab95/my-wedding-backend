import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { MatrimonialAd } from './matrimonial-ad.entity';

export enum InteractionType {
  VIEWED = 'viewed',
  EXPRESSED_INTEREST = 'expressed_interest',
  REJECTED = 'rejected',
  BLOCKED = 'blocked',
  REPORTED = 'reported',
}

@Entity('user_ad_interactions')
@Unique(['userId', 'adId'])
@Index(['userId', 'interactionType'])
@Index(['adId', 'interactionType'])
@Index(['userId', 'createdAt'])
export class UserAdInteraction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  adId: string;

  @Column({
    type: 'enum',
    enum: InteractionType,
    default: InteractionType.VIEWED,
  })
  interactionType: InteractionType;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => MatrimonialAd, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'adId' })
  ad: MatrimonialAd;
}
