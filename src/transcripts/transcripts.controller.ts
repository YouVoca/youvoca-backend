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
import { UploadTranscriptDto } from './dto/upload-transcript.dto';
import { TranscriptsService } from './transcripts.service';

@Controller('transcripts')
@UseGuards(JwtAuthGuard)
export class TranscriptsController {
  constructor(private readonly transcriptsService: TranscriptsService) {}

  @Post('upload')
  upload(@Body() dto: UploadTranscriptDto) {
    return this.transcriptsService.upload(dto);
  }

  @Get(':transcriptId')
  findOne(@Param('transcriptId', ParseIntPipe) transcriptId: number) {
    return this.transcriptsService.findOne(transcriptId);
  }
}
