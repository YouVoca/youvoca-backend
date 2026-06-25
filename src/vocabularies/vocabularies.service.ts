import {
  BadRequestException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import {
  CEFRLevel,
  Prisma,
  TranscriptSegment,
  UserWordStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyzeVocabularyDto } from './dto/analyze-vocabulary.dto';
import { CreateUserVocabularyDto } from './dto/create-user-vocabulary.dto';
import { ListUserVocabulariesDto } from './dto/list-user-vocabularies.dto';
import { OpenAiVocabularyAnalyzer } from './openai-vocabulary-analyzer';

@Injectable()
export class VocabulariesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analyzer: OpenAiVocabularyAnalyzer,
  ) {}

  async analyze(userId: number, dto: AnalyzeVocabularyDto) {
    const transcript = await this.prisma.transcript.findUnique({
      where: { id: dto.transcriptId },
      include: { segments: { orderBy: { startSec: 'asc' } } },
    });
    if (!transcript) throw new NotFoundException('대본을 찾을 수 없습니다.');

    const segments = this.dedupeSegments(transcript.segments);
    const transcriptInput = this.formatTranscript(
      transcript.fullText,
      segments,
    );
    if (transcriptInput.length > 120_000) {
      throw new PayloadTooLargeException(
        '분석 가능한 대본 길이를 초과했습니다.',
      );
    }

    const knownWords = dto.excludeKnownWords
      ? await this.prisma.userVocabulary.findMany({
          where: {
            userId,
            status: { in: [UserWordStatus.KNOWN, UserWordStatus.MASTERED] },
          },
          select: { vocabulary: { select: { word: true, lemma: true } } },
        })
      : [];
    const excluded = [
      ...new Set(
        knownWords.flatMap(({ vocabulary }) =>
          [vocabulary.word, vocabulary.lemma].filter((word): word is string =>
            Boolean(word),
          ),
        ),
      ),
    ];
    const analysis = await this.analyzer.analyze({
      targetLevel: dto.targetLevel,
      knownWords: excluded,
      transcript: transcriptInput,
      selectedWords: this.normalizeSelectedWords(dto.selectedWords),
    });

    const segmentMap = new Map(
      segments.map((segment) => [segment.id, segment]),
    );
    const words = await this.prisma.$transaction(async (tx) => {
      const saved = [];
      for (const item of analysis.words) {
        const word = item.word.trim().toLowerCase();
        const vocabulary = await tx.vocabulary.upsert({
          where: { word },
          update: {
            lemma: item.lemma.trim().toLowerCase(),
            meaningKo: item.meaningKo,
            partOfSpeech: item.partOfSpeech,
            difficulty: item.difficulty as CEFRLevel,
            coreMeaningKo: item.coreMeaningKo,
          },
          create: {
            word,
            lemma: item.lemma.trim().toLowerCase(),
            meaningKo: item.meaningKo,
            partOfSpeech: item.partOfSpeech,
            difficulty: item.difficulty as CEFRLevel,
            coreMeaningKo: item.coreMeaningKo,
          },
        });

        await tx.wordMeaning.deleteMany({
          where: { vocabularyId: vocabulary.id },
        });
        if (item.meanings.length) {
          await tx.wordMeaning.createMany({
            data: item.meanings.map((meaning, index) => ({
              vocabularyId: vocabulary.id,
              ...meaning,
              order: index + 1,
            })),
          });
        }

        const segment = item.segmentId
          ? segmentMap.get(item.segmentId)
          : undefined;
        const occurrence = await tx.transcriptVocabulary.upsert({
          where: {
            transcriptId_vocabularyId_sentence: {
              transcriptId: transcript.id,
              vocabularyId: vocabulary.id,
              sentence: item.sentence,
            },
          },
          update: {
            sentenceKo: item.sentenceKo,
            segmentId: segment?.id,
            startSec: segment?.startSec ?? item.startSec,
            endSec: segment?.endSec ?? item.endSec,
          },
          create: {
            transcriptId: transcript.id,
            vocabularyId: vocabulary.id,
            sentence: item.sentence,
            sentenceKo: item.sentenceKo,
            segmentId: segment?.id,
            startSec: segment?.startSec ?? item.startSec,
            endSec: segment?.endSec ?? item.endSec,
          },
        });
        saved.push({
          ...vocabulary,
          ...occurrence,
          vocabularyId: vocabulary.id,
        });
      }
      return saved;
    });

    return { transcriptId: transcript.id, words };
  }

  async saveForUser(userId: number, dto: CreateUserVocabularyDto) {
    const vocabulary = await this.prisma.vocabulary.findUnique({
      where: { id: dto.vocabularyId },
      select: { id: true },
    });
    if (!vocabulary) throw new NotFoundException('단어를 찾을 수 없습니다.');

    const existing = await this.prisma.userVocabulary.findUnique({
      where: {
        userId_vocabularyId: { userId, vocabularyId: dto.vocabularyId },
      },
    });
    const userVocabulary = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.userVocabulary.upsert({
        where: {
          userId_vocabularyId: { userId, vocabularyId: dto.vocabularyId },
        },
        update: {
          ...(dto.status && { status: dto.status }),
          ...(dto.memo !== undefined && { memo: dto.memo.trim() || null }),
        },
        create: {
          userId,
          vocabularyId: dto.vocabularyId,
          status: dto.status ?? UserWordStatus.UNKNOWN,
          memo: dto.memo?.trim() || null,
        },
      });
      if (dto.transcriptVocabularyId) {
        await this.attachExample(
          tx,
          saved.id,
          dto.vocabularyId,
          dto.transcriptVocabularyId,
        );
      }
      return saved;
    });

    return { ...userVocabulary, alreadySaved: Boolean(existing) };
  }

  async findForUser(userId: number, query: ListUserVocabulariesDto) {
    const where = { userId, ...(query.status && { status: query.status }) };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.userVocabulary.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          vocabulary: true,
          examples: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { transcriptVocabulary: true },
          },
        },
      }),
      this.prisma.userVocabulary.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        vocabularyId: item.vocabularyId,
        word: item.vocabulary.word,
        meaningKo: item.vocabulary.meaningKo,
        partOfSpeech: item.vocabulary.partOfSpeech,
        difficulty: item.vocabulary.difficulty,
        status: item.status,
        memo: item.memo,
        sentence: item.examples[0]?.transcriptVocabulary.sentence ?? null,
        savedAt: item.savedAt,
        updatedAt: item.updatedAt,
      })),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  async updateStatus(
    userId: number,
    userVocabularyId: number,
    status: UserWordStatus,
  ) {
    await this.requireUserVocabulary(userId, userVocabularyId);
    return this.prisma.userVocabulary.update({
      where: { id: userVocabularyId },
      data: { status },
      select: { id: true, status: true, updatedAt: true },
    });
  }

  async addExample(
    userId: number,
    userVocabularyId: number,
    transcriptVocabularyId: number,
  ) {
    const userVocabulary = await this.requireUserVocabulary(
      userId,
      userVocabularyId,
    );
    return this.prisma.$transaction((tx) =>
      this.attachExample(
        tx,
        userVocabularyId,
        userVocabulary.vocabularyId,
        transcriptVocabularyId,
      ),
    );
  }

  async addToReviewQueue(userId: number, userVocabularyId: number) {
    await this.requireUserVocabulary(userId, userVocabularyId);
    return this.prisma.userVocabulary.update({
      where: { id: userVocabularyId },
      data: { status: UserWordStatus.LEARNING, reviewQueuedAt: new Date() },
      select: {
        id: true,
        status: true,
        reviewQueuedAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(vocabularyId: number) {
    const vocabulary = await this.prisma.vocabulary.findUnique({
      where: { id: vocabularyId },
      include: {
        meanings: { orderBy: { order: 'asc' } },
        transcriptVocabularies: {
          orderBy: { id: 'desc' },
          take: 50,
          include: {
            transcript: { select: { id: true, title: true, video: true } },
          },
        },
      },
    });
    if (!vocabulary) throw new NotFoundException('단어를 찾을 수 없습니다.');
    return vocabulary;
  }

  private async requireUserVocabulary(userId: number, id: number) {
    const userVocabulary = await this.prisma.userVocabulary.findFirst({
      where: { id, userId },
    });
    if (!userVocabulary) {
      throw new NotFoundException('내 단어장에서 찾을 수 없습니다.');
    }
    return userVocabulary;
  }

  private async attachExample(
    tx: Prisma.TransactionClient,
    userVocabularyId: number,
    vocabularyId: number,
    transcriptVocabularyId: number,
  ) {
    const occurrence = await tx.transcriptVocabulary.findUnique({
      where: { id: transcriptVocabularyId },
      select: { id: true, vocabularyId: true },
    });
    if (!occurrence)
      throw new NotFoundException('등장 문장을 찾을 수 없습니다.');
    if (occurrence.vocabularyId !== vocabularyId) {
      throw new BadRequestException('해당 단어의 문장만 추가할 수 있습니다.');
    }
    return tx.userVocabularyExample.upsert({
      where: {
        userVocabularyId_transcriptVocabularyId: {
          userVocabularyId,
          transcriptVocabularyId,
        },
      },
      update: {},
      create: { userVocabularyId, transcriptVocabularyId },
      include: { transcriptVocabulary: true },
    });
  }

  private formatTranscript(fullText: string, segments: TranscriptSegment[]) {
    if (!segments.length) return fullText;
    return segments
      .map(
        (segment) =>
          `<segment id="${segment.id}" start="${segment.startSec ?? ''}" end="${segment.endSec ?? ''}">${segment.text}</segment>`,
      )
      .join('\n');
  }

  private dedupeSegments(segments: TranscriptSegment[]) {
    const seen = new Set<string>();
    return segments.filter((segment) => {
      const normalizedText = segment.text.trim().replace(/\s+/g, ' ');
      const key = `${segment.startSec ?? 'none'}::${normalizedText}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private normalizeSelectedWords(selectedWords?: string[]) {
    if (!selectedWords?.length) return undefined;
    const words = selectedWords
      .map((word) => word.trim().toLowerCase())
      .filter((word) => /^[a-z][a-z'-]{0,79}$/.test(word));
    return [...new Set(words)];
  }
}
