import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/auth-user.type';
import { AnalyzeVocabularyDto } from './dto/analyze-vocabulary.dto';
import { VocabulariesService } from './vocabularies.service';

@Controller('vocabularies')
@UseGuards(JwtAuthGuard)
export class VocabulariesController {
  constructor(private readonly vocabulariesService: VocabulariesService) {}

  @Post('analyze')
  analyze(@CurrentUser() user: AuthUser, @Body() dto: AnalyzeVocabularyDto) {
    return this.vocabulariesService.analyze(user.id, dto);
  }
}
