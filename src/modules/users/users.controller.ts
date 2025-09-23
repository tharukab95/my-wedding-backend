import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserProfileDto } from '../../dto/users.dto';
import { ApiResponse } from '../../dto/common.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':userId/profile')
  async getUserProfile(
    @Param('userId') userId: string,
  ): Promise<ApiResponse<any>> {
    try {
      const result = await this.usersService.getUserProfile(userId);
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

  @Put(':userId/profile')
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateUserProfile(
    @Param('userId') userId: string,
    @Body() updateDto: UpdateUserProfileDto,
  ): Promise<ApiResponse<any>> {
    try {
      const result = await this.usersService.updateUserProfile(
        userId,
        updateDto,
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
}
