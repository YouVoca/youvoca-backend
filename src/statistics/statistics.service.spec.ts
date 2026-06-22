import { NotFoundException } from '@nestjs/common';
import { CEFRLevel, UserWordStatus } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { StatisticsService } from './statistics.service';

describe('StatisticsService', () => {
  const prismaMock = {
    userVocabulary: { findMany: jest.fn() },
    transcript: { findUnique: jest.fn() },
  };
  const service = new StatisticsService(prismaMock as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('내 단어 상태와 CEFR 분포를 집계한다', async () => {
    prismaMock.userVocabulary.findMany.mockResolvedValue([
      {
        status: UserWordStatus.KNOWN,
        vocabulary: { difficulty: CEFRLevel.A1 },
      },
      {
        status: UserWordStatus.KNOWN,
        vocabulary: { difficulty: CEFRLevel.A2 },
      },
      {
        status: UserWordStatus.UNKNOWN,
        vocabulary: { difficulty: CEFRLevel.B1 },
      },
      {
        status: UserWordStatus.LEARNING,
        vocabulary: { difficulty: CEFRLevel.B1 },
      },
      { status: UserWordStatus.MASTERED, vocabulary: { difficulty: null } },
    ]);

    await expect(service.findMine(1)).resolves.toEqual({
      totalWords: 5,
      knownWords: 2,
      unknownWords: 1,
      learningWords: 1,
      masteredWords: 1,
      levelDistribution: { A1: 1, A2: 1, B1: 2, B2: 0, C1: 0, C2: 0 },
    });
  });

  it('대본의 중복 등장 문장을 제외하고 기지 단어 비율을 계산한다', async () => {
    const vocabulary = (
      id: number,
      difficulty: CEFRLevel,
      status?: UserWordStatus,
    ) => ({
      vocabulary: {
        id,
        difficulty,
        userVocabularies: status ? [{ status }] : [],
      },
    });
    prismaMock.transcript.findUnique.mockResolvedValue({
      id: 10,
      transcriptVocabularies: [
        vocabulary(1, CEFRLevel.A1, UserWordStatus.KNOWN),
        vocabulary(1, CEFRLevel.A1, UserWordStatus.KNOWN),
        vocabulary(2, CEFRLevel.A2, UserWordStatus.MASTERED),
        vocabulary(3, CEFRLevel.B1, UserWordStatus.KNOWN),
        vocabulary(4, CEFRLevel.C1),
      ],
    });

    await expect(service.findTranscriptDifficulty(1, 10)).resolves.toEqual({
      transcriptId: 10,
      difficulty: '적정 수준',
      totalWords: 4,
      knownWords: 3,
      knownWordRate: 75,
      unknownWordRate: 25,
      recommendedLevel: CEFRLevel.C1,
    });
  });

  it('존재하지 않는 대본의 난이도는 계산하지 않는다', async () => {
    prismaMock.transcript.findUnique.mockResolvedValue(null);
    await expect(
      service.findTranscriptDifficulty(1, 999),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
