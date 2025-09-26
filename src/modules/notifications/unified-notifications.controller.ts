/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../../guards/firebase-auth.guard';
import { User } from '../../decorators/user.decorator';
import type { AuthenticatedUser } from '../../decorators/user.decorator';
import { UserResolverService } from '../../services/user-resolver.service';
import { UnifiedNotificationsService } from './unified-notifications.service';
import { ApiResponse } from '../../dto/common.dto';

@Controller('unified-notifications')
export class UnifiedNotificationsController {
  constructor(
    private readonly unifiedNotificationsService: UnifiedNotificationsService,
    private readonly userResolverService: UserResolverService,
  ) {}

  @Get()
  @UseGuards(FirebaseAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async getUnifiedNotifications(
    @User() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponse<any>> {
    try {
      const resolvedUser = await this.userResolverService.findOrCreateUser(
        user.uid,
        user.phoneNumber,
      );

      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 20;

      const notifications =
        await this.unifiedNotificationsService.getUnifiedNotifications(
          resolvedUser.id,
          pageNum,
          limitNum,
        );

      return {
        success: true,
        data: notifications,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: error.code || 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to get unified notifications',
          details: error.details || null,
        },
      };
    }
  }

  @Get('unread-counts')
  @UseGuards(FirebaseAuthGuard)
  async getUnreadCounts(
    @User() user: AuthenticatedUser,
  ): Promise<ApiResponse<any>> {
    try {
      const resolvedUser = await this.userResolverService.findOrCreateUser(
        user.uid,
        user.phoneNumber,
      );

      const counts = await this.unifiedNotificationsService.getUnreadCounts(
        resolvedUser.id,
      );

      return {
        success: true,
        data: counts,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: error.code || 'INTERNAL_SERVER_ERROR',
          message: error.message || 'An error occurred',
        },
      };
    }
  }

  @Get('interest-requests')
  @UseGuards(FirebaseAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async getInterestRequests(
    @User() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('includeRead') includeRead?: string,
  ): Promise<ApiResponse<any>> {
    try {
      const resolvedUser = await this.userResolverService.findOrCreateUser(
        user.uid,
        user.phoneNumber,
      );

      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 20;
      const includeReadFlag = includeRead === 'true';

      const result = await this.unifiedNotificationsService.getInterestRequests(
        resolvedUser.id,
        pageNum,
        limitNum,
        includeReadFlag,
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: error.code || 'INTERNAL_SERVER_ERROR',
          message: error.message || 'An error occurred',
        },
      };
    }
  }

  @Get('matches')
  @UseGuards(FirebaseAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async getMatches(
    @User() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('includeRead') includeRead?: string,
  ): Promise<ApiResponse<any>> {
    try {
      const resolvedUser = await this.userResolverService.findOrCreateUser(
        user.uid,
        user.phoneNumber,
      );

      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 20;
      const includeReadFlag = includeRead === 'true';

      const result = await this.unifiedNotificationsService.getMatches(
        resolvedUser.id,
        pageNum,
        limitNum,
        includeReadFlag,
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: error.code || 'INTERNAL_SERVER_ERROR',
          message: error.message || 'An error occurred',
        },
      };
    }
  }

  @Put('interest-requests/:interestRequestId/read')
  @UseGuards(FirebaseAuthGuard)
  async markInterestRequestAsRead(
    @User() user: AuthenticatedUser,
    @Param('interestRequestId') interestRequestId: string,
  ): Promise<ApiResponse<any>> {
    try {
      const resolvedUser = await this.userResolverService.findOrCreateUser(
        user.uid,
        user.phoneNumber,
      );

      const result =
        await this.unifiedNotificationsService.markInterestRequestAsRead(
          interestRequestId,
          resolvedUser.id,
        );

      return {
        success: result.success,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: error.code || 'INTERNAL_SERVER_ERROR',
          message: error.message || 'An error occurred',
        },
      };
    }
  }

  @Put('matches/:matchId/read')
  @UseGuards(FirebaseAuthGuard)
  async markMatchAsRead(
    @User() user: AuthenticatedUser,
    @Param('matchId') matchId: string,
  ): Promise<ApiResponse<any>> {
    try {
      const resolvedUser = await this.userResolverService.findOrCreateUser(
        user.uid,
        user.phoneNumber,
      );

      const result = await this.unifiedNotificationsService.markMatchAsRead(
        matchId,
        resolvedUser.id,
      );

      return {
        success: result.success,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: error.code || 'INTERNAL_SERVER_ERROR',
          message: error.message || 'An error occurred',
        },
      };
    }
  }

  @Put('interest-requests/read-all')
  @UseGuards(FirebaseAuthGuard)
  async markAllInterestRequestsAsRead(
    @User() user: AuthenticatedUser,
  ): Promise<ApiResponse<any>> {
    try {
      const resolvedUser = await this.userResolverService.findOrCreateUser(
        user.uid,
        user.phoneNumber,
      );

      const result =
        await this.unifiedNotificationsService.markAllInterestRequestsAsRead(
          resolvedUser.id,
        );

      return {
        success: result.success,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: error.code || 'INTERNAL_SERVER_ERROR',
          message: error.message || 'An error occurred',
        },
      };
    }
  }

  @Put('matches/read-all')
  @UseGuards(FirebaseAuthGuard)
  async markAllMatchesAsRead(
    @User() user: AuthenticatedUser,
  ): Promise<ApiResponse<any>> {
    try {
      const resolvedUser = await this.userResolverService.findOrCreateUser(
        user.uid,
        user.phoneNumber,
      );

      const result =
        await this.unifiedNotificationsService.markAllMatchesAsRead(
          resolvedUser.id,
        );

      return {
        success: result.success,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: error.code || 'INTERNAL_SERVER_ERROR',
          message: error.message || 'An error occurred',
        },
      };
    }
  }
}
