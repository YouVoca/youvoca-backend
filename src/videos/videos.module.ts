import { Module } from '@nestjs/common';
import { VideosController } from './videos.controller';
import { VideosService } from './videos.service';
import { YoutubeTranscriptAdapter } from './youtube-transcript.adapter';

@Module({
  controllers: [VideosController],
  providers: [VideosService, YoutubeTranscriptAdapter],
})
export class VideosModule {}
