import { CEFRLevel } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
} from 'class-validator';

export class AnalyzeVocabularyDto {
  @IsInt()
  @IsPositive()
  transcriptId: number;

  @IsOptional()
  @IsBoolean()
  excludeKnownWords = true;

  @IsOptional()
  @IsEnum(CEFRLevel)
  targetLevel: CEFRLevel = CEFRLevel.B1;
}
