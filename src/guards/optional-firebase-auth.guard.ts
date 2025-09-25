import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import * as admin from 'firebase-admin';
import { UserResolverService } from '../services/user-resolver.service';

@Injectable()
export class OptionalFirebaseAuthGuard implements CanActivate {
  constructor(private userResolverService: UserResolverService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    // If no auth header, allow the request to proceed without authentication
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return true;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Verify the Firebase ID token
      const decodedToken = await admin.auth().verifyIdToken(token);

      // Attach user info to request
      request.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        phoneNumber: decodedToken.phone_number,
      };

      // Also resolve the user and attach userId to request
      try {
        const userId = await this.userResolverService.resolveUserId(
          decodedToken.uid,
        );
        request.userId = userId;
      } catch {
        // If user resolution fails, continue without userId
        request.userId = null;
      }

      return true;
    } catch {
      // If token is invalid, allow the request to proceed without authentication
      return true;
    }
  }
}
