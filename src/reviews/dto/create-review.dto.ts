import { ReviewResult } from '@prisma/client';
import { IsEnum, IsInt, IsPositive } from 'class-validator';

export class CreateReviewDto {
  @IsInt()
  @IsPositive()
  vocabularyId: number;

  @IsEnum(ReviewResult)
  result: ReviewResult;
}
