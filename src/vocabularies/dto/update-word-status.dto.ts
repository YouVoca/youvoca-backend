import { UserWordStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateWordStatusDto {
  @IsEnum(UserWordStatus)
  status: UserWordStatus;
}
