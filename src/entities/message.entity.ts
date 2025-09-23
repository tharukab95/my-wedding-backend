import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  senderId: string;

  @Column()
  receiverId: string;

  @Column()
  matchId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;

  // Relations
  @ManyToOne('User', 'sentMessages')
  @JoinColumn({ name: 'senderId' })
  sender: any;

  @ManyToOne('User', 'receivedMessages')
  @JoinColumn({ name: 'receiverId' })
  receiver: any;

  @ManyToOne('Match', 'messages')
  @JoinColumn({ name: 'matchId' })
  match: any;
}
