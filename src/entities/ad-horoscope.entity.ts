import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  OneToOne, 
  JoinColumn, 
  CreateDateColumn 
} from 'typeorm';

@Entity('ad_horoscopes')
export class AdHoroscope {
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

  @CreateDateColumn()
  createdAt: Date;

  @OneToOne('MatrimonialAd', 'horoscope')
  @JoinColumn({ name: 'matrimonialAdId' })
  matrimonialAd: any;
}
