import { Injectable, NotFoundException } from '@nestjs/common';
import { ReviewResult, UserWordStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findCards(userId: number, limit: number) {
    const now = new Date();
    const items = await this.prisma.userVocabulary.findMany({
      where: {
        userId,
        OR: [
          { status: UserWordStatus.UNKNOWN },
          {
            status: UserWordStatus.LEARNING,
            OR: [{ reviewQueuedAt: null }, { reviewQueuedAt: { lte: now } }],
          },
        ],
      },
      orderBy: [{ reviewQueuedAt: 'asc' }, { savedAt: 'asc' }],
      take: limit,
      include: {
        vocabulary: { include: { meanings: { orderBy: { order: 'asc' } } } },
        examples: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            transcriptVocabulary: {
              include: {
                transcript: { select: { id: true, title: true, video: true } },
              },
            },
          },
        },
      },
    });

    return {
      cards: items.map((item) => {
        const occurrence = item.examples[0]?.transcriptVocabulary;
        return {
          userVocabularyId: item.id,
          vocabularyId: item.vocabularyId,
          word: item.vocabulary.word,
          meaningKo: item.vocabulary.meaningKo,
          partOfSpeech: item.vocabulary.partOfSpeech,
          difficulty: item.vocabulary.difficulty,
          meanings: item.vocabulary.meanings,
          sentence: occurrence?.sentence ?? null,
          sentenceKo: occurrence?.sentenceKo ?? null,
          startSec: occurrence?.startSec ?? null,
          source: occurrence?.transcript ?? null,
          status: item.status,
        };
      }),
    };
  }

  async create(userId: number, vocabularyId: number, result: ReviewResult) {
    const userVocabulary = await this.prisma.userVocabulary.findUnique({
      where: { userId_vocabularyId: { userId, vocabularyId } },
    });
    if (!userVocabulary) {
      throw new NotFoundException('내 단어장에서 찾을 수 없습니다.');
    }

    const schedule = this.getNextSchedule(result);
    return this.prisma.$transaction(async (tx) => {
      const history = await tx.reviewHistory.create({
        data: { userId, vocabularyId, result },
      });
      const updated = await tx.userVocabulary.update({
        where: { id: userVocabulary.id },
        data: {
          status: schedule.status,
          reviewQueuedAt: schedule.reviewQueuedAt,
        },
      });
      return {
        id: history.id,
        vocabularyId,
        result,
        reviewedAt: history.reviewedAt,
        status: updated.status,
        nextReviewAt: updated.reviewQueuedAt,
      };
    });
  }

  private getNextSchedule(result: ReviewResult) {
    const now = Date.now();
    switch (result) {
      case ReviewResult.AGAIN:
        return {
          status: UserWordStatus.LEARNING,
          reviewQueuedAt: new Date(now),
        };
      case ReviewResult.WRONG:
        return {
          status: UserWordStatus.LEARNING,
          reviewQueuedAt: new Date(now + 10 * 60 * 1000),
        };
      case ReviewResult.CORRECT:
        return {
          status: UserWordStatus.LEARNING,
          reviewQueuedAt: new Date(now + 24 * 60 * 60 * 1000),
        };
      case ReviewResult.EASY:
        return { status: UserWordStatus.MASTERED, reviewQueuedAt: null };
    }
  }
}
