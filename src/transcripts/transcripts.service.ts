import { Injectable, NotFoundException } from '@nestjs/common';
import { TranscriptSourceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadTranscriptDto } from './dto/upload-transcript.dto';

@Injectable()
export class TranscriptsService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(dto: UploadTranscriptDto) {
    const transcript = await this.prisma.transcript.create({
      data: {
        title: dto.title.trim(),
        language: dto.language.trim().toLowerCase(),
        fullText: dto.fullText.trim(),
        sourceType: TranscriptSourceType.UPLOAD,
        segments: dto.segments?.length
          ? {
              create: dto.segments.map((segment) => ({
                startSec: segment.startSec,
                endSec: segment.endSec,
                text: segment.text.trim(),
              })),
            }
          : undefined,
      },
      include: { segments: { orderBy: { id: 'asc' } } },
    });

    return {
      transcriptId: transcript.id,
      sourceType: transcript.sourceType,
      title: transcript.title,
      language: transcript.language,
      fullText: transcript.fullText,
      segments: transcript.segments,
    };
  }

  async findOne(id: number) {
    const transcript = await this.prisma.transcript.findUnique({
      where: { id },
      include: {
        video: true,
        segments: { orderBy: [{ startSec: 'asc' }, { id: 'asc' }] },
      },
    });
    if (!transcript) throw new NotFoundException('대본을 찾을 수 없습니다.');
    return transcript;
  }
}
