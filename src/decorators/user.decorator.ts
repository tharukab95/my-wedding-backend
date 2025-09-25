/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  emailVerified?: boolean;
  phoneNumber?: string;
}

export const User = createParamDecorator(
  (data: string, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    return data ? user?.[data] : user;
  },
);
