import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UserResolverService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async resolveUserId(firebaseUid: string): Promise<string> {
    const user = await this.userRepository.findOne({
      where: { firebaseUserId: firebaseUid },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found in database',
      });
    }

    return user.id;
  }

  async findOrCreateUser(
    firebaseUid: string,
    phoneNumber?: string,
  ): Promise<User> {
    let user = await this.userRepository.findOne({
      where: { firebaseUserId: firebaseUid },
    });

    if (!user) {
      user = this.userRepository.create({
        firebaseUserId: firebaseUid,
        phoneNumber: phoneNumber,
        isVerified: true,
      });
      user = await this.userRepository.save(user);
    } else if (phoneNumber && !user.phoneNumber) {
      // Update phone number if it's provided and user doesn't have one
      user.phoneNumber = phoneNumber;
      user = await this.userRepository.save(user);
    }

    return user;
  }
}
