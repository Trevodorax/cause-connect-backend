import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { User } from 'src/users/users.entity';
import { UserPayload } from './decorators/user.decorator';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

interface ResetPasswordDto {
  resetPasswordCode: string;
  newPassword: string;
}

interface LoginDto {
  email: string;
  password: string;
  associationId: string;
}

@Injectable()
export class AuthService {
  constructor(
    private userService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}
  async resetPassword(dto: ResetPasswordDto): Promise<string> {
    const user = await this.userService.resetPassword(dto);

    const payload = this.userToPayload(user);
    const token = await this.jwtService.signAsync(payload, {
      expiresIn: '24h',
      secret: this.configService.get<string>('JWT_SECRET'),
    });
    return token;
  }

  async login(dto: LoginDto): Promise<string> {
    const user = await this.userService.findOneByEmailInAssociation(
      dto.email,
      dto.associationId,
    );

    // No matching email
    if (!user) {
      throw new UnauthorizedException("Email doesn't exist");
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException("User doesn't have a password set");
    }

    if (!(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Password doesn't match");
    }
    const payload = this.userToPayload(user);
    const token = await this.jwtService.signAsync(payload, {
      expiresIn: '24h',
      secret: this.configService.get<string>('JWT_SECRET'),
    });
    return token;
  }

  private userToPayload(user: User): UserPayload {
    const payload: UserPayload = {
      id: user.id,
      associationId: user.association.id,
      role: user.role,
    };

    return payload;
  }
}
