import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne, 
  JoinColumn, 
  CreateDateColumn 
} from 'typeorm';

@Entity('ad_photos')
export class AdPhoto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  matrimonialAdId: string;

  @Column()
  fileName: string;

  @Column()
  filePath: string;

  @Column()
  fileSize: number;

  @Column()
  mimeType: string;

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @Column({ default: false })
  isProfilePhoto: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne('MatrimonialAd', 'photos')
  @JoinColumn({ name: 'matrimonialAdId' })
  matrimonialAd: any;
}
