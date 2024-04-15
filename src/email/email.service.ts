import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

interface PasswordResetEmailDto {
  email: string;
  fullName: string;
  passwordResetCode: string;
}

interface LateUserEmailDto {
  email: string;
}

@Injectable()
export class EmailService {
  constructor(private mailerService: MailerService) {}

  async sendPasswordResetEmail(dto: PasswordResetEmailDto) {
    await this.mailerService.sendMail({
      to: dto.email,
      // from: '"Support Team" <support@example.com>', // override default from
      subject: 'Here is your password reset code',
      template: './password-reset', // `.hbs` extension is appended automatically
      context: {
        fullName: dto.fullName,
        passwordResetCode: dto.passwordResetCode,
      },
    });
  }

  async sendLateUserEmail(dto: LateUserEmailDto) {
    await this.mailerService.sendMail({
      to: dto.email,
      // from: '"Support Team" <support@example.com>', // override default from
      subject: 'Late payment reminder',
      template: './late-user', // `.hbs` extension is appended automatically
    });
  }
}
