import { Controller, Get, Param, Res } from '@nestjs/common';
import { JavaAppService } from './java-app.service';
import { Response } from 'express';
import { Public } from 'src/auth/decorators/public.decorator';

@Controller('java-app')
export class JavaAppController {
  constructor(private readonly javaAppService: JavaAppService) {}

  @Public()
  @Get(':version')
  async downloadFile(@Param('version') version: string, @Res() res: Response) {
    const file = await this.javaAppService.getJarForVersion(version);
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', file.size);
    res.send(file.data);
  }
}
