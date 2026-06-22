import { UserWordStatus } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateUserVocabularyDto {
  @IsInt()
  @IsPositive()
  vocabularyId: number;

  @IsOptional()
  @IsEnum(UserWordStatus)
  status?: UserWordStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  memo?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  transcriptVocabularyId?: number;
}
