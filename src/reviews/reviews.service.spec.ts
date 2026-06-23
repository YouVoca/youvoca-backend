import { NotFoundException } from '@nestjs/common';
import { ReviewResult, UserWordStatus } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { ReviewsService } from './reviews.service';

describe('ReviewsService', () => {
  const tx = {
    reviewHistory: { create: jest.fn() },
    userVocabulary: { update: jest.fn() },
  };
  const prismaMock = {
    userVocabulary: { findUnique: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn((callback) => callback(tx)),
  };
  const service = new ReviewsService(prismaMock as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.useRealTimers());

  it('내 단어장에 없는 단어의 복습 결과는 저장하지 않는다', async () => {
    prismaMock.userVocabulary.findUnique.mockResolvedValue(null);
    await expect(
      service.create(1, 99, ReviewResult.CORRECT),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.reviewHistory.create).not.toHaveBeenCalled();
  });

  it('CORRECT 결과는 하루 뒤 복습으로 예약한다', async () => {
    const now = new Date('2026-06-23T00:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);
    prismaMock.userVocabulary.findUnique.mockResolvedValue({
      id: 5,
      userId: 1,
      vocabularyId: 3,
    });
    tx.reviewHistory.create.mockResolvedValue({
      id: 8,
      userId: 1,
      vocabularyId: 3,
      result: ReviewResult.CORRECT,
      reviewedAt: now,
    });
    tx.userVocabulary.update.mockImplementation(({ data }) =>
      Promise.resolve({ ...data, id: 5, updatedAt: now }),
    );

    const result = await service.create(1, 3, ReviewResult.CORRECT);

    expect(result.status).toBe(UserWordStatus.LEARNING);
    expect(result.nextReviewAt).toEqual(new Date('2026-06-24T00:00:00.000Z'));
  });

  it('EASY 결과는 단어를 숙달 처리하고 복습 큐에서 제거한다', async () => {
    const now = new Date();
    prismaMock.userVocabulary.findUnique.mockResolvedValue({
      id: 5,
      userId: 1,
      vocabularyId: 3,
    });
    tx.reviewHistory.create.mockResolvedValue({
      id: 9,
      userId: 1,
      vocabularyId: 3,
      result: ReviewResult.EASY,
      reviewedAt: now,
    });
    tx.userVocabulary.update.mockResolvedValue({
      id: 5,
      status: UserWordStatus.MASTERED,
      reviewQueuedAt: null,
    });

    const result = await service.create(1, 3, ReviewResult.EASY);

    expect(result.status).toBe(UserWordStatus.MASTERED);
    expect(result.nextReviewAt).toBeNull();
  });
});
