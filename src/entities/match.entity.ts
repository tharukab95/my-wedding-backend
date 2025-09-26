import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('matches')
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user1Id: string;

  @Column()
  user2Id: string;

  @Column()
  ad1Id: string;

  @Column()
  ad2Id: string;

  @Column({ type: 'float', default: 0 })
  compatibilityScore: number;

  @Column({ default: 'pending' })
  status: 'pending' | 'accepted' | 'rejected' | 'expired';

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  respondedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date | null;

  // Relations
  @ManyToOne('User', 'matchesAsUser1')
  @JoinColumn({ name: 'user1Id' })
  user1: any;

  @ManyToOne('User', 'matchesAsUser2')
  @JoinColumn({ name: 'user2Id' })
  user2: any;

  @ManyToOne('MatrimonialAd', 'matchesAsAd1')
  @JoinColumn({ name: 'ad1Id' })
  ad1: any;

  @ManyToOne('MatrimonialAd', 'matchesAsAd2')
  @JoinColumn({ name: 'ad2Id' })
  ad2: any;
}
