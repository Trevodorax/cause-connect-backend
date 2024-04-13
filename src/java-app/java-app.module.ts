import { Module } from '@nestjs/common';
import { JavaAppController } from './java-app.controller';
import { JavaAppService } from './java-app.service';

@Module({
  controllers: [JavaAppController],
  providers: [JavaAppService],
})
export class JavaAppModule {}
