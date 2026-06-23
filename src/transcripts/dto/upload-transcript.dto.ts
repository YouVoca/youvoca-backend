import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TranscriptSegmentDto {
  @IsOptional()
  @IsNumber()
  startSec?: number;

  @IsOptional()
  @IsNumber()
  endSec?: number;

  @IsString()
  @MinLength(1)
  text: string;
}

export class UploadTranscriptDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language = 'en';

  @IsString()
  @MinLength(1)
  @MaxLength(500_000)
  fullText: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranscriptSegmentDto)
  segments?: TranscriptSegmentDto[];
}

export class UploadYoutubeTranscriptDto extends UploadTranscriptDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  youtubeUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(11)
  videoId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  thumbnailUrl?: string;

  @IsOptional()
  @IsInt()
  durationSec?: number;
}
