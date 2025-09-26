import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('contact_exchanges')
export class ContactExchange {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  interestRequestId: string;

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
}
