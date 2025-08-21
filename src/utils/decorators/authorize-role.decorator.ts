import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'allowedRoles';
export const AuthorizeRoles = (...roles: string[]) =>
  SetMetadata(ROLES_KEY, roles);
