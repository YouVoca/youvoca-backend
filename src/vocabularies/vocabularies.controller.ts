import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/auth-user.type';
import { AnalyzeVocabularyDto } from './dto/analyze-vocabulary.dto';
import { AddVocabularyExampleDto } from './dto/add-vocabulary-example.dto';
import { CreateUserVocabularyDto } from './dto/create-user-vocabulary.dto';
import { ListUserVocabulariesDto } from './dto/list-user-vocabularies.dto';
import { UpdateWordStatusDto } from './dto/update-word-status.dto';
import { VocabulariesService } from './vocabularies.service';

@Controller('vocabularies')
@UseGuards(JwtAuthGuard)
export class VocabulariesController {
  constructor(private readonly vocabulariesService: VocabulariesService) {}

  @Post('analyze')
  analyze(@CurrentUser() user: AuthUser, @Body() dto: AnalyzeVocabularyDto) {
    return this.vocabulariesService.analyze(user.id, dto);
  }

  @Post('my')
  save(@CurrentUser() user: AuthUser, @Body() dto: CreateUserVocabularyDto) {
    return this.vocabulariesService.saveForUser(user.id, dto);
  }

  @Get('my')
  findMine(
    @CurrentUser() user: AuthUser,
    @Query() query: ListUserVocabulariesDto,
  ) {
    return this.vocabulariesService.findForUser(user.id, query);
  }

  @Patch('my/:userVocabularyId/status')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('userVocabularyId', ParseIntPipe) userVocabularyId: number,
    @Body() dto: UpdateWordStatusDto,
  ) {
    return this.vocabulariesService.updateStatus(
      user.id,
      userVocabularyId,
      dto.status,
    );
  }

  @Post('my/:userVocabularyId/examples')
  addExample(
    @CurrentUser() user: AuthUser,
    @Param('userVocabularyId', ParseIntPipe) userVocabularyId: number,
    @Body() dto: AddVocabularyExampleDto,
  ) {
    return this.vocabulariesService.addExample(
      user.id,
      userVocabularyId,
      dto.transcriptVocabularyId,
    );
  }

  @Post('my/:userVocabularyId/review-queue')
  addToReviewQueue(
    @CurrentUser() user: AuthUser,
    @Param('userVocabularyId', ParseIntPipe) userVocabularyId: number,
  ) {
    return this.vocabulariesService.addToReviewQueue(user.id, userVocabularyId);
  }

  @Get(':vocabularyId')
  findOne(@Param('vocabularyId', ParseIntPipe) vocabularyId: number) {
    return this.vocabulariesService.findOne(vocabularyId);
  }
}
