import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseInterceptors,
  UploadedFiles,
  ValidationPipe,
  UsePipes,
  BadRequestException,
  UseGuards,
  Query,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  photoUploadConfig,
  horoscopeUploadConfig,
} from '../../common/config/multer.config';
import { MatrimonialAdsService } from './matrimonial-ads.service';
import { SavePhaseDataDto } from '../../dto/matrimonial-ad.dto';
import { ApiResponse } from '../../dto/common.dto';
import { FirebaseAuthGuard } from '../../guards/firebase-auth.guard';
import { OptionalFirebaseAuthGuard } from '../../guards/optional-firebase-auth.guard';
import { User } from '../../decorators/user.decorator';
import type { AuthenticatedUser } from '../../decorators/user.decorator';
import { OptionalUser } from '../../decorators/optional-user.decorator';

@Controller('matrimonial-ads')
// @UseGuards(FirebaseAuthGuard)
export class MatrimonialAdsController {
  constructor(private readonly matrimonialAdsService: MatrimonialAdsService) {}

  @Post('initialize')
  @UseGuards(FirebaseAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async initializeMatrimonialAd(
    @User() user: AuthenticatedUser,
  ): Promise<ApiResponse<any>> {
    const result = await this.matrimonialAdsService.initializeMatrimonialAd(
      user.uid,
      user.phoneNumber ?? '',
    );
    return {
      success: true,
      data: result,
    };
  }

  @Post(':adId/save-phase')
  @UseGuards(FirebaseAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async savePhaseData(
    @Param('adId') adId: string,
    @Body() savePhaseDto: SavePhaseDataDto,
  ): Promise<ApiResponse<any>> {
    const result = await this.matrimonialAdsService.savePhaseData(
      adId,
      savePhaseDto.phase,
      savePhaseDto.data as Record<string, any>,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Post(':adId/photos')
  @UseGuards(FirebaseAuthGuard)
  @UseInterceptors(FilesInterceptor('photos', 10, photoUploadConfig))
  async uploadPhotos(
    @Param('adId') adId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<ApiResponse<any>> {
    if (!files || files.length === 0) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'No files uploaded',
      });
    }

    const result = await this.matrimonialAdsService.uploadPhotos(adId, files);
    return {
      success: true,
      data: result,
    };
  }

  @Post(':adId/horoscope')
  @UseGuards(FirebaseAuthGuard)
  @UseInterceptors(FilesInterceptor('horoscope', 1, horoscopeUploadConfig))
  async uploadHoroscope(
    @Param('adId') adId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<ApiResponse<any>> {
    if (!files || files.length === 0) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'No file uploaded',
      });
    }

    const result = await this.matrimonialAdsService.uploadHoroscope(
      adId,
      files[0],
    );
    return {
      success: true,
      data: result,
    };
  }

  @Get('status')
  @UseGuards(FirebaseAuthGuard)
  async getAdStatus(
    @User() user: AuthenticatedUser,
  ): Promise<ApiResponse<any>> {
    const result = await this.matrimonialAdsService.getAdStatus(user.uid);
    return {
      success: true,
      data: result,
    };
  }

  @Get('list')
  @UseGuards(OptionalFirebaseAuthGuard)
  async getMatrimonialAds(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('minAge') minAge?: string,
    @Query('maxAge') maxAge?: string,
    @Query('type') type?: 'bride' | 'groom',
    @Query('location') location?: string,
    @Query('religion') religion?: string,
    @Query('education') education?: string,
    @Query('profession') profession?: string,
    @Query('caste') caste?: string,
    @Query('ethnicity') ethnicity?: string,
    @Query('maritalStatus') maritalStatus?: string,
    @Query('hasChildren') hasChildren?: string,
    @Query('isDrinking') isDrinking?: string,
    @Query('isSmoking') isSmoking?: string,
    @Query('skinColor') skinColor?: string,
    @OptionalUser() user?: AuthenticatedUser,
  ): Promise<ApiResponse<any>> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    // Validate pagination parameters
    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message:
          'Invalid pagination parameters. Page must be >= 1, limit must be between 1 and 100',
      });
    }

    // Build filters object
    const filters = {
      minAge: minAge ? parseInt(minAge, 10) : undefined,
      maxAge: maxAge ? parseInt(maxAge, 10) : undefined,
      type,
      location,
      religion,
      education,
      profession,
      caste,
      ethnicity,
      maritalStatus,
      hasChildren,
      isDrinking: isDrinking ? isDrinking === 'true' : undefined,
      isSmoking: isSmoking ? isSmoking === 'true' : undefined,
      skinColor,
    };

    const result = await this.matrimonialAdsService.getMatrimonialAds(
      pageNum,
      limitNum,
      filters,
      user?.uid,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Get('payment-ready')
  @UseGuards(FirebaseAuthGuard)
  async isAdReadyForPayment(
    @User() user: AuthenticatedUser,
  ): Promise<ApiResponse<any>> {
    const isReady = await this.matrimonialAdsService.isAdReadyForPayment(
      user.uid,
    );
    return {
      success: true,
      data: { isReadyForPayment: isReady },
    };
  }

  @Get('submission-status')
  @UseGuards(FirebaseAuthGuard)
  async getAdSubmissionStatus(
    @User() user: AuthenticatedUser,
  ): Promise<ApiResponse<any>> {
    const status = await this.matrimonialAdsService.getAdSubmissionStatus(
      user.uid,
    );
    return {
      success: true,
      data: status,
    };
  }

  @Get('my-ad')
  @UseGuards(FirebaseAuthGuard)
  async getMyAdDetails(
    @User() user: AuthenticatedUser,
  ): Promise<ApiResponse<any>> {
    const result = await this.matrimonialAdsService.getMyAdDetails(user.uid);
    return {
      success: true,
      data: result,
    };
  }

  @Get(':adId')
  async getAdData(@Param('adId') adId: string): Promise<ApiResponse<any>> {
    const result = await this.matrimonialAdsService.getAdData(adId);
    return {
      success: true,
      data: result,
    };
  }

  @Post('submit')
  @UseGuards(FirebaseAuthGuard)
  async submitAd(@User() user: AuthenticatedUser): Promise<ApiResponse<any>> {
    const result = await this.matrimonialAdsService.submitAd(user.uid);
    return {
      success: true,
      data: result,
    };
  }
}
