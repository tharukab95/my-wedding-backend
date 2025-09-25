/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ValidationPipe,
  UsePipes,
  UseGuards,
} from '@nestjs/common';
import { MatchesService } from './matches.service';
import {
  FindMatchesQueryDto,
  ExpressInterestDto,
  RespondToInterestDto,
  RespondToMatchDto,
  GetMyMatchesQueryDto,
} from '../../dto/matches.dto';
import { ApiResponse } from '../../dto/common.dto';
import { FirebaseAuthGuard } from '../../guards/firebase-auth.guard';
import { CurrentUserId } from '../../decorators/current-user.decorator';
import { User } from '../../decorators/user.decorator';
import type { AuthenticatedUser } from '../../decorators/user.decorator';
import { UserResolverService } from '../../services/user-resolver.service';

@Controller()
@UseGuards(FirebaseAuthGuard)
export class MatchesController {
  constructor(
    private readonly matchesService: MatchesService,
    private readonly userResolverService: UserResolverService,
  ) {}

  @Get('matches/find/:adId')
  @UsePipes(new ValidationPipe({ transform: true }))
  async findMatches(
    @Param('adId') adId: string,
    @Query() query: FindMatchesQueryDto,
  ): Promise<ApiResponse<any>> {
    const result = await this.matchesService.findMatches(
      adId,
      query.page,
      query.limit,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Post('interests/express')
  @UsePipes(new ValidationPipe({ transform: true }))
  async expressInterest(
    @Body() expressInterestDto: ExpressInterestDto,
    @User() user: AuthenticatedUser,
  ): Promise<ApiResponse<any>> {
    // Temporarily resolve user ID in controller to debug middleware issue
    const resolvedUserId = await this.userResolverService.resolveUserId(
      user.uid,
    );

    const result = await this.matchesService.expressInterest(
      resolvedUserId,
      expressInterestDto.adId,
      expressInterestDto.message,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Get('interests/received')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getReceivedInterests(
    @Query() query: GetMyMatchesQueryDto,
    @CurrentUserId() userId: string,
  ): Promise<ApiResponse<any>> {
    const result = await this.matchesService.getReceivedInterests(
      userId,
      query.page,
      query.limit,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Post('interests/:interestId/respond')
  @UsePipes(new ValidationPipe({ transform: true }))
  async respondToInterest(
    @Param('interestId') interestId: string,
    @Body() respondDto: RespondToInterestDto,
  ): Promise<ApiResponse<any>> {
    const result = await this.matchesService.respondToInterest(
      interestId,
      respondDto.status,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Get('matches/my-matches')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getMyMatches(
    @Query() query: GetMyMatchesQueryDto,
    @CurrentUserId() userId: string,
  ): Promise<ApiResponse<any>> {
    const result = await this.matchesService.getMyMatches(
      userId,
      query.status,
      query.page,
      query.limit,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Post('matches/:matchId/respond')
  @UsePipes(new ValidationPipe({ transform: true }))
  async respondToMatch(
    @Param('matchId') matchId: string,
    @Body() respondDto: RespondToMatchDto,
  ): Promise<ApiResponse<any>> {
    const result = await this.matchesService.respondToMatch(
      matchId,
      respondDto.status,
    );
    return {
      success: true,
      data: result,
    };
  }
}
