import { Injectable } from '@nestjs/common';
import { readFile } from 'fs';

interface File {
  name: string;
  mimeType: string;
  size: number;
  data: Buffer;
}

@Injectable()
export class JavaAppService {
  async getJarForVersion(version: string): Promise<File> {
    const fileName = `causeconnect-${version}.jar`;
    const filePath = `/home/deploy/cause-connect-java-app/${fileName}`;

    return new Promise((resolve, reject) => {
      readFile(filePath, (err, data) => {
        if (err) {
          reject(err);
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
}
