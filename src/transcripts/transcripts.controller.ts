import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/auth-user.type';
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

  @Get('saved/list')
  findSaved(@CurrentUser() user: AuthUser) {
    return this.transcriptsService.findSaved(user.id);
  }

  @Get(':transcriptId')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('transcriptId', ParseIntPipe) transcriptId: number,
  ) {
    return this.transcriptsService.findOne(transcriptId, user.id);
  }

  @Post(':transcriptId/save')
  save(
    @CurrentUser() user: AuthUser,
    @Param('transcriptId', ParseIntPipe) transcriptId: number,
  ) {
    return this.transcriptsService.save(user.id, transcriptId);
  }

  @Delete(':transcriptId/save')
  deleteSaved(
    @CurrentUser() user: AuthUser,
    @Param('transcriptId', ParseIntPipe) transcriptId: number,
  ) {
    return this.transcriptsService.deleteSaved(user.id, transcriptId);
  }
}
