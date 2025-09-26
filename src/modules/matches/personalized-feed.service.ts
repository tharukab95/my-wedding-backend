/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatrimonialAd } from '../../entities/matrimonial-ad.entity';
import {
  UserAdInteraction,
  InteractionType,
} from '../../entities/user-ad-interaction.entity';
import { InterestRequest } from '../../entities/interest-request.entity';

export interface PersonalizedFeedOptions {
  page?: number;
  limit?: number;
  minAge?: number;
  maxAge?: number;
  type?: 'bride' | 'groom';
  location?: string;
  religion?: string;
  education?: string;
  profession?: string;
  caste?: string;
  ethnicity?: string;
  maritalStatus?: string;
  hasChildren?: boolean;
  isDrinking?: boolean;
  isSmoking?: boolean;
  skinColor?: string;
}

export interface PersonalizedAdResult {
  adId: string;
  userId: string;
  type: string;
  age: number;
  profession: string | null;
  height: string | null;
  location: string | null;
  religion: string | null;
  ethnicity: string | null;
  education: string | null;
  compatibilityScore: number;
  profilePhoto: string | null;
  isInterested: boolean;
  interactionHistory: {
    hasViewed: boolean;
    hasExpressedInterest: boolean;
    hasRejected: boolean;
    lastInteractionAt: Date | null;
  };
  feedScore: number; // Higher score = better placement in feed
}

@Injectable()
export class PersonalizedFeedService {
  constructor(
    @InjectRepository(MatrimonialAd)
    private matrimonialAdRepository: Repository<MatrimonialAd>,
    @InjectRepository(UserAdInteraction)
    private userAdInteractionRepository: Repository<UserAdInteraction>,
    @InjectRepository(InterestRequest)
    private interestRequestRepository: Repository<InterestRequest>,
  ) {}

