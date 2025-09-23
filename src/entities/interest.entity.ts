import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('interests')
export class Interest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  adId: string;

  @Column({ default: 'pending' })
  status: 'pending' | 'accepted' | 'rejected';

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  respondedAt: Date;

  // Relations
  @ManyToOne('User', 'interests')
  @JoinColumn({ name: 'userId' })
  user: any;

  @ManyToOne('MatrimonialAd', 'interests')
  @JoinColumn({ name: 'adId' })
  ad: any;
}
