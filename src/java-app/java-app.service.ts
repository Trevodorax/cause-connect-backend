import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { readdir, readFile } from 'fs';
import * as fs from 'fs';
import { Repository } from 'typeorm';
import { PlugIn } from './plugin.entity';

interface File {
  name: string;
  mimeType: string;
  size: number;
  data: Buffer;
}

interface CreatePluginDto {
  name: string;
  description: string;
  author: string;
}

const JAR_ROOT_PATH = '/home/deploy/cause-connect-java-app/jar/';
const PLUGINS_ROOT_PATH = '/home/deploy/cause-connect-java-app/plugins/';
const INSTALLER_ROOT_PATH = '/home/deploy/cause-connect-java-app/installer/';

@Injectable()
export class JavaAppService {
  constructor(
    @InjectRepository(PlugIn)
    private plugInRepository: Repository<PlugIn>,
  ) {}

  async getJarForVersion(version: string): Promise<File> {
    const fileName = `causeconnect-${version}.jar`;
    const filePath = `${JAR_ROOT_PATH}${fileName}`;

    return new Promise((resolve, reject) => {
      readFile(filePath, (err, data) => {
        if (err) {
          if (err.code === 'ENOENT') {
            reject(new NotFoundException('Version not found.'));
          } else {
            reject(err);
          }
        } else {
          const file: File = {
            name: fileName,
            mimeType: 'application/java-archive',
            size: data.byteLength,
            data: data,
          };
          resolve(file);
        }
      });
    });
  }

  async getLatestJarVersion(): Promise<string> {
    return new Promise((resolve, reject) => {
      readdir(JAR_ROOT_PATH, (err, files) => {
        if (err) {
          reject(err);
        } else {
          const jarFiles = files.filter(
            (file) => file.startsWith('causeconnect-') && file.endsWith('.jar'),
          );
          if (jarFiles.length === 0) {
            reject(new Error('No jar files found in the directory.'));
          } else {
            const sortedJarFiles = jarFiles.sort();
            const latestJarFileName = sortedJarFiles[sortedJarFiles.length - 1];
            const match = latestJarFileName.match(/causeconnect-(.*).jar/);
            if (match && match[1]) {
              resolve(match[1]);
            } else {
              reject(new Error('Invalid file name.'));
            }
          }
        }
      });
    });
  }

  async uploadPlugin(file: Express.Multer.File): Promise<string> {
    const timestamp = new Date().getMilliseconds();
    const fileName = `${timestamp}_${file.originalname}`;
    const filePath = `${PLUGINS_ROOT_PATH}${fileName}`;

    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, file.buffer, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(filePath);
        }
      });
    });
  }

  async createPlugin(
    file: Express.Multer.File,
    createPluginDto: CreatePluginDto,
  ): Promise<PlugIn> {
    try {
      const filePath = await this.uploadPlugin(file);
      const plugin = this.plugInRepository.create({
        ...createPluginDto,
        jarFilePath: filePath,
      });
      await this.plugInRepository.save(plugin);
      return plugin;
    } catch (err) {
      throw new InternalServerErrorException(err, 'Failed to create plugin');
    }
  }

  async getPlugins(): Promise<PlugIn[]> {
    return await this.plugInRepository.find();
  }

  async getPlugin(id: string): Promise<PlugIn | null> {
    return await this.plugInRepository.findOneBy({ id });
  }

  async downloadPlugin(id: string): Promise<File> {
    const plugin = await this.getPlugin(id);
    if (!plugin) {
      throw new NotFoundException('Plugin not found');
    }

    return new Promise((resolve, reject) => {
      readFile(plugin.jarFilePath, (err, data) => {
        if (err) {
          if (err.code === 'ENOENT') {
            reject(new NotFoundException('Version not found.'));
          } else {
            reject(err);
          }
        } else {
          const file: File = {
            name: plugin.name + '.jar',
            mimeType: 'application/java-archive',
            size: data.byteLength,
            data: data,
          };
          resolve(file);
        }
      });
    });
  }

  async downloadLauncher(): Promise<File> {
    const fileName = 'cause-connect-installer.dmg';
    const filePath = `${INSTALLER_ROOT_PATH}${fileName}`;

    return new Promise((resolve, reject) => {
      readFile(filePath, (err, data) => {
        if (err) {
          if (err.code === 'ENOENT') {
            reject(new NotFoundException('File not found.'));
          } else {
            reject(err);
          }
        } else {
          const file: File = {
            name: fileName,
            mimeType: 'application/octet-stream',
            size: data.byteLength,
            data: data,
          };
          resolve(file);
        }
      });
    });
  }
}
