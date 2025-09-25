import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { UserResolverService } from '../services/user-resolver.service';

@Injectable()
export class UserResolverMiddleware implements NestMiddleware {
  constructor(private userResolverService: UserResolverService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Only process if user is authenticated (from FirebaseAuthGuard)
    if (req.user && req.user.uid) {
      try {
        const user = await this.userResolverService.findOrCreateUser(
          req.user.uid,
          req.user.phoneNumber,
        );
        req.userId = user.id;
      } catch (error) {
        // If user doesn't exist in database, we'll let the controller handle it
        // This allows for user creation in endpoints like initialize
        req.userId = null;
        console.log(`Error resolving user:`, error);
      }
    } else {
      //   console.log('No user in request');
    }

    next();
  }
}
