import { Injectable, NotFoundException } from '@nestjs/common';
import { CEFRLevel, UserWordStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const CEFR_ORDER: CEFRLevel[] = [
  CEFRLevel.A1,
  CEFRLevel.A2,
  CEFRLevel.B1,
  CEFRLevel.B2,
  CEFRLevel.C1,
  CEFRLevel.C2,
];

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMine(userId: number) {
    const words = await this.prisma.userVocabulary.findMany({
      where: { userId },
      select: { status: true, vocabulary: { select: { difficulty: true } } },
    });

    const statusCounts: Record<UserWordStatus, number> = {
      KNOWN: 0,
      UNKNOWN: 0,
      LEARNING: 0,
      MASTERED: 0,
    };
    for (const word of words) statusCounts[word.status] += 1;

    const levelDistribution: Record<CEFRLevel, number> = {
      A1: 0,
      A2: 0,
      B1: 0,
      B2: 0,
      C1: 0,
      C2: 0,
    };
    for (const word of words) {
      if (word.vocabulary.difficulty) {
        levelDistribution[word.vocabulary.difficulty] += 1;
      }
    }

    const totalWords = Object.values(statusCounts).reduce(
      (sum, count) => sum + count,
      0,
    );
    return {
      totalWords,
      knownWords: statusCounts.KNOWN,
      unknownWords: statusCounts.UNKNOWN,
      learningWords: statusCounts.LEARNING,
      masteredWords: statusCounts.MASTERED,
      levelDistribution,
    };
  }

  async findTranscriptDifficulty(userId: number, transcriptId: number) {
    const transcript = await this.prisma.transcript.findUnique({
      where: { id: transcriptId },
      select: {
        id: true,
        transcriptVocabularies: {
          select: {
            vocabulary: {
              select: {
                id: true,
                difficulty: true,
                userVocabularies: {
                  where: { userId },
                  select: { status: true },
                },
              },
            },
          },
        },
      },
    });
    if (!transcript) throw new NotFoundException('대본을 찾을 수 없습니다.');

    const uniqueWords = new Map(
      transcript.transcriptVocabularies.map(({ vocabulary }) => [
        vocabulary.id,
        vocabulary,
      ]),
    );
    const words = [...uniqueWords.values()];
    const knownStatuses = new Set<UserWordStatus>([
      UserWordStatus.KNOWN,
      UserWordStatus.MASTERED,
    ]);
    const knownWords = words.filter((word) =>
      word.userVocabularies.some(({ status }) => knownStatuses.has(status)),
    ).length;
    const totalWords = words.length;
    const knownWordRate = totalWords
      ? this.roundRate((knownWords / totalWords) * 100)
      : 0;
    const unknownWordRate = this.roundRate(100 - knownWordRate);

    return {
      transcriptId,
      difficulty: totalWords
        ? this.getDifficultyLabel(knownWordRate)
        : '분석 데이터 없음',
      totalWords,
      knownWords,
      knownWordRate,
      unknownWordRate: totalWords ? unknownWordRate : 0,
      recommendedLevel: this.getRecommendedLevel(
        words.map((word) => word.difficulty),
      ),
    };
  }

  private getDifficultyLabel(knownWordRate: number) {
    if (knownWordRate >= 80) return '쉬움';
    if (knownWordRate >= 60) return '적정 수준';
    return '도전적';
  }

  private getRecommendedLevel(levels: (CEFRLevel | null)[]) {
    const scores = levels
      .filter((level): level is CEFRLevel => Boolean(level))
      .map((level) => CEFR_ORDER.indexOf(level))
      .sort((a, b) => a - b);
    if (!scores.length) return null;
    const percentileIndex = Math.max(0, Math.ceil(scores.length * 0.8) - 1);
    return CEFR_ORDER[scores[percentileIndex]];
  }

  private roundRate(value: number) {
    return Math.round(value * 10) / 10;
  }
}
