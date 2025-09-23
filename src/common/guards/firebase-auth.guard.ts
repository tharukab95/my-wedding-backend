import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { FirebaseService } from '../services/firebase.service';
import { ErrorCodes } from '../../dto/common.dto';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private firebaseService: FirebaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: 'No valid authorization header found',
      });
    }

    const idToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decodedToken = await this.firebaseService.verifyIdToken(idToken);
      
      // Add user info to request object
      request.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        phoneNumber: decodedToken.phone_number,
        firebaseUserId: decodedToken.uid,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Invalid Firebase ID token',
      });
    }
  }
}
