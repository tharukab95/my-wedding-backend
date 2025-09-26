/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InterestRequest } from '../../entities/interest-request.entity';
import { Match } from '../../entities/match.entity';
import { MatchRead } from '../../entities/match-read.entity';
import { InterestRequestRead } from '../../entities/interest-request-read.entity';

@Injectable()
export class UnifiedNotificationsService {
  constructor(
    @InjectRepository(InterestRequest)
    private interestRequestRepository: Repository<InterestRequest>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectRepository(MatchRead)
    private matchReadRepository: Repository<MatchRead>,
    @InjectRepository(InterestRequestRead)
    private interestRequestReadRepository: Repository<InterestRequestRead>,
  ) {}

  async getUnreadCounts(userId: string) {
    // Get all interest requests for this user
    const allInterestRequests = await this.interestRequestRepository.find({
      where: { toUserId: userId },
    });

    // Get all matches for this user
    const allMatches = await this.matchRepository.find({
      where: [{ user1Id: userId }, { user2Id: userId }],
    });

    // Get read status for interest requests
    const readInterestRequestIds = await this.interestRequestReadRepository
      .createQueryBuilder('irr')
      .select('irr.interestRequestId')
      .where('irr.userId = :userId', { userId })
      .getRawMany();

    const readInterestRequestIdSet = new Set(
      readInterestRequestIds.map((r) => r.irr_interestRequestId),
    );

    // Get read status for matches
    const readMatchIds = await this.matchReadRepository
      .createQueryBuilder('mr')
      .select('mr.matchId')
      .where('mr.userId = :userId', { userId })
      .getRawMany();

    const readMatchIdSet = new Set(readMatchIds.map((r: any) => r.mr_matchId));

    // Count unread items
    const unreadInterestRequests = allInterestRequests.filter(
      (ir) => !readInterestRequestIdSet.has(ir.id),
    ).length;

    const unreadMatches = allMatches.filter(
      (match) => !readMatchIdSet.has(match.id),
    ).length;

    return {
      interestRequests: unreadInterestRequests,
      matches: unreadMatches,
      total: unreadInterestRequests + unreadMatches,
    };
  }

  async getUnifiedNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    // Get all interest requests and matches for this user
    const [allInterestRequests, allMatches] = await Promise.all([
      this.interestRequestRepository.find({
        where: { toUserId: userId },
        order: { createdAt: 'DESC' },
      }),
      this.matchRepository.find({
        where: [{ user1Id: userId }, { user2Id: userId }],
        order: { createdAt: 'DESC' },
      }),
    ]);

    // Get read status for interest requests
    const readInterestRequestIds = await this.interestRequestReadRepository
      .createQueryBuilder('irr')
      .select('irr.interestRequestId')
      .where('irr.userId = :userId', { userId })
      .getRawMany();

    const readInterestRequestIdSet = new Set(
      readInterestRequestIds.map((r) => r.irr_interestRequestId),
    );

    // Get read status for matches
    const readMatchIds = await this.matchReadRepository
      .createQueryBuilder('mr')
      .select('mr.matchId')
      .where('mr.userId = :userId', { userId })
      .getRawMany();

    const readMatchIdSet = new Set(readMatchIds.map((r: any) => r.mr_matchId));

    // Get read timestamps for interest requests
    const readInterestRequestTimestamps =
      await this.interestRequestReadRepository
        .createQueryBuilder('irr')
        .select(['irr.interestRequestId', 'irr.readAt'])
        .where('irr.userId = :userId', { userId })
        .getRawMany();

    const readInterestRequestTimestampMap = new Map(
      readInterestRequestTimestamps.map((r: any) => [
        r.irr_interestRequestId,
        r.irr_readAt,
      ]),
    );

    // Get read timestamps for matches
    const readMatchTimestamps = await this.matchReadRepository
      .createQueryBuilder('mr')
      .select(['mr.matchId', 'mr.readAt'])
      .where('mr.userId = :userId', { userId })
      .getRawMany();

    const readMatchTimestampMap = new Map(
      readMatchTimestamps.map((r: any) => [r.mr_matchId, r.mr_readAt]),
    );

