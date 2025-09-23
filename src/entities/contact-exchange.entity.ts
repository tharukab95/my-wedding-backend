import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('contact_exchanges')
export class ContactExchange {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  interestRequestId: string;

  @Column()
  fromUserId: string;

  @Column()
  toUserId: string;

  @Column({ type: 'json' })
  sharedContactInfo: {
    phone?: string;
    email?: string;
    address?: string;
  };

  @Column({ default: false })
  photosShared: boolean;

  @Column({ default: false })
  horoscopeShared: boolean;

  @Column({ default: false })
  isMutual: boolean; // Both parties agreed to share

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @OneToOne('InterestRequest', 'contactExchange')
  @JoinColumn({ name: 'interestRequestId' })
  interestRequest: any;

  @ManyToOne('User')
  @JoinColumn({ name: 'fromUserId' })
  fromUser: any;

  @ManyToOne('User')
  @JoinColumn({ name: 'toUserId' })
  toUser: any;
}
