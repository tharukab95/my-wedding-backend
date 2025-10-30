import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InterestRequest } from '../entities/interest-request.entity';
import { Match } from '../entities/match.entity';

@Injectable()
export class NotificationCountService {
  constructor(
    @InjectRepository(InterestRequest)
    private interestRequestRepository: Repository<InterestRequest>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
  ) {}

  async getUnreadCounts(userId: string) {
    try {
      const [interestRequests, matches] = await Promise.all([
        this.interestRequestRepository.count({
          where: { toUserId: userId, isRead: false },
        }),
        this.matchRepository.count({
          where: [
            { user1Id: userId, isRead: false },
            { user2Id: userId, isRead: false },
          ],
        }),
      ]);

      return {
        interestRequests,
        matches,
        total: interestRequests + matches,
      };
    } catch (error) {
      console.error('Error getting unread counts:', error);
      return {
        interestRequests: 0,
        matches: 0,
        total: 0,
      };
    }
  }

  async getInterestRequestCounts(userId: string) {
    try {
      const [received, sent] = await Promise.all([
        this.interestRequestRepository.count({
          where: { toUserId: userId },
        }),
        this.interestRequestRepository.count({
          where: { fromUserId: userId },
        }),
      ]);

      return { received, sent };
    } catch (error) {
      console.error('Error getting interest request counts:', error);
      return { received: 0, sent: 0 };
    }
  }

  async getMatchCounts(userId: string) {
    try {
      const total = await this.matchRepository.count({
        where: [{ user1Id: userId }, { user2Id: userId }],
      });

      return { total };
    } catch (error) {
      console.error('Error getting match counts:', error);
      return { total: 0 };
    }
  }
}
