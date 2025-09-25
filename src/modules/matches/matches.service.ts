import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatrimonialAd } from '../../entities/matrimonial-ad.entity';
import { Match } from '../../entities/match.entity';
import { InterestRequest } from '../../entities/interest-request.entity';
import { User } from '../../entities/user.entity';
import { AdPhoto } from '../../entities/ad-photo.entity';
import { ErrorCodes } from '../../dto/common.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { calculateAge } from '../../utils/age.util';

@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(MatrimonialAd)
    private matrimonialAdRepository: Repository<MatrimonialAd>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectRepository(InterestRequest)
    private interestRequestRepository: Repository<InterestRequest>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AdPhoto)
    private adPhotoRepository: Repository<AdPhoto>,
    private notificationsService: NotificationsService,
  ) {}

  async findMatches(adId: string, page: number = 1, limit: number = 20) {
    const matrimonialAd = await this.matrimonialAdRepository.findOne({
      where: { id: adId },
    });

    if (!matrimonialAd) {
      throw new NotFoundException({
        code: ErrorCodes.AD_NOT_FOUND,
        message: 'Matrimonial ad not found',
      });
    }

    // Build query for matching ads
    const query = this.matrimonialAdRepository
      .createQueryBuilder('ad')
      .leftJoinAndSelect('ad.user', 'user')
      .leftJoinAndSelect('ad.photos', 'photos')
      .where('ad.id != :adId', { adId })
      .andWhere('ad.status = :status', { status: 'active' })
      .andWhere('ad.type != :type', { type: matrimonialAd.type || 'bride' }); // Opposite gender

    // Add compatibility filters based on preferences
    // Note: Age preferences are now in lookingForPreferences table
    // This would need to be updated to join with looking_for_preferences table
    if (matrimonialAd.religion && matrimonialAd.religion !== 'Not specified') {
      query.andWhere('ad.religion = :religion', {
        religion: matrimonialAd.religion,
      });
    }
    if (matrimonialAd.location && matrimonialAd.location !== 'Not specified') {
      query.andWhere('ad.location = :location', {
        location: matrimonialAd.location,
      });
    }

    // Get total count
    const total = await query.getCount();

    // Get paginated results
    const ads = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    // Get existing interests sent by this user
    const existingInterests = await this.interestRequestRepository.find({
      where: { fromUserId: matrimonialAd.userId },
    });
    const interestedAdIds = existingInterests.map(
      (interest) => interest.toAdId,
    );

    // Format matches with compatibility scores
    const matches = ads.map((ad) => {
      const compatibilityScore = this.calculateCompatibilityScore(
        matrimonialAd,
        ad,
      );
      const profilePhoto = (ad.photos as AdPhoto[])?.find(
        (photo: AdPhoto) => photo.isProfilePhoto,
      );

      return {
        adId: ad.id,
        userId: ad.userId,
        type: ad.type,
        age: calculateAge(ad.birthday),
        profession: ad.profession,
        height: ad.height,
        location: ad.location,
        religion: ad.religion,
        ethnicity: ad.ethnicity,
        education: ad.education,
        compatibilityScore,
        profilePhoto: (profilePhoto as AdPhoto)?.filePath,
        isInterested: interestedAdIds.includes(ad.id),
      };
    });

    // Sort by compatibility score
    matches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

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

  async expressInterest(userId: string, adId: string, message?: string) {
    // Check if ad exists and is active
    const ad = await this.matrimonialAdRepository.findOne({
      where: { id: adId },
      relations: ['user'],
    });

    if (!ad) {
      throw new NotFoundException({
        code: ErrorCodes.AD_NOT_FOUND,
        message: 'Ad not found',
      });
    }

    if (ad.status !== 'active') {
      throw new BadRequestException({
        code: ErrorCodes.AD_NOT_ACTIVE,
        message: 'Ad is not active',
      });
    }

    // Check if user is trying to express interest in their own ad
    if (ad.userId === userId) {
      throw new BadRequestException({
        code: ErrorCodes.CANNOT_EXPRESS_INTEREST_OWN_AD,
        message: 'Cannot express interest in your own ad',
      });
    }

    // Get the user's own ad
    const userAd = await this.matrimonialAdRepository.findOne({
      where: { userId },
    });

    if (!userAd) {
      throw new BadRequestException({
        code: ErrorCodes.AD_NOT_FOUND,
        message: 'You must have an active matrimonial ad to express interest',
      });
    }

    // Check if interest already exists
    const existingInterest = await this.interestRequestRepository.findOne({
      where: { fromUserId: userId, toAdId: adId },
    });

    if (existingInterest) {
      throw new BadRequestException({
        code: ErrorCodes.INTEREST_ALREADY_EXPRESSED,
        message: 'Interest has already been expressed',
      });
    }

    // Create interest request
    const interestRequest = this.interestRequestRepository.create({
      fromUserId: userId,
      toUserId: ad.userId,
      fromAdId: userAd.id,
      toAdId: adId,
      status: 'pending',
      compatibilityScore: 0, // Will be calculated
      porondamScore: 0, // Will be calculated
      message: message || null,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    const savedInterest =
      await this.interestRequestRepository.save(interestRequest);

    // Send notification to ad owner
    await this.notificationsService.createNotification(
      ad.userId,
      'interest',
      'New Interest Received',
      `$Someone has expressed interest in your profile`,
      {
        interestId: savedInterest.id,
        fromUserId: userId,
        adId: adId,
        message: message,
      },
    );

    return {
      interestId: savedInterest.id,
      adId: savedInterest.toAdId,
      status: savedInterest.status,
      createdAt: savedInterest.createdAt,
    };
  }

  async getReceivedInterests(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    // Find user's ad
    const userAd = await this.matrimonialAdRepository.findOne({
      where: { userId },
    });

    if (!userAd) {
      throw new NotFoundException({
        code: ErrorCodes.AD_NOT_FOUND,
        message: 'User has no matrimonial ad',
      });
    }

    const query = this.interestRequestRepository
      .createQueryBuilder('interestRequest')
      .leftJoinAndSelect('interestRequest.fromUser', 'fromUser')
      .leftJoinAndSelect('interestRequest.fromAd', 'fromAd')
      .leftJoinAndSelect('fromAd.photos', 'photos')
      .where('interestRequest.toAdId = :adId', { adId: userAd.id })
      .orderBy('interestRequest.createdAt', 'DESC');

    const total = await query.getCount();

    const interests = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const formattedInterests = interests.map((interestRequest) => {
      const profilePhoto = (
        interestRequest.fromAd as MatrimonialAd
      ).photos?.find((photo: any) => (photo as AdPhoto).isProfilePhoto) as
        | AdPhoto
        | undefined;

      return {
        interestId: interestRequest.id,
        fromUser: {
          id: (interestRequest.fromUser as User).id,
          firebaseUserId: (interestRequest.fromUser as User).firebaseUserId,
        },
        ad: {
          id: (interestRequest.fromAd as MatrimonialAd).id,
          type: (interestRequest.fromAd as MatrimonialAd).type,
          age: calculateAge((interestRequest.fromAd as MatrimonialAd).birthday),
          profession: (interestRequest.fromAd as MatrimonialAd).profession,
          location: (interestRequest.fromAd as MatrimonialAd).location,
          profilePhoto: profilePhoto?.filePath,
        },
        message: interestRequest.message,
        compatibilityScore: interestRequest.compatibilityScore,
        porondamScore: interestRequest.porondamScore,
        status: interestRequest.status,
        createdAt: interestRequest.createdAt,
        respondedAt: interestRequest.respondedAt,
        expiresAt: interestRequest.expiresAt,
      };
    });

    return {
      interests: formattedInterests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async respondToInterest(interestId: string, status: 'accepted' | 'rejected') {
    const interestRequest = await this.interestRequestRepository.findOne({
      where: { id: interestId },
      relations: ['fromUser', 'toUser', 'fromAd', 'toAd'],
    });

    if (!interestRequest) {
      throw new NotFoundException({
        code: ErrorCodes.INTEREST_NOT_FOUND,
        message: 'Interest request not found',
      });
    }

    if (interestRequest.status !== 'pending') {
      throw new BadRequestException({
        code: ErrorCodes.INTEREST_ALREADY_RESPONDED,
        message: 'Interest has already been responded to',
      });
    }

    await this.interestRequestRepository.update(interestId, {
      status,
      respondedAt: new Date(),
    });

    let matchId: string | null = null;

    if (status === 'accepted') {
      // Create a match
      const match = this.matchRepository.create({
        user1Id: interestRequest.fromUserId,
        user2Id: interestRequest.toUserId,
        ad1Id: interestRequest.fromAdId,
        ad2Id: interestRequest.toAdId,
        compatibilityScore: interestRequest.compatibilityScore,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });

      const savedMatch = await this.matchRepository.save(match);
      matchId = savedMatch.id;

      // Send notification to the user who expressed interest
      await this.notificationsService.createNotification(
        interestRequest.fromUserId,
        'match',
        'Interest Accepted!',
        'Your interest has been accepted. You have a new match!',
        {
          matchId: savedMatch.id,
          interestId: interestId,
        },
      );
    } else {
      // Send notification for rejection
      await this.notificationsService.createNotification(
        interestRequest.fromUserId,
        'interest',
        'Interest Response',
        'Your interest was not accepted at this time.',
        {
          interestId: interestId,
          status: 'rejected',
        },
      );
    }

    return {
      interestId,
      status,
      respondedAt: new Date(),
      matchId,
    };
  }

  async getMyMatches(
    userId: string,
    status?: string,
    page: number = 1,
    limit: number = 20,
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

    if (status) {
      query.andWhere('match.status = :status', { status });
    }

    const total = await query.getCount();

    const matches = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const formattedMatches = matches.map((match) => {
      const otherUser = (
        match.user1Id === userId ? match.user2 : match.user1
      ) as User;
      const otherAd = (
        match.ad1Id === (match.ad1 as MatrimonialAd).id ? match.ad2 : match.ad1
      ) as MatrimonialAd;

      return {
        matchId: match.id,
        otherUser: {
          userId: otherUser.id,
          name: `${otherAd.type} - ${calculateAge(otherAd.birthday)} years`, // You might want to add name field
          age: calculateAge(otherAd.birthday),
          profession: otherAd.profession,
          location: otherAd.location,
          profilePhoto: null, // Get from photos
        },
        compatibilityScore: match.compatibilityScore,
        status: match.status,
        createdAt: match.createdAt,
        expiresAt: match.expiresAt,
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

  async respondToMatch(matchId: string, status: 'accepted' | 'rejected') {
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException({
        code: ErrorCodes.MATCH_NOT_FOUND,
        message: 'Match not found',
      });
    }

    await this.matchRepository.update(matchId, {
      status,
      respondedAt: new Date(),
    });

    // TODO: Send notification to both users

    return {
      matchId,
      status,
      respondedAt: new Date(),
    };
  }

  private calculateCompatibilityScore(
    ad1: MatrimonialAd,
    ad2: MatrimonialAd,
  ): number {
    let score = 0;
    let factors = 0;

    // Age compatibility (moved to lookingForPreferences table)
    // This would need to be updated to use lookingForPreferences data

    // Religion compatibility
    if (ad1.religion && ad2.religion && ad1.religion === ad2.religion) {
      score += 15;
    }
    factors++;

    // Location compatibility
    if (ad1.location && ad2.location && ad1.location === ad2.location) {
      score += 10;
    }
    factors++;

    // Education compatibility (moved to lookingForPreferences table)
    // This would need to be updated to use lookingForPreferences data

    // Profession compatibility (if specified in preferences)
    // This would need to be enhanced based on preferredProfessions

    // Ethnicity compatibility
    if (ad1.ethnicity && ad2.ethnicity && ad1.ethnicity === ad2.ethnicity) {
      score += 5;
    }
    factors++;

    return Math.round((score / factors) * 100) || 0;
  }
}
