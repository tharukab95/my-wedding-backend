/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatrimonialAd } from '../../entities/matrimonial-ad.entity';
import { User } from '../../entities/user.entity';
import { AdPhoto } from '../../entities/ad-photo.entity';
import { AdHoroscope } from '../../entities/ad-horoscope.entity';
// PreferredProfession and PreferredHabit entities removed - now using LookingForPreferences
import { LookingForPreferences } from '../../entities/looking-for-preferences.entity';
import { InterestRequest } from '../../entities/interest-request.entity';
import { Match } from '../../entities/match.entity';
import { ErrorCodes } from '../../dto/common.dto';
import { calculateAge } from '../../utils/age.util';

@Injectable()
export class MatrimonialAdsService {
  constructor(
    @InjectRepository(MatrimonialAd)
    private matrimonialAdRepository: Repository<MatrimonialAd>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AdPhoto)
    private adPhotoRepository: Repository<AdPhoto>,
    @InjectRepository(AdHoroscope)
    private adHoroscopeRepository: Repository<AdHoroscope>,
    // PreferredProfession and PreferredHabit repositories removed - now using LookingForPreferences
    @InjectRepository(LookingForPreferences)
    private lookingForPreferencesRepository: Repository<LookingForPreferences>,
    @InjectRepository(InterestRequest)
    private interestRequestRepository: Repository<InterestRequest>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
  ) {}

  async initializeMatrimonialAd(firebaseUserId: string, phoneNumber: string) {
    const user = await this.findOrCreateUser(firebaseUserId, phoneNumber);
    const existingAd = await this.findExistingAd(user.id);

    if (existingAd) {
      return this.formatAdResponse(existingAd);
    }

    return this.createNewAd(user.id);
  }

  private async findOrCreateUser(firebaseUserId: string, phoneNumber: string) {
    let user = await this.userRepository.findOne({
      where: { firebaseUserId },
    });

    if (!user) {
      try {
        user = await this.userRepository.save({
          firebaseUserId,
          phoneNumber,
          isVerified: true,
        });
      } catch (error: any) {
        if (
          this.isUniqueConstraintError(error, 'UQ_1ebf192be0cd17d1c6f88367855')
        ) {
          // Race condition: user was created by another process
          user = await this.userRepository.findOne({
            where: { firebaseUserId },
          });
          if (!user) {
            throw new BadRequestException({
              code: ErrorCodes.USER_CREATION_FAILED,
              message: 'Failed to create user',
            });
          }
        } else {
          throw error;
        }
      }
    }

    return user;
  }

  private async findExistingAd(userId: string) {
    return await this.matrimonialAdRepository.findOne({
      where: { userId },
    });
  }

  private async createNewAd(userId: string) {
    try {
      const savedAd = await this.matrimonialAdRepository.save({
        userId,
        currentPhase: 0,
        status: 'draft',
      });
      return this.formatAdResponse(savedAd);
    } catch (error: any) {
      if (this.isUniqueConstraintError(error, 'UQ_matrimonial_ads_userId')) {
        // Race condition: ad was created by another process
        const existingAd = await this.findExistingAd(userId);
        if (existingAd) {
          return this.formatAdResponse(existingAd);
        }
      }
      throw error;
    }
  }

  private formatAdResponse(ad: MatrimonialAd) {
    return {
      adId: ad.id,
      userId: ad.userId,
      currentPhase: ad.currentPhase,
      status: ad.status,
      createdAt: ad.createdAt,
    };
  }

  private isUniqueConstraintError(error: any, constraintName: string): boolean {
    return error?.code === '23505' && error?.constraint === constraintName;
  }

  async savePhaseData(adId: string, phase: number, data: Record<string, any>) {
    const matrimonialAd = await this.matrimonialAdRepository.findOne({
      where: { id: adId },
    });

    if (!matrimonialAd) {
      throw new NotFoundException({
        code: ErrorCodes.AD_NOT_FOUND,
        message: 'Matrimonial ad not found',
      });
    }

    if (matrimonialAd.status !== 'draft') {
      throw new BadRequestException({
        code: ErrorCodes.AD_ALREADY_SUBMITTED,
        message: 'Cannot modify submitted ad',
      });
    }

    // Update phase data based on phase number
    const updateData: Partial<MatrimonialAd> = { currentPhase: phase };

    switch (phase) {
      case 1:
        if (data.advertiserType) {
          updateData.advertiserType = data.advertiserType as
            | 'self'
            | 'parent'
            | 'guardian';
        }
        break;
      case 2:
        if (data.type) updateData.type = data.type as 'bride' | 'groom';
        if (data.birthday && typeof data.birthday === 'string') {
          updateData.birthday = new Date(data.birthday);
        }
        if (data.birthTime) updateData.birthTime = data.birthTime as string;
        if (data.profession) updateData.profession = data.profession as string;
        if (data.height) updateData.height = data.height as string;
        if (data.caste) updateData.caste = data.caste as string;
        if (data.religion) updateData.religion = data.religion as string;
        if (data.ethnicity) updateData.ethnicity = data.ethnicity as string;
        if (data.maritalStatus)
          updateData.maritalStatus = data.maritalStatus as string;
        if (data.hasChildren)
          updateData.hasChildren = data.hasChildren as string;
        if (data.location) updateData.location = data.location as string;
        if (data.education) updateData.education = data.education as string;
        if (data.languages) updateData.languages = data.languages as string[];
        if (data.hobbies) updateData.hobbies = data.hobbies as string[];

        // Additional Phase 2 fields
        if (data.skinColor) updateData.skinColor = data.skinColor as string;
        if (data.drinking !== undefined) {
          updateData.isDrinking =
            data.drinking === 'yes' || data.drinking === true;
        }
        if (data.smoking !== undefined) {
          updateData.isSmoking =
            data.smoking === 'yes' || data.smoking === true;
        }
        break;
      case 3:
        if (data.fatherProfession)
          updateData.fatherProfession = data.fatherProfession as string;
        if (data.motherProfession)
          updateData.motherProfession = data.motherProfession as string;
        if (data.familyStatus)
          updateData.familyStatus = data.familyStatus as string;

        // Handle siblings data
        if (data.siblings) {
          const siblingsData = data.siblings as {
            brothers?: number;
            sisters?: number;
          };
          if (siblingsData.brothers !== undefined)
            updateData.brothersCount = siblingsData.brothers;
          if (siblingsData.sisters !== undefined)
            updateData.sistersCount = siblingsData.sisters;
        }

        break;
      case 6:
        // Handle looking for preferences
        if (data.lookingFor) {
          const lookingForData = data.lookingFor as {
            migrationPlans?: string;
            skinTone?: string;
            minAge?: string;
            maxAge?: string;
            education?: string;
            profession?: string[];
            habits?: string[];
          };

          // Check if preferences already exist
          let preferences = await this.lookingForPreferencesRepository.findOne({
            where: { matrimonialAdId: adId },
          });

          if (preferences) {
            // Update existing preferences
            await this.lookingForPreferencesRepository.update(preferences.id, {
              migrationPlans: lookingForData.migrationPlans || null,
              skinTone: lookingForData.skinTone || null,
              minAge: lookingForData.minAge || null,
              maxAge: lookingForData.maxAge || null,
              preferredEducation: lookingForData.education || null,
              preferredProfessions: lookingForData.profession || null,
              preferredHabits: lookingForData.habits || null,
            });
          } else {
            // Create new preferences
            preferences = this.lookingForPreferencesRepository.create({
              matrimonialAdId: adId,
              migrationPlans: lookingForData.migrationPlans || null,
              skinTone: lookingForData.skinTone || null,
              minAge: lookingForData.minAge || null,
              maxAge: lookingForData.maxAge || null,
              preferredEducation: lookingForData.education || null,
              preferredProfessions: lookingForData.profession || null,
              preferredHabits: lookingForData.habits || null,
            });
            await this.lookingForPreferencesRepository.save(preferences);
          }
        }
        break;
      case 7:
        if (data.assets) {
          updateData.assets = data.assets as string[];
        }
        break;
    }

    await this.matrimonialAdRepository.update(adId, updateData);

    const updatedAd = await this.matrimonialAdRepository.findOne({
      where: { id: adId },
    });

    if (!updatedAd) {
      throw new NotFoundException({
        code: ErrorCodes.AD_NOT_FOUND,
        message: 'Matrimonial ad not found after update',
      });
    }

    return {
      adId: updatedAd.id,
      currentPhase: updatedAd.currentPhase,
      status: updatedAd.status,
      updatedAt: updatedAd.updatedAt,
    };
  }

  async uploadPhotos(adId: string, files: Express.Multer.File[]) {
    const matrimonialAd = await this.matrimonialAdRepository.findOne({
      where: { id: adId },
    });

    if (!matrimonialAd) {
      throw new NotFoundException({
        code: ErrorCodes.AD_NOT_FOUND,
        message: 'Matrimonial ad not found',
      });
    }

    const photos: AdPhoto[] = [];
    let displayOrder = 0;

    for (const file of files) {
      const photo = this.adPhotoRepository.create({
        matrimonialAdId: adId,
        fileName: file.originalname || '',
        filePath: file.path || '',
        fileSize: file.size || 0,
        mimeType: file.mimetype || '',
        displayOrder,
        isProfilePhoto: displayOrder === 0,
      });

      const savedPhoto = await this.adPhotoRepository.save(photo);
      photos.push(savedPhoto);
      displayOrder++;
    }

    // Update photos count
    await this.matrimonialAdRepository.update(adId, {
      photosCount: photos.length,
    });

    return {
      adId,
      photosCount: photos.length,
      photos,
    };
  }

  async uploadHoroscope(adId: string, file: Express.Multer.File) {
    const matrimonialAd = await this.matrimonialAdRepository.findOne({
      where: { id: adId },
    });

    if (!matrimonialAd) {
      throw new NotFoundException({
        code: ErrorCodes.AD_NOT_FOUND,
        message: 'Matrimonial ad not found',
      });
    }

    // Delete existing horoscope if any
    await this.adHoroscopeRepository.delete({ matrimonialAdId: adId });

    const horoscope = this.adHoroscopeRepository.create({
      matrimonialAdId: adId,
      fileName: file.originalname || '',
      filePath: file.path || '',
      fileSize: file.size || 0,
      mimeType: file.mimetype || '',
    });

    const savedHoroscope = await this.adHoroscopeRepository.save(horoscope);

    // Update hasHoroscope flag
    await this.matrimonialAdRepository.update(adId, {
      hasHoroscope: true,
    });

    return {
      adId,
      hasHoroscope: true,
      horoscope: savedHoroscope,
    };
  }

  async getAdStatus(firebaseUserId: string) {
    // Find user by firebaseUserId
    const user = await this.userRepository.findOne({
      where: { firebaseUserId },
    });

    if (!user) {
      throw new NotFoundException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    // Find user's matrimonial ad
    const matrimonialAd = await this.matrimonialAdRepository.findOne({
      where: { userId: user.id },
      relations: ['photos', 'horoscope', 'lookingForPreferences'],
    });

    if (!matrimonialAd) {
      throw new NotFoundException({
        code: ErrorCodes.AD_NOT_FOUND,
        message: 'Matrimonial ad not found for this user',
      });
    }

    const phases = {
      1: {
        completed: !!matrimonialAd.advertiserType,
        hasData: !!matrimonialAd.advertiserType,
      },
      2: { completed: !!matrimonialAd.type, hasData: !!matrimonialAd.type },
      3: {
        completed: !!matrimonialAd.fatherProfession,
        hasData: !!matrimonialAd.fatherProfession,
      },
      4: {
        completed: matrimonialAd.photosCount > 0,
        photosCount: matrimonialAd.photosCount,
      },
      5: {
        completed: matrimonialAd.hasHoroscope,
        hasHoroscope: matrimonialAd.hasHoroscope,
      },
      6: {
        completed: !!matrimonialAd.lookingForPreferences,
        hasData: !!matrimonialAd.lookingForPreferences,
      },
      // Phase 7 (assets) is not implemented yet, so we skip it
    };

    const isSubmitted = !!matrimonialAd.submittedAt;
    const isPaid = matrimonialAd.status === 'active';
    const needsPayment = isSubmitted && !isPaid;

    return {
      adId: matrimonialAd.id,
      currentPhase: matrimonialAd.currentPhase,
      status: matrimonialAd.status,
      phases,
      createdAt: matrimonialAd.createdAt,
      updatedAt: matrimonialAd.updatedAt,
      submittedAt: matrimonialAd.submittedAt,
      isSubmitted,
      isPaid,
      needsPayment,
    };
  }

  async getAdData(adId: string) {
    const matrimonialAd = await this.matrimonialAdRepository.findOne({
      where: { id: adId },
      relations: ['lookingForPreferences'],
    });

    if (!matrimonialAd) {
      throw new NotFoundException({
        code: ErrorCodes.AD_NOT_FOUND,
        message: 'Matrimonial ad not found',
      });
    }

    // Preferred professions and habits are now stored in lookingForPreferences

    // Format looking for preferences
    const lookingFor = matrimonialAd.lookingForPreferences
      ? {
          migrationPlans: matrimonialAd.lookingForPreferences.migrationPlans as
            | string
            | null,
          skinTone: matrimonialAd.lookingForPreferences.skinTone as
            | string
            | null,
          minAge: matrimonialAd.lookingForPreferences.minAge as string | null,
          maxAge: matrimonialAd.lookingForPreferences.maxAge as string | null,
          education: matrimonialAd.lookingForPreferences.preferredEducation as
            | string
            | null,
          profession: matrimonialAd.lookingForPreferences
            .preferredProfessions as string[] | null,
          habits: matrimonialAd.lookingForPreferences.preferredHabits as
            | string[]
            | null,
        }
      : null;

    return {
      ...matrimonialAd,
      lookingFor,
    };
  }

  async submitAd(firebaseUserId: string) {
    // Find user by firebaseUserId
    const user = await this.userRepository.findOne({
      where: { firebaseUserId },
    });

    if (!user) {
      throw new NotFoundException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    // Find user's matrimonial ad
    const matrimonialAd = await this.matrimonialAdRepository.findOne({
      where: { userId: user.id },
    });

    if (!matrimonialAd) {
      throw new NotFoundException({
        code: ErrorCodes.AD_NOT_FOUND,
        message: 'Matrimonial ad not found for this user',
      });
    }

    if (matrimonialAd.status === 'active') {
      throw new BadRequestException({
        code: ErrorCodes.AD_ALREADY_SUBMITTED,
        message: 'Ad has already been submitted and activated',
      });
    }

    if (matrimonialAd.status === 'draft' && matrimonialAd.submittedAt) {
      throw new BadRequestException({
        code: ErrorCodes.AD_ALREADY_SUBMITTED,
        message:
          'Ad has already been submitted. Please complete payment to activate.',
      });
    }

    // Check if all phases are completed (bypassing Phase 7 - assets for now)
    const status = await this.getAdStatus(firebaseUserId);
    const requiredPhases = [1, 2, 3, 4, 5, 6]; // Skip phase 7 (assets) for now
    const allRequiredPhasesCompleted = requiredPhases.every(
      (phaseNum) => status.phases[phaseNum]?.completed === true,
    );

    if (!allRequiredPhasesCompleted) {
      throw new BadRequestException({
        code: ErrorCodes.PHASE_NOT_COMPLETED,
        message: 'All required phases must be completed before submission',
      });
    }

    const submittedAt = new Date();

    // Keep ad in draft state until payment is successful
    // Status will be updated to 'active' via webhook when payment is completed
    await this.matrimonialAdRepository.update(matrimonialAd.id, {
      status: 'draft', // Keep as draft until payment
      submittedAt,
      // Don't set expiresAt here - it will be set when payment is successful
    });

    return {
      adId: matrimonialAd.id,
      status: 'draft', // Return draft status
      submittedAt,
      message:
        'Ad submitted successfully. Please complete payment to activate your ad.',
    };
  }

  async isAdReadyForPayment(firebaseUserId: string): Promise<boolean> {
    // Find user by firebaseUserId
    const user = await this.userRepository.findOne({
      where: { firebaseUserId },
    });

    if (!user) {
      return false;
    }

    // Find user's matrimonial ad
    const matrimonialAd = await this.matrimonialAdRepository.findOne({
      where: { userId: user.id },
      relations: ['photos', 'horoscope', 'lookingForPreferences'],
    });

    if (!matrimonialAd) {
      return false;
    }

    // Check if ad is in draft state and has been submitted
    if (matrimonialAd.status !== 'draft' || !matrimonialAd.submittedAt) {
      return false;
    }

    // Check if all required phases are completed
    // const requiredPhases = [1, 2, 3, 4, 5, 6]; // Skip phase 7 (assets) for now

    const phase1Completed = !!matrimonialAd.advertiserType;
    const phase2Completed = !!matrimonialAd.type;
    const phase3Completed = !!matrimonialAd.fatherProfession;
    const phase4Completed = matrimonialAd.photosCount > 0;
    const phase5Completed = matrimonialAd.hasHoroscope;
    const phase6Completed = !!matrimonialAd.lookingForPreferences;

    return (
      phase1Completed &&
      phase2Completed &&
      phase3Completed &&
      phase4Completed &&
      phase5Completed &&
      phase6Completed
    );
  }

  async getAdSubmissionStatus(firebaseUserId: string): Promise<{
    isSubmitted: boolean;
    isPaid: boolean;
    needsPayment: boolean;
    status: string;
    submittedAt?: Date;
  }> {
    // Find user by firebaseUserId
    const user = await this.userRepository.findOne({
      where: { firebaseUserId },
    });

    if (!user) {
      return {
        isSubmitted: false,
        isPaid: false,
        needsPayment: false,
        status: 'not_found',
      };
    }

    // Find user's matrimonial ad
    const matrimonialAd = await this.matrimonialAdRepository.findOne({
      where: { userId: user.id },
    });

    if (!matrimonialAd) {
      return {
        isSubmitted: false,
        isPaid: false,
        needsPayment: false,
        status: 'no_ad',
      };
    }

    const isSubmitted = !!matrimonialAd.submittedAt;
    const isPaid = matrimonialAd.status === 'active';
    const needsPayment = isSubmitted && !isPaid;

    return {
      isSubmitted,
      isPaid,
      needsPayment,
      status: matrimonialAd.status,
      submittedAt: matrimonialAd.submittedAt,
    };
  }

  async getMatrimonialAds(
    page: number = 1,
    limit: number = 20,
    filters: {
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
      hasChildren?: string;
      isDrinking?: boolean;
      isSmoking?: boolean;
      skinColor?: string;
    } = {},
    currentUserId?: string,
  ) {
    // If currentUserId is provided, get user's ad for interaction tracking
    let userAd: MatrimonialAd | null = null;
    let interestedAdIds: string[] = [];
    let matchedAdIds: string[] = [];

    if (currentUserId) {
      const user = await this.userRepository.findOne({
        where: { firebaseUserId: currentUserId },
      });

      if (user) {
        userAd = await this.matrimonialAdRepository.findOne({
          where: { userId: user.id },
          relations: ['lookingForPreferences'],
        });

        // Get user's existing interests and matches
        const [existingInterests, existingMatches] = await Promise.all([
          this.interestRequestRepository.find({
            where: { fromUserId: user.id },
            select: ['toAdId'],
          }),
          this.matchRepository.find({
            where: [{ user1Id: user.id }, { user2Id: user.id }],
            select: ['ad1Id', 'ad2Id'],
          }),
        ]);

        interestedAdIds = existingInterests.map((interest) => interest.toAdId);
        matchedAdIds = existingMatches.flatMap((match) =>
          match.ad1Id === userAd?.id ? [match.ad2Id] : [match.ad1Id],
        );
      }
    }

    // Build the main query with efficient matching
    const query = this.matrimonialAdRepository
      .createQueryBuilder('ad')
      .leftJoinAndSelect('ad.user', 'user')
      .leftJoinAndSelect('ad.photos', 'photos')
      .leftJoinAndSelect('ad.lookingForPreferences', 'preferences')
      .where('ad.status = :status', { status: 'active' })
      .andWhere('ad.expiresAt > :now', { now: new Date() });

    // Exclude current user's ad if they have one
    if (userAd) {
      query.andWhere('ad.id != :userAdId', { userAdId: userAd.id });
    }

    // Apply filters
    if (filters.minAge !== undefined) {
      // Calculate the maximum birth date for minimum age
      const maxBirthDate = new Date();
      maxBirthDate.setFullYear(maxBirthDate.getFullYear() - filters.minAge);
      query.andWhere('ad.birthday <= :maxBirthDate', { maxBirthDate });
    }
    if (filters.maxAge !== undefined) {
      // Calculate the minimum birth date for maximum age
      const minBirthDate = new Date();
      minBirthDate.setFullYear(minBirthDate.getFullYear() - filters.maxAge - 1);
      query.andWhere('ad.birthday >= :minBirthDate', { minBirthDate });
    }
    if (filters.type) {
      query.andWhere('ad.type = :type', { type: filters.type });
    }
    if (filters.location) {
      query.andWhere('ad.location = :location', { location: filters.location });
    }
    if (filters.religion) {
      query.andWhere('ad.religion = :religion', { religion: filters.religion });
    }
    if (filters.education) {
      query.andWhere('ad.education = :education', {
        education: filters.education,
      });
    }
    if (filters.profession) {
      query.andWhere('ad.profession = :profession', {
        profession: filters.profession,
      });
    }
    if (filters.caste) {
      query.andWhere('ad.caste = :caste', { caste: filters.caste });
    }
    if (filters.ethnicity) {
      query.andWhere('ad.ethnicity = :ethnicity', {
        ethnicity: filters.ethnicity,
      });
    }
    if (filters.maritalStatus) {
      query.andWhere('ad.maritalStatus = :maritalStatus', {
        maritalStatus: filters.maritalStatus,
      });
    }
    if (filters.hasChildren) {
      query.andWhere('ad.hasChildren = :hasChildren', {
        hasChildren: filters.hasChildren,
      });
    }
    if (filters.isDrinking !== undefined) {
      query.andWhere('ad.isDrinking = :isDrinking', {
        isDrinking: filters.isDrinking,
      });
    }
    if (filters.isSmoking !== undefined) {
      query.andWhere('ad.isSmoking = :isSmoking', {
        isSmoking: filters.isSmoking,
      });
    }
    if (filters.skinColor) {
      query.andWhere('ad.skinColor = :skinColor', {
        skinColor: filters.skinColor,
      });
    }

    // Get total count
    const total = await query.getCount();

    // Execute query with pagination - different ordering for public vs private access
    let ads;
    if (currentUserId && userAd) {
      // Private access: Use algorithm with boosted ads first, then compatibility
      ads = await query
        .orderBy('ad.isBoosted', 'DESC') // Boosted ads first
        .addOrderBy('ad.boostedAt', 'DESC') // Recent boosts first
        .addOrderBy('ad.submittedAt', 'DESC') // Recent ads
        .skip((page - 1) * limit)
        .take(limit)
        .getMany();
    } else {
      // Public access: Simple date-based sorting (recent first)
      ads = await query
        .orderBy('ad.submittedAt', 'DESC') // Recent ads first
        .skip((page - 1) * limit)
        .take(limit)
        .getMany();
    }

    // Calculate compatibility scores and format results
    const formattedAds = await Promise.all(
      ads.map((ad) => {
        const compatibilityScore = userAd
          ? this.calculateCompatibilityScore(userAd, ad)
          : 0;
        const profilePhoto = ad.photos?.find(
          (photo: any) => photo.isProfilePhoto,
        );

        // Check if user has already interacted with this ad (only for authenticated users)
        const isInterested = currentUserId
          ? interestedAdIds.includes(ad.id)
          : false;
        const isMatched = currentUserId ? matchedAdIds.includes(ad.id) : false;

        // Calculate relevance score for sorting (only for authenticated users)
        const relevanceScore = userAd
          ? this.calculateRelevanceScore(
              userAd,
              ad,
              compatibilityScore,
              isInterested,
              isMatched,
            )
          : 0; // No relevance score for public access

        return {
          adId: ad.id,
          userId: ad.userId,
          type: ad.type,
          age: calculateAge(ad.birthday),
          birthday: ad.birthday,
          profession: ad.profession,
          height: ad.height,
          location: ad.location,
          religion: ad.religion,
          ethnicity: ad.ethnicity,
          education: ad.education,
          caste: ad.caste,
          maritalStatus: ad.maritalStatus,
          hasChildren: ad.hasChildren,
          skinColor: ad.skinColor,
          isDrinking: ad.isDrinking,
          isSmoking: ad.isSmoking,
          photosCount: ad.photosCount,
          hasHoroscope: ad.hasHoroscope,
          profilePhoto: profilePhoto?.filePath,
          compatibilityScore,
          relevanceScore,
          isInterested,
          isMatched,
          isBoosted: ad.isBoosted,
          boostedAt: ad.boostedAt,
          submittedAt: ad.submittedAt,
          createdAt: ad.createdAt,
        };
      }),
    );

    // Sort by relevance score only for authenticated users
    if (currentUserId && userAd) {
      formattedAds.sort((a, b) => {
        // First, prioritize non-interacted ads
        if (a.isInterested !== b.isInterested) {
          return a.isInterested ? 1 : -1;
        }
        if (a.isMatched !== b.isMatched) {
          return a.isMatched ? 1 : -1;
        }

        // Then by relevance score
        return b.relevanceScore - a.relevanceScore;
      });
    }
    // For public access, ads are already sorted by submission date (recent first)

    return {
      ads: formattedAds,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      userAd: userAd
        ? {
            id: userAd.id,
            type: userAd.type,
            age: calculateAge(userAd.birthday),
            location: userAd.location,
            religion: userAd.religion,
          }
        : null,
    };
  }

  private calculateCompatibilityScore(
    userAd: MatrimonialAd,
    targetAd: MatrimonialAd,
  ): number {
    let score = 0;
    let factors = 0;

    // Age compatibility (higher weight for age matching)
    const userAge = calculateAge(userAd.birthday);
    const targetAge = calculateAge(targetAd.birthday);
    if (userAge && targetAge) {
      const ageDiff = Math.abs(userAge - targetAge);
      if (ageDiff <= 2) {
        score += 25;
      } else if (ageDiff <= 5) {
        score += 15;
      } else if (ageDiff <= 10) {
        score += 5;
      }
      factors++;
    }

    // Religion compatibility (high weight)
    if (
      userAd.religion &&
      targetAd.religion &&
      userAd.religion === targetAd.religion
    ) {
      score += 20;
      factors++;
    }

    // Location compatibility (medium weight)
    if (
      userAd.location &&
      targetAd.location &&
      userAd.location === targetAd.location
    ) {
      score += 15;
      factors++;
    }

    // Education compatibility (medium weight)
    if (
      userAd.education &&
      targetAd.education &&
      userAd.education === targetAd.education
    ) {
      score += 10;
      factors++;
    }

    // Caste compatibility (medium weight)
    if (userAd.caste && targetAd.caste && userAd.caste === targetAd.caste) {
      score += 10;
      factors++;
    }

    // Ethnicity compatibility (low weight)
    if (
      userAd.ethnicity &&
      targetAd.ethnicity &&
      userAd.ethnicity === targetAd.ethnicity
    ) {
      score += 5;
      factors++;
    }

    // Profession compatibility (low weight)
    if (
      userAd.profession &&
      targetAd.profession &&
      userAd.profession === targetAd.profession
    ) {
      score += 5;
      factors++;
    }

    return factors > 0 ? Math.round((score / factors) * 100) : 0;
  }

  private calculateRelevanceScore(
    userAd: MatrimonialAd,
    targetAd: MatrimonialAd,
    compatibilityScore: number,
    isInterested: boolean,
    isMatched: boolean,
  ): number {
    let score = 0;

    // Base compatibility score (0-100)
    score += compatibilityScore * 0.4;

    // Boosted ads get significant boost
    if (targetAd.isBoosted) {
      score += 30;

      // Recent boosts get additional boost
      if (targetAd.boostedAt) {
        const boostAge = Date.now() - targetAd.boostedAt.getTime();
        const boostAgeHours = boostAge / (1000 * 60 * 60);

        if (boostAgeHours < 24) {
          score += 20; // Boosted in last 24 hours
        } else if (boostAgeHours < 168) {
          score += 10; // Boosted in last week
        }
      }
    }

    // Recency boost (newer ads get slight preference)
    if (targetAd.submittedAt) {
      const adAge = Date.now() - targetAd.submittedAt.getTime();
      const adAgeDays = adAge / (1000 * 60 * 60 * 24);

      if (adAgeDays < 7) {
        score += 10; // Submitted in last week
      } else if (adAgeDays < 30) {
        score += 5; // Submitted in last month
      }
    }

    // Penalize already interacted ads
    if (isInterested) {
      score -= 50;
    }
    if (isMatched) {
      score -= 100;
    }

    return Math.max(0, score);
  }
}
