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
import { ErrorCodes } from '../../dto/common.dto';

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
  ) {}

  async initializeMatrimonialAd(firebaseUserId: string) {
    // Find user by firebaseUserId
    let user = await this.userRepository.findOne({
      where: { firebaseUserId },
    });

    // If user doesn't exist, create them (Firebase handles user creation)
    if (!user) {
      try {
        user = this.userRepository.create({
          firebaseUserId,
          isVerified: true, // Assuming Firebase handles verification
        });
        user = await this.userRepository.save(user);
      } catch (error: any) {
        // If there's a unique constraint violation, try to find the user again
        // This handles race conditions where the user was created between the check and save
        if (
          error?.code === '23505' &&
          error?.constraint === 'UQ_1ebf192be0cd17d1c6f88367855'
        ) {
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

    // Check if user already has an ad
    const existingAd = await this.matrimonialAdRepository.findOne({
      where: { userId: user.id },
    });

    if (existingAd) {
      return {
        adId: existingAd.id,
        userId: existingAd.userId,
        currentPhase: existingAd.currentPhase,
        status: existingAd.status,
        createdAt: existingAd.createdAt,
      };
    }

    // Create new matrimonial ad with minimal required fields
    const matrimonialAd = this.matrimonialAdRepository.create({
      userId: user.id,
      currentPhase: 1,
      status: 'draft',
      // All other fields are now nullable and will be filled in phases
    });

    const savedAd = await this.matrimonialAdRepository.save(matrimonialAd);

    return {
      adId: savedAd.id,
      userId: savedAd.userId,
      currentPhase: savedAd.currentPhase,
      status: savedAd.status,
      createdAt: savedAd.createdAt,
    };
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
        if (data.age) updateData.age = data.age as number;
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
      7: { completed: !!matrimonialAd.assets, hasData: !!matrimonialAd.assets },
    };

    return {
      adId: matrimonialAd.id,
      currentPhase: matrimonialAd.currentPhase,
      status: matrimonialAd.status,
      phases,
      createdAt: matrimonialAd.createdAt,
      updatedAt: matrimonialAd.updatedAt,
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

    if (matrimonialAd.status !== 'draft') {
      throw new BadRequestException({
        code: ErrorCodes.AD_ALREADY_SUBMITTED,
        message: 'Ad has already been submitted',
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
    const expiresAt = new Date(
      submittedAt.getTime() + 90 * 24 * 60 * 60 * 1000,
    ); // 90 days

    await this.matrimonialAdRepository.update(matrimonialAd.id, {
      status: 'active',
      submittedAt,
      expiresAt,
    });

    return {
      adId: matrimonialAd.id,
      status: 'active',
      submittedAt,
      expiresAt,
    };
  }
}
