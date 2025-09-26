/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InterestRequest } from '../../entities/interest-request.entity';
import { Match } from '../../entities/match.entity';

@Injectable()
export class UnifiedNotificationsService {
  constructor(
    @InjectRepository(InterestRequest)
    private interestRequestRepository: Repository<InterestRequest>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
  ) {}

  async getUnreadCounts(userId: string) {
    const [interestRequestsCount, matchesCount] = await Promise.all([
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
      interestRequests: interestRequestsCount,
      matches: matchesCount,
      total: interestRequestsCount + matchesCount,
    };
  }

  async getUnifiedNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    // Get interest requests
    const interestRequests = await this.interestRequestRepository.find({
      where: { toUserId: userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get matches
    const matches = await this.matchRepository.find({
      where: [{ user1Id: userId }, { user2Id: userId }],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Combine and format notifications
    const notifications = [
      ...interestRequests.map((ir) => ({
        id: ir.id,
        type: 'interest_request',
        title: 'New Interest Received',
        message: 'Someone has expressed interest in your profile',
        isRead: ir.isRead,
        createdAt: ir.createdAt,
        readAt: ir.readAt,
        metadata: {
          interestRequestId: ir.id,
          fromUserId: ir.fromUserId,
          adId: ir.toAdId,
          message: ir.message,
        },
      })),
      ...matches.map((match) => ({
        id: match.id,
        type: 'match',
        title: 'New Match!',
        message: 'You have a new match!',
        isRead: match.isRead,
        createdAt: match.createdAt,
        readAt: match.readAt,
        metadata: {
          matchId: match.id,
          user1Id: match.user1Id,
          user2Id: match.user2Id,
          ad1Id: match.ad1Id,
          ad2Id: match.ad2Id,
        },
      })),
    ];

    // Sort by creation date (newest first)
    notifications.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    // Get total count for pagination
    const [totalInterestRequests, totalMatches] = await Promise.all([
      this.interestRequestRepository.count({ where: { toUserId: userId } }),
      this.matchRepository.count({
        where: [{ user1Id: userId }, { user2Id: userId }],
      }),
    ]);

    const total = totalInterestRequests + totalMatches;

    return {
      notifications: notifications.slice(0, limit),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getInterestRequests(
    userId: string,
    page: number = 1,
    limit: number = 20,
    includeRead: boolean = false,
  ) {
    const whereCondition: any = { toUserId: userId };

    if (!includeRead) {
      whereCondition.isRead = false;
    }

    const query = this.interestRequestRepository
      .createQueryBuilder('interestRequest')
      .leftJoinAndSelect('interestRequest.fromUser', 'fromUser')
      .leftJoinAndSelect('interestRequest.fromAd', 'fromAd')
      .leftJoinAndSelect('fromAd.photos', 'photos')
      .where('interestRequest.toUserId = :userId', { userId });

    if (!includeRead) {
      query.andWhere('interestRequest.isRead = false');
    }

    const total = await query.getCount();

    const interestRequests = await query
      .orderBy('interestRequest.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      interestRequests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMatches(
    userId: string,
    page: number = 1,
    limit: number = 20,
    includeRead: boolean = false,
  ) {
    const query = this.matchRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.user1', 'user1')
      .leftJoinAndSelect('match.user2', 'user2')
      .leftJoinAndSelect('match.ad1', 'ad1')
      .leftJoinAndSelect('match.ad2', 'ad2')
      .where('(match.user1Id = :userId OR match.user2Id = :userId)', {
        userId,
      });

    if (!includeRead) {
      query.andWhere('match.isRead = false');
    }

    const total = await query.getCount();

    const matches = await query
      .orderBy('match.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      matches,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async markInterestRequestAsRead(interestRequestId: string, userId: string) {
    const result = await this.interestRequestRepository.update(
      { id: interestRequestId, toUserId: userId },
      { isRead: true, readAt: new Date() },
    );

    return {
      success: (result.affected || 0) > 0,
      affected: result.affected || 0,
    };
  }

  async markMatchAsRead(matchId: string, userId: string) {
    const result = await this.matchRepository.update(
      { id: matchId, user1Id: userId },
      { isRead: true, readAt: new Date() },
    );

    if ((result.affected || 0) === 0) {
      // Try as user2
      const result2 = await this.matchRepository.update(
        { id: matchId, user2Id: userId },
        { isRead: true, readAt: new Date() },
      );
      return {
        success: (result2.affected || 0) > 0,
        affected: result2.affected || 0,
      };
    }

    return {
      success: (result.affected || 0) > 0,
      affected: result.affected || 0,
    };
  }

  async markAllInterestRequestsAsRead(userId: string) {
    const result = await this.interestRequestRepository.update(
      { toUserId: userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );

    return {
      success: true,
      affected: result.affected || 0,
    };
  }

  async markAllMatchesAsRead(userId: string) {
    const result = await this.matchRepository.update(
      [
        { user1Id: userId, isRead: false },
        { user2Id: userId, isRead: false },
      ],
      { isRead: true, readAt: new Date() },
    );

    return {
      success: true,
      affected: result.affected || 0,
    };
  }
}
