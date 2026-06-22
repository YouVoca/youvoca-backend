import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExtractTranscriptDto } from './dto/extract-transcript.dto';
import { VideosService } from './videos.service';

@Controller('videos')
@UseGuards(JwtAuthGuard)
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Post('transcript')
  extractTranscript(@Body() dto: ExtractTranscriptDto) {
    return this.videosService.extractTranscript(dto);
  }
}
