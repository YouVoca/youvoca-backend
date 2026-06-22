import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { VideosService } from './videos.service';
import type { YoutubeTranscriptAdapter } from './youtube-transcript.adapter';

describe('VideosService', () => {
  const transcript = { findFirst: jest.fn() };
  const prisma = { transcript } as unknown as PrismaService;
  const youtube = { fetch: jest.fn() } as unknown as YoutubeTranscriptAdapter;
  const service = new VideosService(prisma, youtube);

  beforeEach(() => jest.clearAllMocks());

  it('YouTube가 아닌 URL은 외부 요청 전에 거절한다', async () => {
    await expect(
      service.extractTranscript({
        youtubeUrl: 'https://example.com/watch?v=dQw4w9WgXcQ',
        language: 'en',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(youtube.fetch).not.toHaveBeenCalled();
  });

  it('이미 저장한 영상과 언어는 자막을 다시 요청하지 않는다', async () => {
    const existing = {
      id: 10,
      language: 'en',
      fullText: 'Existing transcript',
      video: {
        id: 1,
        title: 'Existing video',
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        thumbnailUrl: null,
      },
      segments: [],
    };
    transcript.findFirst.mockResolvedValue(existing);

    await expect(
      service.extractTranscript({
        youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ',
        language: 'EN',
      }),
    ).resolves.toEqual({
      video: existing.video,
      transcript: existing,
    });
    expect(youtube.fetch).not.toHaveBeenCalled();
  });
});
