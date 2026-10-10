import { Module } from '@nestjs/common';
import { AiAudioController } from './ai-audio.controller';
import { AiAudioService } from './ai-audio.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AiAudioController],
  providers: [AiAudioService],
  exports: [AiAudioService],
})
export class AiAudioModule {}
