/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  emailVerified?: boolean;
  phoneNumber?: string;
}

export const OptionalUser = createParamDecorator(
  (data: string, ctx: ExecutionContext): AuthenticatedUser | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    return data ? user?.[data] : user;
  },
);
