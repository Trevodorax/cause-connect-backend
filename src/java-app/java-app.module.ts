import { Module } from '@nestjs/common';
import { JavaAppController } from './java-app.controller';
import { JavaAppService } from './java-app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlugIn } from './plugin.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PlugIn])],
  controllers: [JavaAppController],
  providers: [JavaAppService],
})
export class JavaAppModule {}
