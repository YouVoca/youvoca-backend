import {
  IsArray,
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
