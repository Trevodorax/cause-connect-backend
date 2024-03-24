import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { GetUser } from './decorators/user.decorator';
import { User } from 'src/users/users.entity';
import { z } from 'zod';

const ResetPasswordSchema = z.object({
  resetPasswordCode: z.string(),
  newPassword: z.string().min(8),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  associationId: z.string(),
});

interface AuthResponse {
  token: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('reset-password')
  async register(
    @Body() body: z.infer<typeof ResetPasswordSchema>,
  ): Promise<AuthResponse> {
    const validBody = ResetPasswordSchema.parse(body);
    const token = await this.authService.resetPassword({
      newPassword: validBody.newPassword,
      resetPasswordCode: validBody.resetPasswordCode,
    });

    return { token };
  }

  @Public()
  @Post('login')
  async login(
    @Body() body: z.infer<typeof LoginSchema>,
  ): Promise<AuthResponse> {
    const validBody = LoginSchema.parse(body);

    const token = await this.authService.login({
      associationId: validBody.associationId,
      email: validBody.email,
      password: validBody.password,
    });

    return { token };
  }

  @Get('me')
  me(@GetUser() user: User): User {
    return user;
  }
}
