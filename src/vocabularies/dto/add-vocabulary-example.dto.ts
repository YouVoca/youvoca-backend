import { IsInt, IsPositive } from 'class-validator';

export class AddVocabularyExampleDto {
  @IsInt()
  @IsPositive()
  transcriptVocabularyId: number;
}
