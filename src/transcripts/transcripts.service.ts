import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TranscriptSourceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  UploadTranscriptDto,
  UploadYoutubeTranscriptDto,
} from './dto/upload-transcript.dto';

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

  async uploadYoutube(dto: UploadYoutubeTranscriptDto) {
    const videoId = this.resolveVideoId(dto);
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const language = this.normalizeLanguage(dto.language);
    const title = dto.title.trim();
    const fullText = dto.fullText.trim();
    const segments = this.normalizeSegments(dto);

    const saved = await this.prisma.$transaction(async (tx) => {
      const video = await tx.video.upsert({
        where: { youtubeUrl },
        update: {
          title,
          thumbnailUrl: dto.thumbnailUrl?.trim() || null,
          durationSec: dto.durationSec,
        },
        create: {
          youtubeUrl,
          title,
          thumbnailUrl: dto.thumbnailUrl?.trim() || null,
          durationSec: dto.durationSec,
        },
      });

      const existing = await tx.transcript.findUnique({
        where: {
          videoId_language_sourceType: {
            videoId: video.id,
            language,
            sourceType: TranscriptSourceType.YOUTUBE,
          },
        },
        select: { id: true },
      });

      if (existing) {
        await tx.transcriptSegment.deleteMany({
          where: { transcriptId: existing.id },
        });
      }

      const transcript = await tx.transcript.upsert({
        where: {
          videoId_language_sourceType: {
            videoId: video.id,
            language,
            sourceType: TranscriptSourceType.YOUTUBE,
          },
        },
        update: {
          title,
          fullText,
          segments: segments.length ? { create: segments } : undefined,
        },
        create: {
          videoId: video.id,
          title,
          language,
          sourceType: TranscriptSourceType.YOUTUBE,
          fullText,
          segments: segments.length ? { create: segments } : undefined,
        },
        include: {
          segments: { orderBy: [{ startSec: 'asc' }, { id: 'asc' }] },
        },
      });

      return { video, transcript };
    });

    return {
      video: saved.video,
      transcript: saved.transcript,
    };
  }

  async findSaved(userId: number) {
    const items = await this.prisma.savedTranscript.findMany({
      where: { userId },
      orderBy: { savedAt: 'desc' },
      include: {
        transcript: {
          include: {
            video: true,
            segments: { orderBy: [{ startSec: 'asc' }, { id: 'asc' }] },
          },
        },
      },
    });

    return {
      items: items.map((item) => ({
        id: item.id,
        savedAt: item.savedAt,
        transcript: item.transcript,
      })),
    };
  }

  async findOne(id: number, userId?: number) {
    const transcript = await this.prisma.transcript.findUnique({
      where: { id },
      include: {
        video: true,
        segments: { orderBy: [{ startSec: 'asc' }, { id: 'asc' }] },
      },
    });
    if (!transcript) throw new NotFoundException('대본을 찾을 수 없습니다.');
    if (!userId) return transcript;

    const saved = await this.prisma.savedTranscript.findUnique({
      where: { userId_transcriptId: { userId, transcriptId: id } },
      select: { id: true },
    });
    return { ...transcript, isSaved: Boolean(saved) };
  }

  async save(userId: number, transcriptId: number) {
    await this.ensureTranscriptExists(transcriptId);
    const saved = await this.prisma.savedTranscript.upsert({
      where: { userId_transcriptId: { userId, transcriptId } },
      update: {},
      create: { userId, transcriptId },
    });
    return { saved: true, savedAt: saved.savedAt };
  }

  async deleteSaved(userId: number, transcriptId: number) {
    await this.prisma.savedTranscript.deleteMany({
      where: { userId, transcriptId },
    });
    return { saved: false };
  }

  private async ensureTranscriptExists(transcriptId: number) {
    const transcript = await this.prisma.transcript.findUnique({
      where: { id: transcriptId },
      select: { id: true },
    });
    if (!transcript) throw new NotFoundException('대본을 찾을 수 없습니다.');
  }

  private resolveVideoId(dto: UploadYoutubeTranscriptDto) {
    const fromId = dto.videoId?.trim();
    if (fromId) {
      if (/^[\w-]{11}$/.test(fromId)) return fromId;
      throw new BadRequestException('유효하지 않은 YouTube 영상 ID입니다.');
    }

    const fromUrl = dto.youtubeUrl?.trim();
    if (!fromUrl) {
      throw new BadRequestException('YouTube URL 또는 영상 ID가 필요합니다.');
    }

    try {
      const normalized = fromUrl.match(/^https?:\/\//i)
        ? fromUrl
        : `https://${fromUrl}`;
      const url = new URL(normalized);
      const host = url.hostname.replace(/^www\./, '');
      let id: string | null = null;

      if (host === 'youtu.be') id = url.pathname.split('/')[1] ?? null;
      if (host === 'youtube.com' || host === 'm.youtube.com') {
        id = url.searchParams.get('v');
        if (!id) {
          id = url.pathname.match(/^\/(?:shorts|embed)\/([^/?]+)/)?.[1] ?? null;
        }
      }

      if (!id || !/^[\w-]{11}$/.test(id)) throw new Error('invalid');
      return id;
    } catch {
      throw new BadRequestException('유효하지 않은 YouTube URL입니다.');
    }
  }

  private normalizeLanguage(language = 'en') {
    return language.trim().toLowerCase() || 'en';
  }

  private normalizeSegments(dto: UploadTranscriptDto) {
    return (
      dto.segments?.map((segment) => ({
        startSec: segment.startSec,
        endSec: segment.endSec,
        text: segment.text.trim(),
      })) ?? []
    );
  }
}
