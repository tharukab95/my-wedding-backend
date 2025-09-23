import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ValidationPipe,
  UsePipes,
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

@Controller()
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

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
  ): Promise<ApiResponse<any>> {
    const userId = 'temp-user-id'; // This should come from JWT token or Firebase auth

    const result = await this.matchesService.expressInterest(
      userId,
      expressInterestDto.adId,
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

  @Get('matches/my-matches/:userId')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getMyMatches(
    @Param('userId') userId: string,
    @Query() query: GetMyMatchesQueryDto,
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
