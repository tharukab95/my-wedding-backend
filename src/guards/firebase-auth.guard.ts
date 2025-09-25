import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: 'MISSING_AUTH_TOKEN',
        message: 'Authorization token is required',
      });
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

      return true;
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_AUTH_TOKEN',
        message: 'Invalid or expired authentication token',
      });
    }
  }
}
