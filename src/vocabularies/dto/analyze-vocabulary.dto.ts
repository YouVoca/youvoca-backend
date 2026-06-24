import { CEFRLevel } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
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

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  selectedWords?: string[];
}
