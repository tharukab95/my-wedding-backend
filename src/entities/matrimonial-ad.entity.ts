import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('matrimonial_ads')
export class MatrimonialAd {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  userId: string;

  @Column({ type: 'int', default: 1 })
  currentPhase: number;

  @Column({ default: 'draft' })
  status: 'draft' | 'active' | 'inactive' | 'expired';

  // Phase 1: Advertiser Info

  @Column({ type: 'varchar', nullable: true })
  advertiserType: 'self' | 'parent' | 'guardian' | null;

  // Phase 2: Personal Details
  @Column({ type: 'varchar', nullable: true })
  type: 'bride' | 'groom' | null;

  @Column({ type: 'date', nullable: true })
  birthday: Date | null;

  @Column({ type: 'time', nullable: true })
  birthTime: string | null;

  @Column({ type: 'varchar', nullable: true })
  profession: string | null;

  @Column({ type: 'varchar', nullable: true })
  height: string | null;

  @Column({ type: 'varchar', nullable: true })
  caste: string | null;

  @Column({ type: 'varchar', nullable: true })
  religion: string | null;

  @Column({ type: 'varchar', nullable: true })
  ethnicity: string | null;

  @Column({ type: 'varchar', nullable: true })
  maritalStatus: string | null;

  @Column({ type: 'varchar', nullable: true })
  hasChildren: string | null;

  @Column({ type: 'varchar', nullable: true })
  location: string | null;

  @Column({ type: 'varchar', nullable: true })
  education: string | null;

  // Simple arrays as JSON
  @Column({ type: 'json', nullable: true })
  languages: string[] | null;

  @Column({ type: 'json', nullable: true })
  hobbies: string[] | null;

  // Additional Phase 2 fields
  @Column({ type: 'varchar', nullable: true })
  skinColor: string | null;

  @Column({ default: false })
  isDrinking: boolean;

  @Column({ default: false })
  isSmoking: boolean;

  // Phase 3: Family Info
  @Column({ type: 'varchar', nullable: true })
  fatherProfession: string | null;

  @Column({ type: 'varchar', nullable: true })
  motherProfession: string | null;

  @Column({ type: 'varchar', nullable: true })
  familyStatus: string | null;

  @Column({ type: 'int', nullable: true })
  brothersCount: number | null;

  @Column({ type: 'int', nullable: true })
  sistersCount: number | null;

  // Phase 4: Photos (just count, files stored separately)
  @Column({ type: 'int', default: 0 })
  photosCount: number;

  // Phase 5: Horoscope (just flag, file stored separately)
  @Column({ default: false })
  hasHoroscope: boolean;

  // Phase 7: Assets (simple array as JSON)
  @Column({ type: 'json', nullable: true })
  assets: string[] | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  // Boosted ads for premium placement
  @Column({ default: false })
  isBoosted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  boostedAt: Date | null;

  // Relations
  @ManyToOne('User', 'matrimonialAds')
  @JoinColumn({ name: 'userId' })
  user: any;

  @OneToMany('AdPhoto', 'matrimonialAd')
  photos: any[];

  @OneToOne('AdHoroscope', 'matrimonialAd')
  horoscope: any;

  @OneToMany('Match', 'ad1')
  matchesAsAd1: any[];

  @OneToMany('Match', 'ad2')
  matchesAsAd2: any[];

  @OneToMany('InterestRequest', 'toAd')
  interestRequests: any[];

  @OneToOne('LookingForPreferences', 'matrimonialAd')
  lookingForPreferences: any;
}
