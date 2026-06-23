import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ExtractTranscriptDto {
  @IsString()
  @MaxLength(2048)
  youtubeUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language = 'en';
}
