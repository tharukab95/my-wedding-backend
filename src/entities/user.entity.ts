import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  firebaseUserId: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ default: false })
  isVerified: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany('MatrimonialAd', 'user')
  matrimonialAds: any[];

  @OneToMany('Match', 'user1')
  matchesAsUser1: any[];

  @OneToMany('Match', 'user2')
  matchesAsUser2: any[];

  @OneToMany('Notification', 'user')
  notifications: any[];

  @OneToMany('InterestRequest', 'fromUser')
  sentInterestRequests: any[];

  @OneToMany('InterestRequest', 'toUser')
  receivedInterestRequests: any[];

  @OneToMany('Message', 'sender')
  sentMessages: any[];

  @OneToMany('Message', 'receiver')
  receivedMessages: any[];
}
