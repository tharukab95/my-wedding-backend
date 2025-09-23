import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('interest_requests')
export class InterestRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fromUserId: string;

  @Column()
  toUserId: string;

  @Column()
  fromAdId: string;

  @Column()
  toAdId: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'accepted', 'rejected', 'expired'],
  })
  status: 'pending' | 'accepted' | 'rejected' | 'expired';

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  compatibilityScore: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  porondamScore: number;

  @Column({ type: 'text', nullable: true })
  message: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  respondedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  // Relations
  @ManyToOne('User', 'sentInterests')
  @JoinColumn({ name: 'fromUserId' })
  fromUser: any;

  @ManyToOne('User', 'receivedInterests')
  @JoinColumn({ name: 'toUserId' })
  toUser: any;

  @ManyToOne('MatrimonialAd', 'sentInterests')
  @JoinColumn({ name: 'fromAdId' })
  fromAd: any;

  @ManyToOne('MatrimonialAd', 'receivedInterests')
  @JoinColumn({ name: 'toAdId' })
  toAd: any;

  @OneToOne('ContactExchange', 'interestRequest')
  contactExchange: any;

  @OneToMany('Notification', 'interestRequest')
  notifications: any[];
}
