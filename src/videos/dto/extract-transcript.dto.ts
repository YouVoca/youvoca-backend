import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class ExtractTranscriptDto {
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  youtubeUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language = 'en';
}
