import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('ad_contact_details')
export class AdContactDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  matrimonialAdId: string;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToOne('MatrimonialAd', 'contactDetails')
  @JoinColumn({ name: 'matrimonialAdId' })
  matrimonialAd: any;
}
