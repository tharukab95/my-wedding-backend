import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MatrimonialAd } from './matrimonial-ad.entity';

@Entity('looking_for_preferences')
export class LookingForPreferences {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  matrimonialAdId: string;

  // Migration preferences
  @Column({ type: 'varchar', nullable: true })
  migrationPlans: string | null;

  // Physical preferences
  @Column({ type: 'varchar', nullable: true })
  skinTone: string | null;

  // Age preferences
  @Column({ type: 'varchar', nullable: true })
  minAge: string | null;

  @Column({ type: 'varchar', nullable: true })
  maxAge: string | null;

  // Education preference
  @Column({ type: 'varchar', nullable: true })
  preferredEducation: string | null;

  // Profession preferences (stored as JSON array for better querying)
  @Column({ type: 'json', nullable: true })
  preferredProfessions: string[] | null;

  // Habit preferences (stored as JSON array for better querying)
  @Column({ type: 'json', nullable: true })
  preferredHabits: string[] | null;

  // Additional preferences that might be added later
  @Column({ type: 'json', nullable: true })
  additionalPreferences: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToOne('MatrimonialAd', 'lookingForPreferences')
  @JoinColumn({ name: 'matrimonialAdId' })
  matrimonialAd: any;
}
