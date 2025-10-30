/* eslint-disable @typescript-eslint/no-unused-vars */
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
import { calculateAge } from '../../utils/age.util';

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

    // Format interest requests with basic ad details
    const formattedInterestRequests = interestRequests.map(
      (interestRequest) => {
        const fromAd = interestRequest.fromAd;
        const fromUser = interestRequest.fromUser;

        return {
          ...interestRequest,
          fromAd: {
            id: fromAd.id,
            type: fromAd.type,
            name: fromUser.name || null,
            age: fromAd.birthday ? calculateAge(fromAd.birthday as Date) : null,
            location: fromAd.location,
            profession: fromAd.profession,
            photos: fromAd.photos || [],
          },
          fromUser: {
            id: fromUser.id,
            firebaseUserId: fromUser.firebaseUserId,
            name: fromUser.name || null,
          },
        };
      },
    );

    return {
      interestRequests: formattedInterestRequests,
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

    // Format matches with basic ad details
    const formattedMatches = matches.map((match) => {
      const user1 = match.user1;
      const user2 = match.user2;
      const ad1 = match.ad1;
      const ad2 = match.ad2;

      return {
        ...match,
        user1: {
          id: user1.id,
          firebaseUserId: user1.firebaseUserId,
          name: user1.name || null,
        },
        user2: {
          id: user2.id,
          firebaseUserId: user2.firebaseUserId,
          name: user2.name || null,
        },
        ad1: {
          id: ad1.id,
          type: ad1.type,
          name: user1.name || null,
          age: ad1.birthday ? calculateAge(ad1.birthday as Date) : null,
          location: ad1.location,
          profession: ad1.profession,
        },
        ad2: {
          id: ad2.id,
          type: ad2.type,
          name: user2.name || null,
          age: ad2.birthday ? calculateAge(ad2.birthday as Date) : null,
          location: ad2.location,
          profession: ad2.profession,
        },
      };
    });

    return {
      matches: formattedMatches,
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

  async getSentInterests(
    userId: string,
    page: number = 1,
    limit: number = 20,
    includeRead: boolean = false,
  ) {
    const query = this.interestRequestRepository
      .createQueryBuilder('interestRequest')
      .leftJoinAndSelect('interestRequest.toUser', 'toUser')
      .leftJoinAndSelect('interestRequest.toAd', 'toAd')
      .leftJoinAndSelect('toAd.photos', 'photos')
      .where('interestRequest.fromUserId = :userId', { userId });

    if (!includeRead) {
      // For sent interests, we need to check if the recipient has read the interest request
      query
        .leftJoin(
          'interest_request_reads',
          'irr',
          'irr.interestRequestId = interestRequest.id AND irr.userId = interestRequest.toUserId',
        )
        .andWhere('irr.id IS NULL');
    }

    const total = await query.getCount();

    const sentInterests = await query
      .orderBy('interestRequest.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    // Get read status for each sent interest
    const interestRequestIds = sentInterests.map((ir) => ir.id);
    const readStatuses = await this.interestRequestReadRepository
      .createQueryBuilder('irr')
      .select(['irr.interestRequestId', 'irr.readAt'])
      .where('irr.interestRequestId IN (:...ids)', { ids: interestRequestIds })
      .andWhere('irr.userId IN (:...recipientIds)', {
        recipientIds: sentInterests.map((ir) => ir.toUserId),
      })
      .getRawMany();

    const readStatusMap = new Map(
      readStatuses.map((r: any) => [
        r.irr_interestRequestId,
        { isRead: true, readAt: r.irr_readAt },
      ]),
    );

    // Format sent interests with basic ad details and read status
    const sentInterestsWithReadStatus = sentInterests.map((interest) => {
      const toAd = interest.toAd;
      const toUser = interest.toUser;

      return {
        ...interest,
        isRead: readStatusMap.has(interest.id),
        readAt: readStatusMap.get(interest.id)?.readAt || null,
        toAd: {
          id: toAd.id,
          type: toAd.type,
          name: toUser.name || null,
          age: toAd.birthday ? calculateAge(toAd.birthday as Date) : null,
          location: toAd.location,
          profession: toAd.profession,
          photos: toAd.photos || [],
        },
        toUser: {
          id: toUser.id,
          firebaseUserId: toUser.firebaseUserId,
          name: toUser.name || null,
        },
      };
    });

    return {
      sentInterests: sentInterestsWithReadStatus,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUnreadCounts(userId: string) {
    try {
      // Unread interestRequests: to this user, and no entry in interest_request_reads for (interestRequestId, userId)
      const unreadInterestRequestCount = await this.interestRequestRepository
        .createQueryBuilder('ir')
        .where('ir."toUserId" = :userId', { userId })
        .andWhere(
          (qb) =>
            `NOT EXISTS (SELECT 1 FROM interest_request_reads irr WHERE irr."interestRequestId" = ir.id AND irr."userId" = :userId)`,
        )
        .setParameter('userId', userId)
        .getCount();

      // Unread matches: match involves user, and no entry in match_reads for (matchId, userId)
      const unreadMatchCount = await this.matchRepository
        .createQueryBuilder('m')
        .where('(m."user1Id" = :userId OR m."user2Id" = :userId)', { userId })
        .andWhere(
          (qb) =>
            `NOT EXISTS (SELECT 1 FROM match_reads mr WHERE mr."matchId" = m.id AND mr."userId" = :userId)`,
        )
        .setParameter('userId', userId)
        .getCount();

      return {
        interestRequests: unreadInterestRequestCount,
        matches: unreadMatchCount,
        total: unreadInterestRequestCount + unreadMatchCount,
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
}
