import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatrimonialAd } from '../../entities/matrimonial-ad.entity';
import { Match } from '../../entities/match.entity';
import { Interest } from '../../entities/interest.entity';
import { User } from '../../entities/user.entity';
import { AdPhoto } from '../../entities/ad-photo.entity';
import { ErrorCodes } from '../../dto/common.dto';

@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(MatrimonialAd)
    private matrimonialAdRepository: Repository<MatrimonialAd>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectRepository(Interest)
    private interestRepository: Repository<Interest>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AdPhoto)
    private adPhotoRepository: Repository<AdPhoto>,
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

    // Get existing interests for this ad
    const existingInterests = await this.interestRepository.find({
      where: { userId: matrimonialAd.userId },
    });
    const interestedAdIds = existingInterests.map((interest) => interest.adId);

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
        age: ad.age,
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

  async expressInterest(userId: string, adId: string) {
    // Check if interest already exists
    const existingInterest = await this.interestRepository.findOne({
      where: { userId, adId },
    });

    if (existingInterest) {
      throw new BadRequestException({
        code: ErrorCodes.INTEREST_ALREADY_EXPRESSED,
        message: 'Interest has already been expressed',
      });
    }

    const interest = this.interestRepository.create({
      userId,
      adId,
      status: 'pending',
    });

    const savedInterest = await this.interestRepository.save(interest);

    // TODO: Send notification to the ad owner

    return {
      interestId: savedInterest.id,
      adId: savedInterest.adId,
      status: savedInterest.status,
      createdAt: savedInterest.createdAt,
    };
  }

  async respondToInterest(interestId: string, status: 'accepted' | 'rejected') {
    const interest = await this.interestRepository.findOne({
      where: { id: interestId },
      relations: ['ad', 'user'],
    });

    if (!interest) {
      throw new NotFoundException({
        code: ErrorCodes.INTEREST_NOT_FOUND,
        message: 'Interest not found',
      });
    }

    await this.interestRepository.update(interestId, {
      status,
      respondedAt: new Date(),
    });

    let matchId: string | null = null;

    if (status === 'accepted') {
      // Create a match
      const match = this.matchRepository.create({
        user1Id: interest.userId,
        user2Id: (interest.ad as MatrimonialAd).userId,
        ad1Id: interest.adId,
        ad2Id: interest.adId,
        compatibilityScore: 0, // Will be calculated
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });

      const savedMatch = await this.matchRepository.save(match);
      matchId = savedMatch.id;

      // TODO: Send notification to both users
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
          name: `${otherAd.type} - ${otherAd.age} years`, // You might want to add name field
          age: otherAd.age,
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
