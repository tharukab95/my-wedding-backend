import { AuthenticatedUser } from '../decorators/user.decorator';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      userId?: string | null;
    }
  }
}
