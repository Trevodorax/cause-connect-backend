import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { JavaAppService } from './java-app.service';
import { Response } from 'express';
import { Public } from 'src/auth/decorators/public.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { z } from 'zod';

const createPluginSchema = z.object({
  name: z.string(),
  description: z.string(),
  author: z.string(),
});

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
  @Post('plugins')
  @UseInterceptors(FileInterceptor('plugin'))
  async updateAssociationLogo(
    @UploadedFile() file: Express.Multer.File,
    @Body() createPluginDto: z.infer<typeof createPluginSchema>,
  ): Promise<PlugInResponse> {
    const validBody = createPluginSchema.parse(createPluginDto);
    const plugin = await this.javaAppService.createPlugin(file, {
      name: validBody.name ?? file.originalname,
      description: validBody.description ?? '',
      author: validBody.author ?? '',
    });
    return plugin;
  }

  @Public()
  @Get('plugins')
  async getPlugins(): Promise<PlugInResponse[]> {
    return await this.javaAppService.getPlugins();
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
