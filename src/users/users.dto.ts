import { UserRole } from './users.entity';

export interface ResetPasswordDto {
  passwordResetCode: string;
  newPassword: string;
}

export interface NewUserDto {
  email: string;
  fullName: string;
  role: UserRole;
  associationId: string;
}

export interface PartialUserDto {
  email?: string;
  fullName?: string;
  role?: UserRole;
}

export interface UserSearchDto {
  search: string;
}
