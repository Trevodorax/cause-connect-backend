import { Controller, Get, Param, Res } from '@nestjs/common';
import { JavaAppService } from './java-app.service';
import { Response } from 'express';
import { Public } from 'src/auth/decorators/public.decorator';

interface PlugInResponse {
  id: string;
  name: string;
  description: string;
  author: string;
}

@Controller('java-app')
export class JavaAppController {
  constructor(private readonly javaAppService: JavaAppService) {}

  @Public()
  @Get('latest-version')
  async getLatestJarVersion() {
    return {
      version: await this.javaAppService.getLatestJarVersion(),
    };
  }

  @Public()
  @Get(':version')
  async downloadFile(@Param('version') version: string, @Res() res: Response) {
    const file = await this.javaAppService.getJarForVersion(version);
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', file.size);
    res.send(file.data);
  }

  @Public()
  @Get('plugins')
  async getPlugins(): Promise<PlugInResponse[]> {
    return this.javaAppService.getPlugins();
  }

  @Public()
  @Get('plugins/:id')
  async downloadPlugin(@Param('id') id: string, @Res() res: Response) {
    const file = await this.javaAppService.downloadPlugin(id);
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', file.size);
    res.send(file.data);
  }

  @Public()
  @Get('installer')
  async downloadInstaller(@Res() res: Response) {
    const file = await this.javaAppService.downloadLauncher();
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', file.size);
    res.send(file.data);
  }
}
