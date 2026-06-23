import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  UploadTranscriptDto,
  UploadYoutubeTranscriptDto,
} from './dto/upload-transcript.dto';
import { TranscriptsService } from './transcripts.service';

@Controller('transcripts')
@UseGuards(JwtAuthGuard)
export class TranscriptsController {
  constructor(private readonly transcriptsService: TranscriptsService) {}

  @Post('upload')
  upload(@Body() dto: UploadTranscriptDto) {
    return this.transcriptsService.upload(dto);
  }

  @Post('youtube')
  uploadYoutube(@Body() dto: UploadYoutubeTranscriptDto) {
    return this.transcriptsService.uploadYoutube(dto);
  }

  @Get(':transcriptId')
  findOne(@Param('transcriptId', ParseIntPipe) transcriptId: number) {
    return this.transcriptsService.findOne(transcriptId);
  }
}