    // Combine and format notifications
    const notifications = [
      ...allInterestRequests.map((ir) => ({
        id: ir.id,
        type: 'interest_request',
        title: 'New Interest Received',
        message: 'Someone has expressed interest in your profile',
        isRead: readInterestRequestIdSet.has(ir.id),
        createdAt: ir.createdAt,
        readAt: readInterestRequestTimestampMap.get(ir.id) || null,
        metadata: {
          interestRequestId: ir.id,
          fromUserId: ir.fromUserId,
          adId: ir.toAdId,
          message: ir.message,
        },
      })),
      ...allMatches.map((match) => ({
        id: match.id,
        type: 'match',
        title: 'New Match!',
        message: 'You have a new match!',
        isRead: readMatchIdSet.has(match.id),
        createdAt: match.createdAt,
        readAt: readMatchTimestampMap.get(match.id) || null,
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

    const total = notifications.length;

    return {
      notifications: notifications.slice((page - 1) * limit, page * limit),
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
    // Check if the user is the recipient of this interest request
    const interestRequest = await this.interestRequestRepository.findOne({
      where: { id: interestRequestId, toUserId: userId },
    });

    if (!interestRequest) {
      return {
        success: false,
        affected: 0,
      };
    }

    // Create or update the read record
    const existingRead = await this.interestRequestReadRepository.findOne({
      where: { interestRequestId, userId },
    });

    if (existingRead) {
      // Update existing read record
      await this.interestRequestReadRepository.update(
        { interestRequestId, userId },
        { readAt: new Date() },
      );
    } else {
      // Create new read record
      await this.interestRequestReadRepository.save({
        interestRequestId,
        userId,
        readAt: new Date(),
      });
    }

    return {
      success: true,
      affected: 1,
    };
  }

  async markMatchAsRead(matchId: string, userId: string) {
    // Check if the user is part of this match
    const match = await this.matchRepository.findOne({
      where: [
        { id: matchId, user1Id: userId },
        { id: matchId, user2Id: userId },
      ],
    });

    if (!match) {
      return {
        success: false,
        affected: 0,
      };
    }

    // Create or update the read record
    const existingRead = await this.matchReadRepository.findOne({
      where: { matchId, userId },
    });

    if (existingRead) {
      // Update existing read record
      await this.matchReadRepository.update(
        { matchId, userId },
        { readAt: new Date() },
      );
    } else {
      // Create new read record
      await this.matchReadRepository.save({
        matchId,
        userId,
        readAt: new Date(),
      });
    }

    return {
      success: true,
      affected: 1,
    };
  }

  async markAllInterestRequestsAsRead(userId: string) {
    // Get all interest requests for this user that haven't been read yet
    const unreadInterestRequests = await this.interestRequestRepository
      .createQueryBuilder('ir')
      .leftJoin(
        'interest_request_reads',
        'irr',
        'irr.interestRequestId = ir.id AND irr.userId = :userId',
        { userId },
      )
      .where('ir.toUserId = :userId', { userId })
      .andWhere('irr.id IS NULL')
      .getMany();

    // Create read records for all unread interest requests
    const readRecords = unreadInterestRequests.map((ir) => ({
      interestRequestId: ir.id,
      userId,
      readAt: new Date(),
    }));

    if (readRecords.length > 0) {
      await this.interestRequestReadRepository.save(readRecords);
    }

    return {
      success: true,
      affected: readRecords.length,
    };
  }

  async markAllMatchesAsRead(userId: string) {
    // Get all matches for this user that haven't been read yet
    const unreadMatches = await this.matchRepository
      .createQueryBuilder('match')
      .leftJoin(
        'match_reads',
        'mr',
        'mr.matchId = match.id AND mr.userId = :userId',
        { userId },
      )
      .where('(match.user1Id = :userId OR match.user2Id = :userId)', { userId })
      .andWhere('mr.id IS NULL')
      .getMany();

    // Create read records for all unread matches
    const readRecords = unreadMatches.map((match) => ({
      matchId: match.id,
      userId,
      readAt: new Date(),
    }));

    if (readRecords.length > 0) {
      await this.matchReadRepository.save(readRecords);
    }

    return {
      success: true,
      affected: readRecords.length,
    };
  }
}
