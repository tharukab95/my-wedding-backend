import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { InterestRequest } from './interest-request.entity';
import { User } from './user.entity';

@Entity('interest_request_reads')
@Unique(['interestRequestId', 'userId'])
export class InterestRequestRead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  interestRequestId: string;

  @Column()
  userId: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  readAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => InterestRequest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'interestRequestId' })
  interestRequest: InterestRequest;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
