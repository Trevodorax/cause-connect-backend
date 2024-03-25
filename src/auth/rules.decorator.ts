import { SetMetadata } from '@nestjs/common';
import { UserRole } from 'src/users/users.entity';

export const ROLES_KEY = 'authorizedRoles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
