import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  OneToOne,
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

  @Column({ nullable: true })
  name: string;

  @Column({ default: false })
  isVerified: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToOne('MatrimonialAd', 'user')
  matrimonialAd: any;

  @OneToMany('Notification', 'user')
  notifications: any[];
}
