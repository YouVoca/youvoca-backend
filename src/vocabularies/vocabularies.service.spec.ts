import { NotFoundException } from '@nestjs/common';
import { CEFRLevel, TranscriptSourceType } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import type { OpenAiVocabularyAnalyzer } from './openai-vocabulary-analyzer';
import { VocabulariesService } from './vocabularies.service';

describe('VocabulariesService', () => {
  const tx = {
    vocabulary: { upsert: jest.fn() },
    wordMeaning: { deleteMany: jest.fn(), createMany: jest.fn() },
    transcriptVocabulary: { upsert: jest.fn() },
  };
  const prismaMock = {
    transcript: { findUnique: jest.fn() },
    userVocabulary: { findMany: jest.fn() },
    $transaction: jest.fn((callback) => callback(tx)),
  };
  const analyzerMock = { analyze: jest.fn() };
  const service = new VocabulariesService(
    prismaMock as unknown as PrismaService,
    analyzerMock as unknown as OpenAiVocabularyAnalyzer,
  );

  beforeEach(() => jest.clearAllMocks());

  it('존재하지 않는 대본은 분석하지 않는다', async () => {
    prismaMock.transcript.findUnique.mockResolvedValue(null);
    await expect(
      service.analyze(1, {
        transcriptId: 999,
        excludeKnownWords: true,
        targetLevel: CEFRLevel.B1,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(analyzerMock.analyze).not.toHaveBeenCalled();
  });

  it('기지 단어를 제외해 분석하고 단어와 등장 문장을 upsert한다', async () => {
    const now = new Date();
    prismaMock.transcript.findUnique.mockResolvedValue({
      id: 10,
      videoId: 1,
      title: 'Test',
      sourceType: TranscriptSourceType.YOUTUBE,
      language: 'en',
      fullText: 'I learned this through experience.',
      createdAt: now,
      segments: [
        {
          id: 7,
          transcriptId: 10,
          startSec: 12,
          endSec: 15,
          text: 'I learned this through experience.',
        },
      ],
    });
    prismaMock.userVocabulary.findMany.mockResolvedValue([
      { vocabulary: { word: 'learn', lemma: 'learn' } },
    ]);
    analyzerMock.analyze.mockResolvedValue({
      words: [
        {
          word: 'Through',
          lemma: 'through',
          meaningKo: '~을 통해',
          partOfSpeech: 'preposition',
          difficulty: 'A2',
          coreMeaningKo: '안을 지나 연결되는 느낌',
          sentence: 'I learned this through experience.',
          sentenceKo: '경험을 통해 이것을 배웠다.',
          segmentId: 7,
          startSec: null,
          endSec: null,
          meanings: [
            {
              meaningKo: '~을 통해',
              explanationKo: '수단이나 과정을 나타낸다.',
              exampleSentence: 'I learned through practice.',
              exampleMeaningKo: '연습을 통해 배웠다.',
            },
          ],
        },
      ],
    });
    tx.vocabulary.upsert.mockResolvedValue({
      id: 3,
      word: 'through',
      lemma: 'through',
      meaningKo: '~을 통해',
      partOfSpeech: 'preposition',
      difficulty: CEFRLevel.A2,
      coreMeaningKo: '안을 지나 연결되는 느낌',
      createdAt: now,
      updatedAt: now,
    });
    tx.wordMeaning.deleteMany.mockResolvedValue({ count: 0 });
    tx.wordMeaning.createMany.mockResolvedValue({ count: 1 });
    tx.transcriptVocabulary.upsert.mockResolvedValue({
      id: 20,
      transcriptId: 10,
      vocabularyId: 3,
      segmentId: 7,
      sentence: 'I learned this through experience.',
      sentenceKo: '경험을 통해 이것을 배웠다.',
      startSec: 12,
      endSec: 15,
    });

    const result = await service.analyze(1, {
      transcriptId: 10,
      excludeKnownWords: true,
      targetLevel: CEFRLevel.B1,
    });

    expect(analyzerMock.analyze).toHaveBeenCalledWith(
      expect.objectContaining({ knownWords: ['learn'] }),
    );
    expect(tx.vocabulary.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { word: 'through' } }),
    );
    expect(tx.transcriptVocabulary.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          segmentId: 7,
          startSec: 12,
          endSec: 15,
        }),
      }),
    );
    expect(result.transcriptId).toBe(10);
    expect(result.words).toHaveLength(1);
  });
});