  async getPersonalizedFeed(
    userId: string,
    options: PersonalizedFeedOptions = {},
  ): Promise<{
    ads: PersonalizedAdResult[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const {
      page = 1,
      limit = 20,
      minAge,
      maxAge,
      type,
      location,
      religion,
      education,
      profession,
      caste,
      ethnicity,
      maritalStatus,
      hasChildren,
      isDrinking,
      isSmoking,
      skinColor,
    } = options;

    // Get user's own ad to determine preferences
    const userAd = await this.matrimonialAdRepository.findOne({
      where: { userId },
    });

    if (!userAd) {
      return {
        ads: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      };
    }

    // Build base query for matching ads
    const query = this.matrimonialAdRepository
      .createQueryBuilder('ad')
      .leftJoinAndSelect('ad.user', 'user')
      .leftJoinAndSelect('ad.photos', 'photos')
      .where('ad.id != :userAdId', { userAdId: userAd.id })
      .andWhere('ad.status = :status', { status: 'active' })
      .andWhere('ad.type != :type', { type: userAd.type || 'bride' }); // Opposite gender

    // Apply filters
    if (minAge) {
      query.andWhere('EXTRACT(YEAR FROM AGE(ad.birthday)) >= :minAge', {
        minAge,
      });
    }
    if (maxAge) {
      query.andWhere('EXTRACT(YEAR FROM AGE(ad.birthday)) <= :maxAge', {
        maxAge,
      });
    }
    if (type) {
      query.andWhere('ad.type = :type', { type });
    }
    if (location) {
      query.andWhere('ad.location ILIKE :location', {
        location: `%${location}%`,
      });
    }
    if (religion) {
      query.andWhere('ad.religion = :religion', { religion });
    }
    if (education) {
      query.andWhere('ad.education ILIKE :education', {
        education: `%${education}%`,
      });
    }
    if (profession) {
      query.andWhere('ad.profession ILIKE :profession', {
        profession: `%${profession}%`,
      });
    }
    if (caste) {
      query.andWhere('ad.caste = :caste', { caste });
    }
    if (ethnicity) {
      query.andWhere('ad.ethnicity = :ethnicity', { ethnicity });
    }
    if (maritalStatus) {
      query.andWhere('ad.maritalStatus = :maritalStatus', { maritalStatus });
    }
    if (hasChildren !== undefined) {
      query.andWhere('ad.hasChildren = :hasChildren', { hasChildren });
    }
    if (isDrinking !== undefined) {
      query.andWhere('ad.isDrinking = :isDrinking', { isDrinking });
    }
    if (isSmoking !== undefined) {
      query.andWhere('ad.isSmoking = :isSmoking', { isSmoking });
    }
    if (skinColor) {
      query.andWhere('ad.skinTone = :skinColor', { skinColor });
    }

    // Get all matching ads
    const allAds = await query.getMany();

    // Get user's interaction history with these ads
    const adIds = allAds.map((ad) => ad.id);
    const interactions = await this.userAdInteractionRepository.find({
      where: { userId, adId: { $in: adIds } as any },
    });

    // Get existing interest requests
    const existingInterests = await this.interestRequestRepository.find({
      where: { fromUserId: userId },
    });
    const interestedAdIds = new Set(existingInterests.map((ir) => ir.toAdId));

    // Create interaction map
    const interactionMap = new Map();
    interactions.forEach((interaction) => {
      if (!interactionMap.has(interaction.adId)) {
        interactionMap.set(interaction.adId, {
          hasViewed: false,
          hasExpressedInterest: false,
          hasRejected: false,
          lastInteractionAt: null,
        });
      }
      const history = interactionMap.get(interaction.adId);

      switch (interaction.interactionType) {
        case InteractionType.VIEWED:
          history.hasViewed = true;
          break;
        case InteractionType.EXPRESSED_INTEREST:
          history.hasExpressedInterest = true;
          break;
        case InteractionType.REJECTED:
          history.hasRejected = true;
          break;
      }

      if (
        !history.lastInteractionAt ||
        interaction.updatedAt > history.lastInteractionAt
      ) {
        history.lastInteractionAt = interaction.updatedAt;
      }
    });

    // Calculate personalized scores and sort
    const personalizedAds = allAds.map((ad) => {
      const compatibilityScore = this.calculateCompatibilityScore(userAd, ad);
      const feedScore = this.calculateFeedScore(
        ad,
        interactionMap.get(ad.id),
        compatibilityScore,
      );
      const profilePhoto =
        ad.photos?.find((photo) => photo.isProfilePhoto)?.filePath || null;

      return {
        adId: ad.id,
        userId: ad.userId,
        type: ad.type || 'bride',
        age: ad.birthday ? this.calculateAge(ad.birthday) : 0,
        profession: ad.profession,
        height: ad.height,
        location: ad.location,
        religion: ad.religion,
        ethnicity: ad.ethnicity,
        education: ad.education,
        compatibilityScore,
        profilePhoto,
        isInterested: interestedAdIds.has(ad.id),
        interactionHistory: interactionMap.get(ad.id) || {
          hasViewed: false,
          hasExpressedInterest: false,
          hasRejected: false,
          lastInteractionAt: null,
        },
        feedScore,
      };
    });

    // Sort by feed score (highest first)
    personalizedAds.sort((a, b) => b.feedScore - a.feedScore);

    // Apply pagination
    const total = personalizedAds.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedAds = personalizedAds.slice(startIndex, endIndex);

    return {
      ads: paginatedAds,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private calculateFeedScore(
    ad: MatrimonialAd,
    interactionHistory: any,
    compatibilityScore: number,
  ): number {
    let score = compatibilityScore; // Base score from compatibility

    // Boost for unseen ads (never interacted with)
    if (!interactionHistory) {
      score += 50; // Significant boost for fresh profiles
    } else {
      // Penalize based on interaction history
      if (interactionHistory.hasRejected) {
        score -= 100; // Heavy penalty for rejected ads
      }
      if (interactionHistory.hasExpressedInterest) {
        score -= 20; // Small penalty for already interested (they know about it)
      }
      if (interactionHistory.hasViewed) {
        score -= 10; // Small penalty for viewed ads
      }

      // Time-based decay for old interactions
      if (interactionHistory.lastInteractionAt) {
        const daysSinceInteraction = Math.floor(
          (Date.now() - interactionHistory.lastInteractionAt.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        if (daysSinceInteraction > 7) {
          score += Math.min(daysSinceInteraction * 2, 30); // Gradual boost over time
        }
      }
    }

    // Boost for recently created ads
    const daysSinceCreation = Math.floor(
      (Date.now() - ad.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceCreation < 7) {
      score += 20; // Boost for new ads
    }

    // Boost for ads with photos
    if (ad.photos && ad.photos.length > 0) {
      score += 15;
    }

    // Boost for complete profiles
    const completenessScore = this.calculateProfileCompleteness(ad);
    score += completenessScore * 10;

    return Math.max(score, 0); // Ensure non-negative score
  }

  private calculateProfileCompleteness(ad: MatrimonialAd): number {
    let completedFields = 0;
    const totalFields = 15; // Total number of important fields

    const fields = [
      ad.profession,
      ad.height,
      ad.caste,
      ad.religion,
      ad.ethnicity,
      ad.education,
      ad.location,
      ad.maritalStatus,
      ad.fatherProfession,
      ad.motherProfession,
      ad.familyStatus,
      ad.brothersCount !== null,
      ad.sistersCount !== null,
      ad.languages,
      ad.hobbies,
    ];

    completedFields = fields.filter(
      (field) => field !== null && field !== undefined && field !== '',
    ).length;

    return completedFields / totalFields;
  }

  private calculateCompatibilityScore(
    ad1: MatrimonialAd,
    ad2: MatrimonialAd,
  ): number {
    let score = 0;
    let factors = 0;

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

    // Ethnicity compatibility
    if (ad1.ethnicity && ad2.ethnicity && ad1.ethnicity === ad2.ethnicity) {
      score += 5;
    }
    factors++;

    return Math.round((score / factors) * 100) || 0;
  }

  private calculateAge(birthday: Date): number {
    if (!birthday) return 0;
    const today = new Date();
    const birthDate = new Date(birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  }

  async recordInteraction(
    userId: string,
    adId: string,
    interactionType: InteractionType,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.userAdInteractionRepository.upsert(
      {
        userId,
        adId,
        interactionType,
        metadata,
      },
      ['userId', 'adId'],
    );
  }

  async getInteractionHistory(
    userId: string,
    adId: string,
  ): Promise<UserAdInteraction[]> {
    return this.userAdInteractionRepository.find({
      where: { userId, adId },
      order: { createdAt: 'DESC' },
    });
  }
}
