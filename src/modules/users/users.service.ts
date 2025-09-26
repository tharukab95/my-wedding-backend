/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { MatrimonialAd } from '../../entities/matrimonial-ad.entity';
import { ErrorCodes } from '../../dto/common.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(MatrimonialAd)
    private matrimonialAdRepository: Repository<MatrimonialAd>,
  ) {}

  async getUserProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['matrimonialAd'],
    });

    if (!user) {
      throw new NotFoundException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    const matrimonialAd = user.matrimonialAd
      ? {
          adId: user.matrimonialAd.id,
          type: user.matrimonialAd.type,
          status: user.matrimonialAd.status,
          createdAt: user.matrimonialAd.createdAt,
        }
      : null;

    return {
      userId: user.id,
      firebaseUserId: user.firebaseUserId,
      phoneNumber: user.phoneNumber,
      isVerified: user.isVerified,
      matrimonialAd,
      createdAt: user.createdAt,
    };
  }

  async updateUserProfile(
    userId: string,
    updateData: { phoneNumber?: string },
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    await this.userRepository.update(userId, updateData);

    const updatedUser = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!updatedUser) {
      throw new NotFoundException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'User not found after update',
      });
    }

    return {
      userId: updatedUser.id,
      phoneNumber: updatedUser.phoneNumber,
      updatedAt: updatedUser.updatedAt,
    };
  }

  async findUserByFirebaseId(firebaseUserId: string) {
    return await this.userRepository.findOne({
      where: { firebaseUserId },
    });
  }

  async createUser(firebaseUserId: string, phoneNumber?: string) {
    const user = this.userRepository.create({
      firebaseUserId,
      phoneNumber,
      isVerified: true, // Assuming Firebase handles verification
    });

    return await this.userRepository.save(user);
  }
}
