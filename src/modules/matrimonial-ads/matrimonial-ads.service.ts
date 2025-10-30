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
import { AdContactDetails } from '../../entities/ad-contact-details.entity';
// PreferredProfession and PreferredHabit entities removed - now using LookingForPreferences
import { LookingForPreferences } from '../../entities/looking-for-preferences.entity';
import { InterestRequest } from '../../entities/interest-request.entity';
import { Match } from '../../entities/match.entity';
import { ErrorCodes } from '../../dto/common.dto';
import { calculateAge } from '../../utils/age.util';
import { SseNotificationService } from '../../services/sse-notification.service';

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
    @InjectRepository(AdContactDetails)
    private adContactDetailsRepository: Repository<AdContactDetails>,
    // PreferredProfession and PreferredHabit repositories removed - now using LookingForPreferences
    @InjectRepository(LookingForPreferences)
    private lookingForPreferencesRepository: Repository<LookingForPreferences>,
    @InjectRepository(InterestRequest)
    private interestRequestRepository: Repository<InterestRequest>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    private sseNotificationService: SseNotificationService,
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

  /**
   * Validates Phase 1 data
   */
  private validatePhase1(data: Record<string, any>): void {
    if (!data.advertiserType) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Phase 1 validation failed: advertiserType is required',
        details: {
          phase: 1,
          missingFields: ['advertiserType'],
        },
      });
    }

    const validTypes = ['self', 'parent', 'guardian'];
    if (!validTypes.includes(data.advertiserType)) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: `Phase 1 validation failed: advertiserType must be one of: ${validTypes.join(', ')}`,
        details: {
          phase: 1,
          invalidField: 'advertiserType',
          value: data.advertiserType,
        },
      });
    }
  }

  /**
   * Validates Phase 2 data
   */
  private validatePhase2(data: Record<string, any>): void {
    const requiredFields = [
      'name',
      'type',
      'email',
      'phone',
      'birthday',
      'age',
      'profession',
      'height',
      'caste',
      'religion',
      'ethnicity',
      'maritalStatus',
      'location',
      'education',
      'drinking',
      'smoking',
      'skinColor',
    ];

    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (
        data[field] === undefined ||
        data[field] === null ||
        data[field] === ''
      ) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: `Phase 2 validation failed: Missing required fields: ${missingFields.join(', ')}`,
        details: {
          phase: 2,
          missingFields,
        },
      });
    }

    // Validate type enum
    if (!['bride', 'groom'].includes(data.type)) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message:
          'Phase 2 validation failed: type must be either "bride" or "groom"',
        details: {
          phase: 2,
          invalidField: 'type',
          value: data.type,
        },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Phase 2 validation failed: Invalid email format',
        details: {
          phase: 2,
          invalidField: 'email',
          value: data.email,
        },
      });
    }

    // Validate birthday format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.birthday)) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message:
          'Phase 2 validation failed: birthday must be in YYYY-MM-DD format',
        details: {
          phase: 2,
          invalidField: 'birthday',
          value: data.birthday,
        },
      });
    }

    // Validate age is a number
    if (typeof data.age !== 'number' || data.age < 18 || data.age > 100) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message:
          'Phase 2 validation failed: age must be a number between 18 and 100',
        details: {
          phase: 2,
          invalidField: 'age',
          value: data.age,
        },
      });
    }
  }

  /**
   * Validates Phase 3 data
   */
  private validatePhase3(data: Record<string, any>): void {
    const requiredFields = [
      'fatherProfession',
      'motherProfession',
      'familyStatus',
    ];

    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (
        data[field] === undefined ||
        data[field] === null ||
        data[field] === ''
      ) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: `Phase 3 validation failed: Missing required fields: ${missingFields.join(', ')}`,
        details: {
          phase: 3,
          missingFields,
        },
      });
    }

    // Validate siblings object
    if (!data.siblings || typeof data.siblings !== 'object') {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Phase 3 validation failed: siblings object is required',
        details: {
          phase: 3,
          missingFields: ['siblings'],
        },
      });
    }

    const siblings = data.siblings as { brothers?: number; sisters?: number };
    if (
      siblings.brothers === undefined ||
      siblings.sisters === undefined ||
      typeof siblings.brothers !== 'number' ||
      typeof siblings.sisters !== 'number' ||
      siblings.brothers < 0 ||
      siblings.sisters < 0
    ) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message:
          'Phase 3 validation failed: siblings.brothers and siblings.sisters must be non-negative numbers',
        details: {
          phase: 3,
          invalidField: 'siblings',
          value: data.siblings,
        },
      });
    }
  }

  /**
   * Validates Phase 6 data (Assets/Possessions)
   */
  private validatePhase6(data: Record<string, any>): void {
    // Assets/Possessions are optional, but if provided, should be an array of strings
    const assetsData = data.possessions || data.assets;
    if (assetsData !== undefined && assetsData !== null) {
      if (!Array.isArray(assetsData)) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_ERROR,
          message:
            'Phase 6 validation failed: possessions/assets must be an array',
          details: {
            phase: 6,
            invalidField: 'possessions',
            value: assetsData,
          },
        });
      }
    }
  }

  /**
   * Validates Phase 7 data (Partner Preferences)
   */
  private validatePhase7(data: Record<string, any>): void {
    // Partner preferences are all optional, but if lookingFor is provided, validate structure
    if (data.lookingFor !== undefined && data.lookingFor !== null) {
      if (typeof data.lookingFor !== 'object') {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Phase 7 validation failed: lookingFor must be an object',
          details: {
            phase: 7,
            invalidField: 'lookingFor',
            value: data.lookingFor,
          },
        });
      }
    }
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

    // Validate phase data before processing
    switch (phase) {
      case 1:
        this.validatePhase1(data);
        break;
      case 2:
        this.validatePhase2(data);
        break;
      case 3:
        this.validatePhase3(data);
        break;
      case 6:
        this.validatePhase6(data);
        break;
      case 7:
        this.validatePhase7(data);
        break;
      // Phase 4 and 5 don't need validation as they're file uploads handled separately
      default:
        break;
    }

    // Update phase data based on phase number
    const updateData: Partial<MatrimonialAd> = { currentPhase: phase };

    switch (phase) {
      case 1:
        updateData.advertiserType = data.advertiserType as
          | 'self'
          | 'parent'
          | 'guardian';
        break;
      case 2:
        // Update all Phase 2 fields
        updateData.type = data.type as 'bride' | 'groom';
        updateData.name = data.name as string;
        updateData.birthday = new Date(data.birthday);
        updateData.birthTime = data.birthTime as string;
        updateData.profession = data.profession as string;
        updateData.height = data.height as string;
        updateData.caste = data.caste as string;
        updateData.religion = data.religion as string;
        updateData.ethnicity = data.ethnicity as string;
        updateData.maritalStatus = data.maritalStatus as string;
        if (data.hasChildren)
          updateData.hasChildren = data.hasChildren as string;
        updateData.location = data.location as string;
        updateData.education = data.education as string;
        updateData.languages = data.languages || [];
        updateData.hobbies = data.hobbies || [];

        // Additional Phase 2 fields
        updateData.skinColor = data.skinColor as string;
        // Handle drinking/smoking - they come as strings but stored as booleans
        updateData.isDrinking =
          data.drinking === 'yes' ||
          data.drinking === true ||
          data.drinking === 'socially';
        updateData.isSmoking = data.smoking === 'yes' || data.smoking === true;

        // Update user name if provided in phase 2
        if (data.name) {
          await this.userRepository.update(matrimonialAd.userId, {
            name: data.name as string,
          });
        }

        // Save email and phone to AdContactDetails entity
        {
          let contactDetails = await this.adContactDetailsRepository.findOne({
            where: { matrimonialAdId: adId },
          });

          if (contactDetails) {
            await this.adContactDetailsRepository.update(contactDetails.id, {
              email: data.email as string,
              phone: data.phone as string,
            });
          } else {
            contactDetails = this.adContactDetailsRepository.create({
              matrimonialAdId: adId,
              email: data.email as string,
              phone: data.phone as string,
            });
            await this.adContactDetailsRepository.save(contactDetails);
          }
        }
        break;
      case 3:
        // Update all Phase 3 fields
        updateData.fatherProfession = data.fatherProfession as string;
        updateData.motherProfession = data.motherProfession as string;
        updateData.familyStatus = data.familyStatus as string;

        // Handle siblings data
        {
          const siblingsData = data.siblings as {
            brothers: number;
            sisters: number;
          };
          updateData.brothersCount = siblingsData.brothers;
          updateData.sistersCount = siblingsData.sisters;
        }
        break;
      case 6:
        // Phase 6: Assets/Possessions (optional)
        // Accept both 'assets' and 'possessions' field names for compatibility
        {
          const assetsData = data.possessions || data.assets;
          if (assetsData) {
            updateData.assets = assetsData as string[];
          }
        }
        break;
      case 7:
        // Phase 7: Partner Preferences (optional)
        if (data.lookingFor) {
          const lookingForData = data.lookingFor as {
            migrationPlans?: string;
            skinTone?: string;
            minAge?: string;
            maxAge?: string;
            education?: string;
            profession?: string[] | string;
            habits?: string[] | string;
          };

          // Normalize profession and habits to arrays
          const professionArray = Array.isArray(lookingForData.profession)
            ? lookingForData.profession
            : lookingForData.profession
              ? [lookingForData.profession]
              : null;
          const habitsArray = Array.isArray(lookingForData.habits)
            ? lookingForData.habits
            : lookingForData.habits
              ? [lookingForData.habits]
              : null;

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
              preferredProfessions: professionArray,
              preferredHabits: habitsArray,
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
              preferredProfessions: professionArray,
              preferredHabits: habitsArray,
            });
            await this.lookingForPreferencesRepository.save(preferences);
          }
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

    // Get existing photos count to set correct displayOrder
    const existingPhotos = await this.adPhotoRepository.find({
      where: { matrimonialAdId: adId },
      order: { displayOrder: 'DESC' },
      take: 1,
    });

    if (existingPhotos.length > 0) {
      displayOrder = existingPhotos[0].displayOrder + 1;
    }

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

    // Update photos count - count all photos for this ad
    const totalPhotos = await this.adPhotoRepository.count({
      where: { matrimonialAdId: adId },
    });

    await this.matrimonialAdRepository.update(adId, {
      photosCount: totalPhotos,
    });

    return {
      adId,
      photosCount: totalPhotos,
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
        completed: !!matrimonialAd.assets && matrimonialAd.assets.length > 0,
        hasData: !!matrimonialAd.assets && matrimonialAd.assets.length > 0,
        assets: matrimonialAd.assets || [],
      },
      7: {
        completed: !!matrimonialAd.lookingForPreferences,
        hasData: !!matrimonialAd.lookingForPreferences,
      },
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
      age: calculateAge(matrimonialAd.birthday),
      lookingFor,
    };
  }

  async getMyAdDetails(firebaseUserId: string) {
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

    // Find user's matrimonial ad with all relations
    const matrimonialAd = await this.matrimonialAdRepository.findOne({
      where: { userId: user.id },
      relations: [
        'photos',
        'horoscope',
        'contactDetails',
        'lookingForPreferences',
      ],
    });

    if (!matrimonialAd) {
      throw new NotFoundException({
        code: ErrorCodes.AD_NOT_FOUND,
        message: 'Matrimonial ad not found for this user',
      });
    }

    // Sort photos by displayOrder
    if (matrimonialAd.photos) {
      matrimonialAd.photos.sort(
        (a: any, b: any) => a.displayOrder - b.displayOrder,
      );
    }

    // Format photos with URLs
    const photoUrls = matrimonialAd.photos
      ? matrimonialAd.photos.map((photo: any) => ({
          id: photo.id,
          url: photo.filePath.startsWith('http')
            ? photo.filePath
            : `/api/${photo.filePath.replace(/^\.\//, '')}`,
          fileName: photo.fileName,
          fileSize: photo.fileSize,
          mimeType: photo.mimeType,
          displayOrder: photo.displayOrder,
          isProfilePhoto: photo.isProfilePhoto,
          createdAt: photo.createdAt,
        }))
      : [];

    // Format horoscope with URL
    const horoscopeUrl = matrimonialAd.horoscope
      ? {
          id: matrimonialAd.horoscope.id,
          url: matrimonialAd.horoscope.filePath.startsWith('http')
            ? matrimonialAd.horoscope.filePath
            : `/api/${matrimonialAd.horoscope.filePath.replace(/^\.\//, '')}`,
          fileName: matrimonialAd.horoscope.fileName,
          fileSize: matrimonialAd.horoscope.fileSize,
          mimeType: matrimonialAd.horoscope.mimeType,
          createdAt: matrimonialAd.horoscope.createdAt,
        }
      : null;

    // Format contact details (only for own ad)
    const contactDetails = matrimonialAd.contactDetails
      ? {
          email: matrimonialAd.contactDetails.email,
          phone: matrimonialAd.contactDetails.phone,
        }
      : null;

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
      id: matrimonialAd.id,
      userId: matrimonialAd.userId,
      name: matrimonialAd.name,
      type: matrimonialAd.type,
      currentPhase: matrimonialAd.currentPhase,
      status: matrimonialAd.status,
      advertiserType: matrimonialAd.advertiserType,
      birthday: matrimonialAd.birthday,
      birthTime: matrimonialAd.birthTime,
      age: calculateAge(matrimonialAd.birthday),
      profession: matrimonialAd.profession,
      height: matrimonialAd.height,
      caste: matrimonialAd.caste,
      religion: matrimonialAd.religion,
      ethnicity: matrimonialAd.ethnicity,
      maritalStatus: matrimonialAd.maritalStatus,
      hasChildren: matrimonialAd.hasChildren,
      location: matrimonialAd.location,
      education: matrimonialAd.education,
      languages: matrimonialAd.languages,
      hobbies: matrimonialAd.hobbies,
      skinColor: matrimonialAd.skinColor,
      isDrinking: matrimonialAd.isDrinking,
      isSmoking: matrimonialAd.isSmoking,
      fatherProfession: matrimonialAd.fatherProfession,
      motherProfession: matrimonialAd.motherProfession,
      familyStatus: matrimonialAd.familyStatus,
      brothersCount: matrimonialAd.brothersCount,
      sistersCount: matrimonialAd.sistersCount,
      photosCount: matrimonialAd.photosCount,
      hasHoroscope: matrimonialAd.hasHoroscope,
      assets: matrimonialAd.assets,
      isBoosted: matrimonialAd.isBoosted,
      boostedAt: matrimonialAd.boostedAt,
      submittedAt: matrimonialAd.submittedAt,
      expiresAt: matrimonialAd.expiresAt,
      createdAt: matrimonialAd.createdAt,
      updatedAt: matrimonialAd.updatedAt,
      // Include URLs and contact details
      photoUrls,
      horoscopeUrl,
      contactDetails,
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

    // Check if all required phases are completed
    // All 7 phases are required: Phase 6 = Assets, Phase 7 = Partner Preferences
    const status = await this.getAdStatus(firebaseUserId);
    const requiredPhases = [1, 2, 3, 4, 5, 6, 7]; // All phases are required
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
    // All 7 phases are required: Phase 6 = Assets, Phase 7 = Partner Preferences
    const phase1Completed = !!matrimonialAd.advertiserType;
    const phase2Completed = !!matrimonialAd.type;
    const phase3Completed = !!matrimonialAd.fatherProfession;
    const phase4Completed = matrimonialAd.photosCount > 0;
    const phase5Completed = matrimonialAd.hasHoroscope;
    const phase6Completed =
      !!matrimonialAd.assets && matrimonialAd.assets.length > 0;
    const phase7Completed = !!matrimonialAd.lookingForPreferences;

    return (
      phase1Completed &&
      phase2Completed &&
      phase3Completed &&
      phase4Completed &&
      phase5Completed &&
      phase6Completed &&
      phase7Completed
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
      submittedAt: matrimonialAd.submittedAt ?? undefined,
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
        .addOrderBy('ad.submittedAt', 'DESC') // Recent submissions first
        .addOrderBy('ad.createdAt', 'DESC') // Fallback to creation date
        .skip((page - 1) * limit)
        .take(limit)
        .getMany();
    } else {
      // Public access: Simple date-based sorting (recent first)
      // Sort by submittedAt first, but use createdAt as fallback for NULL values
      ads = await query
        .orderBy('ad.submittedAt', 'DESC') // Recent submissions first
        .addOrderBy('ad.createdAt', 'DESC') // Fallback to creation date (handles NULL submittedAt)
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
          name: ad.name,
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
          assets: ad.assets,
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

  // Ad Status Management with Notifications
  async updateAdStatus(adId: string, status: string, message?: string) {
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

    await this.matrimonialAdRepository.update(adId, { status: status as any });

    // Send SSE notification
    try {
      this.sseNotificationService.sendAdStatusChangeNotification(
        ad.userId,
        adId,
        status,
        message || `Your ad status has been updated to ${status}`,
      );
    } catch (error) {
      console.error('Error sending ad status change notification:', error);
    }

    return {
      success: true,
      message: 'Ad status updated successfully',
      adId,
      status,
    };
  }

  async activateAd(adId: string) {
    return this.updateAdStatus(
      adId,
      'active',
      'Your ad is now live and visible to other users!',
    );
  }

  async deactivateAd(adId: string, reason?: string) {
    return this.updateAdStatus(
      adId,
      'inactive',
      reason || 'Your ad has been deactivated',
    );
  }

  async rejectAd(adId: string, reason: string) {
    return this.updateAdStatus(
      adId,
      'rejected',
      `Your ad was rejected: ${reason}`,
    );
  }

  async suspendAd(adId: string, reason: string) {
    return this.updateAdStatus(
      adId,
      'suspended',
      `Your ad has been suspended: ${reason}`,
    );
  }
}
