import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/auth-user.type';
import { StatisticsService } from './statistics.service';

@Controller('statistics')
@UseGuards(JwtAuthGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('me')
  findMine(@CurrentUser() user: AuthUser) {
    return this.statisticsService.findMine(user.id);
  }

  @Get('transcripts/:transcriptId/difficulty')
  findTranscriptDifficulty(
    @CurrentUser() user: AuthUser,
    @Param('transcriptId', ParseIntPipe) transcriptId: number,
  ) {
    return this.statisticsService.findTranscriptDifficulty(
      user.id,
      transcriptId,
    );
  }
}
