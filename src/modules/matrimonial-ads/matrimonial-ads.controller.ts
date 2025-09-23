/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
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
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  photoUploadConfig,
  horoscopeUploadConfig,
} from '../../common/config/multer.config';
import { MatrimonialAdsService } from './matrimonial-ads.service';
import {
  InitializeMatrimonialAdDto,
  SavePhaseDataDto,
} from '../../dto/matrimonial-ad.dto';
import { ApiResponse } from '../../dto/common.dto';

@Controller('matrimonial-ads')
export class MatrimonialAdsController {
  constructor(private readonly matrimonialAdsService: MatrimonialAdsService) {}

  @Post('initialize')
  @UsePipes(new ValidationPipe({ transform: true }))
  async initializeMatrimonialAd(
    @Body() initializeDto: InitializeMatrimonialAdDto,
  ): Promise<ApiResponse<any>> {
    const result = await this.matrimonialAdsService.initializeMatrimonialAd(
      initializeDto.firebaseUserId,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Post(':adId/save-phase')
  @UsePipes(new ValidationPipe({ transform: true }))
  async savePhaseData(
    @Param('adId') adId: string,
    @Body() savePhaseDto: SavePhaseDataDto,
  ): Promise<ApiResponse<any>> {
    const result = await this.matrimonialAdsService.savePhaseData(
      adId,
      savePhaseDto.phase,
      savePhaseDto.data,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Post(':adId/photos')
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

  @Get('status/:firebaseUserId')
  async getAdStatus(
    @Param('firebaseUserId') firebaseUserId: string,
  ): Promise<ApiResponse<any>> {
    const result = await this.matrimonialAdsService.getAdStatus(firebaseUserId);
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

  @Post('submit/:firebaseUserId')
  async submitAd(
    @Param('firebaseUserId') firebaseUserId: string,
  ): Promise<ApiResponse<any>> {
    const result = await this.matrimonialAdsService.submitAd(firebaseUserId);
    return {
      success: true,
      data: result,
    };
  }
}
