import { Injectable, NotFoundException } from '@nestjs/common';
import { readdir, readFile } from 'fs';

interface File {
  name: string;
  mimeType: string;
  size: number;
  data: Buffer;
}

const JAR_ROOT_PATH = '/home/deploy/cause-connect-java-app/';

@Injectable()
export class JavaAppService {
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
}
