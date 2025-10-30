import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import * as admin from 'firebase-admin';
import { UserResolverService } from '../services/user-resolver.service';

// Extend Request shape we set in the guard
type AugmentedRequest = Request & {
  user?: {
    uid: string;
    email?: string;
    emailVerified?: boolean;
    phoneNumber?: string;
  };
  userId?: string | null;
};

function parseCookies(cookieHeader?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  cookieHeader.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const key = pair.slice(0, idx).trim();
      const val = decodeURIComponent(pair.slice(idx + 1).trim());
      out[key] = val;
    }
  });
  return out;
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private readonly userResolverService: UserResolverService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AugmentedRequest>();

    // 1) Authorization header
    let token: string | undefined;
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // 2) Cookies
    if (!token) {
      const cookies = parseCookies(request.headers.cookie);
      token =
        cookies['__session'] || // Firebase Hosting convention
        cookies['session'] ||
        cookies['idToken'] ||
        cookies['token'];
    }

    // 3) Query (?token=)
    if (!token) {
      const raw = (request.query as Record<string, unknown>)?.token;
      if (typeof raw === 'string') token = raw;
      else if (Array.isArray(raw) && typeof raw[0] === 'string') token = raw[0];
    }

    if (!token) {
      throw new UnauthorizedException({
        code: 'MISSING_AUTH_TOKEN',
        message: 'Authorization token is required',
      });
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);

      request.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        phoneNumber: decodedToken.phone_number,
      };

      // Resolve and attach DB user id for @CurrentUserId()
      try {
        const user = await this.userResolverService.findOrCreateUser(
          decodedToken.uid,
          decodedToken.phone_number,
        );
        request.userId = user.id;
      } catch {
        request.userId = null;
      }

      return true;
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_AUTH_TOKEN',
        message: 'Invalid or expired authentication token',
      });
    }
  }
}
