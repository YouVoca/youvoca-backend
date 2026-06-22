import { BadRequestException, Injectable } from '@nestjs/common';
import { TranscriptSourceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ExtractTranscriptDto } from './dto/extract-transcript.dto';
import { YoutubeTranscriptAdapter } from './youtube-transcript.adapter';

@Injectable()
export class VideosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly youtube: YoutubeTranscriptAdapter,
  ) {}

  async extractTranscript(dto: ExtractTranscriptDto) {
    const videoId = this.extractVideoId(dto.youtubeUrl);
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const language = dto.language.trim().toLowerCase();
    const existing = await this.prisma.transcript.findFirst({
      where: {
        language,
        sourceType: TranscriptSourceType.YOUTUBE,
        video: { youtubeUrl },
      },
      include: { video: true, segments: { orderBy: { startSec: 'asc' } } },
    });
    if (existing) return this.toResponse(existing.video!, existing);

    const result = await this.youtube.fetch(videoId, language);
    const thumbnail = [...result.videoDetails.thumbnails].sort(
      (a, b) => b.width - a.width,
    )[0]?.url;

    const saved = await this.prisma.$transaction(async (tx) => {
      const video = await tx.video.upsert({
        where: { youtubeUrl },
        update: {
          title: result.videoDetails.title,
          thumbnailUrl: thumbnail,
          durationSec: result.videoDetails.lengthSeconds,
        },
        create: {
          youtubeUrl,
          title: result.videoDetails.title,
          thumbnailUrl: thumbnail,
          durationSec: result.videoDetails.lengthSeconds,
        },
      });
      const transcript = await tx.transcript.create({
        data: {
          videoId: video.id,
          title: result.videoDetails.title,
          sourceType: TranscriptSourceType.YOUTUBE,
          language,
          fullText: result.segments.map((segment) => segment.text).join(' '),
          segments: {
            create: result.segments.map((segment) => ({
              startSec: segment.offset,
              endSec: segment.offset + segment.duration,
              text: segment.text,
            })),
          },
        },
        include: { segments: { orderBy: { startSec: 'asc' } } },
      });
      return { video, transcript };
    });

    return this.toResponse(saved.video, saved.transcript);
  }

  private extractVideoId(value: string) {
    try {
      const url = new URL(value);
      const host = url.hostname.replace(/^www\./, '');
      let id: string | null = null;
      if (host === 'youtu.be') id = url.pathname.split('/')[1] ?? null;
      if (host === 'youtube.com' || host === 'm.youtube.com') {
        id = url.searchParams.get('v');
        if (!id)
          id = url.pathname.match(/^\/(?:shorts|embed)\/([^/?]+)/)?.[1] ?? null;
      }
      if (!id || !/^[\w-]{11}$/.test(id)) throw new Error('invalid');
      return id;
    } catch {
      throw new BadRequestException('유효하지 않은 YouTube URL입니다.');
    }
  }

  private toResponse(
    video: {
      id: number;
      title: string;
      youtubeUrl: string;
      thumbnailUrl: string | null;
    },
    transcript: {
      id: number;
      language: string;
      fullText: string;
      segments: unknown[];
    },
  ) {
    return { video, transcript };
  }
}
